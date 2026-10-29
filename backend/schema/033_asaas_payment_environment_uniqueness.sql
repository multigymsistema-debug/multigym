-- A local invoice may have one Asaas mapping per environment. Preserve all existing
-- rows (including production mappings); do not rewrite their provider identifiers.
ALTER TABLE asaas_student_payments
  DROP CONSTRAINT IF EXISTS asaas_student_payments_payment_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'asaas_student_payments'::regclass
      AND conname = 'asaas_student_payments_payment_environment_key'
  ) THEN
    ALTER TABLE asaas_student_payments
      ADD CONSTRAINT asaas_student_payments_payment_environment_key
      UNIQUE (payment_id, environment);
  END IF;
END $$;
