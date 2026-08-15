import {randomBytes,createHash} from 'node:crypto';
import argon2 from 'argon2';
import {z} from 'zod';
import {pool,withTenant} from './db.js';

const tokenHash=(v:string)=>createHash('sha256').update(v).digest('hex');
const token=()=>randomBytes(32).toString('hex');
const signup=z.object({gymName:z.string().min(2).max(160),name:z.string().min(2).max(160),email:z.string().email(),password:z.string().min(8).max(128)});
const login=z.object({email:z.string().email(),password:z.string().min(1)});

export async function authRoutes(app:any){
 app.post('/auth/signup',async(req:any,res:any)=>{
  const d=signup.parse(req.body), slug=d.gymName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+randomBytes(3).toString('hex');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const gym=await client.query('INSERT INTO gyms(name,slug) VALUES($1,$2) RETURNING id,name,slug',[d.gymName,slug]);
   const hash=await argon2.hash(d.password,{type:argon2.argon2id});
   const u=await client.query("INSERT INTO users(gym_id,name,email,password_hash,role) VALUES($1,$2,lower($3),$4,'admin') RETURNING id,name,email,role,gym_id",[gym.rows[0].id,d.name,d.email,hash]);
   await client.query('COMMIT');
   return res.code(201).send({user:publicUser(u.rows[0],gym.rows[0].name)});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 });
 app.post('/auth/login',async(req:any,res:any)=>{
  const d=login.parse(req.body);
  const q=await pool.query("SELECT u.*,g.name gym_name FROM users u JOIN gyms g ON g.id=u.gym_id WHERE lower(u.email)=lower($1) AND u.status='active' AND g.active=true LIMIT 1",[d.email]);
  const u=q.rows[0]; if(!u||!(await argon2.verify(u.password_hash,d.password))) return res.code(401).send({error:'E-mail ou senha inválidos.'});
  const raw=token(); await withTenant(u.gym_id,async c=>{await c.query("INSERT INTO sessions(user_id,gym_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '14 days')",[u.id,u.gym_id,tokenHash(raw)]);await c.query('UPDATE users SET last_login_at=now() WHERE id=$1',[u.id]);});
  return {token:raw,user:publicUser(u,u.gym_name)};
 });
 app.post('/auth/logout',async(req:any,res:any)=>{const raw=req.headers.authorization?.replace(/^Bearer\s+/i,'');if(raw)await pool.query('UPDATE sessions SET revoked_at=now() WHERE token_hash=$1',[tokenHash(raw)]);return res.send({ok:true})});
 app.get('/auth/me',async(req:any,res:any)=>{if(!req.user)return res.code(401).send({error:'Não autenticado.'});return {user:req.user}});
}
function publicUser(u:any,gymName?:string){return {id:u.id,name:u.name,email:u.email,role:u.role,gymId:u.gym_id,gymName:gymName??u.gym_name}}
export async function resolveUser(raw:string|undefined){
 if(!raw)return null;
 const q=await pool.query("SELECT u.id,u.name,u.email,u.role,u.gym_id,g.name gym_name FROM sessions s JOIN users u ON u.id=s.user_id JOIN gyms g ON g.id=s.gym_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active' AND g.active=true",[tokenHash(raw)]);
 return q.rows[0]??null;
}
