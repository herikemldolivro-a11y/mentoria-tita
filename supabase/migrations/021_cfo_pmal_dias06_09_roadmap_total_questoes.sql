-- Mentoria Titã — V9.4.5
-- CFO PMAL 2026 — consolidação dos Dias 06 a 09 + PDFs + 4 nivelamentos por aula.
-- O roteiro completo de Dias 01–39 é exibido pela interface; aqui entram no banco as aulas com PDFs enviados agora.

-- Semana 2 é criada apenas para receber o Dia 09 (10/09/2026).
insert into public.study_weeks(plan_id,week_number,title,position,starts_on,ends_on,active)
select id,2,'CFO PMAL — Semana 2',2,date '2026-09-10',date '2026-09-10',true
from public.study_plans
where slug='cfo-pmal-2026'
on conflict(plan_id,week_number)
do update set
  title=excluded.title,
  position=excluded.position,
  starts_on=least(coalesce(public.study_weeks.starts_on,excluded.starts_on),excluded.starts_on),
  ends_on=greatest(coalesce(public.study_weeks.ends_on,excluded.ends_on),excluded.ends_on),
  active=true;

-- Garante Sociologia para o Dia 09.
with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
)
insert into public.study_subjects(plan_id,slug,short_name,name,description,position,active)
select p.id,'sociologia','SOCIOLOGIA','Sociologia','Sociologia aplicada ao edital do CFO PMAL.',7,true
from p
on conflict(plan_id,slug)
do update set
  short_name=excluded.short_name,
  name=excluded.name,
  description=excluded.description,
  position=excluded.position,
  active=true;

