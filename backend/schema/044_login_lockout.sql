ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0 CHECK(failed_login_attempts>=0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0 CHECK(failed_login_attempts>=0);
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE master_support_tickets ADD COLUMN IF NOT EXISTS locked_email varchar(254);
ALTER TABLE master_support_tickets ADD COLUMN IF NOT EXISTS locked_account_type varchar(16) CHECK(locked_account_type IS NULL OR locked_account_type IN ('staff','student'));
