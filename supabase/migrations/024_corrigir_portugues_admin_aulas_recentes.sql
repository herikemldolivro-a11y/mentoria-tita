-- Mentoria Titã — V9.4.9
-- CORREÇÃO: aulas recentes de Língua Portuguesa ausentes no Admin > Questões.
-- Causa encontrada: o cadastro oficial usa subject_slug = 'lingua-portuguesa',
-- enquanto o pacote dos Dias 10–14 usou o alias 'portugues'.
-- Esta migration corrige as 5 aulas e cria um resolvedor de aliases para os próximos pacotes.

create or replace function public.mt_resolve_study_subject(
  p_plan_slug text,
  p_subject_slug text
)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select s.id
  from public.study_subjects s
  join public.study_plans p on p.id = s.plan_id
  where p.slug = p_plan_slug
    and s.slug = case lower(trim(p_subject_slug))
      when 'portugues' then 'lingua-portuguesa'
      when 'língua-portuguesa' then 'lingua-portuguesa'
      when 'lingua portuguesa' then 'lingua-portuguesa'
      when 'língua portuguesa' then 'lingua-portuguesa'
      else lower(trim(p_subject_slug))
    end
  limit 1;
$$;

do $$
declare
  v_plan_id uuid;
  v_week2 uuid;
  v_subject_id uuid;
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
  into v_week2
  from public.study_weeks
  where plan_id = v_plan_id
    and week_number = 2
  limit 1;

  if v_week2 is null then
    raise exception 'Semana 2 do CFO PMAL não encontrada';
  end if;

  v_subject_id := public.mt_resolve_study_subject(
    'cfo-pmal-2026',
    'portugues'
  );

  if v_subject_id is null then
    raise exception 'Matéria Língua Portuguesa não encontrada';
  end if;

  -- Garante as 5 aulas recentes de Português.
  insert into public.study_lessons(
    subject_id,
    week_id,
    slug,
    title,
    priority,
    position,
    question_count,
    pdf_path,
    active
  )
  values
    (
      v_subject_id,
      v_week2,
      'compreensao-interpretacao-textos',
      'Compreensão e interpretação de textos',
      null,
      1,
      15,
      '/materials/cfo-pmal/dias-01-39/d10-01-portugues-compreensao-interpretacao-textos.pdf',
      true
    ),
    (
      v_subject_id,
      v_week2,
      'classes-palavras',
      'Classes de palavras',
      null,
      6,
      15,
      '/materials/cfo-pmal/dias-01-39/d10-06-portugues-classes-palavras.pdf',
      true
    ),
    (
      v_subject_id,
      v_week2,
      'sintaxe-oracao-termos-oracao',
      'Sintaxe da oração e termos da oração',
      null,
      7,
      15,
      '/materials/cfo-pmal/dias-01-39/d11-05-portugues-sintaxe-oracao-termos.pdf',
      true
    ),
    (
      v_subject_id,
      v_week2,
      'coordenacao',
      'Coordenação',
      null,
      8,
      15,
      '/materials/cfo-pmal/dias-01-39/d13-03-portugues-coordenacao.pdf',
      true
    ),
    (
      v_subject_id,
      v_week2,
      'subordinacao',
      'Subordinação',
      null,
      9,
      15,
      '/materials/cfo-pmal/dias-01-39/d14-04-portugues-subordinacao.pdf',
      true
    )
  on conflict(subject_id,slug)
  do update set
    week_id = excluded.week_id,
    title = excluded.title,
    position = excluded.position,
    question_count = excluded.question_count,
    pdf_path = excluded.pdf_path,
    active = true;

  -- 4 nivelamentos de 10, meta 9/10, também nessas aulas.
  insert into public.lesson_leveling_stages(
    lesson_id,
    stage_number,
    question_count,
    required_correct,
    active,
    updated_at
  )
  select
    l.id,
    gs.stage_number,
    10,
    9,
    true,
    now()
  from public.study_lessons l
  cross join generate_series(1,4) as gs(stage_number)
  where l.subject_id = v_subject_id
    and l.slug in (
      'compreensao-interpretacao-textos',
      'classes-palavras',
      'sintaxe-oracao-termos-oracao',
      'coordenacao',
      'subordinacao'
    )
  on conflict(lesson_id,stage_number)
  do update set
    question_count = 10,
    required_correct = 9,
    active = true,
    updated_at = now();

  if to_regclass('public.lesson_leveling_settings') is not null then
    insert into public.lesson_leveling_settings(
      lesson_id,
      question_count,
      required_correct,
      active
    )
    select l.id,10,9,true
    from public.study_lessons l
    where l.subject_id = v_subject_id
      and l.slug in (
        'compreensao-interpretacao-textos',
        'classes-palavras',
        'sintaxe-oracao-termos-oracao',
        'coordenacao',
        'subordinacao'
      )
    on conflict(lesson_id)
    do update set
      question_count = 10,
      required_correct = 9,
      active = true;
  end if;
end;
$$;

-- Recoloca as aulas de Português nos blocos corretos do cronograma.
with p as (
  select id
  from public.study_plans
  where slug = 'cfo-pmal-2026'
),
subject_pt as (
  select public.mt_resolve_study_subject('cfo-pmal-2026','portugues') as id
),
data(study_date,daypart,lesson_slug,position) as (
  values
    (date '2026-09-11','afternoon','compreensao-interpretacao-textos',1),
    (date '2026-09-11','evening','classes-palavras',3),
    (date '2026-09-12','evening','sintaxe-oracao-termos-oracao',2),
    (date '2026-09-14','afternoon','coordenacao',3),
    (date '2026-09-15','evening','subordinacao',1)
)
insert into public.study_schedule_block_lessons(
  block_id,
  lesson_id,
  position
)
select
  b.id,
  l.id,
  d.position
from data d
join subject_pt sp on sp.id is not null
join public.study_lessons l
  on l.subject_id = sp.id
 and l.slug = d.lesson_slug
join public.study_schedule_blocks b
  on b.week_id = l.week_id
 and b.study_date = d.study_date
 and b.daypart = d.daypart
on conflict(block_id,lesson_id)
do update set position = excluded.position;

-- VERIFICAÇÃO FINAL:
-- Esperado: as 9 aulas de Português aparecem no catálogo do Admin.
select
  c.week_number,
  c.subject_name,
  c.lesson_position,
  c.lesson_title,
  c.lesson_slug,
  c.question_count,
  c.pdf_path
from public.study_lesson_catalog c
where c.plan_slug = 'cfo-pmal-2026'
  and c.subject_slug = 'lingua-portuguesa'
order by c.lesson_position;

-- Verificação específica das recentes.
select
  count(*) as aulas_portugues_recentes_no_admin
from public.study_lesson_catalog c
where c.plan_slug = 'cfo-pmal-2026'
  and c.subject_slug = 'lingua-portuguesa'
  and c.lesson_slug in (
    'compreensao-interpretacao-textos',
    'classes-palavras',
    'sintaxe-oracao-termos-oracao',
    'coordenacao',
    'subordinacao'
  );
-- Esperado: 5
