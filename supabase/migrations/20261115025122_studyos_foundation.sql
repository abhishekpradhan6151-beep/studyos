-- StudyOS: all application data is owned by one authenticated user.
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  academic_level text not null default '' check (char_length(academic_level) <= 80),
  timezone text not null default 'UTC' check (char_length(timezone) <= 80),
  daily_target_minutes integer not null default 60 check (daily_target_minutes between 5 and 720),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default 'indigo' check (color in ('indigo','teal','rose','amber','sky','violet')),
  created_at timestamptz not null default now(),
  unique(user_id,id), unique(user_id,name)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  category text not null default 'General' check (char_length(category) between 1 and 80),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (user_id,subject_id) references public.subjects(user_id,id) on delete set null (subject_id)
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null check (char_length(trim(title)) between 1 and 200),
  scheduled_at timestamptz not null, target_minutes integer not null default 25 check(target_minutes between 1 and 720),
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  status text not null default 'scheduled' check(status in ('scheduled','running','paused','completed')),
  actual_seconds integer not null default 0 check(actual_seconds between 0 and 86400),
  first_started_at timestamptz, running_started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(user_id,subject_id) references public.subjects(user_id,id) on delete set null (subject_id),
  check ((status = 'running') = (running_started_at is not null))
);
create unique index one_running_session on public.study_sessions(user_id) where status='running';
create table public.notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null check(char_length(trim(title)) between 1 and 200),
  content text not null default '' check(char_length(content) <= 100000),
  folder text not null default 'General' check(char_length(folder) between 1 and 80),
  pinned boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(user_id,subject_id) references public.subjects(user_id,id) on delete set null (subject_id)
);
create table public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 1 and 200),
  kind text not null default 'academic' check(kind in ('academic','personal')),
  target_value numeric not null default 1 check(target_value > 0 and target_value <= 1000000),
  current_value numeric not null default 0 check(current_value >= 0),
  unit text not null default 'steps' check(char_length(unit) between 1 and 40),
  due_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(current_value <= target_value)
);
create table public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 1 and 150),
  frequency text not null default 'daily' check(frequency in ('daily','weekly')),
  weekly_target integer not null default 1 check(weekly_target between 1 and 7),
  archived boolean not null default false, created_at timestamptz not null default now(), unique(user_id,id)
);
create table public.habit_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null, completed_on date not null,
  created_at timestamptz not null default now(), unique(habit_id,completed_on),
  foreign key(user_id,habit_id) references public.habits(user_id,id) on delete cascade
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check(char_length(title) between 1 and 200),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null, role text not null check(role in ('user','assistant')),
  content text not null check(char_length(content) <= 100000),
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  request_id uuid not null, created_at timestamptz not null default now(),
  foreign key(user_id,conversation_id) references public.conversations(user_id,id) on delete cascade,
  unique(conversation_id,request_id,role), unique(user_id,id)
);
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null, answers jsonb not null check(jsonb_typeof(answers)='array'),
  score integer not null check(score between 0 and 100),
  created_at timestamptz not null default now(), unique(user_id,message_id),
  foreign key(user_id,message_id) references public.messages(user_id,id) on delete cascade
);
create table public.documents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 200),
  storage_path text not null unique,
  media_type text not null check(media_type in ('application/pdf','text/plain','text/markdown')),
  size_bytes integer not null check(size_bytes > 0 and size_bytes <= 8388608),
  created_at timestamptz not null default now(),
  check(split_part(storage_path,'/',1)=user_id::text)
);
create table public.ai_requests (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Do not rely on a project's default grants: explicitly grant and enforce RLS.
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated using((select auth.uid())=id);
create policy profiles_insert on public.profiles for insert to authenticated with check((select auth.uid())=id);
create policy profiles_update on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
revoke all on public.profiles from anon, authenticated;
grant select,insert,update on public.profiles to authenticated;
do $block$
declare t text;
begin
  foreach t in array array['subjects','tasks','study_sessions','notes','goals','habits','habit_entries','conversations','messages','quiz_attempts','documents'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
    execute format('create index %I on public.%I(user_id,created_at desc)',t||'_owner_created',t);
  end loop;
end $block$;
alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from anon,authenticated;
grant select on public.ai_requests to authenticated;
create policy request_owner_select on public.ai_requests for select to authenticated using((select auth.uid())=user_id);
create index ai_requests_owner_created on public.ai_requests(user_id,created_at desc);
create index tasks_subject on public.tasks(user_id,subject_id);
create index sessions_subject on public.study_sessions(user_id,subject_id);
create index notes_subject on public.notes(user_id,subject_id);
create index habit_entries_parent on public.habit_entries(user_id,habit_id,completed_on);
create index messages_conversation on public.messages(user_id,conversation_id,created_at);
create index quiz_attempts_parent on public.quiz_attempts(user_id,message_id);
create index tasks_due on public.tasks(user_id,due_date) where completed_at is null;
create index sessions_schedule on public.study_sessions(user_id,scheduled_at);

create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;
revoke all on function private.touch_updated_at() from public;
do $block$
declare t text;
begin
  foreach t in array array['profiles','tasks','study_sessions','notes','goals','conversations'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
  end loop;
end $block$;

create function public.complete_onboarding(p_name text,p_level text,p_timezone text,p_target integer,p_subjects text[],p_goal text)
returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); s text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Invalid timezone'; end if;
  if coalesce(array_length(p_subjects,1),0)>12 then raise exception 'Choose at most 12 subjects'; end if;
  insert into public.profiles(id) values(uid) on conflict(id) do nothing;
  perform 1 from public.profiles where id=uid for update;
  if exists(select 1 from public.profiles where id=uid and onboarded) then return; end if;
  update public.profiles set display_name=trim(p_name),academic_level=trim(p_level),timezone=p_timezone,daily_target_minutes=p_target,onboarded=true where id=uid;
  foreach s in array coalesce(p_subjects,array[]::text[]) loop
    if trim(s)<>'' then insert into public.subjects(user_id,name) values(uid,trim(s)) on conflict(user_id,name) do nothing; end if;
  end loop;
  if trim(p_goal)<>'' then insert into public.goals(user_id,title) values(uid,trim(p_goal)); end if;
end; $$;
revoke all on function public.complete_onboarding(text,text,text,integer,text[],text) from public;
grant execute on function public.complete_onboarding(text,text,text,integer,text[],text) to authenticated;

create function public.transition_study_session(p_id uuid,p_action text) returns public.study_sessions
language plpgsql security invoker set search_path='' as $$
declare s public.study_sessions; delta integer:=0;
begin
  select * into s from public.study_sessions where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'Session not found'; end if;
  if s.status='completed' then raise exception 'This session is already completed'; end if;
  if s.running_started_at is not null then delta:=least(28800,greatest(0,extract(epoch from (now()-s.running_started_at))::integer)); end if;
  if p_action='start' then
    if s.status='running' then return s; end if;
    update public.study_sessions set status='running',running_started_at=now(),first_started_at=coalesce(first_started_at,now()) where id=p_id returning * into s;
  elsif p_action='pause' then
    if s.status<>'running' then raise exception 'Only a running session can be paused'; end if;
    update public.study_sessions set status='paused',actual_seconds=least(86400,actual_seconds+delta),running_started_at=null where id=p_id returning * into s;
  elsif p_action='finish' then
    update public.study_sessions set status='completed',actual_seconds=least(86400,actual_seconds+delta),running_started_at=null,completed_at=now() where id=p_id returning * into s;
  else raise exception 'Invalid timer action'; end if;
  return s;
end; $$;
revoke all on function public.transition_study_session(uuid,text) from public;
grant execute on function public.transition_study_session(uuid,text) to authenticated;

-- Privileged limiter stays in a non-exposed schema, verifies auth.uid, and has a locked search_path.
create function private.reserve_ai_request(p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  if exists(select 1 from public.ai_requests where id=p_request_id) then raise exception 'This request is already being processed. Send a new message to retry.'; end if;
  if (select count(*) from public.ai_requests where user_id=uid and created_at>now()-interval '1 minute')>=6 then raise exception 'Please wait a minute before sending another AI request.'; end if;
  if (select count(*) from public.ai_requests where user_id=uid and created_at>now()-interval '24 hours')>=40 then raise exception 'Your 40-request daily AI limit has been reached. Please try again later.'; end if;
  insert into public.ai_requests(id,user_id) values(p_request_id,uid);
end; $$;
revoke all on function private.reserve_ai_request(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.reserve_ai_request(uuid) to authenticated;
create function public.reserve_ai_request(p_request_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.reserve_ai_request(p_request_id); $$;
revoke all on function public.reserve_ai_request(uuid) from public;
grant execute on function public.reserve_ai_request(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('study-documents','study-documents',false,8388608,array['application/pdf','text/plain','text/markdown']);
create policy study_documents_select on storage.objects for select to authenticated using(bucket_id='study-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy study_documents_insert on storage.objects for insert to authenticated with check(bucket_id='study-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy study_documents_update on storage.objects for update to authenticated using(bucket_id='study-documents' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='study-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy study_documents_delete on storage.objects for delete to authenticated using(bucket_id='study-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
