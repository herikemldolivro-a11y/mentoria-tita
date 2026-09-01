-- Mentoria Titã — banco de questões, histórico e listas congeladas
-- Requer 002_study_system.sql e 003_content_library.sql.

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete restrict,
  subject_id uuid not null references public.study_subjects(id) on delete restrict,
  lesson_id uuid not null references public.study_lessons(id) on delete restrict,
  statement text not null check (length(trim(statement)) > 0),
  question_type text not null check (question_type in ('true_false', 'multiple_choice')),
  choices jsonb,
  level smallint not null check (level in (1, 2, 3, 4)),
  banca text,
  ano integer check (ano is null or ano between 1900 and 2200),
  exam_name text,
  source_code text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_choices_shape check (
    (question_type = 'true_false' and choices is null)
    or (question_type = 'multiple_choice' and jsonb_typeof(choices) = 'object')
  )
);

create table if not exists public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer text not null check (length(trim(correct_answer)) > 0),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_question_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_answer text not null,
  is_correct boolean not null,
  origin text not null check (origin in ('bank', 'lesson_list', 'leveling')),
  answered_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.study_lessons(id) on delete restrict,
  kind text not null check (kind in ('lesson_list', 'leveling')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  total integer not null check (total > 0),
  score integer check (score is null or score between 0 and total),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint question_attempt_kind_lesson check (
    (kind = 'lesson_list' and lesson_id is not null)
    or kind = 'leveling'
  )
);

create table if not exists public.question_attempt_items (
  attempt_id uuid not null references public.question_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  position integer not null check (position > 0),
  selected_answer text,
  is_correct boolean,
  answered_at timestamptz,
  primary key (attempt_id, question_id),
  unique (attempt_id, position),
  constraint attempt_item_answer_state check (
    (selected_answer is null and is_correct is null and answered_at is null)
    or (selected_answer is not null and is_correct is not null and answered_at is not null)
  )
);

create unique index if not exists question_attempts_one_open_lesson_idx
  on public.question_attempts(user_id, lesson_id, kind)
  where status = 'in_progress' and lesson_id is not null;

create index if not exists questions_plan_idx on public.questions(plan_id);
create index if not exists questions_subject_idx on public.questions(subject_id);
create index if not exists questions_lesson_idx on public.questions(lesson_id);
create index if not exists questions_level_idx on public.questions(level);
create index if not exists questions_active_idx on public.questions(active);
create index if not exists questions_banca_idx on public.questions(banca);
create index if not exists questions_ano_idx on public.questions(ano);
create index if not exists questions_bank_filter_idx on public.questions(plan_id, active, subject_id, lesson_id, level);
create index if not exists user_question_answers_user_question_idx on public.user_question_answers(user_id, question_id, answered_at desc);
create index if not exists user_question_answers_question_idx on public.user_question_answers(question_id, answered_at desc);
create index if not exists question_attempts_user_status_idx on public.question_attempts(user_id, status, started_at desc);
create index if not exists question_attempt_items_attempt_position_idx on public.question_attempt_items(attempt_id, position);

create or replace function public.validate_question_taxonomy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_choice_count integer;
begin
  if not exists (
    select 1
    from public.study_subjects s
    join public.study_lessons l on l.subject_id = s.id
    where s.id = new.subject_id
      and s.plan_id = new.plan_id
      and l.id = new.lesson_id
  ) then
    raise exception 'Plano, matéria e assunto não pertencem à mesma trilha';
  end if;

  if new.question_type = 'true_false' then
    new.choices := null;
  else
    select count(*) into v_choice_count from jsonb_object_keys(new.choices);
    if v_choice_count not between 2 and 5 then
      raise exception 'Questões de múltipla escolha devem ter de 2 a 5 alternativas';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_question_taxonomy_trigger on public.questions;
create trigger validate_question_taxonomy_trigger
before insert or update on public.questions
for each row execute function public.validate_question_taxonomy();

create or replace function public.touch_question_key_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_question_key_updated_at_trigger on public.question_keys;
create trigger touch_question_key_updated_at_trigger
before update on public.question_keys
for each row execute function public.touch_question_key_updated_at();

alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.user_question_answers enable row level security;
alter table public.question_attempts enable row level security;
alter table public.question_attempt_items enable row level security;

drop policy if exists "Users read assigned active questions" on public.questions;
create policy "Users read assigned active questions"
on public.questions for select to authenticated
using (
  public.is_admin()
  or (
    active = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active_study_plan_id = questions.plan_id
    )
  )
);

drop policy if exists "Admins insert questions" on public.questions;
create policy "Admins insert questions" on public.questions
for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update questions" on public.questions;
create policy "Admins update questions" on public.questions
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read question keys" on public.question_keys;
create policy "Admins read question keys" on public.question_keys
for select to authenticated using (public.is_admin());
drop policy if exists "Admins insert question keys" on public.question_keys;
create policy "Admins insert question keys" on public.question_keys
for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update question keys" on public.question_keys;
create policy "Admins update question keys" on public.question_keys
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users read own question answers" on public.user_question_answers;
create policy "Users read own question answers" on public.user_question_answers
for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users read own question attempts" on public.question_attempts;
create policy "Users read own question attempts" on public.question_attempts
for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users read own question attempt items" on public.question_attempt_items;
create policy "Users read own question attempt items" on public.question_attempt_items
for select to authenticated using (
  public.is_admin()
  or exists (
    select 1 from public.question_attempts a
    where a.id = question_attempt_items.attempt_id and a.user_id = auth.uid()
  )
);

grant select, insert, update on public.questions to authenticated;
grant select, insert, update on public.question_keys to authenticated;
grant select on public.user_question_answers, public.question_attempts, public.question_attempt_items to authenticated;

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

  if v_plan_id is null or v_subject_id is null or v_lesson_id is null then
    raise exception 'Plano, matéria e assunto são obrigatórios';
  end if;
  if v_statement = '' then raise exception 'Enunciado obrigatório'; end if;
  if v_type not in ('true_false', 'multiple_choice') then raise exception 'Tipo inválido'; end if;
  if v_level not in (1, 2, 3, 4) then raise exception 'Nível inválido'; end if;

  if v_type = 'true_false' then
    v_choices := null;
    if v_correct not in ('TRUE', 'FALSE') then raise exception 'Gabarito deve ser TRUE ou FALSE'; end if;
  else
    if jsonb_typeof(v_choices) <> 'object' then
      raise exception 'Alternativas devem conter de 2 a 5 opções';
    end if;
    select count(*) into v_choice_count from jsonb_object_keys(v_choices);
    if v_choice_count not between 2 and 5 then
      raise exception 'Alternativas devem conter de 2 a 5 opções';
    end if;
    if not (v_choices ? v_correct) then raise exception 'Gabarito não corresponde às alternativas'; end if;
  end if;

  if v_id is null then
    insert into public.questions (
      plan_id, subject_id, lesson_id, statement, question_type, choices, level,
      banca, ano, exam_name, source_code, active, created_by
    ) values (
      v_plan_id, v_subject_id, v_lesson_id, v_statement, v_type, v_choices, v_level,
      nullif(trim(p_payload->>'banca'), ''), nullif(p_payload->>'ano', '')::integer,
      nullif(trim(p_payload->>'exam_name'), ''), nullif(trim(p_payload->>'source_code'), ''),
      coalesce((p_payload->>'active')::boolean, true), auth.uid()
    ) returning id into v_id;
  else
    update public.questions set
      plan_id = v_plan_id,
      subject_id = v_subject_id,
      lesson_id = v_lesson_id,
      statement = v_statement,
      question_type = v_type,
      choices = v_choices,
      level = v_level,
      banca = nullif(trim(p_payload->>'banca'), ''),
      ano = nullif(p_payload->>'ano', '')::integer,
      exam_name = nullif(trim(p_payload->>'exam_name'), ''),
      source_code = nullif(trim(p_payload->>'source_code'), ''),
      active = coalesce((p_payload->>'active')::boolean, active),
      updated_at = now()
    where id = v_id;
    if not found then raise exception 'Questão não encontrada'; end if;
  end if;

  insert into public.question_keys (question_id, correct_answer, explanation)
  values (v_id, v_correct, nullif(trim(p_payload->>'explanation'), ''))
  on conflict (question_id) do update set
    correct_answer = excluded.correct_answer,
    explanation = excluded.explanation,
    updated_at = now();

  return v_id;
