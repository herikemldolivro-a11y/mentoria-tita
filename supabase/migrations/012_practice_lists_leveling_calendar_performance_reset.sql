begin;

-- 1) Corte de desempenho: preserva histórico bruto, mas relatórios passam a contar somente depois do reset.
create table if not exists public.user_performance_resets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reset_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_performance_resets enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_performance_resets' and policyname='performance reset own select') then
    create policy "performance reset own select" on public.user_performance_resets for select using (auth.uid()=user_id);
  end if;
end $$;

create or replace function public.reset_my_question_performance(p_from timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_at timestamptz:=coalesce(p_from,now());
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  insert into public.user_performance_resets(user_id,reset_at,updated_at) values(v_user_id,v_at,now())
  on conflict(user_id) do update set reset_at=excluded.reset_at,updated_at=now();
  return jsonb_build_object('ok',true,'reset_at',v_at);
end $$;

-- 2) Listas independentes da teoria: Lista 1=35, Lista 2=20, Lista 3=15.
do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='question_attempts' and column_name='practice_list_number') then
    alter table public.question_attempts add column practice_list_number smallint;
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='question_attempts' and column_name='practice_list_size') then
    alter table public.question_attempts add column practice_list_size integer;
  end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.question_attempts'::regclass and conname='question_attempts_practice_list_number_check') then
    alter table public.question_attempts add constraint question_attempts_practice_list_number_check check (practice_list_number is null or practice_list_number between 1 and 3);
  end if;
end $$;
create index if not exists question_attempts_practice_idx on public.question_attempts(user_id,lesson_id,practice_list_number,started_at desc) where practice_list_number is not null;

create or replace function public.start_practice_list_attempt(p_lesson_id uuid,p_list_number integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_plan_id uuid; v_size integer; v_cumulative integer; v_available integer; v_attempt_id uuid; v_status text; v_ids uuid[]; v_i integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_list_number not between 1 and 3 then raise exception 'Lista inválida'; end if;
  v_size:=case p_list_number when 1 then 35 when 2 then 20 else 15 end;
  v_cumulative:=case p_list_number when 1 then 35 when 2 then 55 else 70 end;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  if not exists(select 1 from public.study_lessons l join public.study_subjects s on s.id=l.subject_id where l.id=p_lesson_id and s.plan_id=v_plan_id and l.active and s.active) then raise exception 'Aula indisponível'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user_id::text||':practice:'||p_lesson_id::text||':'||p_list_number::text));

  select id,status into v_attempt_id,v_status from public.question_attempts
  where user_id=v_user_id and lesson_id=p_lesson_id and kind='lesson_list' and practice_list_number=p_list_number
  order by started_at desc limit 1;
  if v_attempt_id is not null then
    return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',v_status='in_progress','completed',v_status='completed','list_size',v_size);
  end if;

  select count(*) into v_available from public.questions where plan_id=v_plan_id and lesson_id=p_lesson_id and active=true;
  if v_available < v_cumulative then return jsonb_build_object('ok',false,'available_count',v_available,'required_count',v_cumulative,'list_size',v_size); end if;

  select coalesce(array_agg(id order by random()),array[]::uuid[]) into v_ids from (
    select q.id from public.questions q
    where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true
      and not exists(
        select 1 from public.question_attempts pa join public.question_attempt_items pi on pi.attempt_id=pa.id
        where pa.user_id=v_user_id and pa.lesson_id=p_lesson_id and pa.practice_list_number is not null and pa.practice_list_number < p_list_number and pi.question_id=q.id
      )
    order by random() limit v_size
  ) picked;
  if coalesce(array_length(v_ids,1),0) < v_size then raise exception 'Não foi possível montar a lista sem repetir questões das listas anteriores'; end if;

  insert into public.question_attempts(user_id,lesson_id,kind,status,total,practice_list_number,practice_list_size)
  values(v_user_id,p_lesson_id,'lesson_list','in_progress',v_size,p_list_number,v_size) returning id into v_attempt_id;
  for v_i in 1..array_length(v_ids,1) loop insert into public.question_attempt_items(attempt_id,question_id,position) values(v_attempt_id,v_ids[v_i],v_i); end loop;
  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',false,'completed',false,'list_size',v_size,'available_count',v_available);
