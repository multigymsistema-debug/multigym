ALTER TABLE payments ADD COLUMN IF NOT EXISTS membership_period_start date;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS membership_period_end date;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE asaas_student_payments ADD COLUMN IF NOT EXISTS payment_method varchar(12);
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='asaas_student_payments_payment_method_check') THEN ALTER TABLE asaas_student_payments ADD CONSTRAINT asaas_student_payments_payment_method_check CHECK(payment_method IS NULL OR payment_method IN ('pix','card')); END IF; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS payments_membership_cycle_open_unique_idx ON payments(gym_id,student_id,enrollment_id,membership_period_start) WHERE category='membership' AND enrollment_id IS NOT NULL AND membership_period_start IS NOT NULL AND status='pending';
CREATE INDEX IF NOT EXISTS payments_membership_student_due_idx ON payments(gym_id,student_id,due_at) WHERE category='membership' AND status='pending';
