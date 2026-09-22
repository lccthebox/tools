create table if not exists conversation_member_private.talkflow_topic_progress (
  member_id text not null,
  topic_date date not null references public.talkflow_published_topics(date),
  reflection text not null check (char_length(reflection) between 1 and 500),
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, topic_date)
);

alter table conversation_member_private.talkflow_topic_progress enable row level security;
revoke all on table conversation_member_private.talkflow_topic_progress from public, anon, authenticated;
grant select, insert, update on table conversation_member_private.talkflow_topic_progress to service_role;

create or replace function conversation_member_private.talkflow_progress(p_action text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  portal_token text := nullif(p_payload->>'token','');
  portal_member_id text;
  requested_month text := p_payload->>'month';
  requested_date date;
  reflection_text text;
  saved conversation_member_private.talkflow_topic_progress;
begin
  if p_action not in ('list','save') or p_payload is null then
    return jsonb_build_object('error','invalid_request');
  end if;
  select s.member_id into portal_member_id
  from conversation_member_private.sessions s
  where s.token::text=portal_token and s.expires_at>now();
  if portal_member_id is null then
    return jsonb_build_object('expired',true);
  end if;
  if p_action='list' then
    if requested_month !~ '^\d{4}-\d{2}$' then return jsonb_build_object('error','invalid_request'); end if;
    return jsonb_build_object('progress',coalesce((
      select jsonb_agg(jsonb_build_object('date',p.topic_date,'reflection',p.reflection,'completedAt',p.completed_at,'updatedAt',p.updated_at) order by p.topic_date)
      from conversation_member_private.talkflow_topic_progress p
      where p.member_id=portal_member_id and to_char(p.topic_date,'YYYY-MM')=requested_month
    ),'[]'::jsonb));
  end if;
  if coalesce(p_payload->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then return jsonb_build_object('error','invalid_request'); end if;
  begin requested_date := (p_payload->>'date')::date;
  exception when invalid_datetime_format or datetime_field_overflow then return jsonb_build_object('error','invalid_request'); end;
  reflection_text := trim(coalesce(p_payload->>'reflection',''));
  if char_length(reflection_text) not between 1 and 500 then return jsonb_build_object('error','invalid_reflection'); end if;
  if not exists(select 1 from public.talkflow_published_topics t where t.date=requested_date) then return jsonb_build_object('error','topic_not_found'); end if;
  insert into conversation_member_private.talkflow_topic_progress(member_id,topic_date,reflection)
  values(portal_member_id,requested_date,reflection_text)
  on conflict(member_id,topic_date) do update set reflection=excluded.reflection,updated_at=now()
  returning * into saved;
  return jsonb_build_object('progress',jsonb_build_object('date',saved.topic_date,'reflection',saved.reflection,'completedAt',saved.completed_at,'updatedAt',saved.updated_at));
end;
$$;

revoke all on function conversation_member_private.talkflow_progress(text,jsonb) from public, anon, authenticated;

create or replace function public.conversation_member_topic_progress(p_action text,p_payload jsonb)
returns jsonb language sql security definer set search_path=''
as $$ select conversation_member_private.talkflow_progress(p_action,p_payload); $$;

revoke all on function public.conversation_member_topic_progress(text,jsonb) from public;
grant execute on function public.conversation_member_topic_progress(text,jsonb) to anon, authenticated;
