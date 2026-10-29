ALTER TABLE asaas_student_customers ADD COLUMN IF NOT EXISTS environment varchar(20) NOT NULL DEFAULT 'sandbox';
ALTER TABLE asaas_student_customers DROP CONSTRAINT IF EXISTS asaas_student_customers_pkey;
ALTER TABLE asaas_student_customers ADD CONSTRAINT asaas_student_customers_pkey PRIMARY KEY (gym_id, student_id, environment);
ALTER TABLE asaas_student_payments ADD COLUMN IF NOT EXISTS environment varchar(20) NOT NULL DEFAULT 'sandbox';
CREATE INDEX IF NOT EXISTS asaas_student_payments_env_gym_student_idx ON asaas_student_payments(environment,gym_id,student_id,created_at DESC);
