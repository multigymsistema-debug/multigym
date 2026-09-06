CREATE TABLE IF NOT EXISTS assistant_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assistant varchar(30) NOT NULL CHECK (assistant IN ('nutrigym','personalgym','shared')),
  memory_key varchar(80) NOT NULL,
  memory_value varchar(500) NOT NULL,
  source varchar(30) NOT NULL DEFAULT 'explicit_student',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE,
  UNIQUE(gym_id,student_id,assistant,memory_key)
);
CREATE INDEX IF NOT EXISTS assistant_memories_student_idx ON assistant_memories(gym_id,student_id,assistant,active,updated_at DESC);
CREATE TABLE IF NOT EXISTS assistant_conversation_state (
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assistant varchar(30) NOT NULL CHECK (assistant IN ('nutrigym','personalgym')),
  summary varchar(1800) NOT NULL DEFAULT '',
  current_intent varchar(60),
  current_topic varchar(160),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(gym_id,student_id,assistant),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);
