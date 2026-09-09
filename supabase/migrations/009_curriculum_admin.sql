-- Mentoria Tita - Admin de cronograma, semanas, materias e matriz semanal.
-- Tambem repara mojibake existente e normaliza novas gravacoes.
-- Migration aditiva/idempotente.

create or replace function public.mt_fix_text(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := p_value;
  v_next text;
  i integer;
begin
  if v is null then return null; end if;

  for i in 1..3 loop
    if strpos(v, chr(195)) = 0
       and strpos(v, chr(194)) = 0
       and strpos(v, chr(226)) = 0 then
      exit;
    end if;

    begin
      v_next := convert_from(convert_to(v, 'WIN1252'), 'UTF8');
      if v_next = v then exit; end if;
      v := v_next;
    exception when others then
      exit;
    end;
  end loop;

  return v;
end;
$$;

update public.contests
set nome = public.mt_fix_text(nome),
    sigla = public.mt_fix_text(sigla);

update public.study_plans set name = public.mt_fix_text(name);
update public.study_weeks set title = public.mt_fix_text(title);

update public.study_subjects
set short_name = public.mt_fix_text(short_name),
    name = public.mt_fix_text(name),
    description = public.mt_fix_text(description);

update public.study_lessons
set title = public.mt_fix_text(title),
    priority = public.mt_fix_text(priority);

update public.study_lesson_topics set topic = public.mt_fix_text(topic);

update public.questions
set statement = public.mt_fix_text(statement),
    banca = public.mt_fix_text(banca),
    exam_name = public.mt_fix_text(exam_name),
    source_code = public.mt_fix_text(source_code);

update public.question_keys set explanation = public.mt_fix_text(explanation);

update public.user_revisions
set subject_name = public.mt_fix_text(subject_name),
    lesson_title = public.mt_fix_text(lesson_title);

update public.lesson_materials
set title = public.mt_fix_text(title),
    file_name = public.mt_fix_text(file_name);

update public.profiles
set nome = public.mt_fix_text(nome)
where nome is not null;

update public.contests
set nome = 'Polícia Rodoviária Federal',
    sigla = 'PRF'
where slug = 'prf';

update public.study_plans
set name = 'PRF — Foco 95+'
where slug = 'prf-foco95';

update public.study_weeks w
set title = 'Semana 1'
from public.study_plans p
where w.plan_id = p.id
  and p.slug = 'prf-foco95'
  and w.week_number = 1;

update public.study_subjects s
set short_name = case s.slug
      when 'contabilidade' then 'CONTABILIDADE'
      when 'raciocinio-logico' then 'RLM'
      else s.short_name
    end,
    name = case s.slug
      when 'contabilidade' then 'Contabilidade'
      when 'raciocinio-logico' then 'Raciocínio Lógico-Matemático'
      else s.name
    end,
    description = case s.slug
      when 'contabilidade' then 'Base patrimonial, fatos contábeis e estrutura fundamental da disciplina.'
      when 'raciocinio-logico' then 'Fundamentos matemáticos aplicados ao perfil de cobrança da PRF.'
      else s.description
    end
from public.study_plans p
where s.plan_id = p.id
  and p.slug = 'prf-foco95'
  and s.slug in ('contabilidade', 'raciocinio-logico');

update public.study_lessons l
set title = case l.slug
      when 'fundamentos-da-contabilidade' then 'Fundamentos da Contabilidade'
      when 'patrimonio-e-situacao-liquida' then 'Patrimônio e Situação Líquida'
      when 'atos-e-fatos-administrativos' then 'Atos e Fatos Administrativos'
      when 'razao-e-proporcao' then 'Razão e Proporção'
      when 'regra-de-tres' then 'Regra de Três'
      else public.mt_fix_text(regexp_replace(l.title, '^\s*#+\s*', ''))
    end
from public.study_subjects s
join public.study_plans p on p.id = s.plan_id
where l.subject_id = s.id
  and p.slug = 'prf-foco95';

create or replace function public.mt_normalize_contest_text()
returns trigger language plpgsql set search_path = public as $$
begin
  new.nome := public.mt_fix_text(new.nome);
  new.sigla := public.mt_fix_text(new.sigla);
  return new;
end;
$$;
drop trigger if exists mt_normalize_contest_text_trigger on public.contests;
create trigger mt_normalize_contest_text_trigger
before insert or update on public.contests
for each row execute function public.mt_normalize_contest_text();

create or replace function public.mt_normalize_plan_text()
returns trigger language plpgsql set search_path = public as $$
begin new.name := public.mt_fix_text(new.name); return new; end;
$$;
drop trigger if exists mt_normalize_plan_text_trigger on public.study_plans;
create trigger mt_normalize_plan_text_trigger before insert or update on public.study_plans
for each row execute function public.mt_normalize_plan_text();

create or replace function public.mt_normalize_week_text()
returns trigger language plpgsql set search_path = public as $$
begin new.title := public.mt_fix_text(new.title); return new; end;
$$;
drop trigger if exists mt_normalize_week_text_trigger on public.study_weeks;
create trigger mt_normalize_week_text_trigger before insert or update on public.study_weeks
for each row execute function public.mt_normalize_week_text();

create or replace function public.mt_normalize_subject_text()
returns trigger language plpgsql set search_path = public as $$
begin
  new.short_name := public.mt_fix_text(new.short_name);
  new.name := public.mt_fix_text(new.name);
  new.description := public.mt_fix_text(new.description);
  return new;
end;
$$;
drop trigger if exists mt_normalize_subject_text_trigger on public.study_subjects;
create trigger mt_normalize_subject_text_trigger before insert or update on public.study_subjects
for each row execute function public.mt_normalize_subject_text();

create or replace function public.mt_normalize_lesson_text()
returns trigger language plpgsql set search_path = public as $$
begin
  new.title := public.mt_fix_text(regexp_replace(new.title, '^\s*#+\s*', ''));
  new.priority := public.mt_fix_text(new.priority);
  return new;
end;
$$;
drop trigger if exists mt_normalize_lesson_text_trigger on public.study_lessons;
create trigger mt_normalize_lesson_text_trigger before insert or update on public.study_lessons
for each row execute function public.mt_normalize_lesson_text();

create or replace function public.mt_normalize_topic_text()
returns trigger language plpgsql set search_path = public as $$
begin new.topic := public.mt_fix_text(new.topic); return new; end;
$$;
drop trigger if exists mt_normalize_topic_text_trigger on public.study_lesson_topics;
create trigger mt_normalize_topic_text_trigger before insert or update on public.study_lesson_topics
for each row execute function public.mt_normalize_topic_text();

create or replace function public.mt_normalize_question_text()
returns trigger language plpgsql set search_path = public as $$
begin
  new.statement := public.mt_fix_text(new.statement);
  new.banca := public.mt_fix_text(new.banca);
  new.exam_name := public.mt_fix_text(new.exam_name);
  new.source_code := public.mt_fix_text(new.source_code);
  return new;
end;
$$;
drop trigger if exists mt_normalize_question_text_trigger on public.questions;
create trigger mt_normalize_question_text_trigger before insert or update on public.questions
for each row execute function public.mt_normalize_question_text();

create or replace function public.mt_normalize_key_text()
returns trigger language plpgsql set search_path = public as $$
begin new.explanation := public.mt_fix_text(new.explanation); return new; end;
$$;
drop trigger if exists mt_normalize_key_text_trigger on public.question_keys;
create trigger mt_normalize_key_text_trigger before insert or update on public.question_keys
for each row execute function public.mt_normalize_key_text();

alter table public.study_weeks add column if not exists active boolean not null default true;
alter table public.study_subjects add column if not exists active boolean not null default true;
alter table public.study_lessons add column if not exists active boolean not null default true;

create or replace view public.study_lesson_catalog
with (security_invoker = true)
as
select
  -- IMPORTANTE: as colunas antigas permanecem exatamente na mesma ordem.
  -- PostgreSQL permite acrescentar novas colunas ao final de CREATE OR REPLACE VIEW,
  -- mas não permite deslocar/renomear colunas já existentes.
  p.id as plan_id,
  p.slug as plan_slug,
  p.contest_id,
  w.id as week_id,
  w.week_number,
  s.id as subject_id,
  s.slug as subject_slug,
  s.short_name as subject_short_name,
  s.name as subject_name,
  s.description as subject_description,
  l.id as lesson_id,
  l.slug as lesson_slug,
  l.title as lesson_title,
  l.priority,
  l.position as lesson_position,
  l.question_count,
  l.pdf_path,

  -- Novas colunas da V8/V9: sempre adicionadas ao FINAL da view.
  p.name as plan_name,
  w.title as week_title,
  w.position as week_position,
  s.position as subject_position
from public.study_plans p
join public.study_weeks w on w.plan_id = p.id
join public.study_subjects s on s.plan_id = p.id
join public.study_lessons l on l.subject_id = s.id and l.week_id = w.id
where p.active = true
  and w.active = true
  and s.active = true
  and l.active = true;

create or replace function public.admin_upsert_study_week(
  p_plan_id uuid,
  p_week_number integer,
  p_title text,
  p_position integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador'; end if;
  if p_week_number < 1 or p_week_number > 52 then raise exception 'Semana deve ficar entre 1 e 52'; end if;
  if not exists(select 1 from public.study_plans where id = p_plan_id and active) then raise exception 'Plano inválido'; end if;

  insert into public.study_weeks(plan_id, week_number, title, position, active)
  values (p_plan_id, p_week_number, coalesce(nullif(trim(p_title), ''), 'Semana ' || p_week_number), coalesce(p_position, p_week_number), true)
  on conflict(plan_id, week_number) do update
  set title = excluded.title, position = excluded.position, active = true
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.admin_upsert_study_week(uuid, integer, text, integer) from public;
grant execute on function public.admin_upsert_study_week(uuid, integer, text, integer) to authenticated;

create or replace function public.admin_upsert_study_subject(
  p_plan_id uuid,
  p_slug text,
  p_short_name text,
  p_name text,
  p_description text default null,
  p_position integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador'; end if;
  if trim(coalesce(p_slug,'')) = '' or trim(coalesce(p_name,'')) = '' then raise exception 'Slug e nome são obrigatórios'; end if;

  insert into public.study_subjects(plan_id, slug, short_name, name, description, position, active)
  values (
    p_plan_id,
    lower(trim(p_slug)),
    coalesce(nullif(trim(p_short_name), ''), upper(trim(p_name))),
    trim(p_name),
    nullif(trim(p_description), ''),
    greatest(coalesce(p_position,1),1),
    true
  )
  on conflict(plan_id, slug) do update
  set short_name = excluded.short_name,
      name = excluded.name,
      description = excluded.description,
      position = excluded.position,
      active = true
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.admin_upsert_study_subject(uuid, text, text, text, text, integer) from public;
grant execute on function public.admin_upsert_study_subject(uuid, text, text, text, text, integer) to authenticated;

create or replace function public.admin_upsert_study_lesson(
  p_subject_id uuid,
  p_week_id uuid,
  p_slug text,
  p_title text,
  p_priority text,
  p_position integer,
  p_question_count integer,
  p_topics jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_plan_subject uuid;
  v_plan_week uuid;
  v_topic text;
  v_pos integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador'; end if;
  if p_question_count < 1 or p_question_count > 200 then raise exception 'A lista deve ter entre 1 e 200 questões'; end if;
  if trim(coalesce(p_slug,'')) = '' or trim(coalesce(p_title,'')) = '' then raise exception 'Slug e título da aula são obrigatórios'; end if;

  select plan_id into v_plan_subject from public.study_subjects where id = p_subject_id;
  select plan_id into v_plan_week from public.study_weeks where id = p_week_id;
  if v_plan_subject is null or v_plan_week is null or v_plan_subject <> v_plan_week then
    raise exception 'Matéria e semana precisam pertencer ao mesmo plano';
  end if;

  insert into public.study_lessons(subject_id, week_id, slug, title, priority, position, question_count, active)
  values(p_subject_id, p_week_id, lower(trim(p_slug)), trim(p_title), nullif(trim(p_priority), ''), greatest(coalesce(p_position,1),1), p_question_count, true)
  on conflict(subject_id, slug) do update
  set week_id = excluded.week_id,
      title = excluded.title,
      priority = excluded.priority,
      position = excluded.position,
      question_count = excluded.question_count,
      active = true
  returning id into v_id;

  delete from public.study_lesson_topics where lesson_id = v_id;

  if jsonb_typeof(coalesce(p_topics,'[]'::jsonb)) = 'array' then
    for v_topic in select trim(value #>> '{}') from jsonb_array_elements(coalesce(p_topics,'[]'::jsonb))
    loop
      if v_topic <> '' then
        v_pos := v_pos + 1;
        insert into public.study_lesson_topics(lesson_id, topic, position)
        values(v_id, v_topic, v_pos);
      end if;
    end loop;
  end if;

  return v_id;
end;
$$;
revoke all on function public.admin_upsert_study_lesson(uuid, uuid, text, text, text, integer, integer, jsonb) from public;
grant execute on function public.admin_upsert_study_lesson(uuid, uuid, text, text, text, integer, integer, jsonb) to authenticated;

create or replace function public.admin_curriculum_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plans jsonb;
  v_weeks jsonb;
  v_subjects jsonb;
  v_lessons jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
  into v_plans
  from (
    select p.id, p.slug, p.name, p.contest_id, c.sigla as contest_sigla
    from public.study_plans p
    left join public.contests c on c.id = p.contest_id
    where p.active
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.plan_id, x.week_number), '[]'::jsonb)
  into v_weeks
  from (
    select id, plan_id, week_number, title, position, active
    from public.study_weeks
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.plan_id, x.position), '[]'::jsonb)
  into v_subjects
  from (
    select id, plan_id, slug, short_name, name, description, position, active
    from public.study_subjects
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.week_id, x.subject_id, x.position), '[]'::jsonb)
  into v_lessons
  from (
    select
      l.id, l.subject_id, l.week_id, l.slug, l.title, l.priority, l.position,
      l.question_count, l.active,
      coalesce((select jsonb_agg(t.topic order by t.position) from public.study_lesson_topics t where t.lesson_id = l.id), '[]'::jsonb) as topics,
      exists(select 1 from public.lesson_materials lm where lm.lesson_id = l.id and lm.is_active) as has_material,
      coalesce((select count(*) from public.questions q where q.lesson_id = l.id and q.active),0) as active_questions
    from public.study_lessons l
  ) x;

  return jsonb_build_object('plans', v_plans, 'weeks', v_weeks, 'subjects', v_subjects, 'lessons', v_lessons);
end;
$$;
revoke all on function public.admin_curriculum_catalog() from public;
grant execute on function public.admin_curriculum_catalog() to authenticated;

create or replace function public.admin_import_week_matrix(
  p_plan_id uuid,
  p_matrix jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_number integer;
  v_week_title text;
  v_week_id uuid;
  v_subject jsonb;
  v_lesson jsonb;
  v_subject_id uuid;
  v_subject_count integer := 0;
  v_lesson_count integer := 0;
  v_lesson_position integer;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador'; end if;
  if jsonb_typeof(p_matrix) <> 'object' then raise exception 'A matriz deve ser um objeto JSON'; end if;

  v_week_number := nullif(p_matrix->>'semana','')::integer;
  if v_week_number is null or v_week_number not between 1 and 52 then raise exception 'Informe "semana" entre 1 e 52'; end if;

  v_week_title := coalesce(nullif(trim(p_matrix->>'titulo'),''), 'Semana ' || v_week_number);
  v_week_id := public.admin_upsert_study_week(p_plan_id, v_week_number, v_week_title, v_week_number);

  if jsonb_typeof(p_matrix->'materias') <> 'array' then raise exception 'A matriz deve conter "materias" como lista'; end if;

  for v_subject in select value from jsonb_array_elements(p_matrix->'materias')
  loop
    v_subject_count := v_subject_count + 1;
    v_subject_id := public.admin_upsert_study_subject(
      p_plan_id,
      v_subject->>'slug',
      coalesce(v_subject->>'sigla', v_subject->>'nome'),
      v_subject->>'nome',
      v_subject->>'descricao',
      coalesce(nullif(v_subject->>'posicao','')::integer, v_subject_count)
    );

    if jsonb_typeof(v_subject->'aulas') <> 'array' then raise exception 'Matéria % precisa conter "aulas"', v_subject_count; end if;
    v_lesson_position := 0;

    for v_lesson in select value from jsonb_array_elements(v_subject->'aulas')
    loop
      v_lesson_position := v_lesson_position + 1;
      v_lesson_count := v_lesson_count + 1;
      perform public.admin_upsert_study_lesson(
        v_subject_id,
        v_week_id,
        v_lesson->>'slug',
        v_lesson->>'titulo',
        v_lesson->>'prioridade',
        coalesce(nullif(v_lesson->>'posicao','')::integer, v_lesson_position),
        coalesce(nullif(v_lesson->>'questoes_lista','')::integer, 35),
        coalesce(v_lesson->'topicos', '[]'::jsonb)
      );
    end loop;
  end loop;

  return jsonb_build_object('week_id', v_week_id, 'week_number', v_week_number, 'subjects', v_subject_count, 'lessons', v_lesson_count);
end;
$$;
revoke all on function public.admin_import_week_matrix(uuid, jsonb) from public;
grant execute on function public.admin_import_week_matrix(uuid, jsonb) to authenticated;

create or replace function public.get_lesson_question_status(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_count integer;
  v_required integer;
  v_attempt public.question_attempts%rowtype;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id = v_user_id;

  select l.question_count into v_required
  from public.study_lessons l
  join public.study_subjects s on s.id = l.subject_id
  where l.id = p_lesson_id and s.plan_id = v_plan_id and l.active and s.active;

  if v_required is null then raise exception 'Aula fora do plano ativo'; end if;

  select count(*) into v_count from public.questions
  where lesson_id = p_lesson_id and plan_id = v_plan_id and active = true;

  select * into v_attempt from public.question_attempts
  where user_id = v_user_id and lesson_id = p_lesson_id and kind = 'lesson_list'
  order by started_at desc limit 1;

  return jsonb_build_object(
    'available_count', v_count,
    'required_count', v_required,
    'attempt_id', v_attempt.id,
    'attempt_status', v_attempt.status
  );
end;
$$;
revoke all on function public.get_lesson_question_status(uuid) from public;
grant execute on function public.get_lesson_question_status(uuid) to authenticated;

create or replace function public.start_lesson_question_attempt(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_available integer;
  v_required integer;
  v_attempt_id uuid;
  v_selected uuid[] := array[]::uuid[];
  v_level_counts integer[] := array[0,0,0,0];
  v_level integer;
  v_question_id uuid;
  v_selected_count integer := 0;
  v_best_weight double precision;
  v_weight double precision;
  v_remaining integer;
  v_i integer;
  v_j integer;
  v_swap uuid;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id = v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':' || p_lesson_id::text));

  select id into v_attempt_id from public.question_attempts
  where user_id = v_user_id and lesson_id = p_lesson_id and kind = 'lesson_list' and status = 'in_progress'
  order by started_at desc limit 1;

  if v_attempt_id is not null then
    return jsonb_build_object('ok', true, 'attempt_id', v_attempt_id, 'continued', true);
  end if;

  select l.question_count into v_required
  from public.study_lessons l
  join public.study_subjects s on s.id = l.subject_id
  join public.user_lesson_progress lp on lp.lesson_id = l.id and lp.user_id = v_user_id
  where l.id = p_lesson_id
    and s.plan_id = v_plan_id
    and l.active and s.active
    and lp.theory_completed_at is not null;

  if v_required is null then raise exception 'Conclua a teoria antes de iniciar a lista'; end if;

  select count(*) into v_available from public.questions
  where plan_id = v_plan_id and lesson_id = p_lesson_id and active = true;

  if v_available < v_required then
    return jsonb_build_object('ok', false, 'available_count', v_available, 'required_count', v_required);
  end if;

  insert into public.question_attempts(user_id, lesson_id, kind, status, total)
  values (v_user_id, p_lesson_id, 'lesson_list', 'in_progress', v_required)
  returning id into v_attempt_id;

  if (select count(distinct level) from public.questions where plan_id = v_plan_id and lesson_id = p_lesson_id and active) = 4
     and v_required >= 4 then
    for v_level in 1..4 loop
      select q.id into v_question_id
      from public.questions q
      where q.plan_id = v_plan_id and q.lesson_id = p_lesson_id and q.active and q.level = v_level
      order by exists (select 1 from public.user_question_answers a where a.user_id = v_user_id and a.question_id = q.id), random()
      limit 1;
      if v_question_id is not null then
        v_selected := array_append(v_selected, v_question_id);
        v_level_counts[v_level] := v_level_counts[v_level] + 1;
        v_selected_count := v_selected_count + 1;
      end if;
    end loop;
  end if;

  while v_selected_count < v_required loop
    v_level := null;
    v_best_weight := -1;
    for v_i in 1..4 loop
      select count(*) into v_remaining
      from public.questions q
      where q.plan_id = v_plan_id and q.lesson_id = p_lesson_id and q.active
        and q.level = v_i and not (q.id = any(v_selected));

      if v_remaining > 0 then
        v_weight := sqrt(v_remaining::double precision) / (1 + v_level_counts[v_i] * 0.35) * (0.85 + random() * 0.30);
        if v_weight > v_best_weight then v_best_weight := v_weight; v_level := v_i; end if;
      end if;
    end loop;

    if v_level is null then raise exception 'Não foi possível compor a lista sem repetição'; end if;

    select q.id into v_question_id
    from public.questions q
    where q.plan_id = v_plan_id and q.lesson_id = p_lesson_id and q.active
      and q.level = v_level and not (q.id = any(v_selected))
    order by exists (select 1 from public.user_question_answers a where a.user_id = v_user_id and a.question_id = q.id), random()
    limit 1;

    v_selected := array_append(v_selected, v_question_id);
    v_level_counts[v_level] := v_level_counts[v_level] + 1;
    v_selected_count := v_selected_count + 1;
  end loop;

  if array_length(v_selected, 1) > 1 then
    for v_i in reverse array_length(v_selected, 1)..2 loop
      v_j := floor(random() * v_i + 1)::integer;
      v_swap := v_selected[v_i];
      v_selected[v_i] := v_selected[v_j];
      v_selected[v_j] := v_swap;
    end loop;
  end if;

  for v_i in 1..array_length(v_selected, 1) loop
    insert into public.question_attempt_items(attempt_id, question_id, position)
    values (v_attempt_id, v_selected[v_i], v_i);
  end loop;

  update public.user_lesson_progress
  set list_started_at = coalesce(list_started_at, now()), updated_at = now()
  where user_id = v_user_id and lesson_id = p_lesson_id;

  return jsonb_build_object('ok', true, 'attempt_id', v_attempt_id, 'continued', false);
end;
$$;
revoke all on function public.start_lesson_question_attempt(uuid) from public;
grant execute on function public.start_lesson_question_attempt(uuid) to authenticated;

create or replace function public.admin_question_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_admin() then coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) else '[]'::jsonb end
  from (
    select
      p.id as plan_id,
      p.name as plan_name,
      s.id as subject_id,
      s.name as subject_name,
      l.id as lesson_id,
      l.title as lesson_title,
      l.question_count as required_count,
      count(q.id) filter (where q.active) as active_count,
      count(q.id) as total_count
    from public.study_lessons l
    join public.study_subjects s on s.id = l.subject_id
    join public.study_plans p on p.id = s.plan_id
    left join public.questions q on q.lesson_id = l.id
    where l.active and s.active and p.active
    group by p.id, p.name, s.id, s.name, l.id, l.title, l.position, l.question_count
    order by p.name, s.name, l.position
  ) rows;
$$;
revoke all on function public.admin_question_overview() from public;
grant execute on function public.admin_question_overview() to authenticated;