end $$;

-- 2.1) Ao concluir a lista principal da aula, cria a primeira revisão normal para +2 dias.
-- Se a interface antiga já tiver criado a revisão, o UNIQUE evita duplicação.
create or replace function public.mt_seed_first_revision_from_lesson_progress()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_lesson public.study_lessons%rowtype; v_subject public.study_subjects%rowtype; v_base date;
begin
  if new.list_completed_at is not null and (tg_op='INSERT' or old.list_completed_at is null) then
    select * into v_lesson from public.study_lessons where id=new.lesson_id;
    if v_lesson.id is not null then select * into v_subject from public.study_subjects where id=v_lesson.subject_id; end if;
    if v_lesson.id is not null and v_subject.id is not null then
      v_base:=(new.list_completed_at at time zone 'America/Sao_Paulo')::date;
      insert into public.user_revisions(user_id,lesson_id,subject_slug,subject_name,lesson_slug,lesson_title,revision_number,recommended_for,scheduled_for,status)
      values(new.user_id,v_lesson.id,v_subject.slug,v_subject.name,v_lesson.slug,v_lesson.title,1,v_base+2,null,'draft')
      on conflict(user_id,lesson_id,revision_number) do update
      set recommended_for=case when public.user_revisions.status='draft' then excluded.recommended_for else public.user_revisions.recommended_for end, updated_at=now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists mt_seed_first_revision_trigger on public.user_lesson_progress;
create trigger mt_seed_first_revision_trigger after insert or update of list_completed_at on public.user_lesson_progress for each row execute function public.mt_seed_first_revision_from_lesson_progress();