-- Atualiza/recria as 19 aulas dos Dias 06–09 com os PDFs exatos deste envio.
with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
),
data(week_number,subject_slug,lesson_position,lesson_slug,title,question_count,pdf_path) as (
  values
    (1, 'processo-penal-militar', 3, 'ipm-instauracao-desenvolvimento', 'IPM: instauração e desenvolvimento', 35, '/materials/cfo-pmal/dias-01-39/d06-01-dppm-ipm-instauracao-desenvolvimento.pdf'),
    (1, 'processo-penal-militar', 4, 'ipm-encerramento-arquivamento-valor-probatorio', 'IPM: encerramento, arquivamento e valor probatório', 35, '/materials/cfo-pmal/dias-01-39/d06-02-dppm-ipm-encerramento-arquivamento-valor-probatorio.pdf'),
    (1, 'direito-penal', 3, 'dolo-culpa-erro-resultado-agravador', 'Dolo, culpa, erro e resultado agravador', 35, '/materials/cfo-pmal/dias-01-39/d06-03-direito-penal-dolo-culpa-erro-resultado-agravador.pdf'),
    (1, 'direito-penal', 4, 'iter-criminis-tentativa', 'Iter criminis e tentativa', 35, '/materials/cfo-pmal/dias-01-39/d06-04-direito-penal-iter-criminis-tentativa.pdf'),
    (1, 'direito-penal', 5, 'ilicitude-excludentes', 'Ilicitude e excludentes', 35, '/materials/cfo-pmal/dias-01-39/d07-01-direito-penal-ilicitude-excludentes.pdf'),
    (1, 'direito-penal', 6, 'imputabilidade-penal', 'Imputabilidade penal', 35, '/materials/cfo-pmal/dias-01-39/d07-02-direito-penal-imputabilidade-penal.pdf'),
    (1, 'legislacao-pmal', 5, 'lei-5346-deveres-obrigacoes-etica', 'Deveres, obrigações e ética', 35, '/materials/cfo-pmal/dias-01-39/d07-03-legislacao-deveres-obrigacoes-etica.pdf'),
    (1, 'legislacao-pmal', 6, 'lei-5346-violacao-deveres-conselhos', 'Violação de deveres e conselhos', 35, '/materials/cfo-pmal/dias-01-39/d07-04-legislacao-violacao-deveres-conselhos.pdf'),
    (1, 'legislacao-pmal', 7, 'lei-5346-ausente-desertor-desaparecido-extraviado', 'Ausente, desertor, desaparecido e extraviado', 35, '/materials/cfo-pmal/dias-01-39/d07-05-legislacao-ausente-desertor-desaparecido-extraviado.pdf'),
    (1, 'informatica', 5, 'microsoft-excel-formulas-funcoes-graficos-analise', 'Excel: fórmulas, funções, gráficos e análise', 35, '/materials/cfo-pmal/dias-01-39/d08-01-informatica-excel-formulas-funcoes-graficos-analise.pdf'),
    (1, 'informatica', 6, 'microsoft-powerpoint', 'Microsoft PowerPoint', 35, '/materials/cfo-pmal/dias-01-39/d08-02-informatica-microsoft-powerpoint.pdf'),
    (1, 'processo-penal-militar', 5, 'acao-penal-militar', 'Ação penal militar', 35, '/materials/cfo-pmal/dias-01-39/d08-03-dppm-acao-penal-militar.pdf'),
    (1, 'processo-penal-militar', 6, 'processo-juiz-auxiliares-partes', 'Processo, juiz, auxiliares e partes', 35, '/materials/cfo-pmal/dias-01-39/d08-04-dppm-processo-juiz-auxiliares-partes.pdf'),
    (1, 'conhecimentos-alagoas', 6, 'rio-sao-francisco-territorio-alagoano', 'Rio São Francisco e território alagoano', 35, '/materials/cfo-pmal/dias-01-39/d08-05-alagoas-rio-sao-francisco-territorio-alagoano.pdf'),
    (2, 'conhecimentos-alagoas', 7, 'organizacao-politico-administrativa', 'Organização político-administrativa', 35, '/materials/cfo-pmal/dias-01-39/d09-01-alagoas-organizacao-politico-administrativa.pdf'),
    (2, 'conhecimentos-alagoas', 8, 'economia-estadual', 'Economia estadual', 35, '/materials/cfo-pmal/dias-01-39/d09-02-alagoas-economia-estadual.pdf'),
    (2, 'conhecimentos-alagoas', 9, 'manifestacoes-culturais-populares', 'Manifestações culturais populares', 35, '/materials/cfo-pmal/dias-01-39/d09-03-alagoas-manifestacoes-culturais-populares.pdf'),
    (2, 'conhecimentos-alagoas', 10, 'patrimonio-historico-cultural-alagoano', 'Patrimônio histórico-cultural alagoano', 35, '/materials/cfo-pmal/dias-01-39/d09-04-alagoas-patrimonio-historico-cultural-alagoano.pdf'),
    (2, 'sociologia', 1, 'constituicao-saber-sociologico', 'Constituição do saber sociológico', 35, '/materials/cfo-pmal/dias-01-39/d09-05-sociologia-constituicao-saber-sociologico.pdf')
)
insert into public.study_lessons(subject_id,week_id,slug,title,priority,position,question_count,pdf_path,active)
select
  s.id,
  w.id,
  d.lesson_slug,
  d.title,
  null,
  d.lesson_position,
  d.question_count,
  d.pdf_path,
  true
from data d
join p on true
join public.study_subjects s on s.plan_id=p.id and s.slug=d.subject_slug
join public.study_weeks w on w.plan_id=p.id and w.week_number=d.week_number
on conflict(subject_id,slug)
do update set
  week_id=excluded.week_id,
  title=excluded.title,
  position=excluded.position,
  question_count=excluded.question_count,
  pdf_path=excluded.pdf_path,
  active=true;

-- Regra geral do CFO PMAL:
-- TODA aula já cadastrada no plano recebe 4 nivelamentos x 10 questões, exigência 9/10.
-- Isso corrige inclusive aulas antigas que ainda estivessem configuradas com 5 questões.
with target_lessons as (
  select l.id as lesson_id
  from public.study_lessons l
  join public.study_subjects s on s.id=l.subject_id
  join public.study_plans p on p.id=s.plan_id
  where p.slug='cfo-pmal-2026'
    and p.active and s.active and l.active
),
stages as (
  select generate_series(1,4) as stage_number
)
insert into public.lesson_leveling_stages(
  lesson_id,stage_number,question_count,required_correct,active,updated_at
)
select tl.lesson_id,st.stage_number,10,9,true,now()
from target_lessons tl cross join stages st
on conflict(lesson_id,stage_number)
do update set
  question_count=10,
  required_correct=9,
  active=true,
  updated_at=now();

