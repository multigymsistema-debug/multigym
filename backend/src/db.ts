import pg from 'pg';
import 'dotenv/config';
const {Pool}=pg;
export const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10});
export async function withTenant<T>(gymId:string, fn:(c:any)=>Promise<T>):Promise<T>{
 const c=await pool.connect();
 try{await c.query('BEGIN'); await c.query("SELECT set_config('app.gym_id',$1,true)",[gymId]); const v=await fn(c); await c.query('COMMIT'); return v}
 catch(e){await c.query('ROLLBACK');throw e} finally{c.release()}
}
export async function migrate(){
 const fs=await import('node:fs/promises'), path=await import('node:path');
 const sql=await fs.readFile(path.join(process.cwd(),'schema','001_schema.sql'),'utf8');
 await pool.query(sql);
}