-- 3) Calendário dedicado de nivelamentos, ligado às revisões normais.
create table if not exists public.user_leveling_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_id uuid not null references public.user_revisions(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete restrict,
  leveling_number integer not null check(leveling_number>0),
  recommended_for date not null,
  scheduled_for date,
  status text not null default 'draft' check(status in ('draft','scheduled','in_progress','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,revision_id)
);
alter table public.user_leveling_schedule enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_leveling_schedule' and policyname='leveling schedule own select') then
    create policy "leveling schedule own select" on public.user_leveling_schedule for select using(auth.uid()=user_id);
  end if;
end $$;
create index if not exists user_leveling_schedule_user_date_idx on public.user_leveling_schedule(user_id,coalesce(scheduled_for,recommended_for),status);

do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='question_attempts' and column_name='leveling_schedule_id') then
    alter table public.question_attempts add column leveling_schedule_id uuid references public.user_leveling_schedule(id) on delete set null;
  end if;
end $$;
create index if not exists question_attempts_leveling_schedule_idx on public.question_attempts(leveling_schedule_id) where leveling_schedule_id is not null;

create or replace function public.mt_revision_complete_on_reread()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.reread_confirmed_at is not null and (old.reread_confirmed_at is null or old.reread_confirmed_at is distinct from new.reread_confirmed_at) then
    new.status:='completed'; new.completed_at:=coalesce(new.completed_at,now()); new.updated_at:=now();
  end if;
  return new;
end $$;
drop trigger if exists mt_revision_complete_on_reread_trigger on public.user_revisions;
create trigger mt_revision_complete_on_reread_trigger before update of reread_confirmed_at on public.user_revisions for each row execute function public.mt_revision_complete_on_reread();

create or replace function public.mt_sync_leveling_schedule_from_revision()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_base date; v_existing public.user_leveling_schedule%rowtype;
begin
  if new.status not in ('scheduled','completed') then return new; end if;
  v_base:=case when new.completed_at is not null then new.completed_at::date else coalesce(new.scheduled_for,new.recommended_for,current_date) end;
  select * into v_existing from public.user_leveling_schedule where user_id=new.user_id and revision_id=new.id;
  if v_existing.id is null then
    insert into public.user_leveling_schedule(user_id,revision_id,lesson_id,leveling_number,recommended_for,status)
    values(new.user_id,new.id,new.lesson_id,new.revision_number,v_base+1,'draft');
  elsif v_existing.status='draft' then
    update public.user_leveling_schedule set lesson_id=new.lesson_id,leveling_number=new.revision_number,recommended_for=v_base+1,updated_at=now() where id=v_existing.id;
  end if;
  return new;
end $$;
drop trigger if exists mt_sync_leveling_schedule_trigger on public.user_revisions;
create trigger mt_sync_leveling_schedule_trigger after insert or update of scheduled_for,status,reread_confirmed_at,completed_at on public.user_revisions for each row execute function public.mt_sync_leveling_schedule_from_revision();

insert into public.user_leveling_schedule(user_id,revision_id,lesson_id,leveling_number,recommended_for,status)
select r.user_id,r.id,r.lesson_id,r.revision_number,(case when r.completed_at is not null then r.completed_at::date else coalesce(r.scheduled_for,r.recommended_for) end)+1,'draft'
from public.user_revisions r where r.status in ('scheduled','completed') and coalesce(r.scheduled_for,r.recommended_for) is not null
on conflict(user_id,revision_id) do nothing;

create or replace function public.set_leveling_schedule(p_leveling_id uuid,p_date date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_row public.user_leveling_schedule%rowtype;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if; if p_date is null then raise exception 'Escolha uma data'; end if;
  update public.user_leveling_schedule set scheduled_for=p_date,status=case when status='completed' then status else 'scheduled' end,updated_at=now()
  where id=p_leveling_id and user_id=v_user_id returning * into v_row;
  if v_row.id is null then raise exception 'Nivelamento não encontrado'; end if;
  return jsonb_build_object('id',v_row.id,'scheduled_for',v_row.scheduled_for,'status',v_row.status);
end $$;

create or replace function public.start_leveling_calendar_attempt(p_leveling_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_row public.user_leveling_schedule%rowtype; v_count integer:=10; v_required integer:=9; v_attempt_id uuid; v_ids uuid[]; v_i integer; v_available integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user_id::text||':leveling-calendar:'||p_leveling_id::text));
  select * into v_row from public.user_leveling_schedule where id=p_leveling_id and user_id=v_user_id;
  if v_row.id is null then raise exception 'Nivelamento não encontrado'; end if; if v_row.status='completed' then raise exception 'Nivelamento já concluído'; end if;
  if v_row.scheduled_for is null then raise exception 'Agende o nivelamento antes de iniciar'; end if;
  select coalesce(question_count,10),coalesce(required_correct,9) into v_count,v_required from public.lesson_leveling_settings where lesson_id=v_row.lesson_id;
  v_count:=coalesce(v_count,10);v_required:=coalesce(v_required,least(9,v_count));
  select count(*) into v_available from public.questions where lesson_id=v_row.lesson_id and active=true;
  if v_available<v_count then raise exception 'Há apenas % questões para um nivelamento de %',v_available,v_count; end if;
  select id into v_attempt_id from public.question_attempts where user_id=v_user_id and leveling_schedule_id=p_leveling_id and kind='leveling' and status='in_progress' order by started_at desc limit 1;
  if v_attempt_id is not null then return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',true,'required_count',v_count,'required_correct',v_required); end if;
  select array_agg(id) into v_ids from(
    select q.id from public.questions q where q.lesson_id=v_row.lesson_id and q.active=true
    order by case when exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id and a.is_correct=false) then 0 when not exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id) then 1 else 2 end,q.level desc,random() limit v_count
  ) x;
  insert into public.question_attempts(user_id,lesson_id,revision_id,kind,status,total,required_correct,leveling_schedule_id)
  values(v_user_id,v_row.lesson_id,v_row.revision_id,'leveling','in_progress',v_count,v_required,p_leveling_id) returning id into v_attempt_id;
  for v_i in 1..array_length(v_ids,1) loop insert into public.question_attempt_items(attempt_id,question_id,position) values(v_attempt_id,v_ids[v_i],v_i); end loop;
  update public.user_leveling_schedule set status='in_progress',updated_at=now() where id=p_leveling_id;
  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',false,'required_count',v_count,'required_correct',v_required);
end $$;

