-- Mentoria Tita - V9.4.8
-- CFO PMAL 2026 - Dias 10 a 14: 30 aulas + 30 PDFs.
-- Regra: Portugues = 15 principal; demais = 35 principal; TODAS com 4 nivelamentos x 10, meta 9/10.

-- Semana 2 cobre os Dias 09 a 15 (10/09 a 16/09/2026).
insert into public.study_weeks(plan_id,week_number,title,position,starts_on,ends_on,active)
select id,2,'CFO PMAL - Semana 2',2,date '2026-09-10',date '2026-09-16',true
from public.study_plans
where slug='cfo-pmal-2026'
on conflict(plan_id,week_number)
do update set
  title=excluded.title,
  position=excluded.position,
  starts_on=least(coalesce(public.study_weeks.starts_on,excluded.starts_on),excluded.starts_on),
  ends_on=greatest(coalesce(public.study_weeks.ends_on,excluded.ends_on),excluded.ends_on),
  active=true;

-- Garante Direito Constitucional para os Dias 13 e 14.
with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
)
insert into public.study_subjects(plan_id,slug,short_name,name,description,position,active)
select p.id,'direito-constitucional','CONST.','Direito Constitucional','Direito Constitucional aplicado ao edital do CFO PMAL.',8,true
from p
on conflict(plan_id,slug)
do update set
  short_name=excluded.short_name,
  name=excluded.name,
  description=excluded.description,
  active=true;

