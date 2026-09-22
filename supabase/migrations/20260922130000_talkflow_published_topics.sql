create table if not exists public.talkflow_published_topics (
  date date primary key,
  topic jsonb not null,
  published_at timestamptz not null default now()
);

alter table public.talkflow_published_topics enable row level security;
revoke all on table public.talkflow_published_topics from public, anon, authenticated;
grant select, insert, update on table public.talkflow_published_topics to service_role;

create or replace function conversation_member_private.talkflow_topics(p_action text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  portal_token text := nullif(p_payload->>'token','');
  requested_month text := p_payload->>'month';
begin
  if p_action <> 'list' or requested_month !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('error','invalid_request');
  end if;
  if not exists (
    select 1 from conversation_member_private.sessions s
    where s.token::text=portal_token and s.expires_at>now()
  ) then
    return jsonb_build_object('expired',true);
  end if;
  return jsonb_build_object('topics',coalesce((
    select jsonb_agg(t.topic order by t.date)
    from public.talkflow_published_topics t
    where to_char(t.date,'YYYY-MM')=requested_month
  ),'[]'::jsonb));
end;
$$;

revoke all on function conversation_member_private.talkflow_topics(text,jsonb) from public, anon, authenticated;

create or replace function public.conversation_member_topics(p_action text,p_payload jsonb)
returns jsonb
language sql
security definer
set search_path=''
as $$ select conversation_member_private.talkflow_topics(p_action,p_payload); $$;

revoke all on function public.conversation_member_topics(text,jsonb) from public;
grant execute on function public.conversation_member_topics(text,jsonb) to anon, authenticated;