create or replace function public.get_leveling_calendar()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_plan_id uuid;v_rows jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  with rows as(
    select ls.id,ls.revision_id,ls.leveling_number,ls.lesson_id,l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
      ls.recommended_for,ls.scheduled_for,ls.status,
      coalesce(st.question_count,10) required_count,coalesce(st.required_correct,9) required_correct,
      (select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.leveling_schedule_id=ls.id order by qa.started_at desc limit 1) attempt_id
    from public.user_leveling_schedule ls join public.study_lessons l on l.id=ls.lesson_id join public.study_subjects s on s.id=l.subject_id
    left join public.lesson_leveling_settings st on st.lesson_id=l.id
    where ls.user_id=v_user_id and s.plan_id=v_plan_id order by coalesce(ls.scheduled_for,ls.recommended_for),ls.leveling_number
  ) select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into v_rows from rows;
  return jsonb_build_object('events',v_rows);
end $$;

-- 4) Tentativas e conclusão: listas da central não alteram a etapa teoria/lista do cronograma.
create or replace function public.finalize_question_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_attempt public.question_attempts%rowtype;v_answered integer;v_score integer;v_mode text;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id;
  if v_attempt.id is null then raise exception 'Tentativa não encontrada'; end if;
  if v_attempt.status='completed' then return jsonb_build_object('score',v_attempt.score,'total',v_attempt.total,'percentage',round(v_attempt.score::numeric*100/v_attempt.total,1)); end if;
  select count(*),count(*) filter(where is_correct) into v_answered,v_score from public.question_attempt_items where attempt_id=p_attempt_id and selected_answer is not null;
  if v_answered<v_attempt.total then raise exception 'Responda todas as % questões antes de finalizar',v_attempt.total; end if;
  update public.question_attempts set status='completed',score=v_score,completed_at=now(),updated_at=now() where id=p_attempt_id;
  if v_attempt.kind='lesson_list' and v_attempt.practice_list_number is null then
    select theory_mode into v_mode from public.user_lesson_progress where user_id=v_user_id and lesson_id=v_attempt.lesson_id;
    perform public.save_lesson_progress(v_attempt.lesson_id,true,true,v_mode,true,true);
  end if;
  return jsonb_build_object('score',v_score,'total',v_attempt.total,'percentage',round(v_score::numeric*100/v_attempt.total,1));
end $$;

create or replace function public.finalize_leveling_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_attempt public.question_attempts%rowtype;v_answered integer;v_score integer;v_required integer;v_round integer;v_passed boolean;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id and kind='leveling';
  if v_attempt.id is null then raise exception 'Nivelamento não encontrado'; end if;
  v_required:=coalesce(v_attempt.required_correct,least(9,v_attempt.total));
  if v_attempt.status='completed' then return jsonb_build_object('score',v_attempt.score,'total',v_attempt.total,'required_correct',v_required,'passed',v_attempt.score>=v_required,'percentage',round(v_attempt.score::numeric*100/v_attempt.total,1)); end if;
  select count(*),count(*) filter(where is_correct) into v_answered,v_score from public.question_attempt_items where attempt_id=p_attempt_id and selected_answer is not null;
  if v_answered<v_attempt.total then raise exception 'Responda todas as % questões antes de finalizar',v_attempt.total; end if;
  v_passed:=v_score>=v_required;
  update public.question_attempts set status='completed',score=v_score,completed_at=now(),updated_at=now() where id=p_attempt_id;
  select coalesce(max(round),0)+1 into v_round from public.user_leveling_attempts where revision_id=v_attempt.revision_id;
  insert into public.user_leveling_attempts(user_id,revision_id,round,score,passed,total_questions,required_correct) values(v_user_id,v_attempt.revision_id,v_round,v_score,v_passed,v_attempt.total,v_required);
  if v_passed then
    update public.user_revisions set status='completed',completed_at=coalesce(completed_at,now()),updated_at=now() where id=v_attempt.revision_id and user_id=v_user_id;
    if v_attempt.leveling_schedule_id is not null then update public.user_leveling_schedule set status='completed',completed_at=now(),updated_at=now() where id=v_attempt.leveling_schedule_id and user_id=v_user_id; end if;
  elsif v_attempt.leveling_schedule_id is not null then update public.user_leveling_schedule set status='scheduled',updated_at=now() where id=v_attempt.leveling_schedule_id and user_id=v_user_id; end if;
  return jsonb_build_object('score',v_score,'total',v_attempt.total,'required_correct',v_required,'passed',v_passed,'round',v_round,'percentage',round(v_score::numeric*100/v_attempt.total,1));
end $$;

