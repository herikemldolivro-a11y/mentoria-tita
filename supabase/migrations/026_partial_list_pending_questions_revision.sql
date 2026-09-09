begin;

create or replace function public.complete_lesson_list_early(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.question_attempts%rowtype;
  v_answered integer := 0;
  v_score integer := 0;
  v_mode text;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  select * into v_attempt
  from public.question_attempts
  where id = p_attempt_id and user_id = v_user_id and kind = 'lesson_list';

  if v_attempt.id is null then raise exception 'Lista não encontrada'; end if;

  select
    count(*) filter (where selected_answer is not null),
    count(*) filter (where selected_answer is not null and is_correct)
  into v_answered, v_score
  from public.question_attempt_items
  where attempt_id = p_attempt_id;

  if v_attempt.status = 'completed' then
    return jsonb_build_object(
      'score', coalesce(v_attempt.score, v_score),
      'answered', v_answered,
      'total', v_attempt.total,
      'pending', greatest(v_attempt.total - v_answered, 0),
      'percentage', case when v_attempt.total > 0 then round(coalesce(v_attempt.score, v_score)::numeric * 100 / v_attempt.total, 1) else 0 end
    );
  end if;

  update public.question_attempts
  set status = 'completed', score = v_score, completed_at = now(), updated_at = now()
  where id = p_attempt_id;

  if v_attempt.lesson_id is not null then
    select theory_mode into v_mode
    from public.user_lesson_progress
    where user_id = v_user_id and lesson_id = v_attempt.lesson_id;

    perform public.save_lesson_progress(v_attempt.lesson_id, true, true, v_mode, true, true);
  end if;

  return jsonb_build_object(
    'score', v_score,
    'answered', v_answered,
    'total', v_attempt.total,
    'pending', greatest(v_attempt.total - v_answered, 0),
    'percentage', case when v_attempt.total > 0 then round(v_score::numeric * 100 / v_attempt.total, 1) else 0 end
  );
end;
$$;

grant execute on function public.complete_lesson_list_early(uuid) to authenticated;

create or replace function public.get_revision_pending_questions(p_revision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.user_revisions%rowtype;
  v_source public.question_attempts%rowtype;
  v_pending integer := 0;
  v_attempt_id uuid;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  select * into v_revision
  from public.user_revisions
  where id = p_revision_id and user_id = v_user_id;

  if v_revision.id is null then raise exception 'Revisão não encontrada'; end if;

  select qa.* into v_source
  from public.question_attempts qa
  where qa.user_id = v_user_id
    and qa.lesson_id = v_revision.lesson_id
    and qa.kind = 'lesson_list'
    and qa.status = 'completed'
    and exists (
      select 1 from public.question_attempt_items qi
      where qi.attempt_id = qa.id and qi.selected_answer is null
    )
  order by qa.completed_at desc nulls last, qa.started_at desc
  limit 1;

  if v_source.id is null then
    return jsonb_build_object('revision_id', p_revision_id, 'pending_count', 0, 'source_attempt_id', null, 'attempt_id', null);
  end if;

  select count(*)::integer into v_pending
  from public.question_attempt_items qi
  where qi.attempt_id = v_source.id
    and qi.selected_answer is null
    and not exists (
      select 1 from public.user_question_answers a
      where a.user_id = v_user_id
        and a.question_id = qi.question_id
        and a.answered_at > coalesce(v_source.completed_at, v_source.started_at)
    );

  select qa.id into v_attempt_id
  from public.question_attempts qa
  where qa.user_id = v_user_id
    and qa.revision_id = p_revision_id
    and qa.kind = 'list_review'
    and qa.list_review_id is null
    and qa.status = 'in_progress'
  order by qa.started_at desc
  limit 1;

  return jsonb_build_object('revision_id', p_revision_id, 'pending_count', v_pending, 'source_attempt_id', v_source.id, 'attempt_id', v_attempt_id);
end;
$$;

grant execute on function public.get_revision_pending_questions(uuid) to authenticated;

create or replace function public.start_revision_pending_questions(p_revision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.user_revisions%rowtype;
  v_source public.question_attempts%rowtype;
  v_attempt_id uuid;
  v_ids uuid[] := array[]::uuid[];
  v_total integer := 0;
  v_i integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':revision-pending:' || p_revision_id::text));

  select * into v_revision
  from public.user_revisions
  where id = p_revision_id and user_id = v_user_id;

  if v_revision.id is null then raise exception 'Revisão não encontrada'; end if;

  select qa.id into v_attempt_id
  from public.question_attempts qa
  where qa.user_id = v_user_id
    and qa.revision_id = p_revision_id
    and qa.kind = 'list_review'
    and qa.list_review_id is null
    and qa.status = 'in_progress'
  order by qa.started_at desc
  limit 1;

  if v_attempt_id is not null then
    return jsonb_build_object('ok', true, 'attempt_id', v_attempt_id, 'continued', true);
  end if;

  select qa.* into v_source
  from public.question_attempts qa
  where qa.user_id = v_user_id
    and qa.lesson_id = v_revision.lesson_id
    and qa.kind = 'lesson_list'
    and qa.status = 'completed'
    and exists (
      select 1 from public.question_attempt_items qi
      where qi.attempt_id = qa.id and qi.selected_answer is null
    )
  order by qa.completed_at desc nulls last, qa.started_at desc
  limit 1;

  if v_source.id is null then
    return jsonb_build_object('ok', true, 'no_pending', true, 'pending_count', 0);
  end if;

  select coalesce(array_agg(qi.question_id order by qi.position), array[]::uuid[])
  into v_ids
  from public.question_attempt_items qi
  where qi.attempt_id = v_source.id
    and qi.selected_answer is null
    and not exists (
      select 1 from public.user_question_answers a
      where a.user_id = v_user_id
        and a.question_id = qi.question_id
        and a.answered_at > coalesce(v_source.completed_at, v_source.started_at)
    );

  v_total := coalesce(array_length(v_ids, 1), 0);
  if v_total = 0 then
    return jsonb_build_object('ok', true, 'no_pending', true, 'pending_count', 0);
  end if;

  insert into public.question_attempts(user_id, lesson_id, revision_id, kind, status, total)
  values(v_user_id, v_revision.lesson_id, p_revision_id, 'list_review', 'in_progress', v_total)
  returning id into v_attempt_id;

  for v_i in 1..v_total loop
    insert into public.question_attempt_items(attempt_id, question_id, position)
    values(v_attempt_id, v_ids[v_i], v_i);
  end loop;

  return jsonb_build_object('ok', true, 'attempt_id', v_attempt_id, 'continued', false, 'pending_count', v_total);
end;
$$;

grant execute on function public.start_revision_pending_questions(uuid) to authenticated;

commit;
