CREATE TABLE IF NOT EXISTS financial_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  register_id uuid NOT NULL REFERENCES cash_registers(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
  sale_id uuid REFERENCES sales(id) ON DELETE RESTRICT,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK(amount>0),
  reason varchar(500),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS financial_refund_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id uuid NOT NULL REFERENCES financial_refunds(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL CHECK(quantity>0),
  amount numeric(12,2) NOT NULL CHECK(amount>0)
);
CREATE INDEX IF NOT EXISTS financial_refunds_gym_created_idx ON financial_refunds(gym_id,created_at DESC);
CREATE INDEX IF NOT EXISTS financial_refunds_sale_idx ON financial_refunds(sale_id);
CREATE INDEX IF NOT EXISTS financial_refunds_payment_idx ON financial_refunds(payment_id);
