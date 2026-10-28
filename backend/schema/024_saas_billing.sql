-- Billing for MultiGym SaaS is intentionally separate from member plans.
CREATE TABLE IF NOT EXISTS gym_saas_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  monthly_price numeric(12,2) NOT NULL CHECK(monthly_price > 0),
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gym_saas_subscriptions (
  gym_id uuid PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES gym_saas_plans(id) ON DELETE SET NULL,
  status varchar(24) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','manual','past_due','cancelled','grandfathered')),
  source varchar(24) NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','mercadopago','new_registration','grandfathered')),
  mp_preapproval_id text UNIQUE,
  mp_payer_email varchar(254),
  expires_at timestamptz,
  manual_payment_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Existing academies stay online during migration; the Master can transition them individually.
INSERT INTO gym_saas_subscriptions(gym_id,status,source)
SELECT id,'grandfathered','grandfathered' FROM gyms
ON CONFLICT(gym_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS gym_saas_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  provider_event_id text NOT NULL UNIQUE,
  event_type varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
