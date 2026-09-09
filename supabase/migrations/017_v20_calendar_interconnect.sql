-- Mentoria Titã V2.0
-- Calendários interconectados por origem, nivelamentos após revisão correspondente,
-- listas robustas e desbloqueio por revisão.

-- 1) Permite que um nivelamento venha do calendário principal OU do calendário das listas.
alter table public.user_leveling_schedule alter column revision_id drop not null;
alter table public.user_leveling_schedule add column if not exists list_review_id uuid;
alter table public.user_leveling_schedule add column if not exists calendar_scope text not null default 'principal';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conrelid='public.user_leveling_schedule'::regclass
      and conname='user_leveling_schedule_list_review_id_fkey'
  ) then
    alter table public.user_leveling_schedule
      add constraint user_leveling_schedule_list_review_id_fkey
      foreign key (list_review_id) references public.user_list_reviews(id) on delete cascade;
  end if;
end $$;

alter table public.user_leveling_schedule drop constraint if exists user_leveling_schedule_user_id_revision_id_key;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conrelid='public.user_leveling_schedule'::regclass
      and conname='user_leveling_schedule_calendar_scope_check'
  ) then
    alter table public.user_leveling_schedule
      add constraint user_leveling_schedule_calendar_scope_check
      check (calendar_scope in ('principal','list'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conrelid='public.user_leveling_schedule'::regclass
      and conname='user_leveling_schedule_source_check'
  ) then
    alter table public.user_leveling_schedule
      add constraint user_leveling_schedule_source_check
      check (
        (calendar_scope='principal' and revision_id is not null and list_review_id is null)
        or
        (calendar_scope='list' and list_review_id is not null and revision_id is null)
      ) not valid;
  end if;
end $$;

update public.user_leveling_schedule
set calendar_scope='principal', list_review_id=null
where revision_id is not null;

create unique index if not exists user_leveling_schedule_principal_source_uidx
  on public.user_leveling_schedule(user_id,revision_id)
  where revision_id is not null;
create unique index if not exists user_leveling_schedule_list_source_uidx
  on public.user_leveling_schedule(user_id,list_review_id)
  where list_review_id is not null;
create index if not exists user_leveling_schedule_scope_date_idx
  on public.user_leveling_schedule(user_id,calendar_scope,scheduled_for,status);

-- 2) Calendário principal: só cria o nivelamento depois que a revisão ganha uma data.
-- A data do nivelamento é SEMPRE o dia seguinte à data escolhida para a revisão.
create or replace function public.mt_sync_leveling_schedule_from_revision()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_existing public.user_leveling_schedule%rowtype; v_date date;
begin
  if new.scheduled_for is null then return new; end if;
  v_date := new.scheduled_for + 1;
  select * into v_existing
  from public.user_leveling_schedule
  where user_id=new.user_id and revision_id=new.id and calendar_scope='principal'
  order by created_at desc limit 1;

  if v_existing.id is null then
    insert into public.user_leveling_schedule(
      user_id,revision_id,list_review_id,lesson_id,leveling_number,
      recommended_for,scheduled_for,status,calendar_scope
    ) values(
      new.user_id,new.id,null,new.lesson_id,new.revision_number,
      v_date,v_date,'scheduled','principal'
    );
  elsif v_existing.status not in ('in_progress','completed') then
    update public.user_leveling_schedule
    set lesson_id=new.lesson_id,
        leveling_number=new.revision_number,
        recommended_for=v_date,
        scheduled_for=v_date,
        status='scheduled',
        calendar_scope='principal',
        updated_at=now()
    where id=v_existing.id;
  end if;
  return new;
end $$;

drop trigger if exists mt_sync_leveling_schedule_trigger on public.user_revisions;
create trigger mt_sync_leveling_schedule_trigger
  after insert or update of scheduled_for,status,completed_at on public.user_revisions
  for each row execute function public.mt_sync_leveling_schedule_from_revision();

