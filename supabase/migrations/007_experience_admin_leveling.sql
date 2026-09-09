-- Mentoria Titã — experiência por usuário, diretório de alunos e nivelamento configurável.
-- Esta migration é aditiva e foi desenhada para rodar depois das migrations 002, 003, 004 e 006.

alter table public.profiles
  add column if not exists username text;

create table if not exists public.lesson_leveling_settings (
  lesson_id uuid primary key references public.study_lessons(id) on delete cascade,
  question_count integer not null default 10 check (question_count between 1 and 50),
  required_correct integer not null default 9 check (required_correct >= 1),
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint lesson_leveling_settings_required_check check (required_correct <= question_count)
);

insert into public.lesson_leveling_settings (lesson_id, question_count, required_correct, active)
select id, 10, 9, true
from public.study_lessons
on conflict (lesson_id) do nothing;

alter table public.lesson_leveling_settings enable row level security;

drop policy if exists "Authenticated users read leveling rules" on public.lesson_leveling_settings;
create policy "Authenticated users read leveling rules"
on public.lesson_leveling_settings
for select to authenticated
using (true);

drop policy if exists "Admins insert leveling rules" on public.lesson_leveling_settings;
create policy "Admins insert leveling rules"
on public.lesson_leveling_settings
for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins update leveling rules" on public.lesson_leveling_settings;
create policy "Admins update leveling rules"
on public.lesson_leveling_settings
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.lesson_leveling_settings to authenticated;

alter table public.user_leveling_attempts
  add column if not exists total_questions integer not null default 10,
  add column if not exists required_correct integer not null default 9;

alter table public.user_leveling_attempts
  drop constraint if exists user_leveling_attempts_score_check;

alter table public.user_leveling_attempts
  drop constraint if exists user_leveling_attempts_dynamic_score_check;

alter table public.user_leveling_attempts
  add constraint user_leveling_attempts_dynamic_score_check
  check (
    total_questions > 0
    and required_correct between 1 and total_questions
    and score between 0 and total_questions
  );

alter table public.question_attempts
  add column if not exists revision_id uuid references public.user_revisions(id) on delete cascade,
  add column if not exists required_correct integer;

create unique index if not exists question_attempts_one_open_revision_leveling_idx
  on public.question_attempts(user_id, revision_id)
  where status = 'in_progress'
    and kind = 'leveling'
    and revision_id is not null;

create or replace function public.set_my_display_name(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'Informe um nome entre 2 e 80 caracteres';
  end if;

  update public.profiles
  set nome = v_name
  where id = v_user_id;

  if not found then
    raise exception 'Perfil não encontrado';
  end if;

  return v_name;
end;
$$;

revoke all on function public.set_my_display_name(text) from public;
grant execute on function public.set_my_display_name(text) to authenticated;

create or replace function public.admin_students_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_students jsonb;
  v_plans jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by lower(coalesce(x.nome, x.username, x.email))), '[]'::jsonb)
  into v_students
  from (
    select
      p.id,
      p.nome,
      p.username,
      p.email,
      p.ativo,
      p.focus_contest_id,
      c.nome as contest_name,
      c.sigla as contest_sigla,
      p.active_study_plan_id,
      sp.name as plan_name,
      coalesce((
        select count(*)
        from public.user_lesson_progress ulp
        where ulp.user_id = p.id
          and ulp.theory_completed_at is not null
          and ulp.list_completed_at is not null
      ), 0) as completed_lessons,
      coalesce((
        select count(*)
        from public.user_revisions ur
        where ur.user_id = p.id
          and ur.status = 'scheduled'
      ), 0) as scheduled_revisions
    from public.profiles p
    left join public.contests c on c.id = p.focus_contest_id
    left join public.study_plans sp on sp.id = p.active_study_plan_id
    where p.role = 'student'
  ) x;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]'::jsonb)
  into v_plans
  from (
    select id, name, slug, contest_id, active
    from public.study_plans
    where active = true
  ) p;

  return jsonb_build_object('students', v_students, 'plans', v_plans);
end;
$$;

revoke all on function public.admin_students_catalog() from public;
grant execute on function public.admin_students_catalog() to authenticated;

