ALTER TABLE repositories ADD COLUMN public_checked_at timestamptz;
ALTER TABLE repositories ADD COLUMN sync_started_at timestamptz NOT NULL DEFAULT '-infinity';
