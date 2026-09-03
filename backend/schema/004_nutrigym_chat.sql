CREATE TABLE IF NOT EXISTS nutrigym_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL CHECK(role IN ('user','assistant')),
  content varchar(3000) NOT NULL,
  has_image boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS nutrigym_chat_student_idx ON nutrigym_chat_messages(gym_id,student_id,created_at DESC);
