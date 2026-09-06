CREATE TABLE IF NOT EXISTS assistant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assistant varchar(30) NOT NULL CHECK (assistant IN ('nutrigym','personalgym')),
  event_type varchar(60) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS assistant_events_student_idx ON assistant_events(gym_id,student_id,created_at DESC);
