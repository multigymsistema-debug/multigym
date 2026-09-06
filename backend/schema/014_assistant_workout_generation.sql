ALTER TABLE workouts ADD COLUMN IF NOT EXISTS source varchar(30) NOT NULL DEFAULT 'professional';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS generated_by_assistant boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS workouts_student_source_idx ON workouts(gym_id,student_id,source,starts_on DESC);
