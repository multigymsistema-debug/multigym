CREATE TABLE IF NOT EXISTS master_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid REFERENCES gyms(id) ON DELETE SET NULL,
  gym_name varchar(160) NOT NULL,
  subject varchar(160) NOT NULL,
  description text NOT NULL,
  priority varchar(12) NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  status varchar(16) NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
  master_note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES master_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES master_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS master_support_tickets_status_idx ON master_support_tickets(status,priority,updated_at DESC);
