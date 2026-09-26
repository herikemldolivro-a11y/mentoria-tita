create table if not exists public.user_lesson_notebook_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null references public.user_lesson_notebooks(id) on delete cascade,
  revision_id uuid not null references public.user_revisions(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  notebook_review_number integer not null check (notebook_review_number >= 1),
  recommended_for date not null,
  scheduled_for date not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, revision_id)
);

create index if not exists idx_user_lesson_notebook_schedule_user_date
  on public.user_lesson_notebook_schedule(user_id, scheduled_for, status);
create index if not exists idx_user_lesson_notebook_schedule_notebook
  on public.user_lesson_notebook_schedule(notebook_id, scheduled_for, status);

alter table public.user_lesson_notebook_schedule enable row level security;

drop policy if exists user_lesson_notebook_schedule_select_own on public.user_lesson_notebook_schedule;
create policy user_lesson_notebook_schedule_select_own
on public.user_lesson_notebook_schedule
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_lesson_notebook_schedule_update_own on public.user_lesson_notebook_schedule;
create policy user_lesson_notebook_schedule_update_own
on public.user_lesson_notebook_schedule
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, update on public.user_lesson_notebook_schedule to authenticated;

create or replace function public.mt_refresh_notebook_next_review(p_notebook_id uuid)
returns date
language plpgsql
security definer
set search_path='public'
as $function$
declare v_next date; v_step integer;
begin
  select min(scheduled_for) into v_next
  from public.user_lesson_notebook_schedule
  where notebook_id=p_notebook_id and status='scheduled';

  select coalesce(max(notebook_review_number),0) into v_step
  from public.user_lesson_notebook_schedule
  where notebook_id=p_notebook_id and status='completed';

  update public.user_lesson_notebooks
  set next_review_on=v_next, review_step=v_step, updated_at=now()
  where id=p_notebook_id;
  return v_next;
end;
$function$;

create or replace function public.mt_sync_notebook_schedule_for_revision(p_revision_id uuid)
returns void
language plpgsql
security definer
set search_path='public'
as $function$
declare
  v_revision public.user_revisions%rowtype;
  v_notebook public.user_lesson_notebooks%rowtype;
  v_date date;
  v_existing public.user_lesson_notebook_schedule%rowtype;
begin
  select * into v_revision from public.user_revisions where id=p_revision_id;
  if v_revision.id is null or v_revision.scheduled_for is null then return; end if;

  select * into v_notebook
  from public.user_lesson_notebooks
  where user_id=v_revision.user_id and lesson_id=v_revision.lesson_id
  limit 1;
  if v_notebook.id is null or v_notebook.status <> 'active' then return; end if;

  if not exists(select 1 from public.user_lesson_notebook_cards c where c.notebook_id=v_notebook.id and c.user_id=v_revision.user_id) then
    perform public.mt_refresh_notebook_next_review(v_notebook.id);
    return;
  end if;

  v_date := v_revision.scheduled_for - 1;
  select * into v_existing
  from public.user_lesson_notebook_schedule
  where user_id=v_revision.user_id and revision_id=v_revision.id
  limit 1;

  if v_existing.id is null then
    if v_revision.status <> 'completed' then
      insert into public.user_lesson_notebook_schedule(
        user_id,notebook_id,revision_id,lesson_id,notebook_review_number,
        recommended_for,scheduled_for,status
      ) values(
        v_revision.user_id,v_notebook.id,v_revision.id,v_revision.lesson_id,v_revision.revision_number,
        v_date,v_date,'scheduled'
      );
    end if;
  elsif v_existing.status <> 'completed' then
    update public.user_lesson_notebook_schedule
    set notebook_id=v_notebook.id,
        lesson_id=v_revision.lesson_id,
        notebook_review_number=v_revision.revision_number,
        recommended_for=v_date,
        scheduled_for=v_date,
        updated_at=now()
    where id=v_existing.id;
  end if;

  perform public.mt_refresh_notebook_next_review(v_notebook.id);
end;
$function$;

