ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_source varchar(30) NOT NULL DEFAULT 'admin';

CREATE TABLE IF NOT EXISTS pre_enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 full_name varchar(160) NOT NULL,
 email varchar(254),
 phone varchar(30),
 cpf varchar(14),
 birth_date date,
 primary_goal varchar(60),
 training_level varchar(30),
 message text,
 source varchar(40) NOT NULL DEFAULT 'social_link',
 status varchar(20) NOT NULL DEFAULT 'pending',
 reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pre_enrollments_gym_status_idx ON pre_enrollments(gym_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS pre_enrollments_student_idx ON pre_enrollments(student_id,created_at DESC);