end;
$$;

revoke all on function public.admin_upsert_question(jsonb) from public;
grant execute on function public.admin_upsert_question(jsonb) to authenticated;

create or replace function public.admin_import_questions(p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_index integer := 0;
  v_ids jsonb := '[]'::jsonb;
  v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'Envie um array JSON com pelo menos uma questão';
  end if;
  if jsonb_array_length(p_questions) > 500 then
    raise exception 'Importe no máximo 500 questões por lote';
  end if;

  for v_item in select value from jsonb_array_elements(p_questions)
  loop
    v_index := v_index + 1;
    begin
      v_id := public.admin_upsert_question(v_item);
      v_ids := v_ids || jsonb_build_array(v_id);
    exception when others then
      raise exception 'Registro %: %', v_index, sqlerrm;
    end;
  end loop;

  return jsonb_build_object('imported', v_index, 'ids', v_ids);
end;
$$;

revoke all on function public.admin_import_questions(jsonb) from public;
grant execute on function public.admin_import_questions(jsonb) to authenticated;

create or replace function public.get_question_bank_page(
  p_status text default 'all',
  p_subject_id uuid default null,
  p_lesson_id uuid default null,
  p_level smallint default null,
  p_keyword text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  v_total integer;
  v_rows jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if coalesce(p_status, 'all') not in ('all', 'resolved', 'unresolved', 'correct', 'incorrect') then
    raise exception 'Filtro de status inválido';
  end if;
  if p_level is not null and p_level not in (1,2,3,4) then raise exception 'Nível inválido'; end if;

  select active_study_plan_id into v_plan_id from public.profiles where id = v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;

  with filtered as (
    select q.id, q.plan_id, q.subject_id, q.lesson_id, q.statement, q.question_type,
      q.choices, q.level, q.banca, q.ano, q.exam_name, q.source_code,
      s.name as subject_name, l.title as lesson_title,
      last_answer.selected_answer, last_answer.is_correct, last_answer.answered_at
    from public.questions q
    join public.study_subjects s on s.id = q.subject_id
    join public.study_lessons l on l.id = q.lesson_id
    left join lateral (
      select a.selected_answer, a.is_correct, a.answered_at
      from public.user_question_answers a
      where a.user_id = v_user_id and a.question_id = q.id
      order by a.answered_at desc, a.id desc limit 1
    ) last_answer on true
    where q.plan_id = v_plan_id and q.active = true
      and (p_subject_id is null or q.subject_id = p_subject_id)
      and (p_lesson_id is null or q.lesson_id = p_lesson_id)
      and (p_level is null or q.level = p_level)
      and (nullif(trim(coalesce(p_keyword, '')), '') is null or q.statement ilike '%' || trim(p_keyword) || '%')
      and case coalesce(p_status, 'all')
        when 'resolved' then last_answer.answered_at is not null
        when 'unresolved' then last_answer.answered_at is null
        when 'correct' then last_answer.is_correct = true
        when 'incorrect' then last_answer.is_correct = false
        else true
      end
  )
  select count(*) into v_total from filtered;

  with filtered as (
    select q.id, q.subject_id, q.lesson_id, q.statement, q.question_type,
      q.choices, q.level, q.banca, q.ano, q.exam_name, q.source_code,
      s.name as subject_name, l.title as lesson_title,
      last_answer.selected_answer, last_answer.is_correct, last_answer.answered_at,
      case when last_answer.answered_at is not null then k.correct_answer else null end as correct_answer,
      case when last_answer.answered_at is not null then k.explanation else null end as explanation
    from public.questions q
    join public.study_subjects s on s.id = q.subject_id
    join public.study_lessons l on l.id = q.lesson_id
    join public.question_keys k on k.question_id = q.id
    left join lateral (
      select a.selected_answer, a.is_correct, a.answered_at
      from public.user_question_answers a
      where a.user_id = v_user_id and a.question_id = q.id
      order by a.answered_at desc, a.id desc limit 1
    ) last_answer on true
    where q.plan_id = v_plan_id and q.active = true
      and (p_subject_id is null or q.subject_id = p_subject_id)
      and (p_lesson_id is null or q.lesson_id = p_lesson_id)
      and (p_level is null or q.level = p_level)
      and (nullif(trim(coalesce(p_keyword, '')), '') is null or q.statement ilike '%' || trim(p_keyword) || '%')
      and case coalesce(p_status, 'all')
        when 'resolved' then last_answer.answered_at is not null
        when 'unresolved' then last_answer.answered_at is null
        when 'correct' then last_answer.is_correct = true
        when 'incorrect' then last_answer.is_correct = false
        else true
      end
    order by q.created_at desc, q.id
    limit v_size offset ((v_page - 1) * v_size)
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) into v_rows from filtered;

  return jsonb_build_object('items', v_rows, 'total', v_total, 'page', v_page, 'page_size', v_size);
end;
$$;

revoke all on function public.get_question_bank_page(text, uuid, uuid, smallint, text, integer, integer) from public;
grant execute on function public.get_question_bank_page(text, uuid, uuid, smallint, text, integer, integer) to authenticated;

create or replace function public.submit_question_answer(
  p_question_id uuid,
  p_answer text,
  p_origin text default 'bank'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_correct text;
  v_explanation text;
  v_is_correct boolean;
  v_answer text := upper(trim(coalesce(p_answer, '')));
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_origin not in ('bank', 'lesson_list', 'leveling') then raise exception 'Origem inválida'; end if;
  if v_answer = '' then raise exception 'Selecione uma resposta'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id = v_user_id;

  select k.correct_answer, k.explanation
  into v_correct, v_explanation
  from public.questions q
  join public.question_keys k on k.question_id = q.id
  where q.id = p_question_id and q.active = true and q.plan_id = v_plan_id;
  if v_correct is null then raise exception 'Questão indisponível'; end if;

  v_is_correct := v_answer = upper(trim(v_correct));
  insert into public.user_question_answers(user_id, question_id, selected_answer, is_correct, origin)
  values (v_user_id, p_question_id, v_answer, v_is_correct, p_origin);

  return jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_answer', v_correct,
    'explanation', v_explanation
  );
end;
$$;

revoke all on function public.submit_question_answer(uuid, text, text) from public;
grant execute on function public.submit_question_answer(uuid, text, text) to authenticated;

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
  v_attempt public.question_attempts%rowtype;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id = v_user_id;
  if not exists (
    select 1 from public.study_lessons l join public.study_subjects s on s.id = l.subject_id
    where l.id = p_lesson_id and s.plan_id = v_plan_id
  ) then raise exception 'Aula fora do plano ativo'; end if;

  select count(*) into v_count from public.questions
  where lesson_id = p_lesson_id and plan_id = v_plan_id and active = true;
  select * into v_attempt from public.question_attempts
  where user_id = v_user_id and lesson_id = p_lesson_id and kind = 'lesson_list'
  order by started_at desc limit 1;

  return jsonb_build_object(
    'available_count', v_count,
    'required_count', 35,
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

  if not exists (
    select 1
    from public.study_lessons l
    join public.study_subjects s on s.id = l.subject_id
    join public.user_lesson_progress lp on lp.lesson_id = l.id and lp.user_id = v_user_id
    where l.id = p_lesson_id and s.plan_id = v_plan_id and lp.theory_completed_at is not null
  ) then raise exception 'Conclua a teoria antes de iniciar a lista'; end if;

  select count(*) into v_available from public.questions
  where plan_id = v_plan_id and lesson_id = p_lesson_id and active = true;
  if v_available < 35 then
    return jsonb_build_object('ok', false, 'available_count', v_available, 'required_count', 35);
  end if;

  insert into public.question_attempts(user_id, lesson_id, kind, status, total)
  values (v_user_id, p_lesson_id, 'lesson_list', 'in_progress', 35)
  returning id into v_attempt_id;

  -- Se os quatro níveis existem, garante ao menos uma questão de cada um.
  if (select count(distinct level) from public.questions where plan_id = v_plan_id and lesson_id = p_lesson_id and active) = 4 then
    for v_level in 1..4 loop
      select q.id into v_question_id
      from public.questions q
      where q.plan_id = v_plan_id and q.lesson_id = p_lesson_id and q.active and q.level = v_level
      order by exists (
        select 1 from public.user_question_answers a where a.user_id = v_user_id and a.question_id = q.id
      ), random()
      limit 1;
      v_selected := array_append(v_selected, v_question_id);
      v_level_counts[v_level] := v_level_counts[v_level] + 1;
      v_selected_count := v_selected_count + 1;
    end loop;
  end if;

  while v_selected_count < 35 loop
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
    order by exists (
      select 1 from public.user_question_answers a where a.user_id = v_user_id and a.question_id = q.id
    ), random()
    limit 1;
    v_selected := array_append(v_selected, v_question_id);
    v_level_counts[v_level] := v_level_counts[v_level] + 1;
    v_selected_count := v_selected_count + 1;
  end loop;

  -- Fisher–Yates: congela a mesma seleção, mas em ordem aleatória.
  for v_i in reverse array_length(v_selected, 1)..2 loop
    v_j := floor(random() * v_i + 1)::integer;
    v_swap := v_selected[v_i];
    v_selected[v_i] := v_selected[v_j];
    v_selected[v_j] := v_swap;
  end loop;

  for v_i in 1..array_length(v_selected, 1) loop
    insert into public.question_attempt_items(attempt_id, question_id, position)
    values (v_attempt_id, v_selected[v_i], v_i);
  end loop;

  update public.user_lesson_progress set list_started_at = coalesce(list_started_at, now()), updated_at = now()
  where user_id = v_user_id and lesson_id = p_lesson_id;

  return jsonb_build_object('ok', true, 'attempt_id', v_attempt_id, 'continued', false);
end;
$$;

revoke all on function public.start_lesson_question_attempt(uuid) from public;
grant execute on function public.start_lesson_question_attempt(uuid) to authenticated;

create or replace function public.get_question_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt jsonb;
  v_items jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select jsonb_build_object(
    'id', a.id, 'kind', a.kind, 'status', a.status, 'total', a.total, 'score', a.score,
    'started_at', a.started_at, 'completed_at', a.completed_at,
    'lesson_id', l.id, 'lesson_title', l.title, 'subject_name', s.name
  ) into v_attempt
  from public.question_attempts a
  left join public.study_lessons l on l.id = a.lesson_id
  left join public.study_subjects s on s.id = l.subject_id
  where a.id = p_attempt_id and a.user_id = v_user_id;
  if v_attempt is null then raise exception 'Tentativa não encontrada'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', q.id, 'position', i.position, 'statement', q.statement,
    'question_type', q.question_type, 'choices', q.choices, 'level', q.level,
    'banca', q.banca, 'ano', q.ano, 'exam_name', q.exam_name,
    'selected_answer', i.selected_answer, 'is_correct', i.is_correct,
    'correct_answer', case when i.selected_answer is not null then k.correct_answer else null end,
    'explanation', case when i.selected_answer is not null then k.explanation else null end
  ) order by i.position), '[]'::jsonb) into v_items
  from public.question_attempt_items i
  join public.questions q on q.id = i.question_id
  join public.question_keys k on k.question_id = q.id
  join public.question_attempts a on a.id = i.attempt_id
  where i.attempt_id = p_attempt_id and a.user_id = v_user_id;

  return jsonb_build_object('attempt', v_attempt, 'items', v_items);
