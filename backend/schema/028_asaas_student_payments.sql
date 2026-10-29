CREATE TABLE IF NOT EXISTS asaas_student_customers (
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  customer_id varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(gym_id,student_id)
);
CREATE TABLE IF NOT EXISTS asaas_student_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE UNIQUE,
  asaas_payment_id varchar(80) UNIQUE,
  customer_id varchar(80) NOT NULL,
  external_reference varchar(120) NOT NULL UNIQUE,
  status varchar(40) NOT NULL DEFAULT 'PENDING',
  invoice_url text,
  pix_copy_paste text,
  pix_qr_code_base64 text,
  pix_expiration timestamptz,
  raw_response jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asaas_student_payments_gym_created_idx ON asaas_student_payments(gym_id,created_at DESC);
CREATE TABLE IF NOT EXISTS asaas_webhook_events (
  event_id varchar(160) PRIMARY KEY,
  event_type varchar(80) NOT NULL,
  asaas_payment_id varchar(80),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS asaas_webhook_events_payment_idx ON asaas_webhook_events(asaas_payment_id);
