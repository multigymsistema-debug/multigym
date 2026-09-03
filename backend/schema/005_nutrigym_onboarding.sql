ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS focus_areas text;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS motivations text;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS goal_weight_kg numeric(6,2) CHECK (goal_weight_kg IS NULL OR (goal_weight_kg > 0 AND goal_weight_kg <= 500));
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS body_type varchar(40);
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS body_fat_current numeric(5,2) CHECK (body_fat_current IS NULL OR (body_fat_current >= 0 AND body_fat_current <= 100));
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS body_fat_goal numeric(5,2) CHECK (body_fat_goal IS NULL OR (body_fat_goal >= 0 AND body_fat_goal <= 100));
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS discomforts text;
