CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL, company text NOT NULL,
  password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('dealer', 'staff')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invites (
  hash text PRIMARY KEY, role text NOT NULL CHECK (role IN ('dealer', 'staff')), email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
CREATE TABLE IF NOT EXISTS sessions (
  hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at);
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS requests (
  id text PRIMARY KEY, dealer_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'Submitted', quote jsonb, tracking text, created_at timestamptz NOT NULL DEFAULT now(),
  history jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS requests_dealer ON requests (dealer_id, created_at DESC);
