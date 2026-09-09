-- Mentoria Titã — V9.4.4
-- CFO PMAL 2026 — Semana 1 — DIAS 04, 05 e 06
-- PDFs enviados pelo usuário + vínculos do cronograma + configuração dos nivelamentos.
-- ATENÇÃO: esta migração NÃO remove Direito Penal Aula 05 do Dia 06, caso já exista.
-- Nivelamentos: 4 estágios por aula, 10 questões por estágio, meta 9/10.

do $$
declare
  v_plan_id uuid;
  v_week_id uuid;
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
  where plan_id = v_plan_id and week_number = 1
  limit 1;

  if v_week_id is null then
    raise exception 'Semana 1 do CFO PMAL não encontrada';
  end if;

  update public.study_weeks
  set title='CFO PMAL — Semana 1',
      starts_on=date '2026-09-02',
      ends_on=date '2026-09-09',
      active=true
  where id=v_week_id;

  -- DIA 04
  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id=v_week_id and study_date=date '2026-09-05' and daypart='afternoon'
  ) then
    insert into public.study_schedule_blocks(
      week_id,study_date,daypart,start_time,end_time,title,optional,notes,position
    ) values (
      v_week_id,date '2026-09-05','afternoon',time '13:30',time '17:00',
      'Bloco principal — Tarde',false,
      'Legislação PMAL — Aulas 03 e 04. Teoria + lista principal de questões.',2
    );
  end if;

  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id=v_week_id and study_date=date '2026-09-05' and daypart='evening'
  ) then
    insert into public.study_schedule_blocks(
      week_id,study_date,daypart,start_time,end_time,title,optional,notes,position
    ) values (
      v_week_id,date '2026-09-05','evening',time '19:00',time '22:00',
      'Bloco principal — Noite',false,
      'Português — Aulas 04 e 05 + Conhecimentos de Alagoas — Aula 03.',3
    );
  end if;

  -- DIA 05
  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id=v_week_id and study_date=date '2026-09-06' and daypart='afternoon'
  ) then
    insert into public.study_schedule_blocks(
      week_id,study_date,daypart,start_time,end_time,title,optional,notes,position
    ) values (
      v_week_id,date '2026-09-06','afternoon',time '13:30',time '17:00',
      'Bloco principal — Tarde',false,
      'Informática — Aulas 03 e 04. Teoria + lista principal de questões.',2
    );
  end if;

  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id=v_week_id and study_date=date '2026-09-06' and daypart='evening'
  ) then
    insert into public.study_schedule_blocks(
      week_id,study_date,daypart,start_time,end_time,title,optional,notes,position
    ) values (
      v_week_id,date '2026-09-06','evening',time '19:00',time '22:00',
      'Bloco principal — Noite',false,
      'Conhecimentos de Alagoas — Aulas 04 e 05. Teoria + lista principal de questões.',3
    );
  end if;

  -- DIA 06
  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id=v_week_id and study_date=date '2026-09-07' and daypart='afternoon'
  ) then
    insert into public.study_schedule_blocks(
      week_id,study_date,daypart,start_time,end_time,title,optional,notes,position
    ) values (
      v_week_id,date '2026-09-07','afternoon',time '13:30',time '17:00',
      'Bloco principal — Tarde',false,
      'DPPM — Aulas 03 e 04. Teoria + lista principal de questões.',2
    );
  end if;

  if not exists (
    select 1 from public.study_schedule_blocks
    where week_id=v_week_id and study_date=date '2026-09-07' and daypart='evening'
  ) then
    insert into public.study_schedule_blocks(
      week_id,study_date,daypart,start_time,end_time,title,optional,notes,position
    ) values (
      v_week_id,date '2026-09-07','evening',time '19:00',time '22:00',
      'Bloco principal — Noite',false,
      'Direito Penal — Aulas 03 e 04; Aula 05 é preservada caso já esteja cadastrada.',3
    );
  end if;

  update public.study_schedule_blocks set
    start_time=time '13:30', end_time=time '17:00',
    title='Bloco principal — Tarde', optional=false,
    notes='Legislação PMAL — Aulas 03 e 04. Teoria + lista principal de questões.',
    position=2
  where week_id=v_week_id and study_date=date '2026-09-05' and daypart='afternoon';

  update public.study_schedule_blocks set
    start_time=time '19:00', end_time=time '22:00',
    title='Bloco principal — Noite', optional=false,
    notes='Português — Aulas 04 e 05 + Conhecimentos de Alagoas — Aula 03.',
    position=3
  where week_id=v_week_id and study_date=date '2026-09-05' and daypart='evening';

  update public.study_schedule_blocks set
    start_time=time '13:30', end_time=time '17:00',
    title='Bloco principal — Tarde', optional=false,
    notes='Informática — Aulas 03 e 04. Teoria + lista principal de questões.',
    position=2
  where week_id=v_week_id and study_date=date '2026-09-06' and daypart='afternoon';

  update public.study_schedule_blocks set
    start_time=time '19:00', end_time=time '22:00',
    title='Bloco principal — Noite', optional=false,
    notes='Conhecimentos de Alagoas — Aulas 04 e 05. Teoria + lista principal de questões.',
    position=3
  where week_id=v_week_id and study_date=date '2026-09-06' and daypart='evening';

  update public.study_schedule_blocks set
    start_time=time '13:30', end_time=time '17:00',
    title='Bloco principal — Tarde', optional=false,
    notes='DPPM — Aulas 03 e 04. Teoria + lista principal de questões.',
    position=2
  where week_id=v_week_id and study_date=date '2026-09-07' and daypart='afternoon';

  update public.study_schedule_blocks set
    start_time=time '19:00', end_time=time '22:00',
    title='Bloco principal — Noite', optional=false,
    notes='Direito Penal — Aulas 03 e 04; Aula 05 é preservada caso já esteja cadastrada.',
    position=3
  where week_id=v_week_id and study_date=date '2026-09-07' and daypart='evening';