-- trigger de revisão de lista: central independente gera R1 apenas pela Lista 1.
create or replace function public.mt_schedule_list_review_from_attempt()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_review public.user_list_reviews%rowtype;v_next integer;
begin
  if old.status is distinct from new.status and new.status='completed' then
    if new.kind='lesson_list' and new.lesson_id is not null and (new.practice_list_number is null or new.practice_list_number=1) then
      insert into public.user_list_reviews(user_id,lesson_id,review_number,recommended_for,status) values(new.user_id,new.lesson_id,1,current_date+public.mt_list_review_gap_days(1),'draft') on conflict(user_id,lesson_id,review_number) do nothing;
    elsif new.kind='list_review' and new.list_review_id is not null then
      update public.user_list_reviews set status='completed',completed_at=coalesce(completed_at,now()),updated_at=now() where id=new.list_review_id and user_id=new.user_id returning * into v_review;
      if v_review.id is not null and v_review.review_number<4 then v_next:=v_review.review_number+1;insert into public.user_list_reviews(user_id,lesson_id,review_number,recommended_for,status) values(new.user_id,new.lesson_id,v_next,current_date+public.mt_list_review_gap_days(v_next),'draft') on conflict(user_id,lesson_id,review_number) do nothing;end if;
      if to_regprocedure('public.mt_award_xp_internal(uuid,text,text,integer,jsonb)') is not null then perform public.mt_award_xp_internal(new.user_id,'list_review_completed','list-review:'||new.list_review_id::text,70,jsonb_build_object('review_id',new.list_review_id,'lesson_id',new.lesson_id));end if;
    end if;
  end if;return new;
end $$;

-- 5) Hub de listas com três listas por aula.
create or replace function public.get_list_learning_hub()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_plan_id uuid;v_catalog jsonb;v_reviews jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if; select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído';end if;
  with day_map as(
    select b.week_id,b.study_date,dense_rank() over(partition by b.week_id order by b.study_date)::integer day_number from public.study_schedule_blocks b join public.study_weeks w on w.id=b.week_id where w.plan_id=v_plan_id and w.active=true and w.week_number<90 group by b.week_id,b.study_date
  ), rows as(
    select distinct w.week_number,dm.day_number,b.study_date,l.id lesson_id,l.title lesson_title,l.slug lesson_slug,l.question_count,s.name subject_name,s.slug subject_slug,
      (lp.theory_completed_at is not null) theory_completed,(lp.list_completed_at is not null) list_completed,
      (select count(*)::integer from public.questions q where q.plan_id=v_plan_id and q.lesson_id=l.id and q.active=true) available_count,
      jsonb_build_array(
        jsonb_build_object('list_number',1,'size',35,'cumulative_required',35,'unlocked',(select count(*) from public.questions q where q.plan_id=v_plan_id and q.lesson_id=l.id and q.active)>=35,'attempt_id',(select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=1 order by qa.started_at desc limit 1),'status',(select qa.status from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=1 order by qa.started_at desc limit 1),'score',(select qa.score from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=1 order by qa.started_at desc limit 1)),
        jsonb_build_object('list_number',2,'size',20,'cumulative_required',55,'unlocked',(select count(*) from public.questions q where q.plan_id=v_plan_id and q.lesson_id=l.id and q.active)>=55,'attempt_id',(select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=2 order by qa.started_at desc limit 1),'status',(select qa.status from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=2 order by qa.started_at desc limit 1),'score',(select qa.score from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=2 order by qa.started_at desc limit 1)),
        jsonb_build_object('list_number',3,'size',15,'cumulative_required',70,'unlocked',(select count(*) from public.questions q where q.plan_id=v_plan_id and q.lesson_id=l.id and q.active)>=70,'attempt_id',(select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=3 order by qa.started_at desc limit 1),'status',(select qa.status from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=3 order by qa.started_at desc limit 1),'score',(select qa.score from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=3 order by qa.started_at desc limit 1))
      ) practice_lists
    from public.study_weeks w join public.study_schedule_blocks b on b.week_id=w.id join day_map dm on dm.week_id=b.week_id and dm.study_date=b.study_date join public.study_schedule_block_lessons bl on bl.block_id=b.id join public.study_lessons l on l.id=bl.lesson_id and l.active=true join public.study_subjects s on s.id=l.subject_id and s.active=true left join public.user_lesson_progress lp on lp.user_id=v_user_id and lp.lesson_id=l.id where w.plan_id=v_plan_id and w.active=true and w.week_number<90
  ) select coalesce(jsonb_agg(to_jsonb(rows) order by week_number,day_number,subject_name,lesson_title),'[]'::jsonb) into v_catalog from rows;
  with rr as(select r.id,r.review_number,r.recommended_for,r.scheduled_for,r.status,r.wrong_count,r.new_count,l.id lesson_id,l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,(select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.list_review_id=r.id order by qa.started_at desc limit 1) attempt_id from public.user_list_reviews r join public.study_lessons l on l.id=r.lesson_id join public.study_subjects s on s.id=l.subject_id where r.user_id=v_user_id and s.plan_id=v_plan_id order by coalesce(r.scheduled_for,r.recommended_for),r.review_number) select coalesce(jsonb_agg(to_jsonb(rr)),'[]'::jsonb) into v_reviews from rr;
  return jsonb_build_object('catalog',v_catalog,'reviews',v_reviews);
