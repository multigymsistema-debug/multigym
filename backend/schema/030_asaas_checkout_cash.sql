ALTER TABLE asaas_student_payments ALTER COLUMN enrollment_id DROP NOT NULL;
ALTER TABLE asaas_student_payments ADD COLUMN IF NOT EXISTS cash_register_id uuid REFERENCES cash_registers(id) ON DELETE SET NULL;
