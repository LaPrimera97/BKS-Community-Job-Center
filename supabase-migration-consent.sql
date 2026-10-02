alter table applications add column if not exists consent_at timestamptz;
alter table applications add column if not exists consent_version text;