do $$
begin
  if to_regclass('public.lesson_leveling_settings') is not null then
    execute $compat$
      insert into public.lesson_leveling_settings(
        lesson_id,question_count,required_correct,active
      )
      select l.id,10,9,true
      from public.study_lessons l
      join public.study_subjects s on s.id=l.subject_id
      join public.study_plans p on p.id=s.plan_id
      where p.slug='cfo-pmal-2026'
        and p.active and s.active and l.active
      on conflict(lesson_id)
      do update set
        question_count=10,
        required_correct=9,
        active=true
    $compat$;
  end if;
end;
$$;

-- Blocos corretos dos Dias 06–09.
do $$
declare
  v_plan_id uuid;
  v_week1 uuid;
  v_week2 uuid;
begin
  select id into v_plan_id from public.study_plans where slug='cfo-pmal-2026' limit 1;
  if v_plan_id is null then raise exception 'Plano cfo-pmal-2026 não encontrado'; end if;

  select id into v_week1 from public.study_weeks where plan_id=v_plan_id and week_number=1 limit 1;
  select id into v_week2 from public.study_weeks where plan_id=v_plan_id and week_number=2 limit 1;
  if v_week1 is null or v_week2 is null then raise exception 'Semanas CFO PMAL não encontradas'; end if;

  -- Garante os blocos.
  insert into public.study_schedule_blocks(week_id,study_date,daypart,start_time,end_time,title,optional,notes,position)
  values
    (v_week1,date '2026-09-07','afternoon',time '13:30',time '17:00','Dia 06 — Tarde',false,'DPPM 03 e 04.',2),
    (v_week1,date '2026-09-07','evening',time '19:00',time '22:00','Dia 06 — Noite',false,'Direito Penal 03 e 04.',3),
    (v_week1,date '2026-09-08','afternoon',time '13:30',time '17:00','Dia 07 — Tarde',false,'Direito Penal 05 e 06 + Legislação PMAL 05.',2),
    (v_week1,date '2026-09-08','evening',time '19:00',time '22:00','Dia 07 — Noite',false,'Legislação PMAL 06 e 07.',3),
    (v_week1,date '2026-09-09','afternoon',time '13:30',time '17:00','Dia 08 — Tarde',false,'Informática 05 e 06 + DPPM 05.',2),
    (v_week1,date '2026-09-09','evening',time '19:00',time '22:00','Dia 08 — Noite',false,'DPPM 06 + Alagoas 06.',3),
    (v_week2,date '2026-09-10','afternoon',time '13:30',time '17:00','Dia 09 — Tarde',false,'Alagoas 07, 08 e 09.',2),
    (v_week2,date '2026-09-10','evening',time '19:00',time '22:00','Dia 09 — Noite',false,'Alagoas 10 + Sociologia 01.',3)
  on conflict(week_id,study_date,daypart)
  do update set
    start_time=excluded.start_time,
    end_time=excluded.end_time,
    title=excluded.title,
    optional=false,
    notes=excluded.notes,
    position=excluded.position;

  -- Remove apenas os vínculos destes blocos e remonta na ordem exata.
  delete from public.study_schedule_block_lessons bl
  using public.study_schedule_blocks b
  where bl.block_id=b.id
    and (
      (b.week_id=v_week1 and b.study_date between date '2026-09-07' and date '2026-09-09')
      or (b.week_id=v_week2 and b.study_date=date '2026-09-10')
    );
end;
$$;

