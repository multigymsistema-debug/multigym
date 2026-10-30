-- SaaS checkout state is distinct from the currently effective entitlement.
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_pending_plan_id uuid REFERENCES gym_saas_plans(id) ON DELETE SET NULL;
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_checkout_status text;
ALTER TABLE gym_saas_subscriptions DROP CONSTRAINT IF EXISTS gym_saas_subscriptions_asaas_checkout_status_check;
ALTER TABLE gym_saas_subscriptions ADD CONSTRAINT gym_saas_subscriptions_asaas_checkout_status_check CHECK(asaas_checkout_status IS NULL OR asaas_checkout_status IN ('PENDING','PAYMENT_PENDING','PAID','CANCELED','EXPIRED'));
