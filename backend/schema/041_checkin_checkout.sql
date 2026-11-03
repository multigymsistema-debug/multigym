ALTER TABLE checkins ADD COLUMN IF NOT EXISTS checkout_at timestamptz;
CREATE INDEX IF NOT EXISTS checkins_gym_checkout_pending_idx ON checkins(gym_id,checked_at DESC) WHERE checkout_at IS NULL;
