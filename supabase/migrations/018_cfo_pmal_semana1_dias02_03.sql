-- Mentoria Titã — V9.4.1
-- CFO PMAL 2026 — Semana 1 — DIAS 02 e 03
-- DIA 02: quinta-feira, 03/09/2026
-- DIA 03: sexta-feira, 04/09/2026
-- Idempotente: pode rodar mesmo se o DIA 02 já tiver sido aplicado.

do $$
declare
  v_plan_id uuid;
  v_week_id uuid;
begin
  select id
  into v_plan_id
  from public.study_plans
  where slug = 'cfo-pmal-2026'
  limit 1;

  if v_plan_id is null then
    raise exception 'Plano cfo-pmal-2026 não encontrado';
  end if;

  select id
  into v_week_id
  from public.study_weeks
  where plan_id = v_plan_id
    and week_number = 1
  limit 1;

  if v_week_id is null then
    raise exception 'Semana 1 do CFO PMAL não encontrada';
  end if;

  update public.study_weeks
  set
    title = 'CFO PMAL — Semana 1',
    starts_on = date '2026-09-02',
    ends_on = date '2026-09-09',
    active = true
  where id = v_week_id;

  -- Garante que os blocos obrigatórios dos DIAS 02 e 03 existam.
  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id = v_week_id
      and study_date = date '2026-09-03'
      and daypart = 'afternoon'
  ) then
    insert into public.study_schedule_blocks(
      week_id, study_date, daypart, start_time, end_time,
      title, optional, notes, position
    )
    values (
      v_week_id, date '2026-09-03', 'afternoon',
      time '13:30', time '17:00',
      'Bloco principal — Tarde', false,
      'DPPM — Aulas 01 e 02. Teoria + lista principal de questões.',
      2
    );
  end if;

  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id = v_week_id
      and study_date = date '2026-09-03'
      and daypart = 'evening'
  ) then
    insert into public.study_schedule_blocks(
      week_id, study_date, daypart, start_time, end_time,
      title, optional, notes, position
    )
    values (
      v_week_id, date '2026-09-03', 'evening',
      time '19:00', time '22:00',
      'Bloco principal — Noite', false,
      'Informática — Aulas 01 e 02. Teoria + lista principal de questões.',
      3
    );
  end if;

  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id = v_week_id
      and study_date = date '2026-09-04'
      and daypart = 'afternoon'
  ) then
    insert into public.study_schedule_blocks(
      week_id, study_date, daypart, start_time, end_time,
      title, optional, notes, position
    )
    values (
      v_week_id, date '2026-09-04', 'afternoon',
      time '13:30', time '17:00',
      'Bloco principal — Tarde', false,
      'Direito Penal — Aulas 01 e 02. Teoria + lista principal de questões.',
      2
    );
  end if;

  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id = v_week_id
      and study_date = date '2026-09-04'
      and daypart = 'evening'
  ) then
    insert into public.study_schedule_blocks(
      week_id, study_date, daypart, start_time, end_time,
      title, optional, notes, position
    )
    values (
      v_week_id, date '2026-09-04', 'evening',
      time '19:00', time '22:00',
      'Bloco principal — Noite', false,
      'Conhecimentos de Alagoas — Aulas 01 e 02. Teoria + lista principal de questões.',
      3
    );
  end if;

  -- Atualiza textos dos blocos se eles já existiam.
  update public.study_schedule_blocks
  set
    start_time = time '13:30',
    end_time = time '17:00',
    title = 'Bloco principal — Tarde',
    optional = false,
    notes = 'DPPM — Aulas 01 e 02. Teoria + lista principal de questões.',
    position = 2
  where week_id = v_week_id
    and study_date = date '2026-09-03'
    and daypart = 'afternoon';

  update public.study_schedule_blocks
  set
    start_time = time '19:00',
    end_time = time '22:00',
    title = 'Bloco principal — Noite',
    optional = false,
    notes = 'Informática — Aulas 01 e 02. Teoria + lista principal de questões.',
    position = 3
  where week_id = v_week_id
    and study_date = date '2026-09-03'
    and daypart = 'evening';

  update public.study_schedule_blocks
  set
    start_time = time '13:30',
    end_time = time '17:00',
    title = 'Bloco principal — Tarde',
    optional = false,
    notes = 'Direito Penal — Aulas 01 e 02. Teoria + lista principal de questões.',
    position = 2
  where week_id = v_week_id
    and study_date = date '2026-09-04'
    and daypart = 'afternoon';

  update public.study_schedule_blocks
  set
    start_time = time '19:00',
    end_time = time '22:00',
    title = 'Bloco principal — Noite',
    optional = false,
    notes = 'Conhecimentos de Alagoas — Aulas 01 e 02. Teoria + lista principal de questões.',
    position = 3
  where week_id = v_week_id
    and study_date = date '2026-09-04'
    and daypart = 'evening';
end;
$$;