end;
$$;

-- Atualiza as 13 aulas enviadas, preservando a regra da lista principal:
-- Português = 15; demais = 35.
with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
),
lesson_data(subject_slug, lesson_slug, question_count, pdf_path) as (
  values
    ('legislacao-pmal', 'lei-5346-cargo-funcao-comando-subordinacao', 35, '/materials/cfo-pmal/semana-1/legislacao-aula-03-cargo-funcao-comando-subordinacao.pdf'),
    ('legislacao-pmal', 'lei-5346-direitos-prerrogativas', 35, '/materials/cfo-pmal/semana-1/legislacao-aula-04-direitos-prerrogativas.pdf'),
    ('lingua-portuguesa', 'coesao-referenciacao-conectores', 15, '/materials/cfo-pmal/semana-1/portugues-aula-04-coesao-referenciacao-conectores.pdf'),
    ('lingua-portuguesa', 'verbos-tempos-modos-emprego-texto', 15, '/materials/cfo-pmal/semana-1/portugues-aula-05-verbos-tempos-modos-emprego-texto.pdf'),
    ('conhecimentos-alagoas', 'emancipacao-pernambuco-elevacao-provincia', 35, '/materials/cfo-pmal/semana-1/alagoas-aula-03-emancipacao-pernambuco-elevacao-provincia.pdf'),
    ('informatica', 'microsoft-word', 35, '/materials/cfo-pmal/semana-1/informatica-aula-03-microsoft-word.pdf'),
    ('informatica', 'microsoft-excel-estrutura-referencias', 35, '/materials/cfo-pmal/semana-1/informatica-aula-04-microsoft-excel-estrutura-referencias.pdf'),
    ('conhecimentos-alagoas', 'quilombo-palmares', 35, '/materials/cfo-pmal/semana-1/alagoas-aula-04-quilombo-palmares.pdf'),
    ('conhecimentos-alagoas', 'regionalizacao-litoral-zona-mata-agreste-sertao', 35, '/materials/cfo-pmal/semana-1/alagoas-aula-05-regionalizacao-litoral-zona-mata-agreste-sertao.pdf'),
    ('processo-penal-militar', 'ipm-instauracao-desenvolvimento', 35, '/materials/cfo-pmal/semana-1/dppm-aula-03-ipm-instauracao-desenvolvimento.pdf'),
    ('processo-penal-militar', 'ipm-encerramento-arquivamento-valor-probatorio', 35, '/materials/cfo-pmal/semana-1/dppm-aula-04-ipm-encerramento-arquivamento-valor-probatorio.pdf'),
    ('direito-penal', 'dolo-culpa-erro-resultado-agravador', 35, '/materials/cfo-pmal/semana-1/direito-penal-aula-03-dolo-culpa-erro-resultado-agravador.pdf'),
    ('direito-penal', 'iter-criminis-tentativa', 35, '/materials/cfo-pmal/semana-1/direito-penal-aula-04-iter-criminis-tentativa.pdf')
)
update public.study_lessons l
set question_count=d.question_count,
    pdf_path=d.pdf_path,
    active=true
