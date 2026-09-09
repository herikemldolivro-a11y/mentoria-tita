-- Mentoria Tita V1.9 - listas independentes, sem bloqueio por teoria.
alter table public.question_attempts add column if not exists manual_leveling_level smallint;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.question_attempts'::regclass
      and conname='question_attempts_manual_leveling_level_check'
  ) then
    alter table public.question_attempts
      add constraint question_attempts_manual_leveling_level_check
      check (manual_leveling_level is null or manual_leveling_level between 1 and 4);
  end if;
end $$;
create index if not exists question_attempts_manual_leveling_idx
  on public.question_attempts(user_id,lesson_id,manual_leveling_level,status)
  where manual_leveling_level is not null;

create or replace function public.start_practice_list_attempt(p_lesson_id uuid,p_list_number integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_plan_id uuid; v_target integer; v_available integer;
  v_remaining integer; v_attempt_id uuid; v_status text; v_prev_status text;
  v_ids uuid[]; v_i integer; v_actual integer; v_lesson_target integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_list_number not between 1 and 3 then raise exception 'Lista inválida'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  select least(35,greatest(1,l.question_count)) into v_lesson_target
  from public.study_lessons l join public.study_subjects s on s.id=l.subject_id
  where l.id=p_lesson_id and s.plan_id=v_plan_id and l.active and s.active;
  if v_lesson_target is null then raise exception 'Aula indisponível'; end if;
  v_target:=case p_list_number when 1 then v_lesson_target when 2 then 20 else 15 end;
  perform pg_advisory_xact_lock(hashtext(v_user_id::text||':practice:'||p_lesson_id::text||':'||p_list_number::text));

  select id,status into v_attempt_id,v_status
  from public.question_attempts
  where user_id=v_user_id and lesson_id=p_lesson_id and kind='lesson_list' and practice_list_number=p_list_number
  order by started_at desc limit 1;
  if v_attempt_id is not null then
    return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',v_status='in_progress','completed',v_status='completed','list_size',(select total from public.question_attempts where id=v_attempt_id));
  end if;

  if p_list_number>1 then
    select status into v_prev_status from public.question_attempts
    where user_id=v_user_id and lesson_id=p_lesson_id and kind='lesson_list' and practice_list_number=p_list_number-1
    order by started_at desc limit 1;
    if v_prev_status is distinct from 'completed' then
      return jsonb_build_object('ok',false,'reason','previous_list','required_previous',p_list_number-1,'list_size',v_target);
    end if;
  end if;

  select count(*)::integer into v_available from public.questions
  where plan_id=v_plan_id and lesson_id=p_lesson_id and active=true;
  select count(*)::integer into v_remaining
  from public.questions q
  where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true
    and not exists(
      select 1 from public.question_attempts pa
      join public.question_attempt_items pi on pi.attempt_id=pa.id
      where pa.user_id=v_user_id and pa.lesson_id=p_lesson_id
        and pa.practice_list_number is not null and pa.practice_list_number<p_list_number
        and pi.question_id=q.id
    );

  if p_list_number=1 then
    if v_remaining<=0 then return jsonb_build_object('ok',false,'reason','no_questions','available_count',0,'required_count',v_target,'list_size',v_target); end if;
    v_actual:=least(v_target,v_remaining);
  else
    if v_remaining<v_target then return jsonb_build_object('ok',false,'reason','not_enough_new','available_count',v_remaining,'required_count',v_target,'list_size',v_target); end if;
    v_actual:=v_target;
  end if;

  select coalesce(array_agg(id),array[]::uuid[]) into v_ids from (
    select q.id from public.questions q
    where q.plan_id=v_plan_id and q.lesson_id=p_lesson_id and q.active=true
      and not exists(
        select 1 from public.question_attempts pa
        join public.question_attempt_items pi on pi.attempt_id=pa.id
        where pa.user_id=v_user_id and pa.lesson_id=p_lesson_id
          and pa.practice_list_number is not null and pa.practice_list_number<p_list_number
          and pi.question_id=q.id
      )
    order by case when not exists(select 1 from public.user_question_answers a where a.user_id=v_user_id and a.question_id=q.id) then 0 else 1 end, random()
    limit v_actual
  ) picked;
  if coalesce(array_length(v_ids,1),0)<v_actual then
    return jsonb_build_object('ok',false,'reason','compose_failed','available_count',coalesce(array_length(v_ids,1),0),'required_count',v_actual,'list_size',v_target);
  end if;

  insert into public.question_attempts(user_id,lesson_id,kind,status,total,practice_list_number,practice_list_size)
  values(v_user_id,p_lesson_id,'lesson_list','in_progress',v_actual,p_list_number,v_actual)
  returning id into v_attempt_id;
  for v_i in 1..array_length(v_ids,1) loop
    insert into public.question_attempt_items(attempt_id,question_id,position) values(v_attempt_id,v_ids[v_i],v_i);
  end loop;
  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',false,'completed',false,'list_size',v_actual,'target_size',v_target,'available_count',v_available);
end $$;
