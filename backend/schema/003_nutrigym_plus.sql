-- Extended NutriGym context: routine, preferences, plan history and editable habits.
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS wake_time time;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS sleep_time time;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS work_study varchar(160);
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS training_time time;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS meals_per_day int CHECK (meals_per_day IS NULL OR meals_per_day BETWEEN 1 AND 12);
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS cooking_time varchar(30);
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS food_out_frequency varchar(30);
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS budget_level varchar(30);
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS preferences text;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS restrictions text;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS allergies text;
ALTER TABLE nutrigym_profiles ADD COLUMN IF NOT EXISTS dislikes text;

CREATE TABLE IF NOT EXISTS nutrigym_daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  mood varchar(20),
  hunger int CHECK (hunger IS NULL OR hunger BETWEEN 0 AND 10),
  energy int CHECK (energy IS NULL OR energy BETWEEN 0 AND 10),
  night_hunger int CHECK (night_hunger IS NULL OR night_hunger BETWEEN 0 AND 10),
  sleep_quality int CHECK (sleep_quality IS NULL OR sleep_quality BETWEEN 0 AND 10),
  notes varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gym_id, student_id, checkin_date),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutrigym_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  memory_key varchar(80) NOT NULL,
  memory_value varchar(500) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutrigym_shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category varchar(40) NOT NULL DEFAULT 'Outros',
  item varchar(160) NOT NULL,
  quantity varchar(60),
  purchased boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutrigym_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  version int NOT NULL CHECK(version > 0),
  title varchar(160) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  professional_name varchar(160),
  content jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  UNIQUE(gym_id, student_id, version),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS nutrigym_daily_checkins_student_idx ON nutrigym_daily_checkins(gym_id,student_id,checkin_date DESC);
CREATE INDEX IF NOT EXISTS nutrigym_memories_student_idx ON nutrigym_memories(gym_id,student_id,active);
CREATE INDEX IF NOT EXISTS nutrigym_shopping_student_idx ON nutrigym_shopping_items(gym_id,student_id,purchased);
CREATE INDEX IF NOT EXISTS nutrigym_plan_current_idx ON nutrigym_plan_versions(gym_id,student_id,status,version DESC);