create or replace function public.admin_update_student_assignment(
  p_user_id uuid,
  p_plan_id uuid,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contest_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if p_plan_id is not null then
    select contest_id into v_contest_id
    from public.study_plans
    where id = p_plan_id and active = true;

    if v_contest_id is null then
      raise exception 'Plano inválido';
    end if;
  end if;

  update public.profiles
  set active_study_plan_id = p_plan_id,
      focus_contest_id = coalesce(v_contest_id, focus_contest_id),
      ativo = coalesce(p_active, ativo)
  where id = p_user_id
    and role = 'student';

  if not found then
    raise exception 'Aluno não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_update_student_assignment(uuid, uuid, boolean) from public;
grant execute on function public.admin_update_student_assignment(uuid, uuid, boolean) to authenticated;

create or replace function public.admin_leveling_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.plan_name, x.subject_position, x.lesson_position), '[]'::jsonb)
    from (
      select
        p.id as plan_id,
        p.name as plan_name,
        s.id as subject_id,
        s.name as subject_name,
        s.position as subject_position,
        l.id as lesson_id,
        l.title as lesson_title,
        l.position as lesson_position,
        coalesce(ls.question_count, 10) as question_count,
        coalesce(ls.required_correct, 9) as required_correct,
        coalesce(ls.active, true) as active,
        count(q.id) filter (where q.active) as available_questions
      from public.study_lessons l
      join public.study_subjects s on s.id = l.subject_id
      join public.study_plans p on p.id = s.plan_id
      left join public.lesson_leveling_settings ls on ls.lesson_id = l.id
      left join public.questions q on q.lesson_id = l.id
      where p.active = true
      group by p.id, p.name, s.id, s.name, s.position, l.id, l.title, l.position,
               ls.question_count, ls.required_correct, ls.active
    ) x
  );
end;
$$;

revoke all on function public.admin_leveling_catalog() from public;
grant execute on function public.admin_leveling_catalog() to authenticated;

create or replace function public.admin_upsert_leveling_setting(
  p_lesson_id uuid,
  p_question_count integer,
  p_required_correct integer,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if p_question_count not between 1 and 50 then
    raise exception 'Quantidade deve ficar entre 1 e 50';
  end if;

  if p_required_correct < 1 or p_required_correct > p_question_count then
    raise exception 'Meta de acertos inválida';
  end if;

  insert into public.lesson_leveling_settings (
    lesson_id, question_count, required_correct, active, updated_by, updated_at
  )
  values (
    p_lesson_id, p_question_count, p_required_correct, p_active, auth.uid(), now()
  )
  on conflict (lesson_id) do update
  set question_count = excluded.question_count,
      required_correct = excluded.required_correct,
      active = excluded.active,
      updated_by = excluded.updated_by,
      updated_at = now();
end;
$$;

revoke all on function public.admin_upsert_leveling_setting(uuid, integer, integer, boolean) from public;
grant execute on function public.admin_upsert_leveling_setting(uuid, integer, integer, boolean) to authenticated;

create or replace function public.get_my_leveling_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select active_study_plan_id into v_plan_id
  from public.profiles
  where id = v_user_id;

  if v_plan_id is null then
    raise exception 'Nenhum plano ativo atribuído';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.subject_position, x.lesson_position), '[]'::jsonb)
    from (
      select
        s.id as subject_id,
        s.name as subject_name,
        s.position as subject_position,
        l.id as lesson_id,
        l.title as lesson_title,
        l.position as lesson_position,
        coalesce(ls.question_count, 10) as question_count,
        coalesce(ls.required_correct, 9) as required_correct,
        count(q.id) filter (where q.active) as available_questions,
        r.id as revision_id,
        r.revision_number,
        r.status as revision_status,
        r.scheduled_for,
        r.reread_confirmed_at,
        r.completed_at
      from public.study_subjects s
      join public.study_lessons l on l.subject_id = s.id
      left join public.lesson_leveling_settings ls on ls.lesson_id = l.id
      left join public.questions q on q.lesson_id = l.id
      left join lateral (
        select ur.*
        from public.user_revisions ur
        where ur.user_id = v_user_id and ur.lesson_id = l.id
        order by ur.revision_number desc
        limit 1
      ) r on true
      where s.plan_id = v_plan_id
      group by s.id, s.name, s.position, l.id, l.title, l.position,
               ls.question_count, ls.required_correct,
               r.id, r.revision_number, r.status, r.scheduled_for,
               r.reread_confirmed_at, r.completed_at
    ) x
  );
end;
$$;

revoke all on function public.get_my_leveling_overview() from public;
grant execute on function public.get_my_leveling_overview() to authenticated;

