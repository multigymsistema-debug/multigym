CREATE TABLE IF NOT EXISTS gym_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title varchar(140),
  body text,
  image_data text,
  status varchar(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NULLIF(trim(COALESCE(title,'')), '') IS NOT NULL OR NULLIF(trim(COALESCE(body,'')), '') IS NOT NULL OR image_data IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS gym_announcements_lookup_idx ON gym_announcements(gym_id,status,published_at DESC);
