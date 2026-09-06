ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closing_by_method jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS expected_by_method jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS difference_by_method jsonb NOT NULL DEFAULT '{}'::jsonb;
