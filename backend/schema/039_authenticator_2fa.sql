ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_encrypted text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS auth_login_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_login_challenges_expiry_idx ON auth_login_challenges(expires_at) WHERE used_at IS NULL;
