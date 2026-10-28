ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check CHECK(status IN ('active','expiring','expired','cancelled','pending'));
CREATE TABLE IF NOT EXISTS mercadopago_enrollment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  order_id varchar(100) NOT NULL UNIQUE,
  status varchar(40) NOT NULL DEFAULT 'action_required',
  ticket_url text,
  qr_code text,
  qr_code_base64 text,
  raw_response jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id),
  UNIQUE(payment_id)
);
CREATE INDEX IF NOT EXISTS mercadopago_enrollment_orders_gym_created_idx
  ON mercadopago_enrollment_orders(gym_id,created_at DESC);