-- 3) Calendário exclusivo das listas: revisão de lista -> nivelamento no dia seguinte,
-- sem vazar para o calendário principal.
create or replace function public.mt_sync_leveling_schedule_from_list_review()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_existing public.user_leveling_schedule%rowtype; v_date date;
begin
  if new.scheduled_for is null then return new; end if;
  v_date := new.scheduled_for + 1;
  select * into v_existing
  from public.user_leveling_schedule
  where user_id=new.user_id and list_review_id=new.id and calendar_scope='list'
  order by created_at desc limit 1;

  if v_existing.id is null then
    insert into public.user_leveling_schedule(
      user_id,revision_id,list_review_id,lesson_id,leveling_number,
      recommended_for,scheduled_for,status,calendar_scope
    ) values(
      new.user_id,null,new.id,new.lesson_id,new.review_number,
      v_date,v_date,'scheduled','list'
    );
  elsif v_existing.status not in ('in_progress','completed') then
    update public.user_leveling_schedule
    set lesson_id=new.lesson_id,
        leveling_number=new.review_number,
        recommended_for=v_date,
        scheduled_for=v_date,
        status='scheduled',
        calendar_scope='list',
        updated_at=now()
    where id=v_existing.id;
  end if;
  return new;
end $$;

drop trigger if exists mt_sync_list_leveling_schedule_trigger on public.user_list_reviews;
create trigger mt_sync_list_leveling_schedule_trigger
  after insert or update of scheduled_for,status,completed_at on public.user_list_reviews
  for each row execute function public.mt_sync_leveling_schedule_from_list_review();

-- Backfill sem duplicar.
insert into public.user_leveling_schedule(
  user_id,revision_id,list_review_id,lesson_id,leveling_number,
  recommended_for,scheduled_for,status,calendar_scope
)
select r.user_id,r.id,null,r.lesson_id,r.revision_number,
       r.scheduled_for+1,r.scheduled_for+1,'scheduled','principal'
from public.user_revisions r
where r.scheduled_for is not null
  and not exists(
    select 1 from public.user_leveling_schedule ls
    where ls.user_id=r.user_id and ls.revision_id=r.id
  );

insert into public.user_leveling_schedule(
  user_id,revision_id,list_review_id,lesson_id,leveling_number,
  recommended_for,scheduled_for,status,calendar_scope
)
select r.user_id,null,r.id,r.lesson_id,r.review_number,
       r.scheduled_for+1,r.scheduled_for+1,'scheduled','list'
from public.user_list_reviews r
where r.scheduled_for is not null
  and not exists(
    select 1 from public.user_leveling_schedule ls
    where ls.user_id=r.user_id and ls.list_review_id=r.id
  );

update public.user_leveling_schedule ls
set recommended_for=r.scheduled_for+1,
    scheduled_for=r.scheduled_for+1,
    calendar_scope='principal',updated_at=now()
from public.user_revisions r
where ls.revision_id=r.id and r.scheduled_for is not null
  and ls.status not in ('in_progress','completed');

update public.user_leveling_schedule ls
set recommended_for=r.scheduled_for+1,
    scheduled_for=r.scheduled_for+1,
    calendar_scope='list',updated_at=now()
from public.user_list_reviews r
where ls.list_review_id=r.id and r.scheduled_for is not null
  and ls.status not in ('in_progress','completed');

