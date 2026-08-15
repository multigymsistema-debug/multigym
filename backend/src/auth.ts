import { randomBytes, createHash } from 'node:crypto';
import argon2 from 'argon2';
import { z } from 'zod';
import { withTenant, pool } from './db.js';

const signupSchema = z.object({ gymName: z.string().min(2).max(160), name: z.string().min(2).max(160), email: z.string().email().max(254), password: z.string().min(8).max(128) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const newToken = () => randomBytes(32).toString('hex');

export async function registerAuthRoutes(app: any) {
  app.post('/auth/signup', async (request: any, reply: any) => {
    const input = signupSchema.parse(request.body);
    const gymId = crypto.randomUUID();
    const slug = `${input.gymName.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}-${gymId.slice(0, 8)}`;
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    await pool.query('BEGIN');
    try {
      await pool.query('INSERT INTO gyms (id,name,slug) VALUES ($1,$2,$3)', [gymId, input.gymName, slug]);
      const user = await pool.query('INSERT INTO users (gym_id,name,email,password_hash,role) VALUES ($1,$2,lower($3),$4,\'admin\') RETURNING id,name,email,role,gym_id', [gymId, input.name, input.email, passwordHash]);
      await pool.query('COMMIT');
      return reply.code(201).send({ user: user.rows[0] });
    } catch (error) { await pool.query('ROLLBACK'); throw error; }
  });
  app.post('/auth/login', async (request: any, reply: any) => {
    const input = loginSchema.parse(request.body);
    const result = await pool.query('SELECT u.*, g.name AS gym_name FROM users u JOIN gyms g ON g.id=u.gym_id WHERE lower(u.email)=lower($1) AND u.status=\'active\' AND g.active=true LIMIT 1', [input.email]);
    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, input.password))) return reply.code(401).send({ error: 'E-mail ou senha inválidos.' });
    const raw = newToken();
    await withTenant(user.gym_id, async (client) => { await client.query('INSERT INTO sessions (user_id,gym_id,token_hash,expires_at) VALUES ($1,$2,$3,now()+interval \'7 days\')', [user.id, user.gym_id, hashToken(raw)]); await client.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]); });
    return { token: raw, user: { id: user.id, name: user.name, email: user.email, role: user.role, gymId: user.gym_id, gymName: user.gym_name } };
  });
}
