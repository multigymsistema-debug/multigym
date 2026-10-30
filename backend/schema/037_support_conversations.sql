CREATE TABLE IF NOT EXISTS master_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES master_support_tickets(id) ON DELETE CASCADE,
  author_type varchar(12) NOT NULL CHECK(author_type IN ('gym','master')),
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_master_id uuid REFERENCES master_accounts(id) ON DELETE SET NULL,
  body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS master_support_messages_ticket_idx ON master_support_messages(ticket_id,created_at);
ALTER TABLE master_support_tickets ADD COLUMN IF NOT EXISTS gym_seen_at timestamptz;
ALTER TABLE master_support_tickets ADD COLUMN IF NOT EXISTS master_seen_at timestamptz;