-- 4) Listas: o card liberado sempre inicia se existir ao menos uma questão.
-- Lista 2 depende apenas da conclusão da Lista 1; Lista 3 depende da Lista 2.
-- Quando há poucas questões inéditas, completa com questões da aula para não falhar.
create or replace function public.start_practice_list_attempt(p_lesson_id uuid,p_list_number integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_plan_id uuid; v_target integer; v_available integer;
  v_attempt_id uuid; v_status text; v_prev_status text; v_ids uuid[]:=array[]::uuid[];
  v_i integer; v_actual integer; v_unused uuid[]; v_fill uuid[]; v_unused_count integer:=0;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_list_number not between 1 and 3 then raise exception 'Lista inválida'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  if not exists(
    select 1 from public.study_lessons l join public.study_subjects s on s.id=l.subject_id
    where l.id=p_lesson_id and s.plan_id=v_plan_id and l.active and s.active
  ) then raise exception 'Aula indisponível'; end if;

  v_target:=case p_list_number when 1 then 35 when 2 then 20 else 15 end;
  perform pg_advisory_xact_lock(hashtext(v_user_id::text||':practice-v20:'||p_lesson_id::text||':'||p_list_number::text));

  select id,status into v_attempt_id,v_status
  from public.question_attempts
  where user_id=v_user_id and lesson_id=p_lesson_id and kind='lesson_list'
    and practice_list_number=p_list_number
  order by started_at desc limit 1;
  if v_attempt_id is not null then
    return jsonb_build_object(
      'ok',true,'attempt_id',v_attempt_id,'continued',v_status='in_progress',
      'completed',v_status='completed','list_size',(select total from public.question_attempts where id=v_attempt_id)
    );
  end if;

  if p_list_number>1 then
    select status into v_prev_status
    from public.question_attempts
    where user_id=v_user_id and lesson_id=p_lesson_id and kind='lesson_list'
      and practice_list_number=p_list_number-1
    order by started_at desc limit 1;
    if v_prev_status is distinct from 'completed' then
      return jsonb_build_object('ok',false,'reason','previous_list','required_previous',p_list_number-1,'list_size',v_target);
    end if;
  end if;

  select count(*)::integer into v_available
  from public.questions
  where plan_id=v_plan_id and lesson_id=p_lesson_id and active=true;
  if v_available<=0 then
    return jsonb_build_object('ok',false,'reason','no_questions','available_count',0,'required_count',1,'list_size',v_target);
  end if;
  v_actual:=least(v_target,v_available);

  -- Primeiro pega questões ainda não usadas nas listas anteriores da própria área de listas.
  select coalesce(array_agg(id),array[]::uuid[]) into v_unused from (
    select q.id
    from public.questions q
    where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true
      and not exists(
        select 1 from public.question_attempts pa
        join public.question_attempt_items pi on pi.attempt_id=pa.id
        where pa.user_id=v_user_id and pa.lesson_id=p_lesson_id
          and pa.practice_list_number is not null
          and pa.practice_list_number<p_list_number
          and pi.question_id=q.id
      )
    order by case when not exists(
      select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id
    ) then 0 else 1 end, random()
    limit v_actual
  ) picked;
  v_unused_count:=coalesce(array_length(v_unused,1),0);
  v_ids:=v_unused;

  -- Se não bastar, preenche sem quebrar o botão. Repetição é só fallback.
  if v_unused_count<v_actual then
    select coalesce(array_agg(id),array[]::uuid[]) into v_fill from (
      select q.id
      from public.questions q
      where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true
        and not (q.id=any(v_ids))
      order by case when not exists(
        select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id
      ) then 0 else 1 end, random()
      limit (v_actual-v_unused_count)
    ) fillq;
    v_ids:=v_ids||v_fill;
  end if;

  if coalesce(array_length(v_ids,1),0)<=0 then
    return jsonb_build_object('ok',false,'reason','compose_failed','available_count',v_available,'required_count',v_actual,'list_size',v_target);
  end if;
  v_actual:=array_length(v_ids,1);

  insert into public.question_attempts(user_id,lesson_id,kind,status,total,practice_list_number,practice_list_size)
  values(v_user_id,p_lesson_id,'lesson_list','in_progress',v_actual,p_list_number,v_actual)
  returning id into v_attempt_id;
  for v_i in 1..v_actual loop
    insert into public.question_attempt_items(attempt_id,question_id,position)
    values(v_attempt_id,v_ids[v_i],v_i);
  end loop;
  return jsonb_build_object(
    'ok',true,'attempt_id',v_attempt_id,'continued',false,'completed',false,
    'list_size',v_actual,'target_size',v_target,'available_count',v_available,
    'reused_fallback',v_unused_count<v_actual
  );
end $$;

-- 5) Estado do nivelamento manual: NIVEL N é liberado somente após a REVISÃO N da aula.
-- Vale tanto uma revisão do calendário principal quanto uma revisão do calendário das listas.
create or replace function public.mt_manual_level_state(p_user_id uuid,p_plan_id uuid,p_lesson_id uuid,p_level integer)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  v_available integer:=0; v_revision_done boolean:=false; v_passed boolean:=false;
  v_attempt_id uuid; v_score integer; v_total integer; v_best integer; v_calendar_passed boolean:=false;