end $$;

-- 6) Metadados da tentativa para retorno correto ao hub.
create or replace function public.get_attempt_experience_meta(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_attempt public.question_attempts%rowtype;v_revision_number integer;v_session_questions integer:=0;v_session_correct integer:=0;v_session_seconds integer:=0;v_elapsed integer:=0;v_rank jsonb;v_xp jsonb;
begin
 if v_user_id is null then raise exception 'Usuário não autenticado';end if;select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id;if v_attempt.id is null then raise exception 'Tentativa não encontrada';end if;
 if v_attempt.revision_id is not null then select revision_number into v_revision_number from public.user_revisions where id=v_attempt.revision_id and user_id=v_user_id;end if;
 v_elapsed:=greatest(0,extract(epoch from(coalesce(v_attempt.completed_at,now())-v_attempt.started_at))::integer);
 if v_attempt.kind='leveling' and v_attempt.revision_id is not null then select coalesce(sum(total),0)::integer,coalesce(sum(score),0)::integer,coalesce(sum(greatest(0,extract(epoch from(coalesce(completed_at,now())-started_at)))),0)::integer into v_session_questions,v_session_correct,v_session_seconds from public.question_attempts where user_id=v_user_id and revision_id=v_attempt.revision_id and kind='leveling' and(status='completed' or id=p_attempt_id);else v_session_questions:=v_attempt.total;v_session_correct:=coalesce(v_attempt.score,0);v_session_seconds:=v_elapsed;end if;
 select public.get_my_xp_dashboard() into v_xp;v_rank:=v_xp->'rank';
 return jsonb_build_object('attempt_id',v_attempt.id,'kind',v_attempt.kind,'status',v_attempt.status,'revision_id',v_attempt.revision_id,'revision_number',v_revision_number,'required_correct',v_attempt.required_correct,'score',v_attempt.score,'total',v_attempt.total,'elapsed_seconds',v_elapsed,'session_questions',v_session_questions,'session_correct',v_session_correct,'session_seconds',v_session_seconds,'practice_list_number',v_attempt.practice_list_number,'list_review_id',v_attempt.list_review_id,'leveling_schedule_id',v_attempt.leveling_schedule_id,'xp',v_xp,'rank',v_rank);
end $$;

-- 7) Relatório e acerto global respeitam o novo marco de desempenho.
create or replace function public.get_my_question_performance()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_plan_id uuid;v_result jsonb;v_cutoff timestamptz;
begin
 if v_user_id is null then raise exception 'Usuário não autenticado';end if;select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;select reset_at into v_cutoff from public.user_performance_resets where user_id=v_user_id;
 if v_plan_id is null then return jsonb_build_object('total_answered',0,'correct_count',0,'incorrect_count',0,'accuracy',0,'today_answered',0,'last7_answered',0,'subjects','[]'::jsonb,'daily','[]'::jsonb);end if;
 with answer_rows as(select a.id,a.is_correct,a.answered_at,q.subject_id,s.name subject_name,(a.answered_at at time zone 'America/Sao_Paulo')::date local_day from public.user_question_answers a join public.questions q on q.id=a.question_id join public.study_subjects s on s.id=q.subject_id where a.user_id=v_user_id and q.plan_id=v_plan_id and (v_cutoff is null or a.answered_at>=v_cutoff)),overall as(select count(*)::integer total_answered,count(*) filter(where is_correct)::integer correct_count,count(*) filter(where not is_correct)::integer incorrect_count,case when count(*)=0 then 0::numeric else round(count(*) filter(where is_correct)::numeric*100/count(*),1) end accuracy,count(*) filter(where local_day=(now() at time zone 'America/Sao_Paulo')::date)::integer today_answered,count(*) filter(where local_day>=(now() at time zone 'America/Sao_Paulo')::date-6)::integer last7_answered from answer_rows),subject_stats as(select subject_id,subject_name,count(*)::integer total,count(*) filter(where is_correct)::integer correct,count(*) filter(where not is_correct)::integer incorrect,case when count(*)=0 then 0::numeric else round(count(*) filter(where is_correct)::numeric*100/count(*),1) end accuracy from answer_rows group by subject_id,subject_name),days as(select generate_series((now() at time zone 'America/Sao_Paulo')::date-6,(now() at time zone 'America/Sao_Paulo')::date,interval '1 day')::date as day),daily_stats as(select d.day,count(a.id)::integer total,count(a.id) filter(where a.is_correct)::integer correct,count(a.id) filter(where a.id is not null and not a.is_correct)::integer incorrect from days d left join answer_rows a on a.local_day=d.day group by d.day order by d.day)
 select jsonb_build_object('total_answered',o.total_answered,'correct_count',o.correct_count,'incorrect_count',o.incorrect_count,'accuracy',o.accuracy,'today_answered',o.today_answered,'last7_answered',o.last7_answered,'subjects',coalesce((select jsonb_agg(jsonb_build_object('subject_name',ss.subject_name,'total',ss.total,'correct',ss.correct,'incorrect',ss.incorrect,'accuracy',ss.accuracy) order by ss.total desc,ss.subject_name) from subject_stats ss),'[]'::jsonb),'daily',coalesce((select jsonb_agg(jsonb_build_object('day',ds.day,'total',ds.total,'correct',ds.correct,'incorrect',ds.incorrect) order by ds.day) from daily_stats ds),'[]'::jsonb)) into v_result from overall o;return v_result;
