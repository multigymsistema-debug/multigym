CREATE SEQUENCE IF NOT EXISTS rps_receipt_number_seq;
CREATE TABLE IF NOT EXISTS financial_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 receipt_number bigint NOT NULL DEFAULT nextval('rps_receipt_number_seq'),
 operation_type varchar(30) NOT NULL,
 payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
 enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
 sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
 amount numeric(12,2) NOT NULL DEFAULT 0,
 status varchar(20) NOT NULL DEFAULT 'issued',
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(gym_id,receipt_number)
);
CREATE INDEX IF NOT EXISTS financial_receipts_gym_date_idx ON financial_receipts(gym_id,created_at DESC);