create or replace function public.get_leveling_rule(p_revision_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.user_revisions%rowtype;
  v_count integer;
  v_required integer;
  v_available integer;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into v_revision
  from public.user_revisions
  where id = p_revision_id
    and user_id = v_user_id;

  if v_revision.id is null then
    raise exception 'Revisão não encontrada';
  end if;

  select coalesce(question_count, 10), coalesce(required_correct, 9)
  into v_count, v_required
  from public.lesson_leveling_settings
  where lesson_id = v_revision.lesson_id;

  if v_count is null then v_count := 10; end if;
  if v_required is null then v_required := least(9, v_count); end if;

  select count(*) into v_available
  from public.questions
  where lesson_id = v_revision.lesson_id
    and active = true;

  return jsonb_build_object(
    'revision_id', v_revision.id,
    'lesson_id', v_revision.lesson_id,
    'question_count', v_count,
    'required_correct', v_required,
    'available_questions', v_available
  );
end;
$$;

revoke all on function public.get_leveling_rule(uuid) from public;
grant execute on function public.get_leveling_rule(uuid) to authenticated;

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

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':leveling:' || p_revision_id::text));

  select * into v_revision
  from public.user_revisions
  where id = p_revision_id
    and user_id = v_user_id;

  if v_revision.id is null then
    raise exception 'Revisão não encontrada';
  end if;

  if v_revision.status = 'completed' then
    raise exception 'Esta revisão já foi concluída';
  end if;

  if v_revision.scheduled_for is null or v_revision.scheduled_for > current_date then
    raise exception 'O nivelamento só fica disponível na data da revisão';
  end if;

  if v_revision.reread_confirmed_at is null then
    raise exception 'Confirme a releitura antes de iniciar o nivelamento';
  end if;

  select coalesce(question_count, 10), coalesce(required_correct, 9)
  into v_count, v_required
  from public.lesson_leveling_settings
  where lesson_id = v_revision.lesson_id;

  if v_count is null then v_count := 10; end if;
  if v_required is null then v_required := least(9, v_count); end if;

  select count(*) into v_available
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

  select id into v_attempt_id
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
    user_id, lesson_id, revision_id, kind, status, total, required_correct
  )
  values (
    v_user_id, v_revision.lesson_id, p_revision_id, 'leveling', 'in_progress', v_count, v_required
  )
  returning id into v_attempt_id;

  select array_agg(candidate.id) into v_ids
  from (
    select q.id
    from public.questions q
    where q.lesson_id = v_revision.lesson_id
      and q.active = true
    order by
      case when exists (
        select 1
        from public.question_attempts olda
        join public.question_attempt_items oldi on oldi.attempt_id = olda.id
        where olda.user_id = v_user_id
          and olda.revision_id = p_revision_id
          and olda.status = 'completed'
          and oldi.question_id = q.id
      ) then 1 else 0 end,
      case when exists (
        select 1
        from public.user_question_answers ua
        where ua.user_id = v_user_id
          and ua.question_id = q.id
          and ua.is_correct = false
      ) then 0
      when not exists (
        select 1
        from public.user_question_answers ua
        where ua.user_id = v_user_id
          and ua.question_id = q.id
      ) then 1
      else 2 end,
      q.level desc,
      random()
    limit v_count
  ) candidate;

  insert into public.question_attempt_items(attempt_id, question_id, position)
  select v_attempt_id, x.question_id, x.position::integer
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

create or replace function public.finalize_leveling_attempt(p_attempt_id uuid)
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
  v_required integer;
  v_round integer;
  v_passed boolean;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into v_attempt
  from public.question_attempts
  where id = p_attempt_id
    and user_id = v_user_id
    and kind = 'leveling';

  if v_attempt.id is null then
    raise exception 'Nivelamento não encontrado';
  end if;

  v_required := coalesce(v_attempt.required_correct, least(9, v_attempt.total));

  if v_attempt.status = 'completed' then
    return jsonb_build_object(
      'score', v_attempt.score,
      'total', v_attempt.total,
      'required_correct', v_required,
      'passed', v_attempt.score >= v_required,
      'percentage', round(v_attempt.score::numeric * 100 / v_attempt.total, 1)
    );
  end if;

  select count(*), count(*) filter (where is_correct)
  into v_answered, v_score
  from public.question_attempt_items
  where attempt_id = p_attempt_id
    and selected_answer is not null;

  if v_answered < v_attempt.total then
    raise exception 'Responda todas as % questões antes de finalizar', v_attempt.total;
  end if;

  v_passed := v_score >= v_required;

  update public.question_attempts
  set status = 'completed',
      score = v_score,
      completed_at = now(),
      updated_at = now()
  where id = p_attempt_id;

  select coalesce(max(round), 0) + 1
  into v_round
  from public.user_leveling_attempts
  where revision_id = v_attempt.revision_id;

  insert into public.user_leveling_attempts (
    user_id, revision_id, round, score, passed, total_questions, required_correct
  )
  values (
    v_user_id, v_attempt.revision_id, v_round, v_score, v_passed, v_attempt.total, v_required
  );

  if v_passed then
    update public.user_revisions
    set status = 'completed',
        completed_at = now(),
        updated_at = now()
    where id = v_attempt.revision_id
      and user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'score', v_score,
    'total', v_attempt.total,
    'required_correct', v_required,
    'passed', v_passed,
    'round', v_round,
    'percentage', round(v_score::numeric * 100 / v_attempt.total, 1)
  );
