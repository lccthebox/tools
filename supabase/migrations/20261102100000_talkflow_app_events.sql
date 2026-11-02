-- One row per TalkFlow API call for the daily log review. No request or response bodies are stored.
create table if not exists public.talkflow_app_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  kind text not null check (char_length(kind) <= 64),
  method text,
  outcome text not null check (outcome in ('ok', 'rejected', 'failed')),
  status_code integer,
  error_type text check (error_type is null or char_length(error_type) <= 80),
  duration_ms integer,
  client text
);

create index if not exists talkflow_app_events_occurred_at_idx on public.talkflow_app_events (occurred_at desc);
create index if not exists talkflow_app_events_kind_idx on public.talkflow_app_events (kind, occurred_at desc);

alter table public.talkflow_app_events enable row level security;
revoke all on table public.talkflow_app_events from public, anon, authenticated;
grant select, insert, delete on table public.talkflow_app_events to service_role;
