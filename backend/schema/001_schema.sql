CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin','instructor','reception'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE record_status AS ENUM ('active','inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enrollment_status AS ENUM ('active','expiring','expired','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash','pix','card','transfer','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('paid','pending','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appointment_type AS ENUM ('assessment','personal','class','meeting','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS gyms(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL, slug varchar(100) UNIQUE NOT NULL,
 logo_url text, cnpj varchar(18), phone varchar(30), email varchar(254), address jsonb NOT NULL DEFAULT '{}',
 timezone varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo', active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 name varchar(160) NOT NULL, email varchar(254) NOT NULL, password_hash text NOT NULL,
 role user_role NOT NULL DEFAULT 'reception', status record_status NOT NULL DEFAULT 'active',
 last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(gym_id,email)
);
CREATE TABLE IF NOT EXISTS sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, token_hash text UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS password_reset_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plans(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 name varchar(120) NOT NULL, price numeric(12,2) NOT NULL CHECK(price>=0), duration_days int NOT NULL CHECK(duration_days>0),
 status record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(gym_id,name)
);
CREATE TABLE IF NOT EXISTS students(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 full_name varchar(160) NOT NULL, cpf varchar(14), birth_date date, gender varchar(30), phone varchar(30),
 email varchar(254), address jsonb NOT NULL DEFAULT '{}', emergency_contact jsonb NOT NULL DEFAULT '{}',
 notes text, photo_url text, status record_status NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(gym_id,cpf)
);
CREATE TABLE IF NOT EXISTS enrollments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT, plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
 starts_on date NOT NULL, ends_on date NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>=0),
 method payment_method, notes text, status enrollment_status NOT NULL DEFAULT 'active',
 cancelled_at timestamptz, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_on>=starts_on)
);
CREATE TABLE IF NOT EXISTS exercises(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 name varchar(120) NOT NULL, muscle_group varchar(80), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(gym_id,name)
);
CREATE TABLE IF NOT EXISTS workouts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, name varchar(120) NOT NULL,
 objective text, starts_on date, review_on date, notes text, status record_status NOT NULL DEFAULT 'active',
 created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workout_exercises(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, exercise_id uuid NOT NULL REFERENCES exercises(id),
 position int NOT NULL DEFAULT 0, sets varchar(30), reps varchar(30), load varchar(30), rest varchar(30), notes text,
 UNIQUE(workout_id,position)
);
CREATE TABLE IF NOT EXISTS payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT, enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
 amount numeric(12,2) NOT NULL CHECK(amount>0), paid_at timestamptz, method payment_method NOT NULL,
 status payment_status NOT NULL DEFAULT 'paid', reference varchar(120), notes text,
 created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS appointments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid REFERENCES students(id) ON DELETE SET NULL, professional_id uuid REFERENCES users(id) ON DELETE SET NULL,
 type appointment_type NOT NULL, title varchar(160) NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS notifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, title varchar(160) NOT NULL, body text NOT NULL,
 read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL, action varchar(80) NOT NULL, entity varchar(80) NOT NULL,
 entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_gym_name ON students(gym_id,full_name);
CREATE INDEX IF NOT EXISTS enrollments_gym_end ON enrollments(gym_id,ends_on);
CREATE INDEX IF NOT EXISTS payments_gym_date ON payments(gym_id,paid_at);
CREATE INDEX IF NOT EXISTS appointments_gym_date ON appointments(gym_id,starts_at);
CREATE INDEX IF NOT EXISTS sessions_token ON sessions(token_hash) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS exercises_gym_name ON exercises(gym_id,name);

INSERT INTO exercises(gym_id,name,muscle_group)
SELECT g.id,v.name,v.muscle FROM gyms g CROSS JOIN (VALUES
('Supino reto','Peito'),('Supino inclinado','Peito'),('Crucifixo','Peito'),('Puxada frontal','Costas'),
('Remada baixa','Costas'),('Agachamento livre','Pernas'),('Leg press','Pernas'),('Cadeira extensora','Pernas'),
('Mesa flexora','Pernas'),('Elevação lateral','Ombros'),('Desenvolvimento','Ombros'),('Rosca direta','Bíceps'),
('Tríceps pulley','Tríceps'),('Abdominal','Abdômen')
) v(name,muscle) ON CONFLICT(gym_id,name) DO NOTHING;

CREATE TABLE IF NOT EXISTS checkins(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS checkins_student_day ON checkins(gym_id,student_id,((checked_at AT TIME ZONE 'UTC')::date));
CREATE INDEX IF NOT EXISTS checkins_gym_date ON checkins(gym_id,checked_at);
