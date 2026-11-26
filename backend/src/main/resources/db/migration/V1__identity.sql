DO $$ BEGIN
 IF current_database() <> 'openscout_dev' THEN RAISE EXCEPTION 'Expected isolated development database'; END IF;
END $$;
CREATE TABLE accounts (
 id uuid PRIMARY KEY, name varchar(100) NOT NULL, email varchar(254) UNIQUE NOT NULL,
 password_hash varchar(60) NOT NULL
);
CREATE TABLE login_sessions (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), expires_at timestamptz NOT NULL
);
CREATE INDEX login_sessions_expiry ON login_sessions(expires_at);
