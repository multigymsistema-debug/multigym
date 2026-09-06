CREATE INDEX IF NOT EXISTS students_gym_status_name_idx ON students(gym_id,status,full_name);
CREATE INDEX IF NOT EXISTS enrollments_gym_ends_status_idx ON enrollments(gym_id,ends_on,status);
CREATE INDEX IF NOT EXISTS payments_gym_status_created_idx ON payments(gym_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS sales_gym_sold_idx ON sales(gym_id,sold_at DESC);
CREATE INDEX IF NOT EXISTS cash_movements_register_created_idx ON cash_movements(register_id,created_at DESC);
CREATE INDEX IF NOT EXISTS appointments_gym_starts_idx ON appointments(gym_id,starts_at);
CREATE INDEX IF NOT EXISTS checkins_gym_checked_idx ON checkins(gym_id,checked_at DESC);
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  feature varchar(40) NOT NULL,
  requests int NOT NULL DEFAULT 0 CHECK(requests>=0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(gym_id,usage_date,feature)
);
