CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS gyms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL, slug varchar(100) UNIQUE NOT NULL,
 logo_url text, cnpj varchar(18), phone varchar(30), email varchar(254), address jsonb NOT NULL DEFAULT '{}',
 timezone varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo', active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 name varchar(160) NOT NULL, email varchar(254) NOT NULL, password_hash text NOT NULL,
 role varchar(30) NOT NULL DEFAULT 'reception' CHECK(role IN ('admin','manager','instructor','reception')),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gym_id,email)
);
CREATE TABLE IF NOT EXISTS sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, token_hash text UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 name varchar(120) NOT NULL, price numeric(12,2) NOT NULL CHECK(price>=0), duration_days int NOT NULL CHECK(duration_days>0),
 description text, status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gym_id,name)
);
CREATE TABLE IF NOT EXISTS students (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 full_name varchar(160) NOT NULL, cpf varchar(14), birth_date date, gender varchar(30), phone varchar(30), email varchar(254),
 address jsonb NOT NULL DEFAULT '{}', emergency_contact jsonb NOT NULL DEFAULT '{}', notes text, photo_url text,
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 training_level varchar(30) NOT NULL DEFAULT 'beginner', training_experience_months int NOT NULL DEFAULT 0,
 primary_goal varchar(60), weekly_frequency int, session_duration int, limitations text, preferences text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gym_id,cpf)
);
CREATE TABLE IF NOT EXISTS enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT, plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
 starts_on date NOT NULL, ends_on date NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>=0), method varchar(20), notes text,
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','expiring','expired','cancelled')),
 cancelled_at timestamptz, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_on>=starts_on)
);
CREATE TABLE IF NOT EXISTS exercises (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 name varchar(120) NOT NULL, muscle_group varchar(80), equipment varchar(80), difficulty varchar(30), instructions text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gym_id,name)
);
CREATE TABLE IF NOT EXISTS workouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, name varchar(120) NOT NULL,
 objective text, starts_on date, review_on date, notes text, status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workout_exercises (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
 position int NOT NULL DEFAULT 0, sets varchar(30), reps varchar(30), load varchar(30), rest varchar(30), notes text
);
CREATE TABLE IF NOT EXISTS payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT, enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
 amount numeric(12,2) NOT NULL CHECK(amount>0), paid_at timestamptz, due_at timestamptz, method varchar(20) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'paid' CHECK(status IN ('paid','pending','cancelled')), category varchar(30) NOT NULL DEFAULT 'membership',
 reference varchar(120), notes text, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 sku varchar(60), name varchar(160) NOT NULL, category varchar(80), cost numeric(12,2) NOT NULL DEFAULT 0, price numeric(12,2) NOT NULL CHECK(price>=0),
 stock numeric(12,3) NOT NULL DEFAULT 0, min_stock numeric(12,3) NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gym_id,sku), UNIQUE(gym_id,name)
);
CREATE TABLE IF NOT EXISTS services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 name varchar(160) NOT NULL, description text, price numeric(12,2) NOT NULL DEFAULT 0, duration_minutes int, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gym_id,name)
);
CREATE TABLE IF NOT EXISTS sales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid REFERENCES students(id) ON DELETE SET NULL, total numeric(12,2) NOT NULL DEFAULT 0, discount numeric(12,2) NOT NULL DEFAULT 0,
 method varchar(20) NOT NULL, status varchar(20) NOT NULL DEFAULT 'paid', sold_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS sale_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
 product_id uuid REFERENCES products(id) ON DELETE SET NULL, service_id uuid REFERENCES services(id) ON DELETE SET NULL,
 description varchar(200) NOT NULL, quantity numeric(12,3) NOT NULL DEFAULT 1, unit_price numeric(12,2) NOT NULL, total numeric(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS cash_registers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 opened_by uuid REFERENCES users(id), opened_at timestamptz NOT NULL DEFAULT now(), opening_amount numeric(12,2) NOT NULL DEFAULT 0,
 closed_by uuid REFERENCES users(id), closed_at timestamptz, closing_amount numeric(12,2), expected_amount numeric(12,2), difference numeric(12,2), status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 notes text
);
CREATE TABLE IF NOT EXISTS cash_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 register_id uuid NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE, type varchar(20) NOT NULL CHECK(type IN ('sale','payment','supply','withdrawal','adjustment')),
 direction varchar(10) NOT NULL CHECK(direction IN ('in','out')), amount numeric(12,2) NOT NULL CHECK(amount>0), method varchar(20) NOT NULL,
 description varchar(240), reference_id uuid, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS checkins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, method varchar(20) NOT NULL DEFAULT 'manual', confidence numeric(6,5), checked_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS checkins_student_day ON checkins(gym_id,student_id,((checked_at AT TIME ZONE 'America/Sao_Paulo')::date));
CREATE TABLE IF NOT EXISTS face_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, descriptor_encrypted text NOT NULL,
 consent_at timestamptz NOT NULL, revoked_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gym_id,student_id)
);
CREATE TABLE IF NOT EXISTS assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 measured_at date NOT NULL DEFAULT CURRENT_DATE, weight numeric(7,2), height numeric(6,2), body_fat numeric(6,2), muscle_mass numeric(7,2),
 arm numeric(6,2), chest numeric(6,2), waist numeric(6,2), abdomen numeric(6,2), hip numeric(6,2), thigh numeric(6,2), calf numeric(6,2), notes text,
 created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid REFERENCES students(id) ON DELETE SET NULL, professional_id uuid REFERENCES users(id) ON DELETE SET NULL,
 type varchar(30) NOT NULL, title varchar(160) NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, notes text,
 status varchar(20) NOT NULL DEFAULT 'scheduled', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title varchar(160) NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action varchar(80) NOT NULL, entity varchar(80) NOT NULL, entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
-- Compatibilidade com bancos existentes do MultiGym: adiciona campos da versão 2 sem apagar dados.
ALTER TABLE students ADD COLUMN IF NOT EXISTS training_level varchar(30) NOT NULL DEFAULT 'beginner';
ALTER TABLE students ADD COLUMN IF NOT EXISTS training_experience_months int NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS primary_goal varchar(80);
ALTER TABLE students ADD COLUMN IF NOT EXISTS weekly_frequency int;
ALTER TABLE students ADD COLUMN IF NOT EXISTS session_duration int;
ALTER TABLE students ADD COLUMN IF NOT EXISTS limitations text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS preferences text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment varchar(80);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty varchar(30);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'membership';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS method varchar(20) NOT NULL DEFAULT 'manual';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS confidence numeric(6,5);
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
CREATE UNIQUE INDEX IF NOT EXISTS exercises_gym_name ON exercises(gym_id,name);

CREATE INDEX IF NOT EXISTS students_gym_name ON students(gym_id,full_name);
CREATE INDEX IF NOT EXISTS enrollments_gym_end ON enrollments(gym_id,ends_on);
CREATE INDEX IF NOT EXISTS payments_gym_date ON payments(gym_id,paid_at);
CREATE INDEX IF NOT EXISTS checkins_gym_date ON checkins(gym_id,checked_at);
CREATE INDEX IF NOT EXISTS sales_gym_date ON sales(gym_id,sold_at);
CREATE INDEX IF NOT EXISTS cash_gym_status ON cash_registers(gym_id,status);
CREATE INDEX IF NOT EXISTS appointments_gym_date ON appointments(gym_id,starts_at);
CREATE INDEX IF NOT EXISTS audit_gym_date ON audit_logs(gym_id,created_at);
