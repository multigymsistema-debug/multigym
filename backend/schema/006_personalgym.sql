CREATE TABLE IF NOT EXISTS personal_gym_chat_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 role varchar(20) NOT NULL CHECK(role IN ('user','assistant')),
 content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS personal_gym_chat_lookup ON personal_gym_chat_messages(gym_id,student_id,created_at DESC);
