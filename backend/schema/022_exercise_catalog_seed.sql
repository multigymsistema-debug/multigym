CREATE TABLE IF NOT EXISTS gym_exercise_catalog_versions (
  gym_id uuid PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
