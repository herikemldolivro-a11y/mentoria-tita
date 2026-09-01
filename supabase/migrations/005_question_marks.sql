-- Mentoria Titã — favoritos e fila pessoal de revisão de questões.
-- Requer 004_question_bank.sql.

create table if not exists public.user_question_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  starred boolean not null default false,
  saved_for_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists user_question_marks_starred_idx
  on public.user_question_marks(user_id, starred) where starred;
create index if not exists user_question_marks_review_idx
  on public.user_question_marks(user_id, saved_for_review) where saved_for_review;

alter table public.user_question_marks enable row level security;

drop policy if exists "Users read own question marks" on public.user_question_marks;
create policy "Users read own question marks" on public.user_question_marks
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users insert own question marks" on public.user_question_marks;
create policy "Users insert own question marks" on public.user_question_marks
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users update own question marks" on public.user_question_marks;
create policy "Users update own question marks" on public.user_question_marks
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users delete own question marks" on public.user_question_marks;
create policy "Users delete own question marks" on public.user_question_marks
for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.user_question_marks to authenticated;

create or replace function public.set_question_mark(
  p_question_id uuid,
  p_mark text,
  p_value boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_starred boolean := false;
  v_review boolean := false;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if coalesce(p_mark, '') not in ('starred', 'review') then raise exception 'Marcador inválido'; end if;

  select active_study_plan_id into v_plan_id from public.profiles where id = v_user_id;
  if not exists (
    select 1 from public.questions q
    where q.id = p_question_id and q.plan_id = v_plan_id and q.active = true
  ) then raise exception 'Questão indisponível no plano ativo'; end if;

  select starred, saved_for_review into v_starred, v_review
  from public.user_question_marks
  where user_id = v_user_id and question_id = p_question_id;

  v_starred := coalesce(v_starred, false);
  v_review := coalesce(v_review, false);
  if p_mark = 'starred' then v_starred := p_value; else v_review := p_value; end if;

  if not v_starred and not v_review then
    delete from public.user_question_marks
    where user_id = v_user_id and question_id = p_question_id;
  else
    insert into public.user_question_marks(user_id, question_id, starred, saved_for_review)
    values (v_user_id, p_question_id, v_starred, v_review)
    on conflict (user_id, question_id) do update set
      starred = excluded.starred,
      saved_for_review = excluded.saved_for_review,
      updated_at = now();
  end if;

  return jsonb_build_object('starred', v_starred, 'saved_for_review', v_review);
end;
$$;

revoke all on function public.set_question_mark(uuid, text, boolean) from public;
grant execute on function public.set_question_mark(uuid, text, boolean) to authenticated;

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
  if coalesce(p_status, 'all') not in ('all', 'resolved', 'unresolved', 'correct', 'incorrect', 'starred', 'review') then
    raise exception 'Filtro de status inválido';
  end if;
  if p_level is not null and p_level not in (1,2,3,4) then raise exception 'Nível inválido'; end if;

  select active_study_plan_id into v_plan_id from public.profiles where id = v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;

  with filtered as (
    select q.id
    from public.questions q
    left join public.user_question_marks m on m.user_id = v_user_id and m.question_id = q.id
    left join lateral (
      select a.is_correct, a.answered_at
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
        when 'starred' then coalesce(m.starred, false)
        when 'review' then coalesce(m.saved_for_review, false)
        else true
      end
  )
  select count(*) into v_total from filtered;

  with filtered as (
    select q.id, q.subject_id, q.lesson_id, q.statement, q.question_type,
      q.choices, q.level, q.banca, q.ano, q.exam_name, q.source_code,
      s.name as subject_name, l.title as lesson_title,
      last_answer.selected_answer, last_answer.is_correct, last_answer.answered_at,
      coalesce(m.starred, false) as starred,
      coalesce(m.saved_for_review, false) as saved_for_review,
      case when last_answer.answered_at is not null then k.correct_answer else null end as correct_answer,
      case when last_answer.answered_at is not null then k.explanation else null end as explanation
    from public.questions q
    join public.study_subjects s on s.id = q.subject_id
    join public.study_lessons l on l.id = q.lesson_id
    join public.question_keys k on k.question_id = q.id
    left join public.user_question_marks m on m.user_id = v_user_id and m.question_id = q.id
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
        when 'starred' then coalesce(m.starred, false)
        when 'review' then coalesce(m.saved_for_review, false)
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
    'starred', coalesce(m.starred, false),
    'saved_for_review', coalesce(m.saved_for_review, false),
    'correct_answer', case when i.selected_answer is not null then k.correct_answer else null end,
    'explanation', case when i.selected_answer is not null then k.explanation else null end
  ) order by i.position), '[]'::jsonb) into v_items
  from public.question_attempt_items i
  join public.questions q on q.id = i.question_id
  join public.question_keys k on k.question_id = q.id
  join public.question_attempts a on a.id = i.attempt_id
  left join public.user_question_marks m on m.user_id = v_user_id and m.question_id = q.id
  where i.attempt_id = p_attempt_id and a.user_id = v_user_id;

  return jsonb_build_object('attempt', v_attempt, 'items', v_items);
end;
$$;

revoke all on function public.get_question_attempt(uuid) from public;
grant execute on function public.get_question_attempt(uuid) to authenticated;