begin
  select count(*)::integer into v_available
  from public.questions q
  where q.plan_id=p_plan_id and q.lesson_id=p_lesson_id and q.active=true and q.level=p_level;

  select (
    exists(select 1 from public.user_revisions r where r.user_id=p_user_id and r.lesson_id=p_lesson_id and r.revision_number=p_level and r.status='completed')
    or exists(select 1 from public.user_list_reviews r where r.user_id=p_user_id and r.lesson_id=p_lesson_id and r.review_number=p_level and r.status='completed')
  ) into v_revision_done;

  select exists(
    select 1 from public.question_attempts a
    where a.user_id=p_user_id and a.lesson_id=p_lesson_id and a.kind='leveling'
      and a.manual_leveling_level=p_level and a.status='completed'
      and coalesce(a.score,0)>=coalesce(a.required_correct,ceil(a.total*.9)::integer)
  ) into v_passed;

  select exists(
    select 1
    from public.user_leveling_schedule ls
    where ls.user_id=p_user_id and ls.lesson_id=p_lesson_id and ls.leveling_number=p_level and ls.status='completed'
  ) into v_calendar_passed;
  v_passed:=v_passed or v_calendar_passed;

  select a.id,a.score,a.total into v_attempt_id,v_score,v_total
  from public.question_attempts a
  where a.user_id=p_user_id and a.lesson_id=p_lesson_id and a.kind='leveling'
    and a.manual_leveling_level=p_level and a.status='in_progress'
  order by a.started_at desc limit 1;

  select max(coalesce(a.score,0)) into v_best
  from public.question_attempts a
  where a.user_id=p_user_id and a.lesson_id=p_lesson_id and a.kind='leveling'
    and a.manual_leveling_level=p_level and a.status='completed';

  return jsonb_build_object(
    'level',p_level,
    'available_count',v_available,
    'revision_completed',v_revision_done,
    'unlocked',v_revision_done,
    'no_questions',v_available=0,
    'attempt_id',v_attempt_id,
    'status',case when v_passed then 'completed' when v_attempt_id is not null then 'in_progress' else null end,
    'score',coalesce(v_score,v_best),
    'total',v_total,
    'passed',v_passed,
    'locked_reason',case
      when not v_revision_done then 'Conclua a Revisão '||p_level::text||' desta aula'
      when v_available=0 then 'Sem questões disponíveis. Em poucos momentos serão disponibilizadas.'
      else null end
  );
end $$;

create or replace function public.start_manual_leveling_attempt(p_lesson_id uuid,p_level integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_plan_id uuid; v_available integer; v_target integer; v_required integer;
  v_attempt_id uuid; v_ids uuid[]; v_i integer; v_revision_done boolean:=false;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_level not between 1 and 4 then raise exception 'Nível inválido'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  if not exists(
    select 1 from public.study_lessons l join public.study_subjects s on s.id=l.subject_id
    where l.id=p_lesson_id and s.plan_id=v_plan_id and l.active and s.active
  ) then raise exception 'Aula indisponível'; end if;

  select (
    exists(select 1 from public.user_revisions r where r.user_id=v_user_id and r.lesson_id=p_lesson_id and r.revision_number=p_level and r.status='completed')
    or exists(select 1 from public.user_list_reviews r where r.user_id=v_user_id and r.lesson_id=p_lesson_id and r.review_number=p_level and r.status='completed')
  ) into v_revision_done;
  if not v_revision_done then
    return jsonb_build_object('ok',false,'reason','revision_required','required_revision',p_level,'level',p_level);
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text||':manual-level-v20:'||p_lesson_id::text||':'||p_level::text));
  select id into v_attempt_id
  from public.question_attempts
  where user_id=v_user_id and lesson_id=p_lesson_id and kind='leveling'
    and manual_leveling_level=p_level and status='in_progress'
  order by started_at desc limit 1;
  if v_attempt_id is not null then
    return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',true,'level',p_level);
  end if;

  select count(*)::integer into v_available
  from public.questions q
  where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true and q.level=p_level;
  if v_available<=0 then
    return jsonb_build_object('ok',false,'reason','no_questions','available_count',0,'level',p_level);
  end if;
  v_target:=least(10,v_available); v_required:=greatest(1,ceil(v_target*.9)::integer);
  select array_agg(id) into v_ids from (
    select q.id from public.questions q
    where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true and q.level=p_level
    order by case
      when exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id and a.is_correct=false) then 0
      when not exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id) then 1
      else 2 end,
      random()
    limit v_target
  ) picked;

  insert into public.question_attempts(user_id,lesson_id,kind,status,total,required_correct,manual_leveling_level)
  values(v_user_id,p_lesson_id,'leveling','in_progress',v_target,v_required,p_level)
  returning id into v_attempt_id;
  for v_i in 1..array_length(v_ids,1) loop
    insert into public.question_attempt_items(attempt_id,question_id,position)
    values(v_attempt_id,v_ids[v_i],v_i);
  end loop;
  return jsonb_build_object(
    'ok',true,'attempt_id',v_attempt_id,'continued',false,'level',p_level,
    'required_count',v_target,'required_correct',v_required,'available_count',v_available
  );
end $$;

