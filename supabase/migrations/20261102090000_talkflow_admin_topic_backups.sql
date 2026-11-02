-- Server copy of the admin's working topics (drafts included). The admin app keeps topics in
-- browser localStorage; this table lets a cleared or new browser restore them after login.
create table if not exists public.talkflow_admin_topic_backups (
  date date primary key,
  topic jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.talkflow_admin_topic_backups enable row level security;
revoke all on table public.talkflow_admin_topic_backups from public, anon, authenticated;
grant select, insert, update, delete on table public.talkflow_admin_topic_backups to service_role;
