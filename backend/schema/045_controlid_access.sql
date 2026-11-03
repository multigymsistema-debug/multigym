CREATE TABLE IF NOT EXISTS gym_access_control_integrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 provider varchar(40) NOT NULL CHECK(provider IN ('controlid')), device_id varchar(64) NOT NULL,
 device_name varchar(120) NOT NULL, entry_direction varchar(20) NOT NULL CHECK(entry_direction IN ('clockwise','anticlockwise')),
 facial_identifier_id varchar(64), token_hash text NOT NULL UNIQUE, token_encrypted text NOT NULL,
 enabled boolean NOT NULL DEFAULT true, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(gym_id,provider,device_id)
);
CREATE TABLE IF NOT EXISTS gym_access_control_users (
 integration_id uuid NOT NULL REFERENCES gym_access_control_integrations(id) ON DELETE CASCADE,
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, external_user_id varchar(64) NOT NULL,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(integration_id,external_user_id), UNIQUE(integration_id,student_id)
);
CREATE TABLE IF NOT EXISTS gym_access_control_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), integration_id uuid NOT NULL REFERENCES gym_access_control_integrations(id) ON DELETE CASCADE,
 gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, external_event_id varchar(120), external_user_id varchar(64),
 student_id uuid REFERENCES students(id) ON DELETE SET NULL, event_type varchar(32) NOT NULL, outcome varchar(32) NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL DEFAULT '{}', decision jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gym_access_control_events_external_unique ON gym_access_control_events(integration_id,external_event_id) WHERE external_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gym_access_control_events_gym_created_idx ON gym_access_control_events(gym_id,created_at DESC);