-- 6) Um nivelamento agendado só pode iniciar depois que a revisão correspondente foi concluída.
create or replace function public.start_leveling_calendar_attempt(p_leveling_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_plan_id uuid; v_row public.user_leveling_schedule%rowtype;
  v_source_done boolean:=false; v_level integer; v_available integer; v_target integer; v_required integer;
  v_attempt_id uuid; v_ids uuid[]; v_i integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  select * into v_row from public.user_leveling_schedule where id=p_leveling_id and user_id=v_user_id;
  if v_row.id is null then raise exception 'Nivelamento não encontrado'; end if;
  if v_row.status='completed' then
    select id into v_attempt_id from public.question_attempts
    where user_id=v_user_id and leveling_schedule_id=v_row.id and status='completed'
    order by completed_at desc nulls last limit 1;
    return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',false,'completed',true,'level',v_row.leveling_number);
  end if;

  if v_row.calendar_scope='list' then
    select exists(select 1 from public.user_list_reviews r where r.id=v_row.list_review_id and r.user_id=v_user_id and r.status='completed') into v_source_done;
  else
    select exists(select 1 from public.user_revisions r where r.id=v_row.revision_id and r.user_id=v_user_id and r.status='completed') into v_source_done;
  end if;
  if not v_source_done then
    return jsonb_build_object('ok',false,'reason','revision_required','required_revision',v_row.leveling_number,'level',v_row.leveling_number);
  end if;
  if v_row.scheduled_for is null then
    return jsonb_build_object('ok',false,'reason','not_scheduled','level',v_row.leveling_number);
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text||':leveling-calendar-v20:'||p_leveling_id::text));
  select id into v_attempt_id from public.question_attempts
  where user_id=v_user_id and leveling_schedule_id=p_leveling_id and kind='leveling' and status='in_progress'
  order by started_at desc limit 1;
  if v_attempt_id is not null then
    return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',true,'level',v_row.leveling_number);
  end if;

  v_level:=least(4,greatest(1,v_row.leveling_number));
  select count(*)::integer into v_available
  from public.questions q
  where q.plan_id=v_plan_id and q.lesson_id=v_row.lesson_id and q.active=true and q.level=v_level;
  if v_available<=0 then
    return jsonb_build_object('ok',false,'reason','no_questions','available_count',0,'level',v_level);
  end if;
  v_target:=least(10,v_available); v_required:=greatest(1,ceil(v_target*.9)::integer);
  select array_agg(id) into v_ids from (
    select q.id from public.questions q
    where q.plan_id=v_plan_id and q.lesson_id=v_row.lesson_id and q.active=true and q.level=v_level
    order by case
      when exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id and a.is_correct=false) then 0
      when not exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id) then 1
      else 2 end,
      random()
    limit v_target
  ) picked;

  insert into public.question_attempts(user_id,lesson_id,revision_id,kind,status,total,required_correct,leveling_schedule_id)
  values(v_user_id,v_row.lesson_id,v_row.revision_id,'leveling','in_progress',v_target,v_required,p_leveling_id)
  returning id into v_attempt_id;
  for v_i in 1..array_length(v_ids,1) loop
    insert into public.question_attempt_items(attempt_id,question_id,position)
    values(v_attempt_id,v_ids[v_i],v_i);
  end loop;
  update public.user_leveling_schedule set status='in_progress',updated_at=now() where id=p_leveling_id;
  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',false,'level',v_level,'required_count',v_target,'required_correct',v_required);
end $$;