end;
$$;

revoke all on function public.get_question_attempt(uuid) from public;
grant execute on function public.get_question_attempt(uuid) to authenticated;

create or replace function public.submit_attempt_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_correct text;
  v_explanation text;
  v_answer text := upper(trim(coalesce(p_answer, '')));
  v_is_correct boolean;
  v_kind text;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if v_answer = '' then raise exception 'Selecione uma resposta'; end if;

  select a.kind, k.correct_answer, k.explanation
  into v_kind, v_correct, v_explanation
  from public.question_attempts a
  join public.question_attempt_items i on i.attempt_id = a.id
  join public.question_keys k on k.question_id = i.question_id
  where a.id = p_attempt_id and a.user_id = v_user_id and a.status = 'in_progress'
    and i.question_id = p_question_id;
  if v_correct is null then raise exception 'Questão ou tentativa indisponível'; end if;

  v_is_correct := v_answer = upper(trim(v_correct));
  update public.question_attempt_items set
    selected_answer = v_answer, is_correct = v_is_correct, answered_at = now()
  where attempt_id = p_attempt_id and question_id = p_question_id;

  update public.question_attempts set updated_at = now() where id = p_attempt_id;
  insert into public.user_question_answers(user_id, question_id, selected_answer, is_correct, origin)
  values (v_user_id, p_question_id, v_answer, v_is_correct,
    case when v_kind = 'leveling' then 'leveling' else 'lesson_list' end);

  return jsonb_build_object('is_correct', v_is_correct, 'correct_answer', v_correct, 'explanation', v_explanation);