from lesson_data d
join public.study_subjects s
  on s.slug=d.subject_slug and s.plan_id=(select id from p)
where l.subject_id=s.id and l.slug=d.lesson_slug;

-- 4 nivelamentos de 10 questões em CADA uma das 13 aulas; meta 9/10.
with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
),
target(subject_slug, lesson_slug) as (
  values
    ('legislacao-pmal', 'lei-5346-cargo-funcao-comando-subordinacao'),
    ('legislacao-pmal', 'lei-5346-direitos-prerrogativas'),
    ('lingua-portuguesa', 'coesao-referenciacao-conectores'),
    ('lingua-portuguesa', 'verbos-tempos-modos-emprego-texto'),
    ('conhecimentos-alagoas', 'emancipacao-pernambuco-elevacao-provincia'),
    ('informatica', 'microsoft-word'),
    ('informatica', 'microsoft-excel-estrutura-referencias'),
    ('conhecimentos-alagoas', 'quilombo-palmares'),
    ('conhecimentos-alagoas', 'regionalizacao-litoral-zona-mata-agreste-sertao'),
    ('processo-penal-militar', 'ipm-instauracao-desenvolvimento'),
    ('processo-penal-militar', 'ipm-encerramento-arquivamento-valor-probatorio'),
    ('direito-penal', 'dolo-culpa-erro-resultado-agravador'),
    ('direito-penal', 'iter-criminis-tentativa')
),
target_lessons as (
  select l.id as lesson_id
  from target t
  join public.study_subjects s
    on s.slug=t.subject_slug and s.plan_id=(select id from p)
  join public.study_lessons l
    on l.subject_id=s.id and l.slug=t.lesson_slug
),
stages as (
  select generate_series(1,4) as stage_number
)
insert into public.lesson_leveling_stages(
  lesson_id,stage_number,question_count,required_correct,active
)
select tl.lesson_id,st.stage_number,10,9,true
from target_lessons tl cross join stages st
on conflict(lesson_id,stage_number)
do update set
  question_count=10,
  required_correct=9,
  active=true,
  updated_at=now();

-- Compatibilidade com a configuração antiga de nivelamento, se a tabela existir.
do $$
begin
  if to_regclass('public.lesson_leveling_settings') is not null then
    execute $sql$
      with p as (
        select id from public.study_plans where slug='cfo-pmal-2026'
      ),
      target(subject_slug, lesson_slug) as (
        values
    ('legislacao-pmal', 'lei-5346-cargo-funcao-comando-subordinacao'),
    ('legislacao-pmal', 'lei-5346-direitos-prerrogativas'),
    ('lingua-portuguesa', 'coesao-referenciacao-conectores'),
    ('lingua-portuguesa', 'verbos-tempos-modos-emprego-texto'),
    ('conhecimentos-alagoas', 'emancipacao-pernambuco-elevacao-provincia'),
    ('informatica', 'microsoft-word'),
    ('informatica', 'microsoft-excel-estrutura-referencias'),
    ('conhecimentos-alagoas', 'quilombo-palmares'),
    ('conhecimentos-alagoas', 'regionalizacao-litoral-zona-mata-agreste-sertao'),
    ('processo-penal-militar', 'ipm-instauracao-desenvolvimento'),
    ('processo-penal-militar', 'ipm-encerramento-arquivamento-valor-probatorio'),
    ('direito-penal', 'dolo-culpa-erro-resultado-agravador'),
    ('direito-penal', 'iter-criminis-tentativa')
      )
      insert into public.lesson_leveling_settings(
        lesson_id,question_count,required_correct,active
      )
      select l.id,10,9,true
      from target t
      join public.study_subjects s
        on s.slug=t.subject_slug and s.plan_id=(select id from p)
      join public.study_lessons l
        on l.subject_id=s.id and l.slug=t.lesson_slug
      on conflict(lesson_id)
      do update set
        question_count=10,
        required_correct=9,
        active=true
    $sql$;
  end if;
end;
$$;

