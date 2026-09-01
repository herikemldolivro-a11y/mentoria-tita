-- Mentoria Titã — persistência central do cronograma PRF
-- Execute no SQL Editor do Supabase depois da migration de concursos.

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  slug text not null unique,
  name text not null,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.study_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  title text not null,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  unique (plan_id, week_number)
);

create table if not exists public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  slug text not null,
  short_name text not null,
  name text not null,
  description text,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  unique (plan_id, slug)
);

create table if not exists public.study_lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  week_id uuid not null references public.study_weeks(id) on delete cascade,
  slug text not null,
  title text not null,
  priority text,
  position integer not null,
  question_count integer not null default 35 check (question_count > 0),
  pdf_path text,
  created_at timestamptz not null default now(),
  unique (subject_id, slug),
  unique (week_id, subject_id, position)
);

create table if not exists public.study_lesson_topics (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  topic text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (lesson_id, position)
);

alter table public.profiles
  add column if not exists active_study_plan_id uuid
  references public.study_plans(id)
  on delete set null;

create table if not exists public.user_week_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.study_weeks(id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_id)
);

create table if not exists public.user_subject_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

create table if not exists public.user_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  theory_started_at timestamptz,
  theory_completed_at timestamptz,
  theory_mode text check (theory_mode in ('platform-pdf', 'external-video')),
  list_started_at timestamptz,
  list_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.user_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  subject_slug text not null,
  subject_name text not null,
  lesson_slug text not null,
  lesson_title text not null,
  revision_number integer not null check (revision_number > 0),
  recommended_for date not null,
  scheduled_for date,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'completed')),
  reread_confirmed_at timestamptz,
  study_mode text check (study_mode in ('platform-pdf', 'external-course')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id, revision_number)
);

create table if not exists public.user_leveling_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_id uuid not null references public.user_revisions(id) on delete cascade,
  round integer not null check (round > 0),
  score integer not null check (score between 0 and 10),
  passed boolean not null,
  completed_at timestamptz not null default now(),
  unique (revision_id, round)
);

-- Catálogo simples para o front-end resolver plano/semana/matéria/aula por slug.
create or replace view public.study_lesson_catalog
with (security_invoker = true)
as
select
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
  l.pdf_path
from public.study_plans p
join public.study_weeks w on w.plan_id = p.id
join public.study_subjects s on s.plan_id = p.id
join public.study_lessons l on l.subject_id = s.id and l.week_id = w.id
where p.active = true;

-- RLS: catálogo é leitura para autenticados; progresso é sempre do próprio usuário.
alter table public.study_plans enable row level security;
alter table public.study_weeks enable row level security;
alter table public.study_subjects enable row level security;
alter table public.study_lessons enable row level security;
alter table public.study_lesson_topics enable row level security;
alter table public.user_week_progress enable row level security;
alter table public.user_subject_progress enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.user_revisions enable row level security;
alter table public.user_leveling_attempts enable row level security;

drop policy if exists "Authenticated users read study plans" on public.study_plans;
create policy "Authenticated users read study plans" on public.study_plans
for select to authenticated using (active = true);

drop policy if exists "Authenticated users read study weeks" on public.study_weeks;
create policy "Authenticated users read study weeks" on public.study_weeks
for select to authenticated using (true);

drop policy if exists "Authenticated users read study subjects" on public.study_subjects;
create policy "Authenticated users read study subjects" on public.study_subjects
for select to authenticated using (true);

drop policy if exists "Authenticated users read study lessons" on public.study_lessons;
create policy "Authenticated users read study lessons" on public.study_lessons
for select to authenticated using (true);

drop policy if exists "Authenticated users read lesson topics" on public.study_lesson_topics;
create policy "Authenticated users read lesson topics" on public.study_lesson_topics
for select to authenticated using (true);

