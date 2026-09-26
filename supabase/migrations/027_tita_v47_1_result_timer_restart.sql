-- TITA V47.1 — espelho local. A migration equivalente já foi aplicada ao Supabase LIVE.
-- Cronômetro: elapsed_seconds começa na primeira resposta.
-- Refazer lista: cria nova tentativa com as mesmas questões.

create or replace function public.get_attempt_experience_meta(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_attempt public.question_attempts%rowtype;
  v_revision_number integer;
  v_session_questions integer:=0;
  v_session_correct integer:=0;
  v_session_seconds integer:=0;
  v_elapsed integer:=0;
  v_first_answered_at timestamptz;
  v_rank jsonb;
  v_xp jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id;
  if v_attempt.id is null then raise exception 'Tentativa não encontrada'; end if;

  if v_attempt.revision_id is not null then
    select revision_number into v_revision_number
    from public.user_revisions
    where id=v_attempt.revision_id and user_id=v_user_id;
  end if;

  select min(i.answered_at) into v_first_answered_at
  from public.question_attempt_items i
  where i.attempt_id=p_attempt_id and i.answered_at is not null;

  v_elapsed:=case
    when v_first_answered_at is null then 0
    else greatest(0,extract(epoch from(coalesce(v_attempt.completed_at,now())-v_first_answered_at))::integer)
  end;

  if v_attempt.kind='leveling' and v_attempt.revision_id is not null then
    select
      coalesce(sum(a.total),0)::integer,
      coalesce(sum(a.score),0)::integer,
      coalesce(sum(
        case when first_answer.first_answered_at is null then 0
        else greatest(0,extract(epoch from(coalesce(a.completed_at,now())-first_answer.first_answered_at))
        end
      ),0)::integer
    into v_session_questions,v_session_correct,v_session_seconds
    from public.question_attempts a
    left join lateral(
      select min(i.answered_at) first_answered_at
      from public.question_attempt_items i
      where i.attempt_id=a.id and i.answered_at is not null
    ) first_answer on true
    where a.user_id=v_user_id
      and a.revision_id=v_attempt.revision_id
      and a.kind='leveling'
      and(a.status='completed' or a.id=p_attempt_id);
  else
    v_session_questions:=v_attempt.total;
    v_session_correct:=coalesce(v_attempt.score,0);
    v_session_seconds:=v_elapsed;
  end if;

  select public.get_my_xp_dashboard() into v_xp;
  v_rank:=v_xp->'rank';

  return jsonb_build_object(
    'attempt_id',v_attempt.id,
    'kind',v_attempt.kind,
    'status',v_attempt.status,
    'revision_id',v_attempt.revision_id,
    'revision_number',v_revision_number,
    'required_correct',v_attempt.required_correct,
    'score',v_attempt.score,
    'total',v_attempt.total,
    'elapsed_seconds',v_elapsed,
    'session_questions',v_session_questions,
    'session_correct',v_session_correct,
    'session_seconds',v_session_seconds,
    'practice_list_number',v_attempt.practice_list_number,
    'list_review_id',v_attempt.list_review_id,
    'leveling_schedule_id',v_attempt.leveling_schedule_id,
    'manual_leveling_level',v_attempt.manual_leveling_level,
    'xp',v_xp,
    'rank',v_rank
  );
end;
$$;

revoke all on function public.get_attempt_experience_meta(uuid) from public;
grant execute on function public.get_attempt_experience_meta(uuid) to authenticated;

create or replace function public.restart_question_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_source public.question_attempts%rowtype;
  v_open_id uuid;
  v_new_id uuid;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  select * into v_source
  from public.question_attempts
  where id=p_attempt_id and user_id=v_user_id;

  if v_source.id is null then raise exception 'Tentativa não encontrada'; end if;
  if v_source.kind='leveling' then raise exception 'Use o fluxo de nivelamentos para repetir este bloco'; end if;

  perform pg_advisory_xact_lock(
    hashtext(v_user_id::text||':'||coalesce(v_source.lesson_id::text,p_attempt_id::text)||':'||v_source.kind)
  );

  select id into v_open_id
  from public.question_attempts
  where user_id=v_user_id
    and lesson_id is not distinct from v_source.lesson_id
    and kind=v_source.kind
    and status='in_progress'
  order by started_at desc
  limit 1;

  if v_open_id is not null then
    return jsonb_build_object('ok',true,'attempt_id',v_open_id,'continued',true);
  end if;

  insert into public.question_attempts(
    user_id,lesson_id,kind,status,total,score,revision_id,required_correct,
    list_review_id,practice_list_number,practice_list_size,
    leveling_schedule_id,manual_leveling_level,started_at,completed_at,updated_at
  )
  values(
    v_user_id,v_source.lesson_id,v_source.kind,'in_progress',v_source.total,null,
    v_source.revision_id,v_source.required_correct,v_source.list_review_id,
    v_source.practice_list_number,v_source.practice_list_size,
    null,null,now(),null,now()
  )
  returning id into v_new_id;

  insert into public.question_attempt_items(
    attempt_id,question_id,position,selected_answer,is_correct,answered_at
  )
  select v_new_id,i.question_id,i.position,null,null,null
  from public.question_attempt_items i
  where i.attempt_id=p_attempt_id
  order by i.position;

  return jsonb_build_object('ok',true,'attempt_id',v_new_id,'continued',false);
end;
$$;

revoke all on function public.restart_question_attempt(uuid) from public;
grant execute on function public.restart_question_attempt(uuid) to authenticated;
