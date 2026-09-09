-- Mentoria Titã — V9.3.5
-- Libera revisões futuras para execução antecipada.
-- Mantém a exigência de releitura e todas as regras do nivelamento.

create or replace function public.start_leveling_question_attempt(p_revision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.user_revisions%rowtype;
  v_count integer;
  v_required integer;
  v_available integer;
  v_attempt_id uuid;
  v_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_user_id::text || ':leveling:' || p_revision_id::text)
  );

  select *
  into v_revision
  from public.user_revisions
  where id = p_revision_id
    and user_id = v_user_id;

  if v_revision.id is null then
    raise exception 'Revisão não encontrada';
  end if;

  if v_revision.status = 'draft' then
    raise exception 'Agende a revisão antes de iniciá-la';
  end if;

  if v_revision.status = 'completed' then
    raise exception 'Esta revisão já foi concluída';
  end if;

  -- V9.3.5:
  -- NÃO há bloqueio por scheduled_for/current_date.
  -- Revisões programadas para datas futuras podem ser feitas antecipadamente.

  if v_revision.reread_confirmed_at is null then
    raise exception 'Confirme a releitura antes de iniciar o nivelamento';
  end if;

  select coalesce(question_count, 10), coalesce(required_correct, 9)
  into v_count, v_required
  from public.lesson_leveling_settings
  where lesson_id = v_revision.lesson_id;

  if v_count is null then
    v_count := 10;
  end if;

  if v_required is null then
    v_required := least(9, v_count);
  end if;

  select count(*)
  into v_available
  from public.questions
  where lesson_id = v_revision.lesson_id
    and active = true;

  if v_available < v_count then
    return jsonb_build_object(
      'ok', false,
      'available_count', v_available,
      'required_count', v_count,
      'required_correct', v_required
    );
  end if;

  select id
  into v_attempt_id
  from public.question_attempts
  where user_id = v_user_id
    and revision_id = p_revision_id
    and kind = 'leveling'
    and status = 'in_progress'
  order by started_at desc
  limit 1;

  if v_attempt_id is not null then
    return jsonb_build_object(
      'ok', true,
      'attempt_id', v_attempt_id,
      'continued', true,
      'required_count', v_count,
      'required_correct', v_required
    );
  end if;

  insert into public.question_attempts (
    user_id,
    lesson_id,
    revision_id,
    kind,
    status,
    total,
    required_correct
  )
  values (
    v_user_id,
    v_revision.lesson_id,
    p_revision_id,
    'leveling',
    'in_progress',
    v_count,
    v_required
  )
  returning id into v_attempt_id;

  select array_agg(candidate.id)
  into v_ids
  from (
    select q.id
    from public.questions q
    where q.lesson_id = v_revision.lesson_id
      and q.active = true
    order by
      case
        when exists (
          select 1
          from public.question_attempts olda
          join public.question_attempt_items oldi
            on oldi.attempt_id = olda.id
          where olda.user_id = v_user_id
            and olda.revision_id = p_revision_id
            and olda.status = 'completed'
            and oldi.question_id = q.id
        )
        then 1
        else 0
      end,
      case
        when exists (
          select 1
          from public.user_question_answers ua
          where ua.user_id = v_user_id
            and ua.question_id = q.id
            and ua.is_correct = false
        )
        then 0
        when not exists (
          select 1
          from public.user_question_answers ua
          where ua.user_id = v_user_id
            and ua.question_id = q.id
        )
        then 1
        else 2
      end,
      q.level desc,
      random()
    limit v_count
  ) candidate;

  insert into public.question_attempt_items(
    attempt_id,
    question_id,
    position
  )
  select
    v_attempt_id,
    x.question_id,
    x.position::integer
  from unnest(v_ids) with ordinality as x(question_id, position);

  return jsonb_build_object(
    'ok', true,
    'attempt_id', v_attempt_id,
    'continued', false,
    'required_count', v_count,
    'required_correct', v_required
  );
end;
$$;

revoke all on function public.start_leveling_question_attempt(uuid) from public;
grant execute on function public.start_leveling_question_attempt(uuid) to authenticated;
