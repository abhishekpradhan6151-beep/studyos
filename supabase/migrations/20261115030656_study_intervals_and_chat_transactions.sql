alter table public.study_sessions add constraint sessions_owner_id unique(user_id,id);
create table public.study_intervals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  seconds integer not null check(seconds between 0 and 28800),
  created_at timestamptz not null default now(),
  foreign key(user_id,session_id) references public.study_sessions(user_id,id) on delete cascade,
  check(ended_at >= started_at)
);
alter table public.study_intervals enable row level security;
revoke all on public.study_intervals from anon,authenticated;
grant select,insert,delete on public.study_intervals to authenticated;
create policy owner_select on public.study_intervals for select to authenticated using((select auth.uid())=user_id);
create policy owner_insert on public.study_intervals for insert to authenticated with check((select auth.uid())=user_id);
create policy owner_delete on public.study_intervals for delete to authenticated using((select auth.uid())=user_id);
create index intervals_session on public.study_intervals(user_id,session_id);
create index intervals_owner_created on public.study_intervals(user_id,created_at desc);

create or replace function public.transition_study_session(p_id uuid,p_action text) returns public.study_sessions
language plpgsql security invoker set search_path='' as $$
declare s public.study_sessions; delta integer:=0;
begin
  select * into s from public.study_sessions where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'Session not found'; end if;
  if s.status='completed' then raise exception 'This session is already completed'; end if;
  if p_action not in ('start','pause','finish') then raise exception 'Invalid timer action'; end if;
  if s.running_started_at is not null then
    delta:=least(86400-s.actual_seconds,28800,greatest(0,floor(extract(epoch from (now()-s.running_started_at)))::integer));
  end if;
  if p_action='start' then
    if s.status='running' then return s; end if;
    if s.actual_seconds>=86400 then raise exception 'This session has reached 24 hours. Finish it and create a new session.'; end if;
    update public.study_sessions set status='running',running_started_at=now(),first_started_at=coalesce(first_started_at,now()) where id=p_id returning * into s;
  else
    if p_action='pause' and s.status<>'running' then raise exception 'Only a running session can be paused'; end if;
    if delta>0 then
      insert into public.study_intervals(user_id,session_id,started_at,ended_at,seconds)
      values(auth.uid(),s.id,s.running_started_at,s.running_started_at+delta*interval '1 second',delta);
    end if;
    update public.study_sessions set
      status=case when p_action='pause' then 'paused' else 'completed' end,
      actual_seconds=actual_seconds+delta,running_started_at=null,
      completed_at=case when p_action='finish' then now() else null end
    where id=p_id returning * into s;
  end if;
  return s;
end; $$;

create function public.save_chat_exchange(p_conversation uuid,p_request uuid,p_user_content text,p_assistant_content text,p_metadata jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.conversations where id=p_conversation and user_id=auth.uid() for update;
  if not found then raise exception 'Conversation not found'; end if;
  insert into public.messages(user_id,conversation_id,role,content,request_id,created_at)
  values(auth.uid(),p_conversation,'user',p_user_content,p_request,now());
  insert into public.messages(user_id,conversation_id,role,content,request_id,metadata,created_at)
  values(auth.uid(),p_conversation,'assistant',p_assistant_content,p_request,p_metadata,now()+interval '1 millisecond');
  update public.conversations set updated_at=now(),title=case when title='New conversation' then left(p_user_content,80) else title end where id=p_conversation;
end; $$;
revoke all on function public.save_chat_exchange(uuid,uuid,text,text,jsonb) from public;
grant execute on function public.save_chat_exchange(uuid,uuid,text,text,jsonb) to authenticated;