create or replace function public.mt_sync_notebook_schedule_from_revision()
returns trigger
language plpgsql
security definer
set search_path='public'
as $function$
begin
  if new.scheduled_for is not null then perform public.mt_sync_notebook_schedule_for_revision(new.id); end if;
  return new;
end;
$function$;

drop trigger if exists mt_sync_notebook_schedule_trigger on public.user_revisions;
create trigger mt_sync_notebook_schedule_trigger
after insert or update of scheduled_for,status,completed_at on public.user_revisions
for each row execute function public.mt_sync_notebook_schedule_from_revision();

create or replace function public.mt_activate_notebook_on_lesson_completion()
returns trigger
language plpgsql
security definer
set search_path='public'
as $function$
declare v_notebook_id uuid; v_revision record;
begin
  if new.list_completed_at is not null and (tg_op='INSERT' or old.list_completed_at is null) then
    insert into public.user_lesson_notebooks(user_id,lesson_id,status,activated_at,next_review_on,review_step,updated_at)
    values(new.user_id,new.lesson_id,'active',now(),null,0,now())
    on conflict(user_id,lesson_id) do update
    set status='active', activated_at=coalesce(public.user_lesson_notebooks.activated_at,now()), updated_at=now()
    returning id into v_notebook_id;

    for v_revision in
      select id from public.user_revisions
      where user_id=new.user_id and lesson_id=new.lesson_id and scheduled_for is not null and status <> 'completed'
    loop
      perform public.mt_sync_notebook_schedule_for_revision(v_revision.id);
    end loop;
    perform public.mt_refresh_notebook_next_review(v_notebook_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists mt_activate_notebook_on_lesson_completion_trigger on public.user_lesson_progress;
create trigger mt_activate_notebook_on_lesson_completion_trigger
after insert or update of list_completed_at on public.user_lesson_progress
for each row execute function public.mt_activate_notebook_on_lesson_completion();

create or replace function public.mt_sync_notebook_after_card_insert()
returns trigger
language plpgsql
security definer
set search_path='public'
as $function$
declare v_notebook public.user_lesson_notebooks%rowtype; v_progress public.user_lesson_progress%rowtype; v_revision record;
begin
  select * into v_notebook from public.user_lesson_notebooks where id=new.notebook_id;
  if v_notebook.id is null then return new; end if;
  select * into v_progress from public.user_lesson_progress where user_id=v_notebook.user_id and lesson_id=v_notebook.lesson_id;

  if v_progress.list_completed_at is not null then
    update public.user_lesson_notebooks
    set status='active', activated_at=coalesce(activated_at,now()), updated_at=now()
    where id=v_notebook.id;
  end if;

  if exists(select 1 from public.user_lesson_notebooks where id=v_notebook.id and status='active') then
    for v_revision in
      select id from public.user_revisions
      where user_id=v_notebook.user_id and lesson_id=v_notebook.lesson_id and scheduled_for is not null and status <> 'completed'
    loop
      perform public.mt_sync_notebook_schedule_for_revision(v_revision.id);
    end loop;
  end if;

  perform public.mt_refresh_notebook_next_review(v_notebook.id);
  return new;
end;
$function$;

drop trigger if exists mt_sync_notebook_after_card_insert_trigger on public.user_lesson_notebook_cards;
create trigger mt_sync_notebook_after_card_insert_trigger
after insert on public.user_lesson_notebook_cards
for each row execute function public.mt_sync_notebook_after_card_insert();

create or replace function public.activate_lesson_notebook(p_notebook_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $function$
declare v_notebook public.user_lesson_notebooks%rowtype; v_count integer; v_next date; v_revision record;
begin
  select * into v_notebook from public.user_lesson_notebooks where id=p_notebook_id and user_id=auth.uid() for update;
  if not found then raise exception 'Caderno não encontrado.'; end if;
  select count(*) into v_count from public.user_lesson_notebook_cards where notebook_id=p_notebook_id and user_id=auth.uid();
  if v_count=0 then raise exception 'Adicione pelo menos um flashcard antes de finalizar o caderno.'; end if;

  update public.user_lesson_notebooks
  set status='active', activated_at=coalesce(activated_at,now()), updated_at=now()
  where id=p_notebook_id;

  for v_revision in
    select id from public.user_revisions
    where user_id=auth.uid() and lesson_id=v_notebook.lesson_id and scheduled_for is not null and status <> 'completed'
  loop
    perform public.mt_sync_notebook_schedule_for_revision(v_revision.id);
  end loop;

  v_next:=public.mt_refresh_notebook_next_review(p_notebook_id);
  return jsonb_build_object('ok',true,'notebook_id',p_notebook_id,'card_count',v_count,'next_review_on',v_next,'review_step',(select review_step from public.user_lesson_notebooks where id=p_notebook_id));
end;
$function$;

create or replace function public.complete_lesson_notebook_review(p_notebook_id uuid,p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $function$
declare
  v_notebook public.user_lesson_notebooks%rowtype;
  v_schedule public.user_lesson_notebook_schedule%rowtype;
  v_review_id uuid; v_item record; v_card_id uuid; v_correct boolean;
  v_score integer:=0; v_total integer:=0; v_scheduled boolean:=false; v_advanced boolean:=false;
  v_next date; v_step integer;
begin
  select * into v_notebook from public.user_lesson_notebooks where id=p_notebook_id and user_id=auth.uid() for update;
  if not found then raise exception 'Caderno não encontrado.'; end if;
  if jsonb_typeof(p_results) <> 'object' then raise exception 'Resultados inválidos.'; end if;

  select * into v_schedule
  from public.user_lesson_notebook_schedule
  where notebook_id=p_notebook_id and user_id=auth.uid() and status='scheduled' and scheduled_for <= current_date
  order by scheduled_for,notebook_review_number limit 1 for update;
  v_scheduled := v_schedule.id is not null;

  insert into public.user_lesson_notebook_reviews(notebook_id,user_id,was_scheduled,schedule_advanced,score,total)
  values(p_notebook_id,auth.uid(),v_scheduled,false,0,0) returning id into v_review_id;

  for v_item in select key,value from jsonb_each_text(p_results)
  loop
    begin v_card_id:=v_item.key::uuid; exception when invalid_text_representation then continue; end;
    if not exists(select 1 from public.user_lesson_notebook_cards where id=v_card_id and notebook_id=p_notebook_id and user_id=auth.uid()) then continue; end if;
    v_correct:=lower(v_item.value)='true'; v_total:=v_total+1; if v_correct then v_score:=v_score+1; end if;

    update public.user_lesson_notebook_cards
    set last_result=v_correct,
        consecutive_correct=case when v_correct then consecutive_correct+1 else 0 end,
        correct_total=correct_total+case when v_correct then 1 else 0 end,
        incorrect_total=incorrect_total+case when v_correct then 0 else 1 end,
        last_reviewed_at=now(),updated_at=now()
    where id=v_card_id;
    insert into public.user_lesson_notebook_card_reviews(review_id,card_id,user_id,is_correct)
    values(v_review_id,v_card_id,auth.uid(),v_correct);
  end loop;

  if v_total=0 then delete from public.user_lesson_notebook_reviews where id=v_review_id; raise exception 'Nenhum flashcard foi revisado.'; end if;

  if v_scheduled then
    update public.user_lesson_notebook_schedule set status='completed',completed_at=now(),updated_at=now() where id=v_schedule.id;
    v_advanced:=true;
  end if;

  v_next:=public.mt_refresh_notebook_next_review(p_notebook_id);
  select review_step into v_step from public.user_lesson_notebooks where id=p_notebook_id;
  update public.user_lesson_notebooks set last_reviewed_at=now(),updated_at=now() where id=p_notebook_id;
  update public.user_lesson_notebook_reviews set schedule_advanced=v_advanced,score=v_score,total=v_total,completed_at=now() where id=v_review_id;

  return jsonb_build_object('ok',true,'review_id',v_review_id,'score',v_score,'total',v_total,'schedule_advanced',v_advanced,'next_review_on',v_next,'review_step',v_step);
end;
$function$;

create or replace function public.get_principal_calendar_hub()
returns jsonb
language plpgsql
security definer
set search_path='public'
as $function$
declare v_user_id uuid:=auth.uid(); v_plan_id uuid; v_taxonomy jsonb; v_revisions jsonb; v_levelings jsonb; v_notebooks jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;

  with rows as (
    select distinct c.subject_id,c.subject_name,c.subject_slug,c.lesson_id,c.lesson_title,c.lesson_slug,c.lesson_position,c.week_number
    from public.study_lesson_catalog c where c.plan_id=v_plan_id and c.week_number<90
  ) select coalesce(jsonb_agg(to_jsonb(rows) order by subject_name,week_number,lesson_position),'[]'::jsonb) into v_taxonomy from rows;

  with rows as (
    select r.id,r.lesson_id,r.subject_name,r.subject_slug,r.lesson_title,r.lesson_slug,r.revision_number,
           r.recommended_for,r.scheduled_for,r.status,r.completed_at,r.notes
    from public.user_revisions r
    join public.study_lessons l on l.id=r.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    where r.user_id=v_user_id and s.plan_id=v_plan_id and r.scheduled_for is not null
    order by r.scheduled_for,r.revision_number,r.subject_name
  ) select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into v_revisions from rows;

  with rows as (
    select ls.id,ls.lesson_id,ls.leveling_number,ls.recommended_for,ls.scheduled_for,ls.status,ls.completed_at,
           l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
           (r.status='completed') source_completed,
           (select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.leveling_schedule_id=ls.id order by qa.started_at desc limit 1) attempt_id
    from public.user_leveling_schedule ls
    join public.study_lessons l on l.id=ls.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    join public.user_revisions r on r.id=ls.revision_id
    where ls.user_id=v_user_id and s.plan_id=v_plan_id and ls.calendar_scope='principal' and ls.scheduled_for is not null
    order by ls.scheduled_for,ls.leveling_number,s.name,l.title
  ) select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into v_levelings from rows;

  with rows as (
    select ns.id,ns.notebook_id,ns.revision_id,ns.lesson_id,ns.notebook_review_number review_number,
           ns.recommended_for,ns.scheduled_for,ns.status,ns.completed_at,
           l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
           (select count(*)::integer from public.user_lesson_notebook_cards c where c.notebook_id=ns.notebook_id and c.user_id=v_user_id) card_count
    from public.user_lesson_notebook_schedule ns
    join public.study_lessons l on l.id=ns.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    where ns.user_id=v_user_id and s.plan_id=v_plan_id and ns.scheduled_for is not null
      and exists(select 1 from public.user_lesson_notebook_cards c where c.notebook_id=ns.notebook_id and c.user_id=v_user_id)
    order by ns.scheduled_for,ns.notebook_review_number,s.name,l.title
  ) select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into v_notebooks from rows;

  return jsonb_build_object('taxonomy',v_taxonomy,'revisions',v_revisions,'levelings',v_levelings,'notebooks',v_notebooks);
end;
$function$;

insert into public.user_lesson_notebooks(user_id,lesson_id,status,activated_at,next_review_on,review_step,updated_at)
select p.user_id,p.lesson_id,'active',coalesce(p.list_completed_at,now()),null,0,now()
from public.user_lesson_progress p where p.list_completed_at is not null
on conflict(user_id,lesson_id) do update
set status='active',activated_at=coalesce(public.user_lesson_notebooks.activated_at,excluded.activated_at),updated_at=now();

do $backfill$
declare v_revision record; v_notebook record;
begin
  for v_revision in select r.id from public.user_revisions r where r.scheduled_for is not null and r.status <> 'completed' loop
    perform public.mt_sync_notebook_schedule_for_revision(v_revision.id);
  end loop;
  for v_notebook in select id from public.user_lesson_notebooks loop
    perform public.mt_refresh_notebook_next_review(v_notebook.id);
  end loop;
end;
$backfill$;
