-- Grant existing academies a single full-access ten-day trial when first deployed.
ALTER TABLE gym_saas_subscriptions ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE gym_saas_subscriptions DROP CONSTRAINT IF EXISTS gym_saas_subscriptions_status_check;
ALTER TABLE gym_saas_subscriptions ADD CONSTRAINT gym_saas_subscriptions_status_check CHECK(status IN ('pending','trial','active','manual','past_due','cancelled','grandfathered'));
ALTER TABLE gym_saas_subscriptions DROP CONSTRAINT IF EXISTS gym_saas_subscriptions_source_check;
ALTER TABLE gym_saas_subscriptions ADD CONSTRAINT gym_saas_subscriptions_source_check CHECK(source IN ('manual','mercadopago','new_registration','grandfathered','trial'));
UPDATE gym_saas_subscriptions SET status='trial',source='trial',trial_started_at=now(),expires_at=now()+interval '10 days',updated_at=now() WHERE trial_started_at IS NULL AND status IN ('grandfathered','pending');
