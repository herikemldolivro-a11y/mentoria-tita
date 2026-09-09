-- Mentoria Titã — V9.4.0
-- CFO PMAL 2026 — Semana 1 — DIA 02 (quinta-feira, 03/09/2026)
-- Garante as 4 aulas do dia e vincula os 4 PDFs enviados.

do $$
declare
  v_plan_id uuid;
  v_week_id uuid;
  v_dppm_subject_id uuid;
  v_info_subject_id uuid;
  v_afternoon_block_id uuid;
  v_evening_block_id uuid;
begin
  select id into v_plan_id
  from public.study_plans
  where slug = 'cfo-pmal-2026'
  limit 1;

  if v_plan_id is null then
    raise exception 'Plano cfo-pmal-2026 não encontrado';
  end if;

  select id into v_week_id
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

  select id into v_dppm_subject_id
  from public.study_subjects
  where plan_id = v_plan_id
    and slug = 'processo-penal-militar'
  limit 1;

  select id into v_info_subject_id
  from public.study_subjects
  where plan_id = v_plan_id
    and slug = 'informatica'
  limit 1;

  if v_dppm_subject_id is null then
    raise exception 'Matéria Processo Penal Militar não encontrada';
  end if;

  if v_info_subject_id is null then
    raise exception 'Matéria Informática não encontrada';
  end if;

  -- PDFs e metadados das aulas.
  update public.study_lessons
  set
    title = 'Processo penal militar e aplicação do CPPM',
    position = 1,
    question_count = 35,
    active = true,
    pdf_path = '/materials/cfo-pmal/semana-1/dppm-aula-01-processo-penal-militar-aplicacao-cppm.pdf'
  where subject_id = v_dppm_subject_id
    and slug = 'processo-penal-militar-aplicacao-cppm';

  update public.study_lessons
  set
    title = 'Polícia judiciária militar',
    position = 2,
    question_count = 35,
    active = true,
    pdf_path = '/materials/cfo-pmal/semana-1/dppm-aula-02-policia-judiciaria-militar.pdf'
  where subject_id = v_dppm_subject_id
    and slug = 'policia-judiciaria-militar';

  update public.study_lessons
  set
    title = 'Windows: ambiente, interface e operações básicas',
    position = 1,
    question_count = 35,
    active = true,
    pdf_path = '/materials/cfo-pmal/semana-1/informatica-aula-01-windows-ambiente-interface.pdf'
  where subject_id = v_info_subject_id
    and slug = 'windows-ambiente-interface-operacoes-basicas';

  update public.study_lessons
  set
    title = 'Arquivos, pastas, extensões e organização da informação',
    position = 2,
    question_count = 35,
    active = true,
    pdf_path = '/materials/cfo-pmal/semana-1/informatica-aula-02-arquivos-pastas-extensoes.pdf'
  where subject_id = v_info_subject_id
    and slug = 'arquivos-pastas-extensoes-organizacao-informacao';

  -- Bloco da tarde.
  insert into public.study_schedule_blocks(
    week_id,
    study_date,
    daypart,
    start_time,
    end_time,
    title,
    optional,
    notes,
    position
  )
  values (
    v_week_id,
    date '2026-09-03',
    'afternoon',
    time '13:30',
    time '17:00',
    'Bloco principal — Tarde',
    false,
    'DPPM — Aulas 01 e 02. Teoria + lista principal de questões.',
    2
  )
  on conflict (week_id, study_date, daypart)
  do update set
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    title = excluded.title,
    optional = excluded.optional,
    notes = excluded.notes,
    position = excluded.position
  returning id into v_afternoon_block_id;

  -- Bloco da noite.
  insert into public.study_schedule_blocks(
    week_id,
    study_date,
    daypart,
    start_time,
    end_time,
    title,
    optional,
    notes,
    position
  )
  values (
    v_week_id,
    date '2026-09-03',
    'evening',
    time '19:00',
    time '22:00',
    'Bloco principal — Noite',
    false,
    'Informática — Aulas 01 e 02. Teoria + lista principal de questões.',
    3
  )
  on conflict (week_id, study_date, daypart)
  do update set
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    title = excluded.title,
    optional = excluded.optional,
    notes = excluded.notes,
    position = excluded.position
  returning id into v_evening_block_id;

  -- Dia 02 fica exatamente com essas quatro aulas.
  delete from public.study_schedule_block_lessons
  where block_id in (v_afternoon_block_id, v_evening_block_id);

  insert into public.study_schedule_block_lessons(block_id, lesson_id, position)
  select
    v_afternoon_block_id,
    l.id,
    x.position
  from (
    values
      ('processo-penal-militar-aplicacao-cppm'::text, 1),
      ('policia-judiciaria-militar'::text, 2)
  ) as x(lesson_slug, position)
  join public.study_lessons l
    on l.subject_id = v_dppm_subject_id
   and l.slug = x.lesson_slug;

  insert into public.study_schedule_block_lessons(block_id, lesson_id, position)
  select
    v_evening_block_id,
    l.id,
    x.position
  from (
    values
      ('windows-ambiente-interface-operacoes-basicas'::text, 1),
      ('arquivos-pastas-extensoes-organizacao-informacao'::text, 2)
  ) as x(lesson_slug, position)
  join public.study_lessons l
    on l.subject_id = v_info_subject_id
   and l.slug = x.lesson_slug;
end;
$$;

-- Conferência do DIA 02.
select
  b.study_date,
  b.daypart,
  b.start_time,
  b.end_time,
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
  and b.study_date = date '2026-09-03'
order by
  case b.daypart
    when 'morning' then 1
    when 'afternoon' then 2
    when 'evening' then 3
    else 4
  end,
  bl.position;
