-- Mentoria Tita V1.9 - nivelamentos por aula/nível, 1 -> 4.
create or replace function public.mt_manual_level_state(p_user_id uuid,p_plan_id uuid,p_lesson_id uuid,p_level integer)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_available integer:=0; v_prev_passed boolean:=true; v_passed boolean:=false; v_attempt_id uuid; v_score integer; v_total integer; v_best integer;
begin
  select count(*)::integer into v_available from public.questions q where q.plan_id=p_plan_id and q.lesson_id=p_lesson_id and q.active=true and q.level=p_level;
  if p_level>1 then
    select exists(select 1 from public.question_attempts a where a.user_id=p_user_id and a.lesson_id=p_lesson_id and a.kind='leveling' and a.manual_leveling_level=p_level-1 and a.status='completed' and coalesce(a.score,0)>=coalesce(a.required_correct,ceil(a.total*.9)::integer)) into v_prev_passed;
  end if;
  select exists(select 1 from public.question_attempts a where a.user_id=p_user_id and a.lesson_id=p_lesson_id and a.kind='leveling' and a.manual_leveling_level=p_level and a.status='completed' and coalesce(a.score,0)>=coalesce(a.required_correct,ceil(a.total*.9)::integer)) into v_passed;
  select a.id,a.score,a.total into v_attempt_id,v_score,v_total from public.question_attempts a where a.user_id=p_user_id and a.lesson_id=p_lesson_id and a.kind='leveling' and a.manual_leveling_level=p_level and a.status='in_progress' order by a.started_at desc limit 1;
  select max(coalesce(a.score,0)) into v_best from public.question_attempts a where a.user_id=p_user_id and a.lesson_id=p_lesson_id and a.kind='leveling' and a.manual_leveling_level=p_level and a.status='completed';
  return jsonb_build_object('level',p_level,'available_count',v_available,'unlocked',v_prev_passed,'no_questions',v_available=0,'attempt_id',v_attempt_id,'status',case when v_passed then 'completed' when v_attempt_id is not null then 'in_progress' else null end,'score',coalesce(v_score,v_best),'total',v_total,'passed',v_passed,'locked_reason',case when not v_prev_passed then 'Conclua o Nível '||(p_level-1)::text when v_available=0 then 'Sem questões disponíveis' else null end);
end $$;

create or replace function public.get_leveling_learning_hub() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_plan_id uuid; v_catalog jsonb; v_calendar jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  with day_map as (
    select b.week_id,b.study_date,dense_rank() over(partition by b.week_id order by b.study_date)::integer day_number
    from public.study_schedule_blocks b join public.study_weeks w on w.id=b.week_id
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90 group by b.week_id,b.study_date
  ), rows as (
    select distinct w.week_number,dm.day_number,b.study_date,l.id lesson_id,l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
      coalesce((select jsonb_agg(t.topic order by t.position) from public.study_lesson_topics t where t.lesson_id=l.id),'[]'::jsonb) topics,
      jsonb_build_array(public.mt_manual_level_state(v_user_id,v_plan_id,l.id,1),public.mt_manual_level_state(v_user_id,v_plan_id,l.id,2),public.mt_manual_level_state(v_user_id,v_plan_id,l.id,3),public.mt_manual_level_state(v_user_id,v_plan_id,l.id,4)) levels
    from public.study_weeks w
    join public.study_schedule_blocks b on b.week_id=w.id
    join day_map dm on dm.week_id=b.week_id and dm.study_date=b.study_date
    join public.study_schedule_block_lessons bl on bl.block_id=b.id
    join public.study_lessons l on l.id=bl.lesson_id and l.active=true
    join public.study_subjects s on s.id=l.subject_id and s.active=true
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90
  ) select coalesce(jsonb_agg(to_jsonb(rows) order by week_number,day_number,subject_name,lesson_title),'[]'::jsonb) into v_catalog from rows;
  select public.get_leveling_calendar() into v_calendar;
  return jsonb_build_object('catalog',v_catalog,'events',coalesce(v_calendar->'events','[]'::jsonb));
end $$;

create or replace function public.start_manual_leveling_attempt(p_lesson_id uuid,p_level integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_plan_id uuid; v_available integer; v_target integer; v_required integer; v_attempt_id uuid; v_ids uuid[]; v_i integer; v_prev_passed boolean:=true;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_level not between 1 and 4 then raise exception 'Nível inválido'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  if not exists(select 1 from public.study_lessons l join public.study_subjects s on s.id=l.subject_id where l.id=p_lesson_id and s.plan_id=v_plan_id and l.active and s.active) then raise exception 'Aula indisponível'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user_id::text||':manual-level:'||p_lesson_id::text||':'||p_level::text));
  select id into v_attempt_id from public.question_attempts where user_id=v_user_id and lesson_id=p_lesson_id and kind='leveling' and manual_leveling_level=p_level and status='in_progress' order by started_at desc limit 1;
  if v_attempt_id is not null then return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',true,'level',p_level); end if;
  if p_level>1 then
    select exists(select 1 from public.question_attempts a where a.user_id=v_user_id and a.lesson_id=p_lesson_id and a.kind='leveling' and a.manual_leveling_level=p_level-1 and a.status='completed' and coalesce(a.score,0)>=coalesce(a.required_correct,ceil(a.total*.9)::integer)) into v_prev_passed;
    if not v_prev_passed then return jsonb_build_object('ok',false,'reason','previous_level','required_previous',p_level-1,'level',p_level); end if;
  end if;
  select count(*)::integer into v_available from public.questions q where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true and q.level=p_level;
  if v_available<=0 then return jsonb_build_object('ok',false,'reason','no_questions','available_count',0,'level',p_level); end if;
  v_target:=least(10,v_available); v_required:=greatest(1,ceil(v_target*.9)::integer);
  select array_agg(id) into v_ids from (
    select q.id from public.questions q where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true and q.level=p_level
    order by case when exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id and a.is_correct=false) then 0 when not exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id) then 1 else 2 end,random()
    limit v_target
  ) picked;
  insert into public.question_attempts(user_id,lesson_id,kind,status,total,required_correct,manual_leveling_level)
  values(v_user_id,p_lesson_id,'leveling','in_progress',v_target,v_required,p_level) returning id into v_attempt_id;
  for v_i in 1..array_length(v_ids,1) loop insert into public.question_attempt_items(attempt_id,question_id,position) values(v_attempt_id,v_ids[v_i],v_i); end loop;
  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',false,'level',p_level,'required_count',v_target,'required_correct',v_required,'available_count',v_available);
