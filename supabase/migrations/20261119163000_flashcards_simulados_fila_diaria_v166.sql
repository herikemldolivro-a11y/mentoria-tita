-- TITÃ V166 · revisão diária única de flashcards errados (cadernos + simulados)
-- Dois RPCs preexistentes, mantém as assinaturas, histórico e filas de caderno.
-- Todos os acessos são limitados a auth.uid(); não introduz nova tabela ou permissões.
CREATE OR REPLACE FUNCTION public.get_daily_notebook_error_review_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'America/Fortaleza')::date;
  v_result jsonb;
  v_simulados jsonb;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.';
  end if;

  update public.user_lesson_notebook_cards
  set
    daily_review_on = v_today,
    updated_at = now()
  where user_id = v_user
    and last_result = false
    and daily_review_on is null;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'card_id', c.id,
        'notebook_id', c.notebook_id,
        'lesson_id', n.lesson_id,
        'front', c.front,
        'back', c.back,
        'front_image_path', c.front_image_path,
        'back_image_path', c.back_image_path,
        'position', c.position,
        'incorrect_total', c.incorrect_total,
        'correct_total', c.correct_total,
        'daily_review_on', c.daily_review_on,
        'last_reviewed_at', c.last_reviewed_at,
        'lesson_title', sl.title,
        'lesson_slug', sl.slug,
        'subject_name', ss.name,
        'subject_slug', ss.slug
      )
      order by
        c.daily_review_on asc,
        c.incorrect_total desc,
        c.last_reviewed_at asc nulls first,
        c.position asc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.user_lesson_notebook_cards c
  join public.user_lesson_notebooks n
    on n.id = c.notebook_id
   and n.user_id = c.user_id
  join public.study_lessons sl
    on sl.id = n.lesson_id
  join public.study_subjects ss
    on ss.id = sl.subject_id
  where c.user_id = v_user
    and c.daily_review_on is not null
    and c.daily_review_on <= v_today;

  -- MT_TITA_FLASHCARDS_SIMULADOS_FILA_DIARIA_V166
  -- Mirrors the existing lesson-card behavior for old wrong cards without a due date.
  update public.mt_simulado_flashcards
  set daily_review_on = v_today, updated_at = now()
  where user_id = v_user
    and last_result = false
    and daily_review_on is null;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'card_id',c.id,
        'notebook_id',null,
        'lesson_id',null,
        'front',c.front,
        'back',c.back,
        'front_image_path',c.front_image_path,
        'back_image_path',c.back_image_path,
        'position',coalesce(c.numero,0),
        'incorrect_total',c.incorrect_total,
        'correct_total',c.correct_total,
        'daily_review_on',c.daily_review_on,
        'last_reviewed_at',c.last_reviewed_at,
        'lesson_title',coalesce(r.titulo,'Simulado '||c.simulado_id),
        'lesson_slug',c.simulado_id,
        'subject_name',case when c.simulado_id like 'aposta-final-%' then 'APOSTA FINAL' else 'Simulados' end,
        'subject_slug','simulados',
        'source_type','simulado',
        'simulado_id',c.simulado_id,
        'numero',c.numero
      )
      order by c.daily_review_on asc,c.incorrect_total desc,c.last_reviewed_at asc nulls first,coalesce(c.numero,0),c.id
    ),
    '[]'::jsonb
  ) into v_simulados
  from public.mt_simulado_flashcards c
  left join lateral (
    select sr.titulo from public.mt_simulado_review_rounds sr
    where sr.user_id=v_user and sr.simulado_id=c.simulado_id
    order by sr.round_number asc,sr.created_at asc limit 1
  ) r on true
  where c.user_id = v_user
    and c.daily_review_on is not null
    and c.daily_review_on <= v_today;

  -- Merge by due date so simulados appear in the SAME daily review as the lesson flashcards.
  return (
    select coalesce(
      jsonb_agg(items.card order by
        items.card->>'daily_review_on' asc,
        coalesce((items.card->>'incorrect_total')::integer,0) desc,
        items.card->>'last_reviewed_at' asc nulls first,
        coalesce((items.card->>'position')::integer,0)),
      '[]'::jsonb
    )
    from jsonb_array_elements(v_result || v_simulados) as items(card)
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.complete_daily_notebook_error_review(p_results jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today date := (now() at time zone 'America/Fortaleza')::date;
  v_notebook_id uuid;
  v_review_id uuid;
  v_item record;
  v_correct boolean;
  v_score integer := 0;
  v_total integer := 0;
  v_retry_tomorrow integer := 0;
  v_notebook_score integer;
  v_notebook_total integer;
  v_remaining integer := 0;
  v_simulado_total integer := 0;
  v_simulado_correct integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;
  if jsonb_typeof(p_results) <> 'object' then
    raise exception 'Resultados inválidos.';
  end if;

  for v_notebook_id in
    select distinct c.notebook_id
    from public.user_lesson_notebook_cards c
    join jsonb_each_text(p_results) e on e.key = c.id::text
    where c.user_id = auth.uid()
      and c.daily_review_on is not null
      and c.daily_review_on <= v_today
  loop
    v_notebook_score := 0;
    v_notebook_total := 0;

    insert into public.user_lesson_notebook_reviews(
      notebook_id,user_id,was_scheduled,schedule_advanced,score,total
    )
    values (v_notebook_id,auth.uid(),false,false,0,0)
    returning id into v_review_id;

    for v_item in
      select c.id as card_id, e.value as result_value
      from public.user_lesson_notebook_cards c
      join jsonb_each_text(p_results) e on e.key = c.id::text
      where c.user_id = auth.uid()
        and c.notebook_id = v_notebook_id
        and c.daily_review_on is not null
        and c.daily_review_on <= v_today
    loop
      v_correct := lower(v_item.result_value) = 'true';
      v_total := v_total + 1;
      v_notebook_total := v_notebook_total + 1;

      if v_correct then
        v_score := v_score + 1;
        v_notebook_score := v_notebook_score + 1;
      else
        v_retry_tomorrow := v_retry_tomorrow + 1;
      end if;

      update public.user_lesson_notebook_cards
      set last_result = v_correct,
          consecutive_correct = case when v_correct then consecutive_correct + 1 else 0 end,
          correct_total = correct_total + case when v_correct then 1 else 0 end,
          incorrect_total = incorrect_total + case when v_correct then 0 else 1 end,
          last_reviewed_at = now(),
          daily_review_on = case when v_correct then null else v_today + 1 end
      where id = v_item.card_id and user_id = auth.uid();

      insert into public.user_lesson_notebook_card_reviews(review_id,card_id,user_id,is_correct)
      values (v_review_id,v_item.card_id,auth.uid(),v_correct);
    end loop;

    if v_notebook_total > 0 then
      update public.user_lesson_notebook_reviews
      set score = v_notebook_score,
          total = v_notebook_total,
          completed_at = now()
      where id = v_review_id;
    else
      delete from public.user_lesson_notebook_reviews where id = v_review_id;
    end if;
  end loop;

  -- MT_TITA_FLASHCARDS_SIMULADOS_FILA_DIARIA_V166
  -- Process only owner-authorized, due simulado cards supplied in this review.
  -- These are independent of the simulado question review rounds.
  for v_item in
    select c.id as card_id,e.value as result_value
    from public.mt_simulado_flashcards c
    join jsonb_each_text(p_results) e on e.key=c.id::text
    where c.user_id=auth.uid()
      and c.daily_review_on is not null
      and c.daily_review_on <= v_today
    for update of c
  loop
    if jsonb_typeof(p_results -> (v_item.card_id::text)) is distinct from 'boolean' then
      raise exception 'Resultado de flashcard de simulado inválido: %.',v_item.card_id;
    end if;
    v_correct := v_item.result_value = 'true';
    v_total := v_total + 1;
    v_simulado_total := v_simulado_total + 1;
    if v_correct then
      v_score := v_score + 1;
      v_simulado_correct := v_simulado_correct + 1;
    else
      v_retry_tomorrow := v_retry_tomorrow + 1;
    end if;

    update public.mt_simulado_flashcards
    set last_result = v_correct,
        correct_total = correct_total + case when v_correct then 1 else 0 end,
        incorrect_total = incorrect_total + case when v_correct then 0 else 1 end,
        last_reviewed_at = now(),
        daily_review_on = case when v_correct then null else v_today + 1 end,
        updated_at = now()
    where id=v_item.card_id and user_id=auth.uid();
  end loop;

  if v_total = 0 then
    raise exception 'Nenhum flashcard pendente foi revisado.';
  end if;

  select (
    (select count(*) from public.user_lesson_notebook_cards
      where user_id=auth.uid() and daily_review_on is not null and daily_review_on<=v_today)
    +
    (select count(*) from public.mt_simulado_flashcards
      where user_id=auth.uid() and daily_review_on is not null and daily_review_on<=v_today)
  ) into v_remaining;

  return jsonb_build_object(
    'ok', true,
    'score', v_score,
    'total', v_total,
    'retry_tomorrow', v_retry_tomorrow,
    'remaining_today', v_remaining,
    'simulado_reviewed', v_simulado_total,
    'simulado_correct', v_simulado_correct,
    'tomorrow', v_today + 1
  );
end;
$function$

