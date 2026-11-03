CREATE TABLE IF NOT EXISTS multigym_checkout_sessions (
 token_hash text PRIMARY KEY,
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 kind varchar(20) NOT NULL CHECK (kind IN ('payment','subscription')),
 payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
 plan_id uuid REFERENCES gym_saas_plans(id),
 amount numeric(12,2) NOT NULL CHECK (amount > 0),
 metadata jsonb NOT NULL DEFAULT '{}',
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','paid','cancelled')),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((kind='payment' AND payment_id IS NOT NULL) OR (kind='subscription' AND plan_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS multigym_checkout_sessions_gym_idx ON multigym_checkout_sessions(gym_id,created_at DESC);
CREATE INDEX IF NOT EXISTS multigym_checkout_sessions_expiry_idx ON multigym_checkout_sessions(expires_at);
