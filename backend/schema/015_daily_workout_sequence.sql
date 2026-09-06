ALTER TABLE workouts ADD COLUMN IF NOT EXISTS routine_day integer;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS routine_cycle integer;
CREATE INDEX IF NOT EXISTS workouts_student_routine_idx ON workouts(gym_id,student_id,routine_cycle,routine_day,starts_on);

WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY gym_id, student_id ORDER BY COALESCE(starts_on, CURRENT_DATE), created_at, id) AS day_number
  FROM workouts
  WHERE routine_day IS NULL
)
UPDATE workouts w
SET routine_day = ((ranked.day_number - 1) % 6) + 1,
    routine_cycle = 6
FROM ranked
WHERE w.id = ranked.id;