with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
),
data(study_date,daypart,subject_slug,lesson_slug,position) as (
  values
    ('2026-09-07','afternoon','processo-penal-militar','ipm-instauracao-desenvolvimento',1),
    ('2026-09-07','afternoon','processo-penal-militar','ipm-encerramento-arquivamento-valor-probatorio',2),
    ('2026-09-07','evening','direito-penal','dolo-culpa-erro-resultado-agravador',1),
    ('2026-09-07','evening','direito-penal','iter-criminis-tentativa',2),
    ('2026-09-08','afternoon','direito-penal','ilicitude-excludentes',1),
    ('2026-09-08','afternoon','direito-penal','imputabilidade-penal',2),
    ('2026-09-08','afternoon','legislacao-pmal','lei-5346-deveres-obrigacoes-etica',3),
    ('2026-09-08','evening','legislacao-pmal','lei-5346-violacao-deveres-conselhos',1),
    ('2026-09-08','evening','legislacao-pmal','lei-5346-ausente-desertor-desaparecido-extraviado',2),
    ('2026-09-09','afternoon','informatica','microsoft-excel-formulas-funcoes-graficos-analise',1),
    ('2026-09-09','afternoon','informatica','microsoft-powerpoint',2),
    ('2026-09-09','afternoon','processo-penal-militar','acao-penal-militar',3),
    ('2026-09-09','evening','processo-penal-militar','processo-juiz-auxiliares-partes',1),
    ('2026-09-09','evening','conhecimentos-alagoas','rio-sao-francisco-territorio-alagoano',2),
    ('2026-09-10','afternoon','conhecimentos-alagoas','organizacao-politico-administrativa',1),
    ('2026-09-10','afternoon','conhecimentos-alagoas','economia-estadual',2),
    ('2026-09-10','afternoon','conhecimentos-alagoas','manifestacoes-culturais-populares',3),
    ('2026-09-10','evening','conhecimentos-alagoas','patrimonio-historico-cultural-alagoano',1),
    ('2026-09-10','evening','sociologia','constituicao-saber-sociologico',2)
)
insert into public.study_schedule_block_lessons(block_id,lesson_id,position)
select b.id,l.id,d.position
from data d
join public.study_subjects s on s.plan_id=(select id from p) and s.slug=d.subject_slug
join public.study_lessons l on l.subject_id=s.id and l.slug=d.lesson_slug
join public.study_weeks w on w.plan_id=(select id from p) and w.id=l.week_id
join public.study_schedule_blocks b on b.week_id=w.id and b.study_date=d.study_date::date and b.daypart=d.daypart
on conflict(block_id,lesson_id)
do update set position=excluded.position;

-- Conferência final: deve retornar 19 aulas, todas com PDF e 4 nivelamentos.
with target(subject_slug,lesson_slug) as (
  values
    ('processo-penal-militar','ipm-instauracao-desenvolvimento'),
    ('processo-penal-militar','ipm-encerramento-arquivamento-valor-probatorio'),
    ('direito-penal','dolo-culpa-erro-resultado-agravador'),
    ('direito-penal','iter-criminis-tentativa'),
    ('direito-penal','ilicitude-excludentes'),
    ('direito-penal','imputabilidade-penal'),
    ('legislacao-pmal','lei-5346-deveres-obrigacoes-etica'),
    ('legislacao-pmal','lei-5346-violacao-deveres-conselhos'),
    ('legislacao-pmal','lei-5346-ausente-desertor-desaparecido-extraviado'),
    ('informatica','microsoft-excel-formulas-funcoes-graficos-analise'),
    ('informatica','microsoft-powerpoint'),
    ('processo-penal-militar','acao-penal-militar'),
    ('processo-penal-militar','processo-juiz-auxiliares-partes'),
    ('conhecimentos-alagoas','rio-sao-francisco-territorio-alagoano'),
    ('conhecimentos-alagoas','organizacao-politico-administrativa'),
    ('conhecimentos-alagoas','economia-estadual'),
    ('conhecimentos-alagoas','manifestacoes-culturais-populares'),
    ('conhecimentos-alagoas','patrimonio-historico-cultural-alagoano'),
    ('sociologia','constituicao-saber-sociologico')
)
select
  s.name as materia,
  l.title as aula,
  l.pdf_path,
  l.question_count as lista_principal,
  (select count(*) from public.lesson_leveling_stages st where st.lesson_id=l.id and st.active) as nivelamentos,
  (select min(st.question_count) from public.lesson_leveling_stages st where st.lesson_id=l.id and st.active) as questoes_por_nivelamento
from target t
join public.study_plans p on p.slug='cfo-pmal-2026'
join public.study_subjects s on s.plan_id=p.id and s.slug=t.subject_slug
join public.study_lessons l on l.subject_id=s.id and l.slug=t.lesson_slug
order by s.position,l.position;
