import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import 'dotenv/config';
import {migrate,pool} from './db.js';
import {authRoutes,resolveUser} from './auth.js';
import {moduleRoutes} from './modules.js';

const app=Fastify({logger:true});
await app.register(helmet);
await app.register(cors,{origin:(process.env.FRONTEND_URL??'http://localhost:5173').split(',').map(s=>s.trim()),credentials:true});
await app.register(rateLimit,{max:120,timeWindow:'1 minute'});
app.decorateRequest('user',null);
app.addHook('preHandler',async(req:any,res:any)=>{
 if(req.url.startsWith('/api/')){const u=await resolveUser(req.headers.authorization?.replace(/^Bearer\s+/i,''));if(!u)return res.code(401).send({error:'Faça login para continuar.'});req.user=u}
});
await migrate();
await authRoutes(app);
await moduleRoutes(app);
app.get('/health',async()=>({ok:true,service:'multigym-api'}));
app.get('/health/db',async()=>{await pool.query('select 1');return {ok:true}});
app.setErrorHandler((e:any,_req,res)=>{app.log.error(e);const code=e.statusCode??(e.name==='ZodError'?400:500);return res.code(code).send({error:e.name==='ZodError'?'Dados inválidos.':'Não foi possível concluir a operação.'})});
await app.listen({port:Number(process.env.PORT??3333),host:'0.0.0.0'});
