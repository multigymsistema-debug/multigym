ALTER TABLE gyms ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

UPDATE gyms g
SET owner_user_id = COALESCE(
  (SELECT u.id FROM users u WHERE u.gym_id=g.id
   AND lower(u.email)=lower(COALESCE(g.email,'')) ORDER BY u.created_at,u.id LIMIT 1),
  (SELECT u.id FROM users u WHERE u.gym_id=g.id AND u.role='admin' ORDER BY u.created_at,u.id LIMIT 1)
)
WHERE g.owner_user_id IS NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.gym_id=g.id AND u.role='admin');

CREATE INDEX IF NOT EXISTS gyms_owner_user_idx ON gyms(owner_user_id);
