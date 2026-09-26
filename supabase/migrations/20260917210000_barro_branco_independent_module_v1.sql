create table if not exists public.bb_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 99),
  title text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_number)
);

create table if not exists public.bb_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.bb_weeks(id) on delete cascade,
  subject_name text not null,
  title text not null,
  topic text null,
  planned_date date null,
  position integer not null default 1,
  source text not null default 'fenix' check (source in ('fenix','manual')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bb_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid null references public.bb_lessons(id) on delete cascade,
  activity_type text not null check (activity_type in ('lesson','revision','leveling','task')),
  leveling_number integer null check (leveling_number is null or leveling_number between 1 and 4),
  subject_name text null,
  title text not null,
  scheduled_for date not null,
  original_scheduled_for date not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed')),
  source text not null default 'manual' check (source in ('fenix','manual','suggested')),
  notes text null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bb_weeks_user_date_idx on public.bb_weeks(user_id, starts_on, ends_on);
create index if not exists bb_lessons_user_week_idx on public.bb_lessons(user_id, week_id, position);
create index if not exists bb_activities_user_date_idx on public.bb_activities(user_id, scheduled_for, status);
create index if not exists bb_activities_lesson_idx on public.bb_activities(lesson_id, activity_type, leveling_number);

alter table public.bb_weeks enable row level security;
alter table public.bb_lessons enable row level security;
alter table public.bb_activities enable row level security;

drop policy if exists bb_weeks_own on public.bb_weeks;
create policy bb_weeks_own on public.bb_weeks for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists bb_lessons_own on public.bb_lessons;
create policy bb_lessons_own on public.bb_lessons for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists bb_activities_own on public.bb_activities;
create policy bb_activities_own on public.bb_activities for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create or replace function public.bb_bootstrap()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_week_id uuid; v_lesson_id uuid; v_n integer; v_start date:=date '2026-09-17';
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  for v_n in 1..40 loop
    insert into public.bb_weeks(user_id,week_number,title,starts_on,ends_on)
    values(v_user,v_n,'Semana '||v_n,v_start+((v_n-1)*7),v_start+((v_n-1)*7)+6)
    on conflict(user_id,week_number) do nothing;
  end loop;
  select id into v_week_id from public.bb_weeks where user_id=v_user and week_number=1;
  select id into v_lesson_id from public.bb_lessons where user_id=v_user and week_id=v_week_id and subject_name='Matemática' and title='Conjuntos' order by created_at limit 1;
  if v_lesson_id is null then
    insert into public.bb_lessons(user_id,week_id,subject_name,title,topic,planned_date,position,source,notes)
    values(v_user,v_week_id,'Matemática','Conjuntos','Conjuntos',date '2026-09-17',1,'fenix','Início real informado: conteúdo iniciado em 17/09/2026. Não redistribuir todo o assunto automaticamente.') returning id into v_lesson_id;
  end if;
  if not exists(select 1 from public.bb_activities where user_id=v_user and lesson_id=v_lesson_id and activity_type='lesson') then
    insert into public.bb_activities(user_id,lesson_id,activity_type,subject_name,title,scheduled_for,original_scheduled_for,status,source,notes)
    values(v_user,v_lesson_id,'lesson','Matemática','Conjuntos',date '2026-09-17',date '2026-09-17','scheduled','fenix','Aula oficial do início real do acompanhamento.');
  end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.bb_create_activity(p_type text,p_date date,p_lesson_id uuid default null,p_level integer default null,p_subject text default null,p_title text default null,p_notes text default null,p_week_number integer default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_lesson public.bb_lessons%rowtype; v_week_id uuid; v_activity public.bb_activities%rowtype; v_subject text; v_title text;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  if p_type not in ('lesson','revision','leveling','task') then raise exception 'Tipo inválido'; end if;
  if p_date is null then raise exception 'Escolha uma data'; end if;
  if p_type in ('revision','leveling') then
    select * into v_lesson from public.bb_lessons where id=p_lesson_id and user_id=v_user;
    if v_lesson.id is null then raise exception 'Selecione uma aula'; end if;
    v_subject:=v_lesson.subject_name;
    v_title:=case when p_type='revision' then 'Revisão — '||v_lesson.title else 'N'||coalesce(p_level,1)||' — '||v_lesson.title end;
    if p_type='leveling' and (p_level is null or p_level not between 1 and 4) then raise exception 'Selecione N1, N2, N3 ou N4'; end if;
  elsif p_type='lesson' then
    if nullif(trim(coalesce(p_subject,'')),'') is null then raise exception 'Digite a matéria'; end if;
    if nullif(trim(coalesce(p_title,'')),'') is null then raise exception 'Digite o nome da aula'; end if;
    select id into v_week_id from public.bb_weeks where user_id=v_user and week_number=coalesce(p_week_number,1);
    if v_week_id is null then select id into v_week_id from public.bb_weeks where user_id=v_user and p_date between starts_on and ends_on order by week_number limit 1; end if;
    if v_week_id is null then raise exception 'Semana não encontrada'; end if;
    insert into public.bb_lessons(user_id,week_id,subject_name,title,topic,planned_date,position,source,notes)
    values(v_user,v_week_id,trim(p_subject),trim(p_title),trim(p_title),p_date,999,'manual',nullif(trim(coalesce(p_notes,'')),'')) returning * into v_lesson;
    p_lesson_id:=v_lesson.id; v_subject:=v_lesson.subject_name; v_title:=v_lesson.title;
  else
    v_subject:=nullif(trim(coalesce(p_subject,'')),'');
    if nullif(trim(coalesce(p_title,'')),'') is null then raise exception 'Digite a tarefa'; end if;
    v_title:=trim(p_title);
  end if;
  insert into public.bb_activities(user_id,lesson_id,activity_type,leveling_number,subject_name,title,scheduled_for,original_scheduled_for,status,source,notes)
  values(v_user,p_lesson_id,p_type,case when p_type='leveling' then p_level else null end,v_subject,v_title,p_date,p_date,'scheduled','manual',nullif(trim(coalesce(p_notes,'')),'')) returning * into v_activity;
  return to_jsonb(v_activity);
end $$;

create or replace function public.bb_toggle_activity(p_activity_id uuid,p_completed boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_row public.bb_activities%rowtype;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  update public.bb_activities set status=case when p_completed then 'completed' else 'scheduled' end,completed_at=case when p_completed then now() else null end,updated_at=now() where id=p_activity_id and user_id=v_user returning * into v_row;
  if v_row.id is null then raise exception 'Atividade não encontrada'; end if;
  return to_jsonb(v_row);
end $$;

create or replace function public.bb_update_activity(p_activity_id uuid,p_date date,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_row public.bb_activities%rowtype;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  update public.bb_activities set scheduled_for=coalesce(p_date,scheduled_for),notes=p_notes,updated_at=now() where id=p_activity_id and user_id=v_user returning * into v_row;
  if v_row.id is null then raise exception 'Atividade não encontrada'; end if;
  return to_jsonb(v_row);
end $$;

create or replace function public.bb_delete_activity(p_activity_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_source text; v_lesson uuid;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  select source,lesson_id into v_source,v_lesson from public.bb_activities where id=p_activity_id and user_id=v_user;
  if v_source is null then return false; end if;
  if v_source='fenix' then raise exception 'Atividade oficial do Fênix não pode ser excluída'; end if;
  delete from public.bb_activities where id=p_activity_id and user_id=v_user;
  if v_lesson is not null and not exists(select 1 from public.bb_activities where lesson_id=v_lesson) then delete from public.bb_lessons where id=v_lesson and user_id=v_user and source='manual'; end if;
  return true;
end $$;

create or replace function public.bb_schedule_d2_revision(p_lesson_id uuid,p_date date default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_lesson public.bb_lessons%rowtype; v_base date; v_date date; v_row public.bb_activities%rowtype;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_lesson from public.bb_lessons where id=p_lesson_id and user_id=v_user;
  if v_lesson.id is null then raise exception 'Aula não encontrada'; end if;
  select coalesce(completed_at::date,scheduled_for) into v_base from public.bb_activities where user_id=v_user and lesson_id=p_lesson_id and activity_type='lesson' order by created_at limit 1;
  v_date:=coalesce(p_date,v_base+2);
  insert into public.bb_activities(user_id,lesson_id,activity_type,subject_name,title,scheduled_for,original_scheduled_for,status,source)
  values(v_user,p_lesson_id,'revision',v_lesson.subject_name,'Revisão — '||v_lesson.title,v_date,v_date,'scheduled','suggested') returning * into v_row;
  return to_jsonb(v_row);
end $$;

revoke all on function public.bb_bootstrap() from public;
revoke all on function public.bb_create_activity(text,date,uuid,integer,text,text,text,integer) from public;
revoke all on function public.bb_toggle_activity(uuid,boolean) from public;
revoke all on function public.bb_update_activity(uuid,date,text) from public;
revoke all on function public.bb_delete_activity(uuid) from public;
revoke all on function public.bb_schedule_d2_revision(uuid,date) from public;
grant execute on function public.bb_bootstrap() to authenticated;
grant execute on function public.bb_create_activity(text,date,uuid,integer,text,text,text,integer) to authenticated;
grant execute on function public.bb_toggle_activity(uuid,boolean) to authenticated;
grant execute on function public.bb_update_activity(uuid,date,text) to authenticated;
grant execute on function public.bb_delete_activity(uuid) to authenticated;
grant execute on function public.bb_schedule_d2_revision(uuid,date) to authenticated;