-- Insere/atualiza as 30 aulas dos Dias 10 a 14 e vincula os PDFs exatos.
with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
),
data(week_number,subject_slug,lesson_position,lesson_slug,title,question_count,pdf_path,day_number,day_order) as (
  values
    (2, 'portugues', 1, 'compreensao-interpretacao-textos', 'Compreensão e interpretação de textos', 15, '/materials/cfo-pmal/dias-01-39/d10-01-portugues-compreensao-interpretacao-textos.pdf', 10, 1),
    (2, 'legislacao-pmal', 8, 'exclusao-servico-ativo-inatividade', 'Exclusão do serviço ativo e inatividade', 35, '/materials/cfo-pmal/dias-01-39/d10-02-legislacao-exclusao-servico-ativo-inatividade.pdf', 10, 2),
    (2, 'processo-penal-militar', 7, 'questoes-prejudiciais-excecoes', 'Questões prejudiciais e exceções', 35, '/materials/cfo-pmal/dias-01-39/d10-03-dppm-questoes-prejudiciais-excecoes.pdf', 10, 3),
    (2, 'informatica', 7, 'redes-computadores-fundamentos', 'Redes de computadores: fundamentos', 35, '/materials/cfo-pmal/dias-01-39/d10-04-informatica-redes-computadores-fundamentos.pdf', 10, 4),
    (2, 'direito-penal', 7, 'crimes-contra-vida', 'Crimes contra a vida', 35, '/materials/cfo-pmal/dias-01-39/d10-05-direito-penal-crimes-contra-vida.pdf', 10, 5),
    (2, 'portugues', 6, 'classes-palavras', 'Classes de palavras', 15, '/materials/cfo-pmal/dias-01-39/d10-06-portugues-classes-palavras.pdf', 10, 6),
    (2, 'legislacao-pmal', 9, 'remuneracao-promocao-uniformes', 'Remuneração, promoção e uniformes', 35, '/materials/cfo-pmal/dias-01-39/d11-01-legislacao-remuneracao-promocao-uniformes.pdf', 11, 1),
    (2, 'processo-penal-militar', 8, 'incidentes-sanidade-mental-falsidade-documental', 'Incidentes de sanidade mental e falsidade documental', 35, '/materials/cfo-pmal/dias-01-39/d11-02-dppm-incidentes-sanidade-mental-falsidade-documental.pdf', 11, 2),
    (2, 'informatica', 8, 'internet-intranet-servicos', 'Internet, intranet e serviços', 35, '/materials/cfo-pmal/dias-01-39/d11-03-informatica-internet-intranet-servicos.pdf', 11, 3),
    (2, 'direito-penal', 8, 'lesoes-perigo-honra-liberdade-individual', 'Lesões, perigo, honra e liberdade individual', 35, '/materials/cfo-pmal/dias-01-39/d11-04-direito-penal-lesoes-perigo-honra-liberdade.pdf', 11, 4),
    (2, 'portugues', 7, 'sintaxe-oracao-termos-oracao', 'Sintaxe da oração e termos da oração', 15, '/materials/cfo-pmal/dias-01-39/d11-05-portugues-sintaxe-oracao-termos.pdf', 11, 5),
    (2, 'legislacao-pmal', 10, 'agregacao-reversao-excedente', 'Agregação, reversão e excedente', 35, '/materials/cfo-pmal/dias-01-39/d11-06-legislacao-agregacao-reversao-excedente.pdf', 11, 6),
    (2, 'processo-penal-militar', 9, 'medidas-preventivas-assecuratorias-coisas', 'Medidas preventivas e assecuratórias sobre coisas', 35, '/materials/cfo-pmal/dias-01-39/d12-01-dppm-medidas-preventivas-assecuratorias-coisas.pdf', 12, 1),
    (2, 'informatica', 9, 'navegadores-busca-pesquisa-internet', 'Navegadores, busca e pesquisa na Internet', 35, '/materials/cfo-pmal/dias-01-39/d12-02-informatica-navegadores-busca-pesquisa.pdf', 12, 2),
    (2, 'direito-penal', 9, 'crimes-contra-patrimonio-i', 'Crimes contra o patrimônio I', 35, '/materials/cfo-pmal/dias-01-39/d12-03-direito-penal-crimes-contra-patrimonio-i.pdf', 12, 3),
    (2, 'legislacao-pmal', 11, 'afastamentos-licencas-recompensas', 'Afastamentos, licenças e recompensas', 35, '/materials/cfo-pmal/dias-01-39/d12-04-legislacao-afastamentos-licencas-recompensas.pdf', 12, 4),
    (2, 'processo-penal-militar', 10, 'prisao-flagrante-militar', 'Prisão em flagrante militar', 35, '/materials/cfo-pmal/dias-01-39/d12-05-dppm-prisao-flagrante-militar.pdf', 12, 5),
    (2, 'legislacao-pmal', 12, 'tempo-servico-disposicoes-finais', 'Tempo de serviço e disposições finais', 35, '/materials/cfo-pmal/dias-01-39/d12-06-legislacao-tempo-servico-disposicoes-finais.pdf', 12, 6),
    (2, 'legislacao-pmal', 13, 'rdpmal-hierarquia-disciplina-etica', 'RDPMAL: disposições gerais, hierarquia, disciplina e ética', 35, '/materials/cfo-pmal/dias-01-39/d13-01-legislacao-rdpmal-hierarquia-disciplina-etica.pdf', 13, 1),
    (2, 'processo-penal-militar', 11, 'prisao-preventiva-militar', 'Prisão preventiva militar', 35, '/materials/cfo-pmal/dias-01-39/d13-02-dppm-prisao-preventiva-militar.pdf', 13, 2),
    (2, 'portugues', 8, 'coordenacao', 'Coordenação', 15, '/materials/cfo-pmal/dias-01-39/d13-03-portugues-coordenacao.pdf', 13, 3),
    (2, 'informatica', 10, 'correio-eletronico-grupos-redes-sociais', 'Correio eletrônico, grupos de discussão e redes sociais', 35, '/materials/cfo-pmal/dias-01-39/d13-04-informatica-correio-grupos-redes-sociais.pdf', 13, 4),
    (2, 'direito-constitucional', 1, 'teoria-constituicao', 'Teoria da Constituição', 35, '/materials/cfo-pmal/dias-01-39/d13-05-direito-constitucional-teoria-constituicao.pdf', 13, 5),
    (2, 'direito-penal', 10, 'crimes-contra-patrimonio-ii', 'Crimes contra o patrimônio II', 35, '/materials/cfo-pmal/dias-01-39/d13-06-direito-penal-crimes-contra-patrimonio-ii.pdf', 13, 6),
    (2, 'legislacao-pmal', 14, 'rdpmal-transgressoes-disciplinares', 'RDPMAL: transgressões disciplinares', 35, '/materials/cfo-pmal/dias-01-39/d14-01-legislacao-rdpmal-transgressoes-disciplinares.pdf', 14, 1),
    (2, 'processo-penal-militar', 12, 'liberdade-provisoria-menagem-providencias-pessoas', 'Liberdade provisória e outras providências sobre pessoas', 35, '/materials/cfo-pmal/dias-01-39/d14-02-dppm-liberdade-provisoria-menagem-providencias-pessoas.pdf', 14, 2),
    (2, 'direito-constitucional', 2, 'supremacia-aplicabilidade-normas-constitucionais', 'Supremacia e aplicabilidade das normas constitucionais', 35, '/materials/cfo-pmal/dias-01-39/d14-03-direito-constitucional-supremacia-aplicabilidade.pdf', 14, 3),
    (2, 'portugues', 9, 'subordinacao', 'Subordinação', 15, '/materials/cfo-pmal/dias-01-39/d14-04-portugues-subordinacao.pdf', 14, 4),
    (2, 'informatica', 11, 'computacao-armazenamento-nuvem', 'Computação e armazenamento em nuvem', 35, '/materials/cfo-pmal/dias-01-39/d14-05-informatica-computacao-armazenamento-nuvem.pdf', 14, 5),
    (2, 'direito-constitucional', 3, 'interpretacao-constitucional', 'Interpretação constitucional', 35, '/materials/cfo-pmal/dias-01-39/d14-06-direito-constitucional-interpretacao.pdf', 14, 6)
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

-- 4 nivelamentos de 10 em TODAS as aulas CFO PMAL atuais.
with target_lessons as (
  select l.id as lesson_id
  from public.study_lessons l
  join public.study_subjects s on s.id=l.subject_id
  join public.study_plans p on p.id=s.plan_id
  where p.slug='cfo-pmal-2026' and p.active and s.active and l.active
),
stages as (
  select generate_series(1,4) as stage_number
)
insert into public.lesson_leveling_stages(lesson_id,stage_number,question_count,required_correct,active,updated_at)
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
      insert into public.lesson_leveling_settings(lesson_id,question_count,required_correct,active)
      select l.id,10,9,true
      from public.study_lessons l
      join public.study_subjects s on s.id=l.subject_id
      join public.study_plans p on p.id=s.plan_id
      where p.slug='cfo-pmal-2026' and p.active and s.active and l.active
      on conflict(lesson_id)
      do update set question_count=10,required_correct=9,active=true
    $compat$;
  end if;
end;
$$;

-- Blocos dos Dias 10 a 14: primeiras 3 aulas à tarde, últimas 3 à noite.
do $$
declare
  v_plan_id uuid;
  v_week2 uuid;
begin
  select id into v_plan_id from public.study_plans where slug='cfo-pmal-2026' limit 1;
  if v_plan_id is null then raise exception 'Plano cfo-pmal-2026 nao encontrado'; end if;

  select id into v_week2 from public.study_weeks where plan_id=v_plan_id and week_number=2 limit 1;
  if v_week2 is null then raise exception 'Semana 2 CFO PMAL nao encontrada'; end if;

  insert into public.study_schedule_blocks(week_id,study_date,daypart,start_time,end_time,title,optional,notes,position)
  values
    (v_week2,date '2026-09-11','afternoon',time '13:30',time '17:00','Dia 10 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week2,date '2026-09-11','evening',time '19:00',time '22:00','Dia 10 - Noite',false,'Aulas 4 a 6.',3),
    (v_week2,date '2026-09-12','afternoon',time '13:30',time '17:00','Dia 11 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week2,date '2026-09-12','evening',time '19:00',time '22:00','Dia 11 - Noite',false,'Aulas 4 a 6.',3),
    (v_week2,date '2026-09-13','afternoon',time '13:30',time '17:00','Dia 12 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week2,date '2026-09-13','evening',time '19:00',time '22:00','Dia 12 - Noite',false,'Aulas 4 a 6.',3),
    (v_week2,date '2026-09-14','afternoon',time '13:30',time '17:00','Dia 13 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week2,date '2026-09-14','evening',time '19:00',time '22:00','Dia 13 - Noite',false,'Aulas 4 a 6.',3),
    (v_week2,date '2026-09-15','afternoon',time '13:30',time '17:00','Dia 14 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week2,date '2026-09-15','evening',time '19:00',time '22:00','Dia 14 - Noite',false,'Aulas 4 a 6.',3)
  on conflict(week_id,study_date,daypart)
  do update set
    start_time=excluded.start_time,
    end_time=excluded.end_time,
    title=excluded.title,
    optional=false,
    notes=excluded.notes,
    position=excluded.position;

  delete from public.study_schedule_block_lessons bl
  using public.study_schedule_blocks b
  where bl.block_id=b.id
    and b.week_id=v_week2
    and b.study_date between date '2026-09-11' and date '2026-09-15';
end;
$$;

with p as (
  select id from public.study_plans where slug='cfo-pmal-2026'
),
data(study_date,daypart,subject_slug,lesson_slug,position) as (
  values
    ('2026-09-11','afternoon','portugues','compreensao-interpretacao-textos',1),
    ('2026-09-11','afternoon','legislacao-pmal','exclusao-servico-ativo-inatividade',2),
    ('2026-09-11','afternoon','processo-penal-militar','questoes-prejudiciais-excecoes',3),
    ('2026-09-11','evening','informatica','redes-computadores-fundamentos',1),
    ('2026-09-11','evening','direito-penal','crimes-contra-vida',2),
    ('2026-09-11','evening','portugues','classes-palavras',3),
    ('2026-09-12','afternoon','legislacao-pmal','remuneracao-promocao-uniformes',1),
    ('2026-09-12','afternoon','processo-penal-militar','incidentes-sanidade-mental-falsidade-documental',2),
    ('2026-09-12','afternoon','informatica','internet-intranet-servicos',3),
    ('2026-09-12','evening','direito-penal','lesoes-perigo-honra-liberdade-individual',1),
    ('2026-09-12','evening','portugues','sintaxe-oracao-termos-oracao',2),
    ('2026-09-12','evening','legislacao-pmal','agregacao-reversao-excedente',3),
    ('2026-09-13','afternoon','processo-penal-militar','medidas-preventivas-assecuratorias-coisas',1),
    ('2026-09-13','afternoon','informatica','navegadores-busca-pesquisa-internet',2),
    ('2026-09-13','afternoon','direito-penal','crimes-contra-patrimonio-i',3),
    ('2026-09-13','evening','legislacao-pmal','afastamentos-licencas-recompensas',1),
    ('2026-09-13','evening','processo-penal-militar','prisao-flagrante-militar',2),
    ('2026-09-13','evening','legislacao-pmal','tempo-servico-disposicoes-finais',3),
    ('2026-09-14','afternoon','legislacao-pmal','rdpmal-hierarquia-disciplina-etica',1),
    ('2026-09-14','afternoon','processo-penal-militar','prisao-preventiva-militar',2),
    ('2026-09-14','afternoon','portugues','coordenacao',3),
    ('2026-09-14','evening','informatica','correio-eletronico-grupos-redes-sociais',1),
    ('2026-09-14','evening','direito-constitucional','teoria-constituicao',2),
    ('2026-09-14','evening','direito-penal','crimes-contra-patrimonio-ii',3),
    ('2026-09-15','afternoon','legislacao-pmal','rdpmal-transgressoes-disciplinares',1),
    ('2026-09-15','afternoon','processo-penal-militar','liberdade-provisoria-menagem-providencias-pessoas',2),
    ('2026-09-15','afternoon','direito-constitucional','supremacia-aplicabilidade-normas-constitucionais',3),
    ('2026-09-15','evening','portugues','subordinacao',1),
    ('2026-09-15','evening','informatica','computacao-armazenamento-nuvem',2),
    ('2026-09-15','evening','direito-constitucional','interpretacao-constitucional',3)
)
insert into public.study_schedule_block_lessons(block_id,lesson_id,position)
select b.id,l.id,d.position
from data d
join public.study_subjects s on s.plan_id=(select id from p) and s.slug=d.subject_slug
join public.study_lessons l on l.subject_id=s.id and l.slug=d.lesson_slug
join public.study_schedule_blocks b
  on b.week_id=l.week_id and b.study_date=d.study_date::date and b.daypart=d.daypart
on conflict(block_id,lesson_id)
do update set position=excluded.position;

-- RELATORIO AO VIVO DO BANCO - DIAS 10 A 14.
-- Mostra exatamente quantas questoes ativas existem por aula e quantas ainda faltam para:
-- Portugues = 55 (15 principal + 40 nivelamentos); demais = 75 (35 + 40).
with target(subject_slug,lesson_slug,day_number,day_order) as (
  values
    ('portugues','compreensao-interpretacao-textos',10,1),
    ('legislacao-pmal','exclusao-servico-ativo-inatividade',10,2),
    ('processo-penal-militar','questoes-prejudiciais-excecoes',10,3),
    ('informatica','redes-computadores-fundamentos',10,4),
    ('direito-penal','crimes-contra-vida',10,5),
    ('portugues','classes-palavras',10,6),
    ('legislacao-pmal','remuneracao-promocao-uniformes',11,1),
    ('processo-penal-militar','incidentes-sanidade-mental-falsidade-documental',11,2),
    ('informatica','internet-intranet-servicos',11,3),
    ('direito-penal','lesoes-perigo-honra-liberdade-individual',11,4),
    ('portugues','sintaxe-oracao-termos-oracao',11,5),
    ('legislacao-pmal','agregacao-reversao-excedente',11,6),
    ('processo-penal-militar','medidas-preventivas-assecuratorias-coisas',12,1),
    ('informatica','navegadores-busca-pesquisa-internet',12,2),
    ('direito-penal','crimes-contra-patrimonio-i',12,3),
    ('legislacao-pmal','afastamentos-licencas-recompensas',12,4),
    ('processo-penal-militar','prisao-flagrante-militar',12,5),
    ('legislacao-pmal','tempo-servico-disposicoes-finais',12,6),
    ('legislacao-pmal','rdpmal-hierarquia-disciplina-etica',13,1),
    ('processo-penal-militar','prisao-preventiva-militar',13,2),
    ('portugues','coordenacao',13,3),
    ('informatica','correio-eletronico-grupos-redes-sociais',13,4),
    ('direito-constitucional','teoria-constituicao',13,5),
    ('direito-penal','crimes-contra-patrimonio-ii',13,6),
    ('legislacao-pmal','rdpmal-transgressoes-disciplinares',14,1),
    ('processo-penal-militar','liberdade-provisoria-menagem-providencias-pessoas',14,2),
    ('direito-constitucional','supremacia-aplicabilidade-normas-constitucionais',14,3),
    ('portugues','subordinacao',14,4),
    ('informatica','computacao-armazenamento-nuvem',14,5),
    ('direito-constitucional','interpretacao-constitucional',14,6)
),
counts as (
  select
    t.day_number,
    t.day_order,
    s.name as materia,
    l.title as assunto,
    l.question_count as principal_meta,
    count(q.id) filter (where q.active) as questoes_ativas,
    count(q.id) filter (where q.active and q.level=1) as nivel_1,
    count(q.id) filter (where q.active and q.level=2) as nivel_2,
    count(q.id) filter (where q.active and q.level=3) as nivel_3,
    count(q.id) filter (where q.active and q.level=4) as nivel_4,
    l.pdf_path,
    l.id as lesson_id
  from target t
  join public.study_plans p on p.slug='cfo-pmal-2026'
  join public.study_subjects s on s.plan_id=p.id and s.slug=t.subject_slug
  join public.study_lessons l on l.subject_id=s.id and l.slug=t.lesson_slug
  left join public.questions q on q.lesson_id=l.id
  group by t.day_number,t.day_order,s.name,l.title,l.question_count,l.pdf_path,l.id
)
select
  day_number as dia,
  day_order as ordem,
  materia,
  assunto,
  principal_meta,
  40 as nivelamentos_meta,
  principal_meta + 40 as meta_total,
  questoes_ativas,
  greatest((principal_meta + 40) - questoes_ativas,0) as faltam_total,
  nivel_1,
  greatest(10-nivel_1,0) as faltam_nivel_1,
  nivel_2,
  greatest(10-nivel_2,0) as faltam_nivel_2,
  nivel_3,
  greatest(10-nivel_3,0) as faltam_nivel_3,
  nivel_4,
  greatest(10-nivel_4,0) as faltam_nivel_4,
  pdf_path
from counts
order by day_number,day_order;

with target(subject_slug,lesson_slug) as (
  values
    ('portugues','compreensao-interpretacao-textos'),
    ('legislacao-pmal','exclusao-servico-ativo-inatividade'),
    ('processo-penal-militar','questoes-prejudiciais-excecoes'),
    ('informatica','redes-computadores-fundamentos'),
    ('direito-penal','crimes-contra-vida'),
    ('portugues','classes-palavras'),
    ('legislacao-pmal','remuneracao-promocao-uniformes'),
    ('processo-penal-militar','incidentes-sanidade-mental-falsidade-documental'),
    ('informatica','internet-intranet-servicos'),
    ('direito-penal','lesoes-perigo-honra-liberdade-individual'),
    ('portugues','sintaxe-oracao-termos-oracao'),
    ('legislacao-pmal','agregacao-reversao-excedente'),
    ('processo-penal-militar','medidas-preventivas-assecuratorias-coisas'),
    ('informatica','navegadores-busca-pesquisa-internet'),
    ('direito-penal','crimes-contra-patrimonio-i'),
    ('legislacao-pmal','afastamentos-licencas-recompensas'),
    ('processo-penal-militar','prisao-flagrante-militar'),
    ('legislacao-pmal','tempo-servico-disposicoes-finais'),
    ('legislacao-pmal','rdpmal-hierarquia-disciplina-etica'),
    ('processo-penal-militar','prisao-preventiva-militar'),
    ('portugues','coordenacao'),
    ('informatica','correio-eletronico-grupos-redes-sociais'),
    ('direito-constitucional','teoria-constituicao'),
    ('direito-penal','crimes-contra-patrimonio-ii'),
    ('legislacao-pmal','rdpmal-transgressoes-disciplinares'),
    ('processo-penal-militar','liberdade-provisoria-menagem-providencias-pessoas'),
    ('direito-constitucional','supremacia-aplicabilidade-normas-constitucionais'),
    ('portugues','subordinacao'),
    ('informatica','computacao-armazenamento-nuvem'),
    ('direito-constitucional','interpretacao-constitucional')
),
counts as (
  select
    l.question_count as principal_meta,
    count(q.id) filter(where q.active) as questoes_ativas
  from target t
  join public.study_plans p on p.slug='cfo-pmal-2026'
  join public.study_subjects s on s.plan_id=p.id and s.slug=t.subject_slug
  join public.study_lessons l on l.subject_id=s.id and l.slug=t.lesson_slug
  left join public.questions q on q.lesson_id=l.id
  group by l.id,l.question_count
)
select
  sum(principal_meta+40) as meta_total_dias_10_14,
  sum(questoes_ativas) as questoes_ativas_dias_10_14,
  sum(greatest((principal_meta+40)-questoes_ativas,0)) as faltam_dias_10_14
from counts;