end $$;

-- finalize_leveling_attempt/get_attempt_experience_meta were extended in production to
-- understand manual_leveling_level while preserving calendar/revision levelings.

create or replace function public.finalize_leveling_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_attempt public.question_attempts%rowtype;v_answered integer;v_score integer;v_required integer;v_round integer;v_passed boolean;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id and kind='leveling';
  if v_attempt.id is null then raise exception 'Nivelamento não encontrado'; end if;
  v_required:=coalesce(v_attempt.required_correct,least(9,v_attempt.total));
  if v_attempt.status='completed' then return jsonb_build_object('score',v_attempt.score,'total',v_attempt.total,'required_correct',v_required,'passed',v_attempt.score>=v_required,'percentage',round(v_attempt.score::numeric*100/v_attempt.total,1),'manual_level',v_attempt.manual_leveling_level); end if;
  select count(*),count(*) filter(where is_correct) into v_answered,v_score from public.question_attempt_items where attempt_id=p_attempt_id and selected_answer is not null;
  if v_answered<v_attempt.total then raise exception 'Responda todas as % questões antes de finalizar',v_attempt.total; end if;
  v_passed:=v_score>=v_required;
  update public.question_attempts set status='completed',score=v_score,completed_at=now(),updated_at=now() where id=p_attempt_id;
  if v_attempt.manual_leveling_level is not null then
    return jsonb_build_object('score',v_score,'total',v_attempt.total,'required_correct',v_required,'passed',v_passed,'percentage',round(v_score::numeric*100/v_attempt.total,1),'manual_level',v_attempt.manual_leveling_level);
  end if;
  select coalesce(max(round),0)+1 into v_round from public.user_leveling_attempts where revision_id=v_attempt.revision_id;
  insert into public.user_leveling_attempts(user_id,revision_id,round,score,passed,total_questions,required_correct) values(v_user_id,v_attempt.revision_id,v_round,v_score,v_passed,v_attempt.total,v_required);
  if v_passed then
    update public.user_revisions set status='completed',completed_at=coalesce(completed_at,now()),updated_at=now() where id=v_attempt.revision_id and user_id=v_user_id;
    if v_attempt.leveling_schedule_id is not null then update public.user_leveling_schedule set status='completed',completed_at=now(),updated_at=now() where id=v_attempt.leveling_schedule_id and user_id=v_user_id; end if;
  elsif v_attempt.leveling_schedule_id is not null then
    update public.user_leveling_schedule set status='scheduled',updated_at=now() where id=v_attempt.leveling_schedule_id and user_id=v_user_id;
  end if;
  return jsonb_build_object('score',v_score,'total',v_attempt.total,'required_correct',v_required,'passed',v_passed,'round',v_round,'percentage',round(v_score::numeric*100/v_attempt.total,1));
end $$;

create or replace function public.get_attempt_experience_meta(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_attempt public.question_attempts%rowtype;v_revision_number integer;v_session_questions integer:=0;v_session_correct integer:=0;v_session_seconds integer:=0;v_elapsed integer:=0;v_rank jsonb;v_xp jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado';end if;
  select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id;
  if v_attempt.id is null then raise exception 'Tentativa não encontrada';end if;
  if v_attempt.revision_id is not null then select revision_number into v_revision_number from public.user_revisions where id=v_attempt.revision_id and user_id=v_user_id;end if;
  v_elapsed:=greatest(0,extract(epoch from(coalesce(v_attempt.completed_at,now())-v_attempt.started_at))::integer);
  if v_attempt.kind='leveling' and v_attempt.revision_id is not null then
    select coalesce(sum(total),0)::integer,coalesce(sum(score),0)::integer,coalesce(sum(greatest(0,extract(epoch from(coalesce(completed_at,now())-started_at)))),0)::integer
    into v_session_questions,v_session_correct,v_session_seconds
    from public.question_attempts where user_id=v_user_id and revision_id=v_attempt.revision_id and kind='leveling' and(status='completed' or id=p_attempt_id);
  else
    v_session_questions:=v_attempt.total;v_session_correct:=coalesce(v_attempt.score,0);v_session_seconds:=v_elapsed;
  end if;
  select public.get_my_xp_dashboard() into v_xp;v_rank:=v_xp->'rank';
  return jsonb_build_object('attempt_id',v_attempt.id,'kind',v_attempt.kind,'status',v_attempt.status,'revision_id',v_attempt.revision_id,'revision_number',v_revision_number,'required_correct',v_attempt.required_correct,'score',v_attempt.score,'total',v_attempt.total,'elapsed_seconds',v_elapsed,'session_questions',v_session_questions,'session_correct',v_session_correct,'session_seconds',v_session_seconds,'practice_list_number',v_attempt.practice_list_number,'list_review_id',v_attempt.list_review_id,'leveling_schedule_id',v_attempt.leveling_schedule_id,'manual_leveling_level',v_attempt.manual_leveling_level,'xp',v_xp,'rank',v_rank);
end $$;