end $$;

create or replace function public.get_my_xp_dashboard()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_total bigint;v_level integer;v_floor bigint;v_next bigint;v_recent jsonb;v_today integer;v_answers integer;v_correct integer;v_cutoff timestamptz;
begin
 if v_user_id is null then raise exception 'Usuário não autenticado';end if;insert into public.user_xp_profiles(user_id) values(v_user_id) on conflict(user_id) do nothing;select total_xp into v_total from public.user_xp_profiles where user_id=v_user_id;v_level:=public.mt_level_for_xp(v_total);v_floor:=public.mt_total_xp_for_level(v_level);v_next:=public.mt_total_xp_for_level(v_level+1);perform public.mt_unlock_rank_achievements(v_user_id,v_level);
 select coalesce(jsonb_agg(to_jsonb(x) order by x.unlocked_at desc),'[]'::jsonb) into v_recent from(select code,title,tier,unlocked_at from public.user_achievements where user_id=v_user_id order by unlocked_at desc limit 8)x;select coalesce(sum(xp),0)::integer into v_today from public.user_xp_events where user_id=v_user_id and created_at>=date_trunc('day',now()) and created_at<date_trunc('day',now())+interval '1 day';select reset_at into v_cutoff from public.user_performance_resets where user_id=v_user_id;select count(*),count(*) filter(where is_correct) into v_answers,v_correct from public.user_question_answers where user_id=v_user_id and(v_cutoff is null or answered_at>=v_cutoff);
 return jsonb_build_object('total_xp',v_total,'level',v_level,'rank',public.mt_rank_for_level(v_level),'level_xp',v_total-v_floor,'level_required',v_next-v_floor,'xp_to_next',v_next-v_total,'progress_percent',case when v_next=v_floor then 100 else round(((v_total-v_floor)::numeric*100/(v_next-v_floor)),1) end,'today_xp',v_today,'answers_total',v_answers,'answers_correct',v_correct,'recent_achievements',v_recent);
end $$;

commit;
