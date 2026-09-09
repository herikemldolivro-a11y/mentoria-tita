-- Mentoria Titã — V9.3.6
-- Classificação de questões reais x autorais/IA + exclusão em lote por aula.

alter table public.questions
  add column if not exists source_type text;

update public.questions
set source_type = case
  when nullif(btrim(banca), '') is null then 'authorial'
  when lower(btrim(banca)) in (
    'autoral',
    'autoria própria',
    'autoria propria',
    'ia',
    'chatgpt',
    'openai',
    'inteligência artificial',
    'inteligencia artificial'
  ) then 'authorial'
  else 'real'
end;

update public.questions
set banca = null
where source_type = 'authorial'
  and (
    banca is null
    or lower(btrim(banca)) in (
      'autoral',
      'autoria própria',
      'autoria propria',
      'ia',
      'chatgpt',
      'openai',
      'inteligência artificial',
      'inteligencia artificial'
    )
  );

alter table public.questions
  alter column source_type set default 'authorial';

alter table public.questions
  alter column source_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_source_type_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_source_type_check
      check (source_type in ('authorial', 'real'));
  end if;
end;
$$;

create index if not exists questions_source_type_idx
  on public.questions(source_type);

create index if not exists questions_created_at_idx
  on public.questions(created_at);

create or replace function public.admin_upsert_question(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_plan_id uuid;
  v_subject_id uuid;
  v_lesson_id uuid;
  v_type text;
  v_level smallint;
  v_statement text;
  v_choices jsonb;
  v_correct text;
  v_choice_count integer;
  v_banca text;
  v_source_type text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  v_id := nullif(p_payload->>'id', '')::uuid;
  v_plan_id := nullif(p_payload->>'plan_id', '')::uuid;
  v_subject_id := nullif(p_payload->>'subject_id', '')::uuid;
  v_lesson_id := nullif(p_payload->>'lesson_id', '')::uuid;
  v_type := p_payload->>'question_type';
  v_level := (p_payload->>'level')::smallint;
  v_statement := trim(coalesce(p_payload->>'statement', ''));
  v_choices := p_payload->'choices';
  v_correct := upper(trim(coalesce(p_payload->>'correct_answer', '')));
  v_banca := nullif(trim(p_payload->>'banca'), '');

  v_source_type := nullif(lower(trim(p_payload->>'source_type')), '');

  if v_source_type is null then
    v_source_type := case
      when v_banca is null then 'authorial'
      when lower(v_banca) in (
        'autoral',
        'autoria própria',
        'autoria propria',
        'ia',
        'chatgpt',
        'openai',
        'inteligência artificial',
        'inteligencia artificial'
      ) then 'authorial'
      else 'real'
    end;
  end if;

  if v_source_type not in ('authorial', 'real') then
    raise exception 'Origem inválida. Use real ou authorial';
  end if;

  if v_source_type = 'authorial' then
    v_banca := null;
  elsif v_banca is null then
    raise exception 'Questão real exige banca';
  end if;

  if v_plan_id is null or v_subject_id is null or v_lesson_id is null then
    raise exception 'Plano, matéria e assunto são obrigatórios';
  end if;

  if v_statement = '' then
    raise exception 'Enunciado obrigatório';
  end if;

  if v_type not in ('true_false', 'multiple_choice') then
    raise exception 'Tipo inválido';
  end if;

  if v_level not in (1, 2, 3, 4) then
    raise exception 'Nível inválido';
  end if;

  if v_type = 'true_false' then
    v_choices := null;
    if v_correct not in ('TRUE', 'FALSE') then
      raise exception 'Gabarito deve ser TRUE ou FALSE';
    end if;
  else
    if jsonb_typeof(v_choices) <> 'object' then
      raise exception 'Alternativas devem conter de 2 a 5 opções';
    end if;

    select count(*)
    into v_choice_count
    from jsonb_object_keys(v_choices);

    if v_choice_count not between 2 and 5 then
      raise exception 'Alternativas devem conter de 2 a 5 opções';
    end if;

    if not (v_choices ? v_correct) then
      raise exception 'Gabarito não corresponde às alternativas';
    end if;
  end if;

  if v_id is null then
    insert into public.questions (
      plan_id,
      subject_id,
      lesson_id,
      statement,
      question_type,
      choices,
      level,
      banca,
      ano,
      exam_name,
      source_code,
      source_type,
      active,
      created_by
    )
    values (
      v_plan_id,
      v_subject_id,
      v_lesson_id,
      v_statement,
      v_type,
      v_choices,
      v_level,
      v_banca,
      nullif(p_payload->>'ano', '')::integer,
      nullif(trim(p_payload->>'exam_name'), ''),
      nullif(trim(p_payload->>'source_code'), ''),
      v_source_type,
      coalesce((p_payload->>'active')::boolean, true),
      auth.uid()
    )
    returning id into v_id;
  else
    update public.questions
    set
      plan_id = v_plan_id,
      subject_id = v_subject_id,
      lesson_id = v_lesson_id,
      statement = v_statement,
      question_type = v_type,
      choices = v_choices,
      level = v_level,
      banca = v_banca,
      ano = nullif(p_payload->>'ano', '')::integer,
      exam_name = nullif(trim(p_payload->>'exam_name'), ''),
      source_code = nullif(trim(p_payload->>'source_code'), ''),
      source_type = v_source_type,
      active = coalesce((p_payload->>'active')::boolean, active),
      updated_at = now()
    where id = v_id;

    if not found then
      raise exception 'Questão não encontrada';
    end if;
  end if;

  insert into public.question_keys (
    question_id,
    correct_answer,
    explanation
  )
  values (
    v_id,
    v_correct,
    nullif(trim(p_payload->>'explanation'), '')
  )
  on conflict (question_id)
  do update
  set
    correct_answer = excluded.correct_answer,
    explanation = excluded.explanation,
    updated_at = now();

  return v_id;
end;
$$;

revoke all on function public.admin_upsert_question(jsonb) from public;
grant execute on function public.admin_upsert_question(jsonb) to authenticated;

create or replace function public.admin_question_bulk_preview(
  p_lesson_id uuid,
  p_source_type text default null,
  p_banca text default null,
  p_level smallint default null,
  p_active boolean default null,
  p_today_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if p_lesson_id is null then
    raise exception 'Selecione uma aula';
  end if;

  if p_source_type is not null
     and p_source_type not in ('real', 'authorial') then
    raise exception 'Filtro de origem inválido';
  end if;

  if p_level is not null and p_level not in (1,2,3,4) then
    raise exception 'Nível inválido';
  end if;

  with filtered as (
    select q.*
    from public.questions q
    where q.lesson_id = p_lesson_id
      and (p_source_type is null or q.source_type = p_source_type)
      and (
        p_banca is null
        or lower(coalesce(q.banca, '')) like '%' || lower(trim(p_banca)) || '%'
      )
      and (p_level is null or q.level = p_level)
      and (p_active is null or q.active = p_active)
      and (
        not p_today_only
        or (q.created_at at time zone 'America/Sao_Paulo')::date =
           (now() at time zone 'America/Sao_Paulo')::date
      )
  ),
  counts as (
    select
      count(*)::integer as total,
      count(*) filter (where source_type = 'real')::integer as real_count,
      count(*) filter (where source_type = 'authorial')::integer as authorial_count,
      count(*) filter (where active)::integer as active_count,
      count(*) filter (where not active)::integer as inactive_count,
      count(*) filter (
        where (created_at at time zone 'America/Sao_Paulo')::date =
              (now() at time zone 'America/Sao_Paulo')::date
      )::integer as today_count,
      count(*) filter (
        where exists (
          select 1
          from public.user_question_answers a
          where a.question_id = filtered.id
        )
        or exists (
          select 1
          from public.question_attempt_items i
          where i.question_id = filtered.id
        )
      )::integer as protected_count
    from filtered
  ),
  bancas as (
    select coalesce(banca, 'Sem banca') as banca, count(*)::integer as count
    from filtered
    where source_type = 'real'
    group by coalesce(banca, 'Sem banca')
    order by count(*) desc, coalesce(banca, 'Sem banca')
  )
  select jsonb_build_object(
    'total', counts.total,
    'real_count', counts.real_count,
    'authorial_count', counts.authorial_count,
    'active_count', counts.active_count,
    'inactive_count', counts.inactive_count,
    'today_count', counts.today_count,
    'protected_count', counts.protected_count,
    'banca_counts', coalesce(
      (select jsonb_agg(jsonb_build_object('banca', banca, 'count', count)) from bancas),
      '[]'::jsonb
    )
  )
  into v_result
  from counts;

  return coalesce(
    v_result,
    jsonb_build_object(
      'total', 0,
      'real_count', 0,
      'authorial_count', 0,
      'active_count', 0,
      'inactive_count', 0,
      'today_count', 0,
      'protected_count', 0,
      'banca_counts', '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.admin_question_bulk_preview(
  uuid,
  text,
  text,
  smallint,
  boolean,
  boolean
) from public;

grant execute on function public.admin_question_bulk_preview(
  uuid,
  text,
  text,
  smallint,
  boolean,
  boolean
) to authenticated;

create or replace function public.admin_delete_questions_bulk(
  p_lesson_id uuid,
  p_source_type text default null,
  p_banca text default null,
  p_level smallint default null,
  p_active boolean default null,
  p_today_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matched integer := 0;
  v_protected integer := 0;
  v_deleted integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if p_lesson_id is null then
    raise exception 'Selecione uma aula';
  end if;

  if p_source_type is not null
     and p_source_type not in ('real', 'authorial') then
    raise exception 'Filtro de origem inválido';
  end if;

  if p_level is not null and p_level not in (1,2,3,4) then
    raise exception 'Nível inválido';
  end if;

  with filtered as (
    select q.id
    from public.questions q
    where q.lesson_id = p_lesson_id
      and (p_source_type is null or q.source_type = p_source_type)
      and (
        p_banca is null
        or lower(coalesce(q.banca, '')) like '%' || lower(trim(p_banca)) || '%'
      )
      and (p_level is null or q.level = p_level)
      and (p_active is null or q.active = p_active)
      and (
        not p_today_only
        or (q.created_at at time zone 'America/Sao_Paulo')::date =
           (now() at time zone 'America/Sao_Paulo')::date
      )
  )
  select
    count(*)::integer,
    count(*) filter (
      where exists (
        select 1
        from public.user_question_answers a
        where a.question_id = filtered.id
      )
      or exists (
        select 1
        from public.question_attempt_items i
        where i.question_id = filtered.id
      )
    )::integer
  into v_matched, v_protected
  from filtered;

  with deletable as (
    select q.id
    from public.questions q
    where q.lesson_id = p_lesson_id
      and (p_source_type is null or q.source_type = p_source_type)
      and (
        p_banca is null
        or lower(coalesce(q.banca, '')) like '%' || lower(trim(p_banca)) || '%'
      )
      and (p_level is null or q.level = p_level)
      and (p_active is null or q.active = p_active)
      and (
        not p_today_only
        or (q.created_at at time zone 'America/Sao_Paulo')::date =
           (now() at time zone 'America/Sao_Paulo')::date
      )
      and not exists (
        select 1
        from public.user_question_answers a
        where a.question_id = q.id
      )
      and not exists (
        select 1
        from public.question_attempt_items i
        where i.question_id = q.id
      )
  ),
  deleted as (
    delete from public.questions q
    using deletable d
    where q.id = d.id
    returning q.id
  )
  select count(*)::integer
  into v_deleted
  from deleted;

  return jsonb_build_object(
    'matched', v_matched,
    'deleted', v_deleted,
    'protected', v_protected
  );
end;
$$;

revoke all on function public.admin_delete_questions_bulk(
  uuid,
  text,
  text,
  smallint,
  boolean,
  boolean
) from public;

grant execute on function public.admin_delete_questions_bulk(
  uuid,
  text,
  text,
  smallint,
  boolean,
  boolean
) to authenticated;
