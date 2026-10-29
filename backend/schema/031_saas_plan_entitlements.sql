ALTER TABLE gym_saas_plans ADD COLUMN IF NOT EXISTS plan_code varchar(24);
ALTER TABLE gym_saas_plans ADD COLUMN IF NOT EXISTS max_users integer;
UPDATE gym_saas_plans SET plan_code=CASE
 WHEN lower(name) LIKE '%premium%' THEN 'premium'
 WHEN lower(name) LIKE '%essencial%' OR lower(name) LIKE '%essential%' THEN 'essential'
 WHEN lower(name) LIKE '%básico%' OR lower(name) LIKE '%basico%' OR lower(name) LIKE '%basic%' THEN 'basic'
 ELSE 'basic' END
WHERE plan_code IS NULL;
UPDATE gym_saas_plans SET max_users=CASE WHEN plan_code='basic' THEN 2 WHEN plan_code='essential' THEN 4 ELSE NULL END;
ALTER TABLE gym_saas_plans DROP CONSTRAINT IF EXISTS gym_saas_plans_plan_code_check;
ALTER TABLE gym_saas_plans ADD CONSTRAINT gym_saas_plans_plan_code_check CHECK(plan_code IN ('basic','essential','premium'));
ALTER TABLE gym_saas_plans DROP CONSTRAINT IF EXISTS gym_saas_plans_max_users_check;
ALTER TABLE gym_saas_plans ADD CONSTRAINT gym_saas_plans_max_users_check CHECK(max_users IS NULL OR max_users > 0);