-- Finalização compatível com nivelamento de lista (sem revision_id obrigatório).
create or replace function public.finalize_leveling_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_attempt public.question_attempts%rowtype; v_schedule public.user_leveling_schedule%rowtype;
  v_answered integer; v_score integer; v_required integer; v_round integer; v_passed boolean;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id and kind='leveling';
  if v_attempt.id is null then raise exception 'Nivelamento não encontrado'; end if;
  v_required:=coalesce(v_attempt.required_correct,least(9,v_attempt.total));
  if v_attempt.status='completed' then
    return jsonb_build_object('score',v_attempt.score,'total',v_attempt.total,'required_correct',v_required,'passed',v_attempt.score>=v_required,'percentage',round(v_attempt.score::numeric*100/v_attempt.total,1),'manual_level',v_attempt.manual_leveling_level);
  end if;
  select count(*),count(*) filter(where is_correct) into v_answered,v_score
  from public.question_attempt_items where attempt_id=p_attempt_id and selected_answer is not null;
  if v_answered<v_attempt.total then raise exception 'Responda todas as % questões antes de finalizar',v_attempt.total; end if;
  v_passed:=v_score>=v_required;
  update public.question_attempts set status='completed',score=v_score,completed_at=now(),updated_at=now() where id=p_attempt_id;

  if v_attempt.manual_leveling_level is not null then
    return jsonb_build_object('score',v_score,'total',v_attempt.total,'required_correct',v_required,'passed',v_passed,'percentage',round(v_score::numeric*100/v_attempt.total,1),'manual_level',v_attempt.manual_leveling_level);
  end if;

  if v_attempt.leveling_schedule_id is not null then
    select * into v_schedule from public.user_leveling_schedule where id=v_attempt.leveling_schedule_id and user_id=v_user_id;
    if v_schedule.calendar_scope='list' then
      update public.user_leveling_schedule
      set status=case when v_passed then 'completed' else 'scheduled' end,
          completed_at=case when v_passed then now() else null end,
          updated_at=now()
      where id=v_schedule.id;
      return jsonb_build_object('score',v_score,'total',v_attempt.total,'required_correct',v_required,'passed',v_passed,'percentage',round(v_score::numeric*100/v_attempt.total,1),'calendar_scope','list','level',v_schedule.leveling_number);
    end if;
  end if;

  if v_attempt.revision_id is not null then
    select coalesce(max(round),0)+1 into v_round from public.user_leveling_attempts where revision_id=v_attempt.revision_id;
    insert into public.user_leveling_attempts(user_id,revision_id,round,score,passed,total_questions,required_correct)
    values(v_user_id,v_attempt.revision_id,v_round,v_score,v_passed,v_attempt.total,v_required);
  end if;
  if v_passed then
    if v_attempt.leveling_schedule_id is not null then
      update public.user_leveling_schedule set status='completed',completed_at=now(),updated_at=now() where id=v_attempt.leveling_schedule_id and user_id=v_user_id;
    end if;
  elsif v_attempt.leveling_schedule_id is not null then
    update public.user_leveling_schedule set status='scheduled',completed_at=null,updated_at=now() where id=v_attempt.leveling_schedule_id and user_id=v_user_id;
  end if;
  return jsonb_build_object('score',v_score,'total',v_attempt.total,'required_correct',v_required,'passed',v_passed,'round',v_round,'percentage',round(v_score::numeric*100/v_attempt.total,1),'calendar_scope','principal');
end $$;

