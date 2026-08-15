import {z} from 'zod';
import {withTenant} from './db.js';

const id=z.string().uuid();
const money=z.coerce.number().nonnegative();
const methods=z.enum(['cash','pix','card','transfer','other']);
const roles=z.enum(['admin','instructor','reception']);
const day=(d:any)=>String(d??'').slice(0,10);

export async function moduleRoutes(app:any){
 const tenant=(req:any,fn:any)=>withTenant(req.user.gym_id,fn);

 // Dashboard
 app.get('/api/dashboard',async(req:any)=>tenant(req,async (c:any)=>{
  const [students,enrollments,expired,revenue,pending,today,checkins,recent]=await Promise.all([
   c.query("SELECT count(*)::int total FROM students WHERE gym_id=$1 AND status='active'",[req.user.gym_id]),
   c.query("SELECT count(*)::int total FROM enrollments WHERE gym_id=$1 AND status='active' AND ends_on BETWEEN current_date AND current_date+7",[req.user.gym_id]),
   c.query("SELECT count(*)::int total FROM enrollments WHERE gym_id=$1 AND ends_on<current_date AND status NOT IN('cancelled')",[req.user.gym_id]),
   c.query("SELECT COALESCE(sum(amount),0)::numeric total FROM payments WHERE gym_id=$1 AND status='paid' AND paid_at>=date_trunc('month',current_date)",[req.user.gym_id]),
   c.query("SELECT COALESCE(sum(amount),0)::numeric total FROM payments WHERE gym_id=$1 AND status='pending'",[req.user.gym_id]),
   c.query("SELECT count(*)::int total FROM appointments WHERE gym_id=$1 AND starts_at::date=current_date",[req.user.gym_id]),
   c.query("SELECT count(*)::int total FROM checkins WHERE gym_id=$1 AND checked_at::date=current_date",[req.user.gym_id]),
   c.query("SELECT s.id,s.full_name,s.phone FROM students s WHERE s.gym_id=$1 AND s.status='active' ORDER BY s.created_at DESC LIMIT 5",[req.user.gym_id])
  ]);
  const revenueMonth=Number(revenue.rows[0].total);
  const prev=await c.query("SELECT COALESCE(sum(amount),0)::numeric total FROM payments WHERE gym_id=$1 AND status='paid' AND paid_at>=date_trunc('month',current_date)-interval '1 month' AND paid_at<date_trunc('month',current_date)",[req.user.gym_id]);
  const previous=Number(prev.rows[0].total); const growth=previous?((revenueMonth-previous)/previous)*100:0;
  return {students:students.rows[0].total,enrollmentsExpiring:enrollments.rows[0].total,enrollmentsExpired:expired.rows[0].total,revenue:revenueMonth,pending:Number(pending.rows[0].total),appointments:today.rows[0].total,checkins:checkins.rows[0].total,revenueGrowth:growth,recentStudents:recent.rows};
 }));

 // Students
 app.get('/api/students',async(req:any)=>tenant(req,async (c:any)=>{
  const q=String(req.query?.q??'').trim(), status=String(req.query?.status??'all');
  return (await c.query(`SELECT s.*,e.id enrollment_id,e.ends_on,CASE WHEN e.ends_on<current_date THEN 'expired' WHEN e.ends_on<=current_date+7 THEN 'expiring' ELSE e.status::text END enrollment_status,p.name plan_name
   FROM students s LEFT JOIN LATERAL(SELECT * FROM enrollments WHERE student_id=s.id AND status<>'cancelled' ORDER BY ends_on DESC LIMIT 1)e ON true
   LEFT JOIN plans p ON p.id=e.plan_id
   WHERE ($1='' OR s.full_name ILIKE $2 OR COALESCE(s.cpf,'') ILIKE $2 OR COALESCE(s.phone,'') ILIKE $2)
   AND ($3='all' OR s.status=$3) ORDER BY s.full_name LIMIT 300`,[q,`%${q}%`,status])).rows;
 }));
 app.get('/api/students/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{
  const r=await c.query('SELECT * FROM students WHERE id=$1 AND gym_id=$2',[req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Aluno não encontrado.'});
  const [ens,pays,works,checks]=await Promise.all([
   c.query("SELECT e.*,p.name plan_name FROM enrollments e JOIN plans p ON p.id=e.plan_id WHERE e.student_id=$1 AND e.gym_id=$2 ORDER BY e.starts_on DESC",[req.params.id,req.user.gym_id]),
   c.query("SELECT * FROM payments WHERE student_id=$1 AND gym_id=$2 ORDER BY created_at DESC LIMIT 100",[req.params.id,req.user.gym_id]),
   c.query("SELECT * FROM workouts WHERE student_id=$1 AND gym_id=$2 ORDER BY created_at DESC",[req.params.id,req.user.gym_id]),
   c.query("SELECT * FROM checkins WHERE student_id=$1 AND gym_id=$2 ORDER BY checked_at DESC LIMIT 30",[req.params.id,req.user.gym_id])
  ]);
  return {student:r.rows[0],enrollments:ens.rows,payments:pays.rows,workouts:works.rows,checkins:checks.rows};
 }));
 const studentSchema=z.object({full_name:z.string().min(2).max(160),cpf:z.string().max(14).optional(),birth_date:z.string().optional(),gender:z.string().max(30).optional(),phone:z.string().max(30).optional(),email:z.string().email().optional().or(z.literal('')),address:z.record(z.any()).optional(),emergency_contact:z.record(z.any()).optional(),notes:z.string().optional(),photo_url:z.string().url().optional().or(z.literal(''))});
 app.post('/api/students',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=studentSchema.parse(req.body);const r=await c.query(`INSERT INTO students(gym_id,full_name,cpf,birth_date,gender,phone,email,address,emergency_contact,notes,photo_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[req.user.gym_id,d.full_name,d.cpf||null,d.birth_date||null,d.gender||null,d.phone||null,d.email||null,d.address??{},d.emergency_contact??{},d.notes||null,d.photo_url||null]);return res.code(201).send(r.rows[0])}));
 app.put('/api/students/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=studentSchema.partial().parse(req.body);const fields=Object.entries(d);if(!fields.length)return res.send({ok:true});const set=fields.map(([k],i)=>`${k}=$${i+1}`).join(',');const vals=fields.map(([,v])=>v??null);const r=await c.query(`UPDATE students SET ${set},updated_at=now() WHERE id=$${vals.length+1} AND gym_id=$${vals.length+2} RETURNING *`,[...vals,req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Aluno não encontrado.'});return r.rows[0]}));
 app.delete('/api/students/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const r=await c.query("UPDATE students SET status='inactive',updated_at=now() WHERE id=$1 AND gym_id=$2 RETURNING id",[req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Aluno não encontrado.'});return {ok:true}}));
 app.post('/api/students/:id/checkin',async(req:any,res:any)=>tenant(req,async (c:any)=>{const r=await c.query("INSERT INTO checkins(gym_id,student_id) SELECT $1,id FROM students WHERE id=$2 AND gym_id=$1 ON CONFLICT DO NOTHING RETURNING *",[req.user.gym_id,req.params.id]);return res.code(r.rowCount?201:200).send(r.rows[0]??{ok:true})}));

 // Plans
 app.get('/api/plans',async(req:any)=>tenant(req,async (c:any)=>(await c.query("SELECT * FROM plans WHERE gym_id=$1 ORDER BY status DESC,price",[req.user.gym_id])).rows));
 const planSchema=z.object({name:z.string().min(2).max(120),price:money,duration_days:z.coerce.number().int().positive()});
 app.post('/api/plans',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=planSchema.parse(req.body);const r=await c.query("INSERT INTO plans(gym_id,name,price,duration_days) VALUES($1,$2,$3,$4) RETURNING *",[req.user.gym_id,d.name,d.price,d.duration_days]);return res.code(201).send(r.rows[0])}));
 app.put('/api/plans/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=planSchema.partial().parse(req.body);const f=Object.entries(d);if(!f.length)return {ok:true};const set=f.map(([k],i)=>`${k}=$${i+1}`).join(',');const vals=f.map(([,v])=>v);const r=await c.query(`UPDATE plans SET ${set},updated_at=now() WHERE id=$${vals.length+1} AND gym_id=$${vals.length+2} RETURNING *`,[...vals,req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Plano não encontrado.'});return r.rows[0]}));
 app.delete('/api/plans/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const r=await c.query("UPDATE plans SET status='inactive',updated_at=now() WHERE id=$1 AND gym_id=$2 RETURNING id",[req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Plano não encontrado.'});return {ok:true}}));

 // Enrollments
 app.get('/api/enrollments',async(req:any)=>tenant(req,async (c:any)=>(await c.query(`SELECT e.*,CASE WHEN e.ends_on<current_date THEN 'expired' WHEN e.ends_on<=current_date+7 THEN 'expiring' ELSE e.status::text END AS display_status,s.full_name student_name,p.name plan_name FROM enrollments e JOIN students s ON s.id=e.student_id JOIN plans p ON p.id=e.plan_id WHERE e.gym_id=$1 ORDER BY e.ends_on DESC LIMIT 500`)).rows));
 const enrollmentSchema=z.object({student_id:id,plan_id:id,starts_on:z.string(),ends_on:z.string(),amount:money,method:methods.optional(),notes:z.string().optional()});
 app.post('/api/enrollments',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=enrollmentSchema.parse(req.body);const r=await c.query(`INSERT INTO enrollments(gym_id,student_id,plan_id,starts_on,ends_on,amount,method,notes,created_by)
 SELECT $1,s.id,p.id,$3,$4,$5,$6,$7,$8 FROM students s JOIN plans p ON p.id=$2 WHERE s.id=$9 AND s.gym_id=$1 AND p.gym_id=$1 RETURNING *`,[req.user.gym_id,d.plan_id,d.starts_on,d.ends_on,d.amount,d.method??null,d.notes??null,req.user.id,d.student_id]);if(!r.rowCount)return res.code(400).send({error:'Aluno ou plano não encontrado.'});return res.code(201).send(r.rows[0])}));
 app.put('/api/enrollments/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=enrollmentSchema.partial().parse(req.body);const f=Object.entries(d);if(!f.length)return {ok:true};const set=f.map(([k],i)=>`${k}=$${i+1}`).join(',');const vals=f.map(([,v])=>v);const r=await c.query(`UPDATE enrollments SET ${set},updated_at=now() WHERE id=$${vals.length+1} AND gym_id=$${vals.length+2} RETURNING *`,[...vals,req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Matrícula não encontrada.'});return r.rows[0]}));
 app.post('/api/enrollments/:id/renew',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=z.object({plan_id:id,starts_on:z.string(),ends_on:z.string(),amount:money,method:methods.optional(),notes:z.string().optional()}).parse(req.body);const old=await c.query('SELECT * FROM enrollments WHERE id=$1 AND gym_id=$2',[req.params.id,req.user.gym_id]);if(!old.rowCount)return res.code(404).send({error:'Matrícula não encontrada.'});const r=await c.query(`INSERT INTO enrollments(gym_id,student_id,plan_id,starts_on,ends_on,amount,method,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[req.user.gym_id,old.rows[0].student_id,d.plan_id,d.starts_on,d.ends_on,d.amount,d.method??null,d.notes??null,req.user.id]);await c.query("UPDATE enrollments SET status='cancelled',cancelled_at=now(),updated_at=now() WHERE id=$1 AND gym_id=$2",[req.params.id,req.user.gym_id]);return res.code(201).send(r.rows[0])}));
 app.post('/api/enrollments/:id/cancel',async(req:any,res:any)=>tenant(req,async (c:any)=>{const r=await c.query("UPDATE enrollments SET status='cancelled',cancelled_at=now(),updated_at=now() WHERE id=$1 AND gym_id=$2 RETURNING id",[req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Matrícula não encontrada.'});return {ok:true}}));

 // Payments
 app.get('/api/payments',async(req:any)=>tenant(req,async (c:any)=>(await c.query(`SELECT p.*,s.full_name student_name FROM payments p JOIN students s ON s.id=p.student_id WHERE p.gym_id=$1 ORDER BY p.created_at DESC LIMIT 500`,[req.user.gym_id])).rows));
 const paymentSchema=z.object({student_id:id,enrollment_id:id.optional(),amount:z.coerce.number().positive(),method:methods,status:z.enum(['paid','pending','cancelled']).default('paid'),paid_at:z.string().optional(),reference:z.string().optional(),notes:z.string().optional()});
 app.post('/api/payments',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=paymentSchema.parse(req.body);const r=await c.query(`INSERT INTO payments(gym_id,student_id,enrollment_id,amount,paid_at,method,status,reference,notes,created_by)
 SELECT $1,s.id,$3,$4,CASE WHEN $5='' THEN NULL ELSE $5::timestamptz END,$6,$7,$8,$9,$10 FROM students s WHERE s.id=$2 AND s.gym_id=$1 RETURNING *`,[req.user.gym_id,d.student_id,d.enrollment_id??null,d.amount,d.paid_at??new Date().toISOString(),d.method,d.status,d.reference??null,d.notes??null,req.user.id]);if(!r.rowCount)return res.code(400).send({error:'Aluno não encontrado.'});return res.code(201).send(r.rows[0])}));

 // Workouts + exercise library
 app.get('/api/exercises',async(req:any)=>tenant(req,async (c:any)=>(await c.query('SELECT * FROM exercises WHERE gym_id=$1 ORDER BY muscle_group,name',[req.user.gym_id])).rows));
 const exerciseSchema=z.object({name:z.string().min(2).max(120),muscle_group:z.string().max(80).optional()});
 app.post('/api/exercises',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=exerciseSchema.parse(req.body);const r=await c.query('INSERT INTO exercises(gym_id,name,muscle_group) VALUES($1,$2,$3) RETURNING *',[req.user.gym_id,d.name,d.muscle_group??null]);return res.code(201).send(r.rows[0])}));
 app.get('/api/workouts',async(req:any)=>tenant(req,async (c:any)=>(await c.query(`SELECT w.*,s.full_name student_name,COUNT(we.id)::int exercise_count FROM workouts w JOIN students s ON s.id=w.student_id LEFT JOIN workout_exercises we ON we.workout_id=w.id WHERE w.gym_id=$1 GROUP BY w.id,s.full_name ORDER BY w.created_at DESC`,[req.user.gym_id])).rows));
 app.get('/api/workouts/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const w=await c.query('SELECT w.*,s.full_name student_name FROM workouts w JOIN students s ON s.id=w.student_id WHERE w.id=$1 AND w.gym_id=$2',[req.params.id,req.user.gym_id]);if(!w.rowCount)return res.code(404).send({error:'Treino não encontrado.'});const ex=await c.query(`SELECT we.*,e.name exercise_name,e.muscle_group FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE we.workout_id=$1 AND we.gym_id=$2 ORDER BY we.position`,[req.params.id,req.user.gym_id]);return {workout:w.rows[0],exercises:ex.rows}}));
 const workoutSchema=z.object({student_id:id,name:z.string().min(2).max(120),objective:z.string().optional(),starts_on:z.string().optional(),review_on:z.string().optional(),notes:z.string().optional()});
 app.post('/api/workouts',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=workoutSchema.parse(req.body);const r=await c.query(`INSERT INTO workouts(gym_id,student_id,name,objective,starts_on,review_on,notes,created_by) SELECT $1,id,$3,$4,$5,$6,$7,$8 FROM students WHERE id=$2 AND gym_id=$1 RETURNING *`,[req.user.gym_id,d.student_id,d.name,d.objective??null,d.starts_on||null,d.review_on||null,d.notes??null,req.user.id]);if(!r.rowCount)return res.code(400).send({error:'Aluno não encontrado.'});return res.code(201).send(r.rows[0])}));
 app.put('/api/workouts/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=workoutSchema.partial().parse(req.body);const f=Object.entries(d);if(!f.length)return {ok:true};const set=f.map(([k],i)=>`${k}=$${i+1}`).join(',');const vals=f.map(([,v])=>v);const r=await c.query(`UPDATE workouts SET ${set},updated_at=now() WHERE id=$${vals.length+1} AND gym_id=$${vals.length+2} RETURNING *`,[...vals,req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Treino não encontrado.'});return r.rows[0]}));
 app.post('/api/workouts/:id/exercises',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=z.object({exercise_id:id,position:z.coerce.number().int().min(0),sets:z.string().optional(),reps:z.string().optional(),load:z.string().optional(),rest:z.string().optional(),notes:z.string().optional()}).parse(req.body);const r=await c.query(`INSERT INTO workout_exercises(gym_id,workout_id,exercise_id,position,sets,reps,load,rest,notes)
 SELECT $1,w.id,e.id,$3,$4,$5,$6,$7,$8 FROM workouts w JOIN exercises e ON e.id=$2 WHERE w.id=$9 AND w.gym_id=$1 AND e.gym_id=$1 RETURNING *`,[req.user.gym_id,d.exercise_id,d.position,d.sets??null,d.reps??null,d.load??null,d.rest??null,d.notes??null,req.params.id]);if(!r.rowCount)return res.code(400).send({error:'Treino ou exercício não encontrado.'});return res.code(201).send(r.rows[0])}));
 app.put('/api/workout-exercises/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=z.object({position:z.coerce.number().int().min(0),sets:z.string().optional(),reps:z.string().optional(),load:z.string().optional(),rest:z.string().optional(),notes:z.string().optional()}).parse(req.body);const r=await c.query(`UPDATE workout_exercises SET position=$1,sets=$2,reps=$3,load=$4,rest=$5,notes=$6 WHERE id=$7 AND gym_id=$8 RETURNING *`,[d.position,d.sets??null,d.reps??null,d.load??null,d.rest??null,d.notes??null,req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Exercício do treino não encontrado.'});return r.rows[0]}));
 app.delete('/api/workout-exercises/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const r=await c.query('DELETE FROM workout_exercises WHERE id=$1 AND gym_id=$2 RETURNING id',[req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Exercício não encontrado.'});return {ok:true}}));

 // Agenda
 app.get('/api/appointments',async(req:any)=>tenant(req,async (c:any)=>(await c.query(`SELECT a.*,s.full_name student_name,u.name professional_name FROM appointments a LEFT JOIN students s ON s.id=a.student_id LEFT JOIN users u ON u.id=a.professional_id WHERE a.gym_id=$1 ORDER BY a.starts_at DESC LIMIT 500`,[req.user.gym_id])).rows));
 const appointmentSchema=z.object({title:z.string().min(2),type:z.enum(['assessment','personal','class','meeting','other']),starts_at:z.string(),ends_at:z.string(),student_id:id.optional(),professional_id:id.optional(),notes:z.string().optional()});
 app.post('/api/appointments',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=appointmentSchema.parse(req.body);const r=await c.query(`INSERT INTO appointments(gym_id,title,type,starts_at,ends_at,student_id,professional_id,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.user.gym_id,d.title,d.type,d.starts_at,d.ends_at,d.student_id??null,d.professional_id??req.user.id,d.notes??null]);return res.code(201).send(r.rows[0])}));
 app.put('/api/appointments/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const d=appointmentSchema.partial().parse(req.body);const f=Object.entries(d);if(!f.length)return {ok:true};const set=f.map(([k],i)=>`${k}=$${i+1}`).join(',');const vals=f.map(([,v])=>v);const r=await c.query(`UPDATE appointments SET ${set},updated_at=now() WHERE id=$${vals.length+1} AND gym_id=$${vals.length+2} RETURNING *`,[...vals,req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Agendamento não encontrado.'});return r.rows[0]}));
 app.delete('/api/appointments/:id',async(req:any,res:any)=>tenant(req,async (c:any)=>{const r=await c.query('DELETE FROM appointments WHERE id=$1 AND gym_id=$2 RETURNING id',[req.params.id,req.user.gym_id]);if(!r.rowCount)return res.code(404).send({error:'Agendamento não encontrado.'});return {ok:true}}));

 // Reports
 app.get('/api/reports/summary',async(req:any)=>tenant(req,async (c:any)=>{
  const [students,enrollments,cancelled,revenue,pending,methods]=await Promise.all([
   c.query("SELECT count(*)::int total FROM students WHERE gym_id=$1 AND status='active'",[req.user.gym_id]),
   c.query("SELECT count(*)::int total FROM enrollments WHERE gym_id=$1 AND starts_on>=date_trunc('month',current_date) AND status<>'cancelled'",[req.user.gym_id]),
   c.query("SELECT count(*)::int total FROM enrollments WHERE gym_id=$1 AND status='cancelled' AND cancelled_at>=date_trunc('month',current_date)",[req.user.gym_id]),
   c.query("SELECT COALESCE(sum(amount),0)::numeric total FROM payments WHERE gym_id=$1 AND status='paid' AND paid_at>=date_trunc('month',current_date)",[req.user.gym_id]),
   c.query("SELECT COALESCE(sum(amount),0)::numeric total FROM payments WHERE gym_id=$1 AND status='pending'",[req.user.gym_id]),
   c.query("SELECT method,COALESCE(sum(amount),0)::numeric total FROM payments WHERE gym_id=$1 AND status='paid' GROUP BY method ORDER BY total DESC",[req.user.gym_id])
  ]);
  return {students:students.rows[0].total,newEnrollments:enrollments.rows[0].total,cancellations:cancelled.rows[0].total,revenue:Number(revenue.rows[0].total),pending:Number(pending.rows[0].total),byMethod:methods.rows};
 }));

 // Gym settings and team
 app.get('/api/gym',async(req:any)=>tenant(req,async (c:any)=>(await c.query('SELECT id,name,slug,logo_url,cnpj,phone,email,address,timezone FROM gyms WHERE id=$1',[req.user.gym_id])).rows[0]));
 app.put('/api/gym',async(req:any,res:any)=>tenant(req,async (c:any)=>{if(req.user.role!=='admin')return res.code(403).send({error:'Apenas administradores podem alterar a academia.'});const d=z.object({name:z.string().min(2).max(160),logo_url:z.string().optional(),cnpj:z.string().optional(),phone:z.string().optional(),email:z.string().email().optional().or(z.literal('')),address:z.record(z.any()).optional(),timezone:z.string().optional()}).parse(req.body);const r=await c.query(`UPDATE gyms SET name=$1,logo_url=$2,cnpj=$3,phone=$4,email=$5,address=$6,timezone=$7,updated_at=now() WHERE id=$8 RETURNING *`,[d.name,d.logo_url??null,d.cnpj??null,d.phone??null,d.email??null,d.address??{},d.timezone??'America/Sao_Paulo',req.user.gym_id]);return r.rows[0]}));
 app.get('/api/users',async(req:any,res:any)=>tenant(req,async (c:any)=>{if(req.user.role!=='admin')return res.code(403).send({error:'Sem permissão.'});return (await c.query("SELECT id,name,email,role,status,last_login_at,created_at FROM users WHERE gym_id=$1 ORDER BY name",[req.user.gym_id])).rows}));
 app.post('/api/users',async(req:any,res:any)=>{return res.code(501).send({error:'Criação de equipe deve ser feita pelo convite seguro na próxima etapa.'})});
}
