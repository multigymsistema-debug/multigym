-- Add Asaas recurring platform subscriptions without rewriting legacy MP references.
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_checkout_id text;
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id text;
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id text;
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_external_reference text;
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_checkout_url text;
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_environment varchar(20);
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS asaas_amount numeric(12,2);
-- Keep legacy source values intact; do not impose a new enum on historic rows.
ALTER TABLE gym_saas_subscriptions DROP CONSTRAINT IF EXISTS gym_saas_subscriptions_source_check;
ALTER TABLE gym_saas_subscriptions DROP CONSTRAINT IF EXISTS gym_saas_subscriptions_asaas_environment_check;
ALTER TABLE gym_saas_subscriptions ADD CONSTRAINT gym_saas_subscriptions_asaas_environment_check CHECK(asaas_environment IS NULL OR asaas_environment IN ('sandbox','production'));
CREATE UNIQUE INDEX IF NOT EXISTS gym_saas_subscriptions_asaas_checkout_environment_uq ON gym_saas_subscriptions(asaas_checkout_id,asaas_environment) WHERE asaas_checkout_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gym_saas_subscriptions_asaas_subscription_environment_uq ON gym_saas_subscriptions(asaas_subscription_id,asaas_environment) WHERE asaas_subscription_id IS NOT NULL;