end;
$$;

revoke all on function public.submit_attempt_answer(uuid, uuid, text) from public;
grant execute on function public.submit_attempt_answer(uuid, uuid, text) to authenticated;

create or replace function public.finalize_question_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.question_attempts%rowtype;
  v_answered integer;
  v_score integer;
  v_mode text;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_attempt from public.question_attempts
  where id = p_attempt_id and user_id = v_user_id;
  if v_attempt.id is null then raise exception 'Tentativa não encontrada'; end if;
  if v_attempt.status = 'completed' then
    return jsonb_build_object('score', v_attempt.score, 'total', v_attempt.total,
      'percentage', round(v_attempt.score::numeric * 100 / v_attempt.total, 1));
  end if;

  select count(*), count(*) filter (where is_correct)
  into v_answered, v_score
  from public.question_attempt_items
  where attempt_id = p_attempt_id and selected_answer is not null;
  if v_answered < v_attempt.total then
    raise exception 'Responda todas as % questões antes de finalizar', v_attempt.total;
  end if;

  update public.question_attempts set status = 'completed', score = v_score,
    completed_at = now(), updated_at = now()
  where id = p_attempt_id;

  if v_attempt.kind = 'lesson_list' then
    select theory_mode into v_mode from public.user_lesson_progress
    where user_id = v_user_id and lesson_id = v_attempt.lesson_id;
    perform public.save_lesson_progress(v_attempt.lesson_id, true, true, v_mode, true, true);
  end if;

  return jsonb_build_object('score', v_score, 'total', v_attempt.total,
    'percentage', round(v_score::numeric * 100 / v_attempt.total, 1));
end;
$$;

revoke all on function public.finalize_question_attempt(uuid) from public;
grant execute on function public.finalize_question_attempt(uuid) to authenticated;

create or replace function public.admin_question_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_admin() then coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb)
    else (select jsonb_build_array() from (select 1) denied where false) end
  from (
    select p.id as plan_id, p.name as plan_name, s.id as subject_id, s.name as subject_name,
      l.id as lesson_id, l.title as lesson_title,
      count(q.id) filter (where q.active) as active_count,
      count(q.id) as total_count
    from public.study_lessons l
    join public.study_subjects s on s.id = l.subject_id
    join public.study_plans p on p.id = s.plan_id
    left join public.questions q on q.lesson_id = l.id
    group by p.id, p.name, s.id, s.name, l.id, l.title, l.position
    order by p.name, s.name, l.position
  ) rows;
$$;

revoke all on function public.admin_question_overview() from public;
grant execute on function public.admin_question_overview() to authenticated;