end;
$$;

revoke all on function public.finalize_leveling_attempt(uuid) from public;
grant execute on function public.finalize_leveling_attempt(uuid) to authenticated;

create or replace function public.complete_lesson_list_early(p_attempt_id uuid)
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
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into v_attempt
  from public.question_attempts
  where id = p_attempt_id
    and user_id = v_user_id
    and kind = 'lesson_list';

  if v_attempt.id is null then
    raise exception 'Lista não encontrada';
  end if;

  if v_attempt.status = 'completed' then
    return jsonb_build_object(
      'score', v_attempt.score,
      'answered', v_attempt.total,
      'total', v_attempt.total,
      'percentage', round(v_attempt.score::numeric * 100 / v_attempt.total, 1)
    );
  end if;

  select count(*), count(*) filter (where is_correct)
  into v_answered, v_score
  from public.question_attempt_items
  where attempt_id = p_attempt_id
    and selected_answer is not null;

  if v_answered = 0 then
    raise exception 'Responda pelo menos uma questão antes de marcar a lista como concluída';
  end if;

  update public.question_attempts
  set status = 'completed',
      score = v_score,
      completed_at = now(),
      updated_at = now()
  where id = p_attempt_id;

  select theory_mode into v_mode
  from public.user_lesson_progress
  where user_id = v_user_id
    and lesson_id = v_attempt.lesson_id;

  perform public.save_lesson_progress(
    v_attempt.lesson_id,
    true,
    true,
    v_mode,
    true,
    true
  );

  return jsonb_build_object(
    'score', v_score,
    'answered', v_answered,
    'total', v_attempt.total,
    'percentage', round(v_score::numeric * 100 / v_attempt.total, 1)
  );
end;
$$;

revoke all on function public.complete_lesson_list_early(uuid) from public;
grant execute on function public.complete_lesson_list_early(uuid) to authenticated;

-- Amplia o payload da tentativa para permitir retorno à aula e conexão do nivelamento com a revisão.
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
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select jsonb_build_object(
    'id', a.id,
    'kind', a.kind,
    'status', a.status,
    'total', a.total,
    'score', a.score,
    'required_correct', a.required_correct,
    'revision_id', a.revision_id,
    'started_at', a.started_at,
    'completed_at', a.completed_at,
    'lesson_id', l.id,
    'lesson_title', l.title,
    'lesson_slug', l.slug,
    'subject_name', s.name,
    'subject_slug', s.slug
  )
  into v_attempt
  from public.question_attempts a
  left join public.study_lessons l on l.id = a.lesson_id
  left join public.study_subjects s on s.id = l.subject_id
  where a.id = p_attempt_id
    and a.user_id = v_user_id;

  if v_attempt is null then
    raise exception 'Tentativa não encontrada';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', q.id,
    'position', i.position,
    'statement', q.statement,
    'question_type', q.question_type,
    'choices', q.choices,
    'level', q.level,
    'banca', q.banca,
    'ano', q.ano,
    'exam_name', q.exam_name,
    'selected_answer', i.selected_answer,
    'is_correct', i.is_correct,
    'correct_answer', case when i.selected_answer is not null then k.correct_answer else null end,
    'explanation', case when i.selected_answer is not null then k.explanation else null end
  ) order by i.position), '[]'::jsonb)
  into v_items
  from public.question_attempt_items i
  join public.questions q on q.id = i.question_id
  join public.question_keys k on k.question_id = q.id
  join public.question_attempts a on a.id = i.attempt_id
  where i.attempt_id = p_attempt_id
    and a.user_id = v_user_id;

  return jsonb_build_object('attempt', v_attempt, 'items', v_items);
end;
$$;

revoke all on function public.get_question_attempt(uuid) from public;
grant execute on function public.get_question_attempt(uuid) to authenticated;
