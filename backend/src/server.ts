import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { pool } from './db.js';
import { registerAuthRoutes } from './auth.js';

const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });
await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
await registerAuthRoutes(app);
app.get('/health', async () => ({ ok: true, service: 'multigym-api' }));
app.get('/health/db', async (_request, reply) => { try { await pool.query('select 1'); return { ok: true }; } catch { return reply.code(503).send({ ok: false }); } });
app.setErrorHandler((error, _request, reply) => { app.log.error(error); return reply.code((error as any).statusCode ?? 500).send({ error: 'Não foi possível concluir a operação.' }); });
await app.listen({ port: Number(process.env.PORT ?? 3333), host: '0.0.0.0' });
