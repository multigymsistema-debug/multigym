-- NutriGym module: real, tenant-scoped student nutrition data.
-- Applied after the core schema and the legacy student portal tables.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_gym_id_id_key'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_gym_id_id_key UNIQUE (gym_id, id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS nutrigym_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  objective varchar(60) NOT NULL,
  weight_kg numeric(6,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 500),
  height_cm numeric(6,2) NOT NULL CHECK (height_cm >= 30 AND height_cm <= 250),
  age int NOT NULL CHECK (age >= 10 AND age <= 120),
  sex varchar(20),
  activity_level varchar(30) NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary','light','moderate','high','athlete')),
  calories_goal numeric(7,2) CHECK (calories_goal IS NULL OR (calories_goal >= 500 AND calories_goal <= 10000)),
  protein_goal_g numeric(7,2) CHECK (protein_goal_g IS NULL OR (protein_goal_g >= 0 AND protein_goal_g <= 1000)),
  carbs_goal_g numeric(7,2) CHECK (carbs_goal_g IS NULL OR (carbs_goal_g >= 0 AND carbs_goal_g <= 1500)),
  fat_goal_g numeric(7,2) CHECK (fat_goal_g IS NULL OR (fat_goal_g >= 0 AND fat_goal_g <= 500)),
  water_goal_ml int NOT NULL DEFAULT 2500 CHECK (water_goal_ml >= 250 AND water_goal_ml <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, student_id),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutrigym_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  meal_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_time time,
  meal_type varchar(40) NOT NULL,
  description varchar(500) NOT NULL,
  calories numeric(7,2) NOT NULL DEFAULT 0 CHECK (calories >= 0 AND calories <= 20000),
  protein_g numeric(7,2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0 AND protein_g <= 1000),
  carbs_g numeric(7,2) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0 AND carbs_g <= 1500),
  fat_g numeric(7,2) NOT NULL DEFAULT 0 CHECK (fat_g >= 0 AND fat_g <= 500),
  notes varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutrigym_hydration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hydration_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_ml int NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 10000),
  hydration_time time NOT NULL DEFAULT LOCALTIME,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutrigym_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  goal_type varchar(40) NOT NULL,
  value numeric(10,2) NOT NULL CHECK (value >= 0),
  unit varchar(30) NOT NULL,
  period varchar(30) NOT NULL DEFAULT 'daily',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, student_id, goal_type),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutrigym_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric(6,2) CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 500)),
  measurements jsonb NOT NULL DEFAULT '{}',
  notes varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (gym_id, student_id) REFERENCES students(gym_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS nutrigym_meals_student_date_idx ON nutrigym_meals (gym_id, student_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS nutrigym_hydration_student_date_idx ON nutrigym_hydration (gym_id, student_id, hydration_date DESC);
CREATE INDEX IF NOT EXISTS nutrigym_checkins_student_date_idx ON nutrigym_checkins (gym_id, student_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS nutrigym_goals_student_active_idx ON nutrigym_goals (gym_id, student_id, active);