-- Vínculos do cronograma. Não apagamos os já existentes:
-- assim, Direito Penal Aula 05 do Dia 06 continua preservada.
with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
),
w as (
  select sw.id
  from public.study_weeks sw
  join p on p.id=sw.plan_id
  where sw.week_number=1
),
data(study_date,daypart,subject_slug,lesson_slug,position) as (
  values
    ('2026-09-05', 'afternoon', 'legislacao-pmal', 'lei-5346-cargo-funcao-comando-subordinacao', 1),
    ('2026-09-05', 'afternoon', 'legislacao-pmal', 'lei-5346-direitos-prerrogativas', 2),
    ('2026-09-05', 'evening', 'lingua-portuguesa', 'coesao-referenciacao-conectores', 1),
    ('2026-09-05', 'evening', 'lingua-portuguesa', 'verbos-tempos-modos-emprego-texto', 2),
    ('2026-09-05', 'evening', 'conhecimentos-alagoas', 'emancipacao-pernambuco-elevacao-provincia', 3),
    ('2026-09-06', 'afternoon', 'informatica', 'microsoft-word', 1),
    ('2026-09-06', 'afternoon', 'informatica', 'microsoft-excel-estrutura-referencias', 2),
    ('2026-09-06', 'evening', 'conhecimentos-alagoas', 'quilombo-palmares', 1),
    ('2026-09-06', 'evening', 'conhecimentos-alagoas', 'regionalizacao-litoral-zona-mata-agreste-sertao', 2),
    ('2026-09-07', 'afternoon', 'processo-penal-militar', 'ipm-instauracao-desenvolvimento', 1),
    ('2026-09-07', 'afternoon', 'processo-penal-militar', 'ipm-encerramento-arquivamento-valor-probatorio', 2),
    ('2026-09-07', 'evening', 'direito-penal', 'dolo-culpa-erro-resultado-agravador', 1),
    ('2026-09-07', 'evening', 'direito-penal', 'iter-criminis-tentativa', 2)
)
insert into public.study_schedule_block_lessons(block_id,lesson_id,position)
select b.id,l.id,d.position
from data d
join public.study_schedule_blocks b
  on b.week_id=(select id from w)
 and b.study_date=d.study_date::date
 and b.daypart=d.daypart
join public.study_subjects s
  on s.plan_id=(select id from p)
 and s.slug=d.subject_slug
join public.study_lessons l
  on l.subject_id=s.id
 and l.slug=d.lesson_slug
on conflict(block_id,lesson_id)
do update set position=excluded.position;

-- Conferência: deve retornar exatamente 13 aulas deste pacote.
with target(subject_slug, lesson_slug) as (
  values
    ('legislacao-pmal', 'lei-5346-cargo-funcao-comando-subordinacao'),
    ('legislacao-pmal', 'lei-5346-direitos-prerrogativas'),
    ('lingua-portuguesa', 'coesao-referenciacao-conectores'),
    ('lingua-portuguesa', 'verbos-tempos-modos-emprego-texto'),
    ('conhecimentos-alagoas', 'emancipacao-pernambuco-elevacao-provincia'),
    ('informatica', 'microsoft-word'),
    ('informatica', 'microsoft-excel-estrutura-referencias'),
    ('conhecimentos-alagoas', 'quilombo-palmares'),
    ('conhecimentos-alagoas', 'regionalizacao-litoral-zona-mata-agreste-sertao'),
    ('processo-penal-militar', 'ipm-instauracao-desenvolvimento'),
    ('processo-penal-militar', 'ipm-encerramento-arquivamento-valor-probatorio'),
    ('direito-penal', 'dolo-culpa-erro-resultado-agravador'),
    ('direito-penal', 'iter-criminis-tentativa')
)
select
  b.study_date,
  b.daypart,
  s.name as materia,
  l.position as aula_numero,
  l.title as aula,
  l.question_count as lista_principal,
  l.pdf_path,
  (
    select count(*)
    from public.lesson_leveling_stages st
    where st.lesson_id=l.id and st.active
  ) as nivelamentos_ativos,
  (
    select min(st.question_count)
    from public.lesson_leveling_stages st
    where st.lesson_id=l.id and st.active
  ) as questoes_por_nivelamento
from target t
join public.study_plans p on p.slug='cfo-pmal-2026'
join public.study_subjects s on s.plan_id=p.id and s.slug=t.subject_slug
join public.study_lessons l on l.subject_id=s.id and l.slug=t.lesson_slug
join public.study_schedule_block_lessons bl on bl.lesson_id=l.id
join public.study_schedule_blocks b on b.id=bl.block_id
join public.study_weeks w on w.id=b.week_id and w.plan_id=p.id and w.week_number=1
where b.study_date in (date '2026-09-05',date '2026-09-06',date '2026-09-07')
order by b.study_date,
  case b.daypart when 'afternoon' then 1 when 'evening' then 2 else 3 end,
  bl.position;
