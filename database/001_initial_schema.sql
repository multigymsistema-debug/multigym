CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE, logo_url text, cnpj varchar(18), phone varchar(30), email varchar(254),
  address jsonb NOT NULL DEFAULT '{}'::jsonb, timezone varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TYPE user_role AS ENUM ('admin','instructor','reception');
CREATE TYPE record_status AS ENUM ('active','inactive');
CREATE TYPE enrollment_status AS ENUM ('active','expiring','expired','cancelled');
CREATE TYPE payment_method AS ENUM ('cash','pix','card','transfer','other');
CREATE TYPE payment_status AS ENUM ('paid','pending','cancelled');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), name varchar(160) NOT NULL,
  email varchar(254) NOT NULL, password_hash text NOT NULL, role user_role NOT NULL DEFAULT 'reception',
  status record_status NOT NULL DEFAULT 'active', last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, email)
);
CREATE INDEX users_gym_idx ON users(gym_id);
CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), name varchar(120) NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0), duration_days integer NOT NULL CHECK (duration_days > 0),
  status record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (gym_id, name)
);
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), full_name varchar(160) NOT NULL,
  cpf varchar(14), birth_date date, gender varchar(30), phone varchar(30), email varchar(254), address jsonb NOT NULL DEFAULT '{}'::jsonb,
  emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb, notes text, photo_url text, status record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (gym_id, cpf)
);
CREATE INDEX students_gym_name_idx ON students(gym_id, full_name);
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), student_id uuid NOT NULL REFERENCES students(id), plan_id uuid NOT NULL REFERENCES plans(id),
  starts_on date NOT NULL, ends_on date NOT NULL, amount numeric(12,2) NOT NULL CHECK (amount >= 0), method payment_method, notes text,
  status enrollment_status NOT NULL DEFAULT 'active', cancelled_at timestamptz, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_on >= starts_on)
);
CREATE INDEX enrollments_gym_status_end_idx ON enrollments(gym_id, status, ends_on);
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), student_id uuid NOT NULL REFERENCES students(id),
  name varchar(120) NOT NULL, objective text, starts_on date, review_on date, notes text, status record_status NOT NULL DEFAULT 'active', created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), name varchar(120) NOT NULL, muscle_group varchar(80), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, exercise_id uuid NOT NULL REFERENCES exercises(id),
  position integer NOT NULL CHECK (position >= 0), sets varchar(30), reps varchar(30), load varchar(30), rest varchar(30), notes text, UNIQUE(workout_id, position)
);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), student_id uuid NOT NULL REFERENCES students(id), enrollment_id uuid REFERENCES enrollments(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0), paid_at timestamptz, method payment_method NOT NULL, status payment_status NOT NULL DEFAULT 'paid', reference varchar(120), notes text, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_gym_date_idx ON payments(gym_id, paid_at);
CREATE TYPE appointment_type AS ENUM ('assessment','personal','class','meeting','other');
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), student_id uuid REFERENCES students(id), professional_id uuid REFERENCES users(id),
  type appointment_type NOT NULL, title varchar(160) NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at > starts_at)
);
CREATE INDEX appointments_gym_start_idx ON appointments(gym_id, starts_at);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), user_id uuid NOT NULL REFERENCES users(id), title varchar(160) NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id), user_id uuid REFERENCES users(id), action varchar(80) NOT NULL, entity varchar(80) NOT NULL, entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

-- O backend define este valor dentro da transação, depois de autenticar o usuário.
CREATE OR REPLACE FUNCTION current_gym_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.current_gym_id', true), '')::uuid $$;
ALTER TABLE users ENABLE ROW LEVEL SECURITY; ALTER TABLE plans ENABLE ROW LEVEL SECURITY; ALTER TABLE students ENABLE ROW LEVEL SECURITY; ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY; ALTER TABLE workouts ENABLE ROW LEVEL SECURITY; ALTER TABLE exercises ENABLE ROW LEVEL SECURITY; ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY; ALTER TABLE payments ENABLE ROW LEVEL SECURITY; ALTER TABLE appointments ENABLE ROW LEVEL SECURITY; ALTER TABLE notifications ENABLE ROW LEVEL SECURITY; ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['users','plans','students','enrollments','workouts','exercises','workout_exercises','payments','appointments','notifications','audit_logs'] LOOP EXECUTE format('CREATE POLICY %I_tenant_isolation ON %I USING (gym_id = current_gym_id()) WITH CHECK (gym_id = current_gym_id())', t, t); END LOOP; END $$;