-- PDFs + quantidade de questões das 8 aulas.
with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
lesson_data(subject_slug, lesson_slug, title, question_count, pdf_path) as (
  values
    ('processo-penal-militar', 'processo-penal-militar-aplicacao-cppm',
      'Processo penal militar e aplicação do CPPM', 35,
      '/materials/cfo-pmal/semana-1/dppm-aula-01-processo-penal-militar-aplicacao-cppm.pdf'),
    ('processo-penal-militar', 'policia-judiciaria-militar',
      'Polícia judiciária militar', 35,
      '/materials/cfo-pmal/semana-1/dppm-aula-02-policia-judiciaria-militar.pdf'),
    ('informatica', 'windows-ambiente-interface-operacoes-basicas',
      'Windows: ambiente, interface e operações básicas', 35,
      '/materials/cfo-pmal/semana-1/informatica-aula-01-windows-ambiente-interface.pdf'),
    ('informatica', 'arquivos-pastas-extensoes-organizacao-informacao',
      'Arquivos, pastas, extensões e organização da informação', 35,
      '/materials/cfo-pmal/semana-1/informatica-aula-02-arquivos-pastas-extensoes.pdf'),
    ('direito-penal', 'aplicacao-lei-penal',
      'Aplicação da lei penal', 35,
      '/materials/cfo-pmal/semana-1/direito-penal-aula-01-aplicacao-lei-penal.pdf'),
    ('direito-penal', 'teoria-crime-fato-tipico-conduta',
      'Teoria do crime: fato típico e conduta', 35,
      '/materials/cfo-pmal/semana-1/direito-penal-aula-02-teoria-crime-fato-tipico-conduta.pdf'),
    ('conhecimentos-alagoas', 'formacao-historica-colonizacao-portuguesa',
      'Formação histórica e colonização portuguesa', 35,
      '/materials/cfo-pmal/semana-1/alagoas-aula-01-formacao-historica-colonizacao-portuguesa.pdf'),
    ('conhecimentos-alagoas', 'economia-acucareira-formacao-social',
      'Economia açucareira e formação social', 35,
      '/materials/cfo-pmal/semana-1/alagoas-aula-02-economia-acucareira-formacao-social.pdf')
)
update public.study_lessons l
set
  title = d.title,
  question_count = d.question_count,
  pdf_path = d.pdf_path,
  active = true
from lesson_data d
join public.study_subjects s
  on s.slug = d.subject_slug
 and s.plan_id = (select id from p)
where l.subject_id = s.id
  and l.slug = d.lesson_slug;

-- Remove apenas os vínculos obrigatórios dos DIAS 02 e 03 e reinsere exatamente os 8 corretos.
with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
w as (
  select sw.id
  from public.study_weeks sw
  join p on p.id = sw.plan_id
  where sw.week_number = 1
),
target_blocks as (
  select b.id
  from public.study_schedule_blocks b
  where b.week_id = (select id from w)
    and b.study_date in (date '2026-09-03', date '2026-09-04')
    and b.daypart in ('afternoon', 'evening')
)
delete from public.study_schedule_block_lessons bl
using target_blocks tb
where bl.block_id = tb.id;

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
w as (
  select sw.id
  from public.study_weeks sw
  join p on p.id = sw.plan_id
  where sw.week_number = 1
),
data(study_date, daypart, subject_slug, lesson_slug, position) as (
  values
    ('2026-09-03', 'afternoon', 'processo-penal-militar', 'processo-penal-militar-aplicacao-cppm', 1),
    ('2026-09-03', 'afternoon', 'processo-penal-militar', 'policia-judiciaria-militar', 2),
    ('2026-09-03', 'evening', 'informatica', 'windows-ambiente-interface-operacoes-basicas', 1),
    ('2026-09-03', 'evening', 'informatica', 'arquivos-pastas-extensoes-organizacao-informacao', 2),
    ('2026-09-04', 'afternoon', 'direito-penal', 'aplicacao-lei-penal', 1),
    ('2026-09-04', 'afternoon', 'direito-penal', 'teoria-crime-fato-tipico-conduta', 2),
    ('2026-09-04', 'evening', 'conhecimentos-alagoas', 'formacao-historica-colonizacao-portuguesa', 1),
    ('2026-09-04', 'evening', 'conhecimentos-alagoas', 'economia-acucareira-formacao-social', 2)
)
insert into public.study_schedule_block_lessons(block_id, lesson_id, position)
select
  b.id,
  l.id,
  d.position
from data d
join public.study_schedule_blocks b
  on b.week_id = (select id from w)
 and b.study_date = d.study_date::date
 and b.daypart = d.daypart
join public.study_subjects s
  on s.plan_id = (select id from p)
 and s.slug = d.subject_slug
join public.study_lessons l
  on l.subject_id = s.id
 and l.slug = d.lesson_slug
on conflict (block_id, lesson_id)
do update set position = excluded.position;

-- Conferência final: deve retornar exatamente 8 linhas.
select
  b.study_date,
  b.daypart,
  s.name as materia,
  l.position as aula_numero,
  l.title as aula,
  l.question_count,
  l.pdf_path
from public.study_schedule_blocks b
join public.study_schedule_block_lessons bl on bl.block_id = b.id
join public.study_lessons l on l.id = bl.lesson_id
join public.study_subjects s on s.id = l.subject_id
join public.study_weeks w on w.id = b.week_id
join public.study_plans p on p.id = w.plan_id
where p.slug = 'cfo-pmal-2026'
  and w.week_number = 1
  and b.study_date in (date '2026-09-03', date '2026-09-04')
  and b.daypart in ('afternoon', 'evening')
order by b.study_date,
  case b.daypart when 'afternoon' then 1 when 'evening' then 2 else 3 end,
  bl.position;
