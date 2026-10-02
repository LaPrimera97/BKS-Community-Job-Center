alter table applications add column if not exists user_email text;
alter table application_events add column if not exists user_email text;

update applications set email = lower(email) where email <> lower(email);
update application_events set applicant_email = lower(applicant_email) where applicant_email <> lower(applicant_email);

update applications a
set user_email = lower(a.email)
from users u
where a.user_email is null
  and a.email <> ''
  and lower(u.email) = lower(a.email);

update application_events e
set user_email = a.user_email
from applications a
where e.user_email is null
  and a.user_email is not null
  and lower(e.applicant_email) = lower(a.email)
  and e.job_id = a.job_id;

create index if not exists applications_user_email_idx on applications (user_email);
create index if not exists application_events_user_email_idx on application_events (user_email);

create table if not exists rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_key_created_idx on rate_limits (key, created_at);
alter table rate_limits enable row level security;

create unique index if not exists applications_id_number_job_id_key on applications (id_number, job_id);
