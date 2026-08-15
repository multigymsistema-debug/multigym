import 'dotenv/config';
import {Pool} from 'pg';
import argon2 from 'argon2';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const r=await pool.query(`SELECT id FROM gyms ORDER BY created_at LIMIT 1`);
if(!r.rows[0]){console.log('Crie uma academia pelo cadastro antes do seed.');process.exit(0)}
const gym=r.rows[0].id; const email='demo@multigym.local'; const pass='MultiGym@123'; const hash=await argon2.hash(pass);
await pool.query(`INSERT INTO users(gym_id,name,email,password_hash,role) VALUES($1,'Administrador Demo',$2,$3,'admin') ON CONFLICT(gym_id,email) DO NOTHING`,[gym,email,hash]);
await pool.query(`INSERT INTO students(gym_id,full_name,phone,email,training_level,training_experience_months,primary_goal,weekly_frequency) VALUES($1,'João Silva','(75) 99999-1111','joao@demo.local','intermediate',18,'Hipertrofia',4),($1,'Maria Santos','(75) 99999-2222','maria@demo.local','beginner',2,'Emagrecimento',3),($1,'Pedro Oliveira','(75) 99999-3333','pedro@demo.local','advanced',42,'Força',5) ON CONFLICT DO NOTHING`,[gym]);
console.log(`Usuário demo: ${email} / ${pass}`);await pool.end();
