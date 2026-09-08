ALTER TABLE exercises ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS illustration_url text;
CREATE INDEX IF NOT EXISTS exercises_gym_active_idx ON exercises(gym_id,active,name);
