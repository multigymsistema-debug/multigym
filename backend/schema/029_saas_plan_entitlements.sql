-- Explicit tier definitions for MultiGym SaaS product access.
ALTER TABLE gym_saas_plans ADD COLUMN IF NOT EXISTS tier_key varchar(20);
ALTER TABLE gym_saas_plans ADD COLUMN IF NOT EXISTS user_limit integer;
ALTER TABLE gym_saas_plans ADD COLUMN IF NOT EXISTS blocked_features jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE gym_saas_plans DROP CONSTRAINT IF EXISTS gym_saas_plans_tier_key_check;
ALTER TABLE gym_saas_plans ADD CONSTRAINT gym_saas_plans_tier_key_check CHECK (tier_key IS NULL OR tier_key IN ('basic','essential','premium'));
ALTER TABLE gym_saas_plans DROP CONSTRAINT IF EXISTS gym_saas_plans_user_limit_check;
ALTER TABLE gym_saas_plans ADD CONSTRAINT gym_saas_plans_user_limit_check CHECK (user_limit IS NULL OR user_limit > 0);

-- Migrate plans with recognizable names; leave ambiguous plans unchanged for manual classification.
UPDATE gym_saas_plans SET tier_key='basic', user_limit=2,
 blocked_features='["workouts","products","cash","services","agenda","exercises","online_billing","nutrigym","personalgym"]'::jsonb
WHERE tier_key IS NULL AND (translate(lower(name),'áéíóúâêôãõç','aeiouaeoaoc') LIKE '%basico%' OR lower(name) LIKE '%basic%');
UPDATE gym_saas_plans SET tier_key='essential', user_limit=4, blocked_features='[]'::jsonb
WHERE tier_key IS NULL AND (lower(name) LIKE '%essencial%' OR lower(name) LIKE '%essential%');
UPDATE gym_saas_plans SET tier_key='premium', user_limit=NULL, blocked_features='[]'::jsonb
WHERE tier_key IS NULL AND (lower(name) LIKE '%premium%');
