CREATE TABLE IF NOT EXISTS gym_online_billing_settings (
  gym_id uuid PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mercadopago_student_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
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
  UNIQUE(payment_id)
);
CREATE INDEX IF NOT EXISTS mercadopago_student_orders_gym_created_idx ON mercadopago_student_orders(gym_id,created_at DESC);
CREATE TABLE IF NOT EXISTS gym_monthly_wallet_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK(amount>0),
  pix_key text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','rejected')),
  requested_by uuid REFERENCES users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES master_accounts(id),
  resolved_at timestamptz,
  master_note text
);
CREATE INDEX IF NOT EXISTS gym_monthly_wallet_withdrawals_status_idx ON gym_monthly_wallet_withdrawals(status,requested_at DESC);