-- 7) Hub do calendário principal com TODAS as matérias/aulas do plano e somente eventos principais.
create or replace function public.get_principal_calendar_hub()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_plan_id uuid; v_taxonomy jsonb; v_revisions jsonb; v_levelings jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;

  with rows as (
    select distinct c.subject_id,c.subject_name,c.subject_slug,c.lesson_id,c.lesson_title,c.lesson_slug,c.lesson_position,c.week_number
    from public.study_lesson_catalog c
    where c.plan_id=v_plan_id and c.week_number<90
  ) select coalesce(jsonb_agg(to_jsonb(rows) order by subject_name,week_number,lesson_position),'[]'::jsonb) into v_taxonomy from rows;

  with rows as (
    select r.id,r.lesson_id,r.subject_name,r.subject_slug,r.lesson_title,r.lesson_slug,r.revision_number,
           r.recommended_for,r.scheduled_for,r.status,r.completed_at
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

  return jsonb_build_object('taxonomy',v_taxonomy,'revisions',v_revisions,'levelings',v_levelings);
end $$;

create or replace function public.create_or_schedule_principal_revision(p_lesson_id uuid,p_revision_number integer,p_date date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_plan_id uuid;v_lesson record;v_row public.user_revisions%rowtype;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_revision_number not between 1 and 4 then raise exception 'Revisão inválida'; end if;
  if p_date is null then raise exception 'Escolha uma data'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  select l.id lesson_id,l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug
  into v_lesson
  from public.study_lessons l join public.study_subjects s on s.id=l.subject_id
  where l.id=p_lesson_id and s.plan_id=v_plan_id and l.active and s.active;
  if v_lesson.lesson_id is null then raise exception 'Aula não encontrada no plano ativo'; end if;

  insert into public.user_revisions(
    user_id,lesson_id,subject_slug,subject_name,lesson_slug,lesson_title,
    revision_number,recommended_for,scheduled_for,status,updated_at
  ) values(
    v_user_id,v_lesson.lesson_id,v_lesson.subject_slug,v_lesson.subject_name,v_lesson.lesson_slug,v_lesson.lesson_title,
    p_revision_number,p_date,p_date,'scheduled',now()
  )
  on conflict(user_id,lesson_id,revision_number) do update
  set recommended_for=excluded.recommended_for,
      scheduled_for=excluded.scheduled_for,
      status=case when public.user_revisions.status='completed' then 'completed' else 'scheduled' end,
      updated_at=now()
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.set_principal_revision_schedule(p_revision_id uuid,p_date date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_row public.user_revisions%rowtype;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_date is null then raise exception 'Escolha uma data'; end if;
  update public.user_revisions
  set scheduled_for=p_date,recommended_for=p_date,
      status=case when status='completed' then status else 'scheduled' end,
      updated_at=now()
  where id=p_revision_id and user_id=v_user_id
  returning * into v_row;
  if v_row.id is null then raise exception 'Revisão não encontrada'; end if;
  return to_jsonb(v_row);
end $$;

-- 8) Hub das listas: desbloqueio por conclusão anterior, sem exigir quantidade rígida,
-- e inclui os nivelamentos exclusivos do calendário das listas.
create or replace function public.get_list_learning_hub()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_plan_id uuid; v_catalog jsonb; v_reviews jsonb; v_levelings jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;

  with day_map as (
    select b.week_id,b.study_date,dense_rank() over(partition by b.week_id order by b.study_date)::integer day_number
    from public.study_schedule_blocks b join public.study_weeks w on w.id=b.week_id
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90
    group by b.week_id,b.study_date
  ), base as (
    select distinct w.week_number,dm.day_number,b.study_date,l.id lesson_id,l.title lesson_title,l.slug lesson_slug,l.question_count,
      s.name subject_name,s.slug subject_slug,
      (lp.theory_completed_at is not null) theory_completed,(lp.list_completed_at is not null) list_completed,
      (select count(*)::integer from public.questions q where q.plan_id=v_plan_id and q.lesson_id=l.id and q.active=true) available_count,
      coalesce((select jsonb_agg(t.topic order by t.position) from public.study_lesson_topics t where t.lesson_id=l.id),'[]'::jsonb) topics,
      a1.id a1_id,a1.status a1_status,a1.score a1_score,a1.total a1_total,
      a2.id a2_id,a2.status a2_status,a2.score a2_score,a2.total a2_total,
      a3.id a3_id,a3.status a3_status,a3.score a3_score,a3.total a3_total
    from public.study_weeks w
    join public.study_schedule_blocks b on b.week_id=w.id
    join day_map dm on dm.week_id=b.week_id and dm.study_date=b.study_date
    join public.study_schedule_block_lessons bl on bl.block_id=b.id
    join public.study_lessons l on l.id=bl.lesson_id and l.active=true
    join public.study_subjects s on s.id=l.subject_id and s.active=true
    left join public.user_lesson_progress lp on lp.user_id=v_user_id and lp.lesson_id=l.id
    left join lateral(select qa.id,qa.status,qa.score,qa.total from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=1 order by qa.started_at desc limit 1) a1 on true
    left join lateral(select qa.id,qa.status,qa.score,qa.total from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=2 order by qa.started_at desc limit 1) a2 on true
    left join lateral(select qa.id,qa.status,qa.score,qa.total from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=3 order by qa.started_at desc limit 1) a3 on true
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90
  ), rows as (
    select base.*,
      jsonb_build_array(
        jsonb_build_object(
          'list_number',1,'size',least(35,available_count),'target_size',35,
          'unlocked',available_count>0,'locked_reason',case when available_count=0 then 'Sem questões disponíveis' else null end,
          'attempt_id',a1_id,'status',a1_status,'score',a1_score,'actual_size',coalesce(a1_total,least(35,available_count))
        ),
        jsonb_build_object(
          'list_number',2,'size',least(20,available_count),'target_size',20,
          'unlocked',coalesce(a1_status='completed',false) and available_count>0,
          'locked_reason',case when coalesce(a1_status='completed',false)=false then 'Conclua a Lista 1' when available_count=0 then 'Sem questões disponíveis' else null end,
          'attempt_id',a2_id,'status',a2_status,'score',a2_score,'actual_size',coalesce(a2_total,least(20,available_count))
        ),
        jsonb_build_object(
          'list_number',3,'size',least(15,available_count),'target_size',15,
          'unlocked',coalesce(a2_status='completed',false) and available_count>0,
          'locked_reason',case when coalesce(a2_status='completed',false)=false then 'Conclua a Lista 2' when available_count=0 then 'Sem questões disponíveis' else null end,
          'attempt_id',a3_id,'status',a3_status,'score',a3_score,'actual_size',coalesce(a3_total,least(15,available_count))
        )
      ) practice_lists
    from base
  )
  select coalesce(jsonb_agg(to_jsonb(rows) order by week_number,day_number,subject_name,lesson_title),'[]'::jsonb)
  into v_catalog from rows;

  with rr as (
    select r.id,r.review_number,r.recommended_for,r.scheduled_for,r.status,r.wrong_count,r.new_count,
      l.id lesson_id,l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
      (select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.list_review_id=r.id order by qa.started_at desc limit 1) attempt_id
    from public.user_list_reviews r
    join public.study_lessons l on l.id=r.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    where r.user_id=v_user_id and s.plan_id=v_plan_id
    order by coalesce(r.scheduled_for,r.recommended_for),r.review_number
  ) select coalesce(jsonb_agg(to_jsonb(rr)),'[]'::jsonb) into v_reviews from rr;

  with ll as (
    select ls.id,ls.list_review_id,ls.leveling_number,ls.lesson_id,ls.recommended_for,ls.scheduled_for,ls.status,ls.completed_at,
      l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
      (r.status='completed') source_completed,
      (select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.leveling_schedule_id=ls.id order by qa.started_at desc limit 1) attempt_id,
      (select count(*)::integer from public.questions q where q.plan_id=v_plan_id and q.lesson_id=ls.lesson_id and q.active=true and q.level=least(4,greatest(1,ls.leveling_number))) available_count
    from public.user_leveling_schedule ls
    join public.user_list_reviews r on r.id=ls.list_review_id
    join public.study_lessons l on l.id=ls.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    where ls.user_id=v_user_id and s.plan_id=v_plan_id and ls.calendar_scope='list' and ls.scheduled_for is not null
    order by ls.scheduled_for,ls.leveling_number,s.name,l.title
  ) select coalesce(jsonb_agg(to_jsonb(ll)),'[]'::jsonb) into v_levelings from ll;

  return jsonb_build_object('catalog',v_catalog,'reviews',v_reviews,'levelings',v_levelings);
end $$;

-- 9) Hub dos nivelamentos: a função de estado acima já aplica Revisão N -> Nivelamento N.
create or replace function public.get_leveling_learning_hub()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_plan_id uuid;v_catalog jsonb;v_calendar jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  with day_map as (
    select b.week_id,b.study_date,dense_rank() over(partition by b.week_id order by b.study_date)::integer day_number
    from public.study_schedule_blocks b join public.study_weeks w on w.id=b.week_id
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90
    group by b.week_id,b.study_date
  ), rows as (
    select distinct w.week_number,dm.day_number,b.study_date,l.id lesson_id,l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
      coalesce((select jsonb_agg(t.topic order by t.position) from public.study_lesson_topics t where t.lesson_id=l.id),'[]'::jsonb) topics,
      jsonb_build_array(
        public.mt_manual_level_state(v_user_id,v_plan_id,l.id,1),
        public.mt_manual_level_state(v_user_id,v_plan_id,l.id,2),
        public.mt_manual_level_state(v_user_id,v_plan_id,l.id,3),
        public.mt_manual_level_state(v_user_id,v_plan_id,l.id,4)
      ) levels
    from public.study_weeks w
    join public.study_schedule_blocks b on b.week_id=w.id
    join day_map dm on dm.week_id=b.week_id and dm.study_date=b.study_date
    join public.study_schedule_block_lessons bl on bl.block_id=b.id
    join public.study_lessons l on l.id=bl.lesson_id and l.active=true
    join public.study_subjects s on s.id=l.subject_id and s.active=true
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90
  ) select coalesce(jsonb_agg(to_jsonb(rows) order by week_number,day_number,subject_name,lesson_title),'[]'::jsonb) into v_catalog from rows;

  with events as (
    select ls.id,ls.leveling_number,ls.lesson_id,l.title lesson_title,s.name subject_name,
      ls.recommended_for,ls.scheduled_for,ls.status,ls.calendar_scope,
      case when ls.calendar_scope='principal' then coalesce(r.status='completed',false) else coalesce(lr.status='completed',false) end source_completed
    from public.user_leveling_schedule ls
    join public.study_lessons l on l.id=ls.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    left join public.user_revisions r on r.id=ls.revision_id
    left join public.user_list_reviews lr on lr.id=ls.list_review_id
    where ls.user_id=v_user_id and s.plan_id=v_plan_id
    order by ls.scheduled_for nulls last,ls.leveling_number
  ) select coalesce(jsonb_agg(to_jsonb(events)),'[]'::jsonb) into v_calendar from events;

  return jsonb_build_object('catalog',v_catalog,'events',v_calendar);
end $$;