-- progresso semanal
DROP POLICY IF EXISTS "Users read own week progress" ON public.user_week_progress;
CREATE POLICY "Users read own week progress" ON public.user_week_progress
FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own week progress" ON public.user_week_progress;
CREATE POLICY "Users insert own week progress" ON public.user_week_progress
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own week progress" ON public.user_week_progress;
CREATE POLICY "Users update own week progress" ON public.user_week_progress
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own week progress" ON public.user_week_progress;
CREATE POLICY "Users delete own week progress" ON public.user_week_progress
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- progresso por matéria
DROP POLICY IF EXISTS "Users read own subject progress" ON public.user_subject_progress;
CREATE POLICY "Users read own subject progress" ON public.user_subject_progress
FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own subject progress" ON public.user_subject_progress;
CREATE POLICY "Users insert own subject progress" ON public.user_subject_progress
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own subject progress" ON public.user_subject_progress;
CREATE POLICY "Users update own subject progress" ON public.user_subject_progress
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own subject progress" ON public.user_subject_progress;
CREATE POLICY "Users delete own subject progress" ON public.user_subject_progress
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- progresso por aula
DROP POLICY IF EXISTS "Users read own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users read own lesson progress" ON public.user_lesson_progress
FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users insert own lesson progress" ON public.user_lesson_progress
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users update own lesson progress" ON public.user_lesson_progress
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users delete own lesson progress" ON public.user_lesson_progress
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- revisões
DROP POLICY IF EXISTS "Users read own revisions" ON public.user_revisions;
CREATE POLICY "Users read own revisions" ON public.user_revisions
FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own revisions" ON public.user_revisions;
CREATE POLICY "Users insert own revisions" ON public.user_revisions
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own revisions" ON public.user_revisions;
CREATE POLICY "Users update own revisions" ON public.user_revisions
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own revisions" ON public.user_revisions;
CREATE POLICY "Users delete own revisions" ON public.user_revisions
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- nivelamentos
DROP POLICY IF EXISTS "Users read own leveling attempts" ON public.user_leveling_attempts;
CREATE POLICY "Users read own leveling attempts" ON public.user_leveling_attempts
FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own leveling attempts" ON public.user_leveling_attempts;
CREATE POLICY "Users insert own leveling attempts" ON public.user_leveling_attempts
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own leveling attempts" ON public.user_leveling_attempts;
CREATE POLICY "Users delete own leveling attempts" ON public.user_leveling_attempts
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Função segura para persistir o estado completo da aula e manter timestamps coerentes.
create or replace function public.save_lesson_progress(
  p_lesson_id uuid,
  p_theory_started boolean,
  p_theory_completed boolean,
  p_theory_mode text,
  p_list_started boolean,
  p_list_completed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subject_id uuid;
  v_week_id uuid;
  v_subject_complete boolean;
  v_week_complete boolean;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if p_theory_mode is not null and p_theory_mode not in ('platform-pdf', 'external-video') then
    raise exception 'Modo de teoria inválido';
  end if;

  select subject_id, week_id
  into v_subject_id, v_week_id
  from public.study_lessons
  where id = p_lesson_id;

  if v_subject_id is null or v_week_id is null then
    raise exception 'Aula inválida';
  end if;

  insert into public.user_lesson_progress (
    user_id,
    lesson_id,
    theory_started_at,
    theory_completed_at,
    theory_mode,
    list_started_at,
    list_completed_at,
    updated_at
  )
  values (
    v_user_id,
    p_lesson_id,
    case when p_theory_started then now() else null end,
    case when p_theory_completed then now() else null end,
    p_theory_mode,
    case when p_list_started then now() else null end,
    case when p_list_completed then now() else null end,
    now()
  )
  on conflict (user_id, lesson_id) do update
  set
    theory_started_at = case
      when p_theory_started then coalesce(user_lesson_progress.theory_started_at, now())
      else null
    end,
    theory_completed_at = case
      when p_theory_completed then coalesce(user_lesson_progress.theory_completed_at, now())
      else null
    end,
    theory_mode = p_theory_mode,
    list_started_at = case
      when p_list_started then coalesce(user_lesson_progress.list_started_at, now())
      else null
    end,
    list_completed_at = case
      when p_list_completed then coalesce(user_lesson_progress.list_completed_at, now())
      else null
    end,
    updated_at = now();

  select not exists (
    select 1
    from public.study_lessons l
    left join public.user_lesson_progress lp
      on lp.lesson_id = l.id and lp.user_id = v_user_id
    where l.subject_id = v_subject_id
      and l.week_id = v_week_id
      and (lp.theory_completed_at is null or lp.list_completed_at is null)
  ) into v_subject_complete;

  insert into public.user_subject_progress (user_id, subject_id, started_at, completed_at, updated_at)
  values (v_user_id, v_subject_id, now(), case when v_subject_complete then now() else null end, now())
  on conflict (user_id, subject_id) do update
  set started_at = coalesce(user_subject_progress.started_at, now()),
      completed_at = case
        when v_subject_complete then coalesce(user_subject_progress.completed_at, now())
        else null
      end,
      updated_at = now();

  select not exists (
    select 1
    from public.study_lessons l
    left join public.user_lesson_progress lp
      on lp.lesson_id = l.id and lp.user_id = v_user_id
    where l.week_id = v_week_id
      and (lp.theory_completed_at is null or lp.list_completed_at is null)
  ) into v_week_complete;

  insert into public.user_week_progress (user_id, week_id, started_at, completed_at, updated_at)
  values (v_user_id, v_week_id, now(), case when v_week_complete then now() else null end, now())
  on conflict (user_id, week_id) do update
  set started_at = coalesce(user_week_progress.started_at, now()),
      completed_at = case
        when v_week_complete then coalesce(user_week_progress.completed_at, now())
        else null
      end,
      updated_at = now();
end;
$$;

revoke all on function public.save_lesson_progress(uuid, boolean, boolean, text, boolean, boolean) from public;
grant execute on function public.save_lesson_progress(uuid, boolean, boolean, text, boolean, boolean) to authenticated;

-- Seed do plano piloto PRF / Semana 1.
insert into public.study_plans (contest_id, slug, name, is_default, active)
select c.id, 'prf-foco95', 'PRF — Foco 95+', true, true
from public.contests c
where c.slug = 'prf'
on conflict (slug) do update
set contest_id = excluded.contest_id,
    name = excluded.name,
    is_default = true,
    active = true;

insert into public.study_weeks (plan_id, week_number, title, position)
select p.id, 1, 'Semana 1', 1
from public.study_plans p
where p.slug = 'prf-foco95'
on conflict (plan_id, week_number) do update
set title = excluded.title,
    position = excluded.position;

insert into public.study_subjects (plan_id, slug, short_name, name, description, position)
select p.id, v.slug, v.short_name, v.name, v.description, v.position
from public.study_plans p
cross join (values
  ('contabilidade', 'CONTABILIDADE', 'Contabilidade', 'Base patrimonial, fatos contábeis e estrutura fundamental da disciplina.', 1),
  ('raciocinio-logico', 'RLM', 'Raciocínio Lógico-Matemático', 'Fundamentos matemáticos aplicados ao perfil de cobrança da PRF.', 2)
) as v(slug, short_name, name, description, position)
where p.slug = 'prf-foco95'
on conflict (plan_id, slug) do update
set short_name = excluded.short_name,
    name = excluded.name,
    description = excluded.description,
    position = excluded.position;

-- Aulas da Semana 1
insert into public.study_lessons (subject_id, week_id, slug, title, priority, position, question_count)
select s.id, w.id, v.slug, v.title, v.priority, v.position, 35
from public.study_subjects s
join public.study_plans p on p.id = s.plan_id and p.slug = 'prf-foco95'
join public.study_weeks w on w.plan_id = p.id and w.week_number = 1
join (values
  ('contabilidade', 'fundamentos-da-contabilidade', 'Fundamentos da Contabilidade', 'Média', 1),
  ('contabilidade', 'patrimonio-e-situacao-liquida', 'Patrimônio e Situação Líquida', 'Muito alta', 2),
  ('contabilidade', 'atos-e-fatos-administrativos', 'Atos e Fatos Administrativos', 'Muito alta', 3),
  ('raciocinio-logico', 'razao-e-proporcao', 'Razão e Proporção', 'Muito alta', 1),
  ('raciocinio-logico', 'regra-de-tres', 'Regra de Três', 'Muito alta', 2)
) as v(subject_slug, slug, title, priority, position)
  on v.subject_slug = s.slug
on conflict (subject_id, slug) do update
set week_id = excluded.week_id,
    title = excluded.title,
    priority = excluded.priority,
    position = excluded.position,
    question_count = 35;

-- Tópicos das 5 aulas do piloto. Recria somente estes tópicos para manter ordem consistente.
delete from public.study_lesson_topics t
using public.study_lessons l, public.study_subjects s, public.study_plans p
where t.lesson_id = l.id
  and l.subject_id = s.id
  and s.plan_id = p.id
  and p.slug = 'prf-foco95'
  and l.week_id = (select id from public.study_weeks where plan_id = p.id and week_number = 1);

insert into public.study_lesson_topics (lesson_id, topic, position)
select l.id, v.topic, v.position
from public.study_lessons l
join public.study_subjects s on s.id = l.subject_id
join public.study_plans p on p.id = s.plan_id and p.slug = 'prf-foco95'
join (values
  ('fundamentos-da-contabilidade', 'conceito', 1),
  ('fundamentos-da-contabilidade', 'objeto', 2),
  ('fundamentos-da-contabilidade', 'objetivo', 3),
  ('fundamentos-da-contabilidade', 'finalidade', 4),
  ('fundamentos-da-contabilidade', 'patrimônio como objeto', 5),
  ('fundamentos-da-contabilidade', 'campo de aplicação', 6),
  ('fundamentos-da-contabilidade', 'usuários da informação contábil', 7),

  ('patrimonio-e-situacao-liquida', 'ativo', 1),
  ('patrimonio-e-situacao-liquida', 'passivo', 2),
  ('patrimonio-e-situacao-liquida', 'patrimônio líquido', 3),
  ('patrimonio-e-situacao-liquida', 'bens, direitos e obrigações', 4),
  ('patrimonio-e-situacao-liquida', 'equação fundamental', 5),
  ('patrimonio-e-situacao-liquida', 'patrimônio bruto', 6),
  ('patrimonio-e-situacao-liquida', 'situação líquida positiva, negativa e nula', 7),
  ('patrimonio-e-situacao-liquida', 'ativo a descoberto/passivo a descoberto', 8),
  ('patrimonio-e-situacao-liquida', 'representação gráfica', 9),

  ('atos-e-fatos-administrativos', 'atos administrativos', 1),
  ('atos-e-fatos-administrativos', 'fatos contábeis', 2),
  ('atos-e-fatos-administrativos', 'fatos permutativos', 3),
  ('atos-e-fatos-administrativos', 'modificativos aumentativos/diminutivos', 4),
  ('atos-e-fatos-administrativos', 'mistos aumentativos/diminutivos', 5),
  ('atos-e-fatos-administrativos', 'impacto no PL', 6),
  ('atos-e-fatos-administrativos', 'identificação prática da natureza do fato', 7),

  ('razao-e-proporcao', 'razão', 1),
  ('razao-e-proporcao', 'proporção', 2),
  ('razao-e-proporcao', 'propriedades', 3),
  ('razao-e-proporcao', 'grandezas direta/inversamente proporcionais', 4),
  ('razao-e-proporcao', 'divisão proporcional', 5),

  ('regra-de-tres', 'simples direta', 1),
  ('regra-de-tres', 'simples inversa', 2),
  ('regra-de-tres', 'composta', 3),
  ('regra-de-tres', 'identificação das grandezas', 4)
) as v(lesson_slug, topic, position)
  on v.lesson_slug = l.slug;

-- Vincula automaticamente o plano padrão ao perfil quando o foco for PRF.
update public.profiles pr
set active_study_plan_id = p.id
from public.study_plans p
join public.contests c on c.id = p.contest_id
where c.slug = 'prf'
  and p.slug = 'prf-foco95'
  and pr.focus_contest_id = c.id
  and pr.active_study_plan_id is null;

-- Atualiza a função de troca de concurso: agora troca também o plano ativo padrão.
create or replace function public.set_focus_contest(p_contest_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_contest_id uuid;
  v_plan_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select id into v_contest_id
  from public.contests
  where slug = p_contest_slug
    and ativo = true;

  if v_contest_id is null then
    raise exception 'Concurso inválido ou inativo';
  end if;

  select id into v_plan_id
  from public.study_plans
  where contest_id = v_contest_id
    and active = true
    and is_default = true
  order by created_at
  limit 1;

  update public.profiles
  set focus_contest_id = v_contest_id,
      active_study_plan_id = v_plan_id
  where id = v_user_id;

  if not found then
    raise exception 'Perfil não encontrado';
  end if;
end;
$$;

revoke all on function public.set_focus_contest(text) from public;
grant execute on function public.set_focus_contest(text) to authenticated;

-- Permissões explícitas para a API do Supabase.
grant select on public.study_plans, public.study_weeks, public.study_subjects, public.study_lessons, public.study_lesson_topics to authenticated;
grant select on public.study_lesson_catalog to authenticated;
grant select, insert, update, delete on public.user_week_progress, public.user_subject_progress, public.user_lesson_progress, public.user_revisions, public.user_leveling_attempts to authenticated;

create index if not exists user_revisions_user_date_idx on public.user_revisions(user_id, scheduled_for);
create index if not exists user_revisions_user_status_idx on public.user_revisions(user_id, status);
create index if not exists user_leveling_revision_idx on public.user_leveling_attempts(revision_id, round);
create index if not exists user_lesson_progress_user_idx on public.user_lesson_progress(user_id);
