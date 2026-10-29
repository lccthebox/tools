create table if not exists conversation_member_private.talkflow_topic_views (
  member_id text not null,
  topic_date date not null references public.talkflow_published_topics(date) on delete cascade,
  first_opened_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  primary key (member_id, topic_date)
);

alter table conversation_member_private.talkflow_topic_views enable row level security;
revoke all on table conversation_member_private.talkflow_topic_views from public, anon, authenticated;
grant select, insert, update on table conversation_member_private.talkflow_topic_views to service_role;

create or replace function conversation_member_private.talkflow_record_topic_view(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  portal_token text := nullif(p_payload->>'token','');
  portal_member_id text;
  requested_date date;
  newly_recorded boolean;
begin
  if p_payload is null or coalesce(p_payload->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then
    return jsonb_build_object('error','invalid_request');
  end if;
  select s.member_id into portal_member_id
  from conversation_member_private.sessions s
  where s.token::text=portal_token and s.expires_at>now();
  if portal_member_id is null then
    return jsonb_build_object('expired',true);
  end if;
  begin
    requested_date := (p_payload->>'date')::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    return jsonb_build_object('error','invalid_request');
  end;
  if not exists(select 1 from public.talkflow_published_topics t where t.date=requested_date) then
    return jsonb_build_object('error','topic_not_found');
  end if;
  insert into conversation_member_private.talkflow_topic_views(member_id,topic_date)
  values(portal_member_id,requested_date)
  on conflict (member_id, topic_date) do update set last_opened_at=now()
  returning xmax=0 into newly_recorded;
  return jsonb_build_object('view',jsonb_build_object('date',requested_date,'counted',newly_recorded));
end;
$$;

revoke all on function conversation_member_private.talkflow_record_topic_view(jsonb) from public, anon, authenticated;

create or replace function public.conversation_member_topic_view(p_payload jsonb)
returns jsonb language sql security definer set search_path=''
as $$ select conversation_member_private.talkflow_record_topic_view(p_payload); $$;

revoke all on function public.conversation_member_topic_view(jsonb) from public;
grant execute on function public.conversation_member_topic_view(jsonb) to anon, authenticated;

create or replace function conversation_member_private.talkflow_topic_view_summary(p_month text)
returns jsonb
language sql
security definer
set search_path=''
as $$
  select jsonb_build_object('views',coalesce(jsonb_object_agg(summary.topic_date::text,summary.view_count),'{}'::jsonb))
  from (
    select v.topic_date,count(*)::integer as view_count
    from conversation_member_private.talkflow_topic_views v
    where to_char(v.topic_date,'YYYY-MM')=p_month
    group by v.topic_date
  ) summary;
$$;

revoke all on function conversation_member_private.talkflow_topic_view_summary(text) from public, anon, authenticated;

create or replace function public.conversation_talkflow_view_summary(p_month text)
returns jsonb language sql security definer set search_path=''
as $$ select conversation_member_private.talkflow_topic_view_summary(p_month); $$;

revoke all on function public.conversation_talkflow_view_summary(text) from public, anon, authenticated;
grant execute on function public.conversation_talkflow_view_summary(text) to service_role;
