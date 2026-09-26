-- TITA V53 — Planos iniciais Soldado PMAL/PMPE + distribuição automática por carga diária.

alter table public.study_lessons
  add column if not exists question_list_enabled boolean not null default true;

insert into public.contests (slug,nome,sigla,logo_path,ativo)
values ('soldado-pmal','PMAL — Soldado','PMAL','/concursos/cfo-pmal/logo.png',true)
on conflict (slug) do update set
  nome=excluded.nome,
  sigla=excluded.sigla,
  logo_path=excluded.logo_path,
  ativo=true;

update public.contests
set nome='PMPE — Soldado', sigla='PMPE', ativo=true
where slug='pmpe';

insert into public.study_plans (contest_id,slug,name,is_default,active)
select id,'soldado-pmal-2026','PMAL — Soldado · Base Inicial 2026',true,true
from public.contests where slug='soldado-pmal'
on conflict (slug) do update set
  contest_id=excluded.contest_id,
  name=excluded.name,
  is_default=true,
  active=true;

insert into public.study_plans (contest_id,slug,name,is_default,active)
select id,'pmpe-soldado-base','PMPE — Soldado · Base Inicial',true,true
from public.contests where slug='pmpe'
on conflict (slug) do update set
  contest_id=excluded.contest_id,
  name=excluded.name,
  is_default=true,
  active=true;

insert into public.study_weeks(plan_id,week_number,title,position,active)
select id,1,'PMAL Soldado — Primeira base de 7 dias',1,true
from public.study_plans where slug='soldado-pmal-2026'
on conflict(plan_id,week_number) do update set title=excluded.title,position=1,active=true;

insert into public.study_weeks(plan_id,week_number,title,position,active)
select id,1,'PMPE Soldado — Primeira base de 7 dias',1,true
from public.study_plans where slug='pmpe-soldado-base'
on conflict(plan_id,week_number) do update set title=excluded.title,position=1,active=true;

-- Matriz PMAL Soldado conforme Edital PMAL 2026. Nesta primeira liberação só uma parte recebe aulas.
with p as (select id from public.study_plans where slug='soldado-pmal-2026'),
data(slug,short_name,name,description,position) as (
  values
  ('lingua-portuguesa','PORTUGUÊS','Língua Portuguesa','Conhecimentos básicos do edital de Soldado PMAL 2026.',1),
  ('matematica','MATEMÁTICA','Matemática','Álgebra linear, proporções, regra de três, porcentagem e juros.',2),
  ('informatica','INFORMÁTICA','Informática','Windows, Office, internet, nuvem, arquivos e segurança da informação.',3),
  ('conhecimentos-alagoas','ALAGOAS','Conhecimentos do Estado de Alagoas','História, geografia, economia, cultura e organização do Estado de Alagoas.',4),
  ('legislacao-pmal','LEGISLAÇÃO PMAL','Legislação Pertinente ao Policial Militar de Alagoas','Estatuto da PMAL e legislação especial indicada no edital.',5),
  ('direito-administrativo','D. ADM.','Noções de Direito Administrativo','Princípios, poderes, atos, serviços, licitações, bens, controle e responsabilidade estatal.',6),
  ('direito-constitucional','CONST.','Noções de Direito Constitucional','Direitos fundamentais, organização do Estado e defesa das instituições democráticas.',7),
  ('processo-penal','PROC. PENAL','Noções de Direito Processual Penal','Inquérito policial e ação penal.',8),
  ('direito-penal-militar','DPM','Noções de Direito Penal Militar','Aplicação da lei penal militar, crime, penas e crimes militares.',9),
  ('processo-penal-militar','PPM','Noções de Direito Processual Penal Militar','CPPM, polícia judiciária militar, IPM, ação penal e processos especiais.',10),
  ('direitos-humanos','DIREITOS HUMANOS','Noções de Direitos Humanos','Conceito, evolução, abrangência, proteção e Convenção Americana.',11),
  ('direito-penal','DIREITO PENAL','Parte Geral do Direito Penal','Conteúdo compatível com os Títulos I a III do Código Penal cobrados no edital.',12)
)
insert into public.study_subjects(plan_id,slug,short_name,name,description,position,active)
select p.id,d.slug,d.short_name,d.name,d.description,d.position,true from p cross join data d
on conflict(plan_id,slug) do update set
 short_name=excluded.short_name,name=excluded.name,description=excluded.description,position=excluded.position,active=true;

-- Matriz PMPE Soldado baseada no último edital para Praça da PMPE.
with p as (select id from public.study_plans where slug='pmpe-soldado-base'),
data(slug,short_name,name,description,position) as (
 values
 ('lingua-portuguesa','PORTUGUÊS','Língua Portuguesa','Português para Praça/Soldado PMPE.',1),
 ('historia-pernambuco','HISTÓRIA PE','História de Pernambuco','Ocupação, colonização, açúcar, presença holandesa, movimentos e cultura pernambucana.',2),
 ('raciocinio-logico','RAC. LÓGICO','Raciocínio Lógico','Estruturas lógicas, argumentação, diagramas, análise combinatória e probabilidade.',3),
 ('informatica','INFORMÁTICA','Informática','Windows, Office/LibreOffice, internet, arquivos, nuvem e ferramentas digitais.',4),
 ('direito-constitucional','CONST.','Direito Constitucional','Princípios, direitos fundamentais, organização do Estado, Administração e Poderes.',5),
 ('direitos-humanos-legislacao','DH + LEG.','Direitos Humanos e Legislação Extravagante','Direitos Humanos e legislação especial do edital de Praça PMPE.',6)
)
insert into public.study_subjects(plan_id,slug,short_name,name,description,position,active)
select p.id,d.slug,d.short_name,d.name,d.description,d.position,true from p cross join data d
on conflict(plan_id,slug) do update set
 short_name=excluded.short_name,name=excluded.name,description=excluded.description,position=excluded.position,active=true;

-- Pesos iniciais. O usuário ainda pode ajustar pelo onboarding/editor.
insert into public.subject_matrix_settings(subject_id,recommended_weight,minimum_weight,priority_score,incidence_score,theory_minutes,question_minutes,rest_minutes,notes)
select s.id,
  case
    when p.slug='soldado-pmal-2026' and s.slug in ('legislacao-pmal','direito-penal') then 1.25
    when p.slug='soldado-pmal-2026' and s.slug in ('lingua-portuguesa','processo-penal-militar') then 1.10
    else 1.00
  end,
  0.35,
  case when p.slug='soldado-pmal-2026' and s.slug='legislacao-pmal' then 90 else 70 end,
  70,50,30,20,
  case when p.slug='soldado-pmal-2026' then 'Matriz inicial baseada no Edital PMAL 2026.' else 'Matriz inicial baseada no último edital de Praça PMPE.' end
from public.study_subjects s
join public.study_plans p on p.id=s.plan_id
where p.slug in ('soldado-pmal-2026','pmpe-soldado-base')
on conflict(subject_id) do update set
 recommended_weight=excluded.recommended_weight,
 minimum_weight=excluded.minimum_weight,
 priority_score=excluded.priority_score,
 incidence_score=excluded.incidence_score,
 theory_minutes=excluded.theory_minutes,
 question_minutes=excluded.question_minutes,
 rest_minutes=excluded.rest_minutes,
 notes=excluded.notes,
 updated_at=now();

create temp table tmp_tita_v53_seed(
 target_plan_slug text not null,
 target_subject_slug text not null,
 target_lesson_slug text not null,
 target_title text,
 target_position integer not null,
 source_subject_slug text,
 source_lesson_slug text,
 custom_topic text
) on commit drop;

-- PMAL Soldado: 28 aulas = 7 dias no padrão de 4 aulas/dia; mesma base inicial do CFO, sem Inglês.
insert into tmp_tita_v53_seed values
('soldado-pmal-2026','legislacao-pmal','lei-5346-generalidades-conceituacao',null,1,'legislacao-pmal','lei-5346-generalidades-conceituacao',null),
('soldado-pmal-2026','legislacao-pmal','lei-5346-ingresso-hierarquia-disciplina',null,2,'legislacao-pmal','lei-5346-ingresso-hierarquia-disciplina',null),
('soldado-pmal-2026','lingua-portuguesa','tipologia-generos-textuais',null,1,'lingua-portuguesa','tipologia-generos-textuais',null),
('soldado-pmal-2026','lingua-portuguesa','ortografia-oficial',null,2,'lingua-portuguesa','ortografia-oficial',null),
('soldado-pmal-2026','processo-penal-militar','processo-penal-militar-aplicacao-cppm',null,1,'processo-penal-militar','processo-penal-militar-aplicacao-cppm',null),
('soldado-pmal-2026','processo-penal-militar','policia-judiciaria-militar',null,2,'processo-penal-militar','policia-judiciaria-militar',null),
('soldado-pmal-2026','informatica','windows-ambiente-interface-operacoes-basicas',null,1,'informatica','windows-ambiente-interface-operacoes-basicas',null),
('soldado-pmal-2026','informatica','arquivos-pastas-extensoes-organizacao-informacao',null,2,'informatica','arquivos-pastas-extensoes-organizacao-informacao',null),
('soldado-pmal-2026','direito-penal','aplicacao-lei-penal',null,1,'direito-penal','aplicacao-lei-penal',null),
('soldado-pmal-2026','direito-penal','teoria-crime-fato-tipico-conduta',null,2,'direito-penal','teoria-crime-fato-tipico-conduta',null),
('soldado-pmal-2026','conhecimentos-alagoas','formacao-historica-colonizacao-portuguesa',null,1,'conhecimentos-alagoas','formacao-historica-colonizacao-portuguesa',null),
('soldado-pmal-2026','conhecimentos-alagoas','economia-acucareira-formacao-social',null,2,'conhecimentos-alagoas','economia-acucareira-formacao-social',null),
('soldado-pmal-2026','legislacao-pmal','lei-5346-cargo-funcao-comando-subordinacao',null,3,'legislacao-pmal','lei-5346-cargo-funcao-comando-subordinacao',null),
('soldado-pmal-2026','legislacao-pmal','lei-5346-direitos-prerrogativas',null,4,'legislacao-pmal','lei-5346-direitos-prerrogativas',null),
('soldado-pmal-2026','lingua-portuguesa','coesao-referenciacao-conectores',null,3,'lingua-portuguesa','coesao-referenciacao-conectores',null),
('soldado-pmal-2026','lingua-portuguesa','verbos-tempos-modos-emprego-texto',null,4,'lingua-portuguesa','verbos-tempos-modos-emprego-texto',null),
('soldado-pmal-2026','conhecimentos-alagoas','emancipacao-pernambuco-elevacao-provincia',null,3,'conhecimentos-alagoas','emancipacao-pernambuco-elevacao-provincia',null),
('soldado-pmal-2026','informatica','microsoft-word',null,3,'informatica','microsoft-word',null),
('soldado-pmal-2026','informatica','microsoft-excel-estrutura-referencias',null,4,'informatica','microsoft-excel-estrutura-referencias',null),
('soldado-pmal-2026','conhecimentos-alagoas','quilombo-palmares',null,4,'conhecimentos-alagoas','quilombo-palmares',null),
('soldado-pmal-2026','conhecimentos-alagoas','regionalizacao-litoral-zona-mata-agreste-sertao',null,5,'conhecimentos-alagoas','regionalizacao-litoral-zona-mata-agreste-sertao',null),
('soldado-pmal-2026','processo-penal-militar','ipm-instauracao-desenvolvimento',null,3,'processo-penal-militar','ipm-instauracao-desenvolvimento',null),
('soldado-pmal-2026','processo-penal-militar','ipm-encerramento-arquivamento-valor-probatorio',null,4,'processo-penal-militar','ipm-encerramento-arquivamento-valor-probatorio',null),
('soldado-pmal-2026','direito-penal','dolo-culpa-erro-resultado-agravador',null,3,'direito-penal','dolo-culpa-erro-resultado-agravador',null),
('soldado-pmal-2026','direito-penal','iter-criminis-tentativa',null,4,'direito-penal','iter-criminis-tentativa',null),
('soldado-pmal-2026','direito-penal','ilicitude-excludentes',null,5,'direito-penal','ilicitude-excludentes',null),
('soldado-pmal-2026','legislacao-pmal','lei-5346-deveres-obrigacoes-etica',null,5,'legislacao-pmal','lei-5346-deveres-obrigacoes-etica',null),
('soldado-pmal-2026','legislacao-pmal','lei-5346-violacao-deveres-conselhos',null,6,'legislacao-pmal','lei-5346-violacao-deveres-conselhos',null);

-- PMPE Soldado: 28 aulas = 7 dias no padrão de 4 aulas/dia. Conteúdo comum reutiliza a base pronta; matérias novas entram sem lista até receberem banco próprio.
insert into tmp_tita_v53_seed values
('pmpe-soldado-base','lingua-portuguesa','compreensao-interpretacao-textos',null,1,'lingua-portuguesa','compreensao-interpretacao-textos',null),
('pmpe-soldado-base','lingua-portuguesa','tipologia-generos-textuais',null,2,'lingua-portuguesa','tipologia-generos-textuais',null),
('pmpe-soldado-base','lingua-portuguesa','ortografia-oficial',null,3,'lingua-portuguesa','ortografia-oficial',null),
('pmpe-soldado-base','lingua-portuguesa','coesao-referenciacao-conectores',null,4,'lingua-portuguesa','coesao-referenciacao-conectores',null),
('pmpe-soldado-base','lingua-portuguesa','verbos-tempos-modos-emprego-texto',null,5,'lingua-portuguesa','verbos-tempos-modos-emprego-texto',null),
('pmpe-soldado-base','historia-pernambuco','ocupacao-colonizacao-pernambuco','Ocupação, colonização e Capitanias Hereditárias',1,null,null,'Contatos iniciais, Capitanias Hereditárias e Duarte Coelho.'),
('pmpe-soldado-base','historia-pernambuco','acucar-olinda-recife','Açúcar, formação de Olinda e Recife',2,null,null,'Importância do açúcar e formação histórica de Olinda e Recife.'),
('pmpe-soldado-base','historia-pernambuco','presenca-holandesa-nassau','Presença holandesa e governo de Maurício de Nassau',3,null,null,'Domínio holandês e governo de Maurício de Nassau.'),
('pmpe-soldado-base','historia-pernambuco','movimentos-cultura-pernambuco','Movimentos de resistência e cultura pernambucana',4,null,null,'Insurreição, Mascates, 1817, Confederação do Equador, Praieira e cultura popular.'),
('pmpe-soldado-base','raciocinio-logico','proposicoes-conectivos','Proposições, conectivos e quantificadores',1,null,null,'Estruturas lógicas, proposições, conectivos e quantificadores.'),
('pmpe-soldado-base','raciocinio-logico','argumentacao-equivalencias','Argumentação, equivalências e implicações',2,null,null,'Inferências, deduções, equivalências e implicações lógicas.'),
('pmpe-soldado-base','raciocinio-logico','diagramas-logicos','Diagramas lógicos e conjuntos',3,null,null,'Diagramas, relações lógicas e representação por conjuntos.'),
('pmpe-soldado-base','raciocinio-logico','combinatoria-probabilidade','Análise combinatória e probabilidade',4,null,null,'Princípios de contagem, análise combinatória e probabilidade.'),
('pmpe-soldado-base','informatica','windows-ambiente-interface-operacoes-basicas',null,1,'informatica','windows-ambiente-interface-operacoes-basicas',null),
('pmpe-soldado-base','informatica','arquivos-pastas-extensoes-organizacao-informacao',null,2,'informatica','arquivos-pastas-extensoes-organizacao-informacao',null),
('pmpe-soldado-base','informatica','microsoft-word',null,3,'informatica','microsoft-word',null),
('pmpe-soldado-base','informatica','microsoft-excel-estrutura-referencias',null,4,'informatica','microsoft-excel-estrutura-referencias',null),
('pmpe-soldado-base','informatica','microsoft-excel-formulas-funcoes-graficos-analise',null,5,'informatica','microsoft-excel-formulas-funcoes-graficos-analise',null),
('pmpe-soldado-base','direito-constitucional','teoria-constituicao',null,1,'direito-constitucional','teoria-constituicao',null),
('pmpe-soldado-base','direito-constitucional','supremacia-aplicabilidade-normas-constitucionais',null,2,'direito-constitucional','supremacia-aplicabilidade-normas-constitucionais',null),
('pmpe-soldado-base','direito-constitucional','interpretacao-constitucional',null,3,'direito-constitucional','interpretacao-constitucional',null),
('pmpe-soldado-base','direito-constitucional','principios-fundamentais',null,4,'direito-constitucional','principios-fundamentais',null),
('pmpe-soldado-base','direito-constitucional','direitos-individuais-coletivos-i',null,5,'direito-constitucional','direitos-individuais-coletivos-i',null),
('pmpe-soldado-base','direitos-humanos-legislacao','conceito-direitos-humanos',null,1,'direitos-humanos','conceito-direitos-humanos',null),
('pmpe-soldado-base','direitos-humanos-legislacao','evolucao-direitos-humanos',null,2,'direitos-humanos','evolucao-direitos-humanos',null),
('pmpe-soldado-base','direitos-humanos-legislacao','abrangencia-direitos-humanos',null,3,'direitos-humanos','abrangencia-direitos-humanos',null),
('pmpe-soldado-base','direitos-humanos-legislacao','sistema-protecao-direitos-humanos',null,4,'direitos-humanos','sistema-protecao-direitos-humanos',null),
('pmpe-soldado-base','direitos-humanos-legislacao','legislacao-extravagante-base','Legislação extravagante — base inicial',5,null,null,'Abuso de autoridade, tortura, Maria da Penha, racismo, crimes ambientais, hediondos e Lei de Drogas.');

-- Cria/atualiza as aulas, copiando título/PDF/prioridade quando existe aula-base compatível no CFO PMAL.
insert into public.study_lessons(subject_id,week_id,slug,title,priority,position,question_count,pdf_path,active,question_list_enabled)
select
  ts.id,
  tw.id,
  seed.target_lesson_slug,
  coalesce(seed.target_title,src.title),
  coalesce(src.priority,'Alta'),
  seed.target_position,
  case when src.id is null then 1 else 35 end,
  src.pdf_path,
  true,
  (src.id is not null)
from tmp_tita_v53_seed seed
join public.study_plans tp on tp.slug=seed.target_plan_slug
join public.study_subjects ts on ts.plan_id=tp.id and ts.slug=seed.target_subject_slug
join public.study_weeks tw on tw.plan_id=tp.id and tw.week_number=1
left join public.study_plans sp on sp.slug='cfo-pmal-2026'
left join public.study_subjects ss on ss.plan_id=sp.id and ss.slug=seed.source_subject_slug
left join public.study_lessons src on src.subject_id=ss.id and src.slug=seed.source_lesson_slug
on conflict(subject_id,slug) do update set
 title=excluded.title,priority=excluded.priority,position=excluded.position,question_count=excluded.question_count,pdf_path=excluded.pdf_path,active=true,question_list_enabled=excluded.question_list_enabled;

create temp table tmp_tita_v53_lesson_map on commit drop as
select
 seed.*,
 tl.id target_lesson_id,
 src.id source_lesson_id
from tmp_tita_v53_seed seed
join public.study_plans tp on tp.slug=seed.target_plan_slug
join public.study_subjects ts on ts.plan_id=tp.id and ts.slug=seed.target_subject_slug
join public.study_lessons tl on tl.subject_id=ts.id and tl.slug=seed.target_lesson_slug
left join public.study_plans sp on sp.slug='cfo-pmal-2026'
left join public.study_subjects ss on ss.plan_id=sp.id and ss.slug=seed.source_subject_slug
left join public.study_lessons src on src.subject_id=ss.id and src.slug=seed.source_lesson_slug;

-- Copia os tópicos das aulas-base; nas matérias novas cria um tópico inicial descritivo.
insert into public.study_lesson_topics(lesson_id,topic,position)
select m.target_lesson_id,t.topic,t.position
from tmp_tita_v53_lesson_map m
join public.study_lesson_topics t on t.lesson_id=m.source_lesson_id
on conflict(lesson_id,position) do nothing;

insert into public.study_lesson_topics(lesson_id,topic,position)
select target_lesson_id,custom_topic,1
from tmp_tita_v53_lesson_map
where source_lesson_id is null and custom_topic is not null
on conflict(lesson_id,position) do update set topic=excluded.topic;

-- Clona até 50 questões reais por aula compatível, equilibrando os níveis existentes.
create temp table tmp_tita_v53_qmap(
 source_question_id uuid not null,
 new_question_id uuid not null,
 target_plan_id uuid not null,
 target_subject_id uuid not null,
 target_lesson_id uuid not null
) on commit drop;

insert into tmp_tita_v53_qmap(source_question_id,new_question_id,target_plan_id,target_subject_id,target_lesson_id)
select picked.id,gen_random_uuid(),tp.id,ts.id,m.target_lesson_id
from tmp_tita_v53_lesson_map m
join public.study_plans tp on tp.slug=m.target_plan_slug
join public.study_subjects ts on ts.plan_id=tp.id and ts.slug=m.target_subject_slug
cross join lateral (
  select ranked.id
  from (
    select q.id,q.level,row_number() over(partition by q.level order by q.id) as level_rank
    from public.questions q
    where q.lesson_id=m.source_lesson_id and q.active=true
  ) ranked
  order by ranked.level_rank,ranked.level,ranked.id
  limit 50
) picked
where m.source_lesson_id is not null
  and not exists (select 1 from public.questions existing where existing.lesson_id=m.target_lesson_id);

insert into public.questions(
 id,plan_id,subject_id,lesson_id,statement,question_type,choices,level,banca,ano,exam_name,source_code,active,created_by,created_at,updated_at,source_type,import_batch_id
)
select
 qm.new_question_id,qm.target_plan_id,qm.target_subject_id,qm.target_lesson_id,
 q.statement,q.question_type,q.choices,q.level,q.banca,q.ano,q.exam_name,q.source_code,true,q.created_by,now(),now(),q.source_type,q.import_batch_id
from tmp_tita_v53_qmap qm
join public.questions q on q.id=qm.source_question_id;

insert into public.question_keys(question_id,correct_answer,explanation,created_at,updated_at)
select qm.new_question_id,k.correct_answer,k.explanation,now(),now()
from tmp_tita_v53_qmap qm
join public.question_keys k on k.question_id=qm.source_question_id
on conflict(question_id) do nothing;

insert into public.lesson_leveling_settings(lesson_id,question_count,required_correct,active,updated_at)
select m.target_lesson_id,s.question_count,s.required_correct,s.active,now()
from tmp_tita_v53_lesson_map m
join public.lesson_leveling_settings s on s.lesson_id=m.source_lesson_id
where m.source_lesson_id is not null
on conflict(lesson_id) do update set question_count=excluded.question_count,required_correct=excluded.required_correct,active=excluded.active,updated_at=now();

insert into public.lesson_leveling_stages(lesson_id,stage_number,question_count,required_correct,active,updated_at)
select m.target_lesson_id,s.stage_number,s.question_count,s.required_correct,s.active,now()
from tmp_tita_v53_lesson_map m
join public.lesson_leveling_stages s on s.lesson_id=m.source_lesson_id
where m.source_lesson_id is not null
on conflict(lesson_id,stage_number) do update set question_count=excluded.question_count,required_correct=excluded.required_correct,active=excluded.active,updated_at=now();

-- Distribuição automática para TODO o sistema:
-- 2h–3h59 = 2 aulas/dia; 4h–5h59 = 3 aulas/dia; 6h+ = 4 aulas/dia.
create or replace function public.complete_dynamic_onboarding(
  p_contest_slug text,
  p_daily_minutes integer,
  p_weights jsonb default '{}'::jsonb,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_contest uuid;
  v_plan uuid;
  v_lessons_per_day integer;
  v_target integer:=1;
  v_actual integer:=1;
  v_day integer:=1;
  v_used integer:=0;
  v_pos integer:=0;
  v_est integer;
  v_total_lessons integer:=0;
  r record;
  v_weight numeric;
  v_recommended numeric;
  v_min numeric;
  v_date date;
  v_week integer;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  if p_daily_minutes<120 or p_daily_minutes>480 then raise exception 'Carga diária deve ficar entre 2 e 8 horas'; end if;

  select c.id into v_contest from public.contests c where c.slug=p_contest_slug and c.ativo=true;
  if v_contest is null then raise exception 'Concurso indisponível'; end if;

  select p.id into v_plan from public.study_plans p
  where p.contest_id=v_contest and p.active=true
  order by p.is_default desc,p.created_at limit 1;
  if v_plan is null then raise exception 'Este concurso ainda não possui matriz ativa'; end if;

  v_lessons_per_day:=case when p_daily_minutes<240 then 2 when p_daily_minutes<360 then 3 else 4 end;

  select count(*) into v_total_lessons
  from public.study_lessons l
  join public.study_subjects s on s.id=l.subject_id
  where s.plan_id=v_plan and s.active=true and l.active=true;

  v_target:=greatest(1,ceil(v_total_lessons::numeric/greatest(1,v_lessons_per_day*7))::integer);

  update public.profiles set
    focus_contest_id=v_contest,
    active_study_plan_id=v_plan,
    nome=coalesce(nullif(trim(p_name),''),nome),
    daily_study_minutes=p_daily_minutes,
    schedule_target_weeks=v_target,
    onboarding_completed_at=now(),
    schedule_generated_at=now()
  where id=v_user;

  delete from public.user_subject_preferences
  where user_id=v_user and subject_id in (select id from public.study_subjects where plan_id=v_plan);

  for r in
    select s.id,s.slug,coalesce(m.recommended_weight,1.0) rec,coalesce(m.minimum_weight,.35) minw
    from public.study_subjects s
    left join public.subject_matrix_settings m on m.subject_id=s.id
    where s.plan_id=v_plan and s.active=true
    order by s.position
  loop
    v_recommended:=r.rec; v_min:=r.minw;
    begin v_weight:=coalesce((p_weights->>r.slug)::numeric,v_recommended); exception when others then v_weight:=v_recommended; end;
    v_weight:=greatest(v_min,least(2.50,v_weight));
    insert into public.user_subject_preferences(user_id,subject_id,weight,recommended_weight)
    values(v_user,r.id,v_weight,v_recommended)
    on conflict(user_id,subject_id) do update set weight=excluded.weight,recommended_weight=excluded.recommended_weight,updated_at=now();
  end loop;

  delete from public.user_personal_schedule_items where user_id=v_user and plan_id=v_plan;

  v_est:=greatest(45,floor(p_daily_minutes::numeric/v_lessons_per_day)::integer);

  for r in
    select l.id lesson_id,l.subject_id,l.position lesson_position,s.position subject_position,
      coalesce(pref.weight,coalesce(m.recommended_weight,1.0)) weight,
      coalesce(m.priority_score,50) priority_score
    from public.study_lessons l
    join public.study_subjects s on s.id=l.subject_id
    left join public.subject_matrix_settings m on m.subject_id=s.id
    left join public.user_subject_preferences pref on pref.user_id=v_user and pref.subject_id=s.id
    where s.plan_id=v_plan and s.active=true and l.active=true
    order by (l.position::numeric/greatest(coalesce(pref.weight,m.recommended_weight,1.0),.10)),
      coalesce(m.priority_score,50) desc,s.position,l.position
  loop
    if v_used>=v_lessons_per_day then v_day:=v_day+1; v_used:=0; end if;
    v_pos:=v_pos+1;
    v_week:=((v_day-1)/7)+1;
    v_date:=current_date+(v_day-1);

    insert into public.user_personal_schedule_items(
      user_id,plan_id,subject_id,lesson_id,scheduled_for,study_day,week_number,position,estimated_minutes
    ) values(
      v_user,v_plan,r.subject_id,r.lesson_id,v_date,v_day,v_week,v_pos,v_est
    );

    v_used:=v_used+1;
    v_actual:=greatest(v_actual,v_week);
  end loop;

  update public.profiles set schedule_weeks=v_actual,schedule_generated_at=now() where id=v_user;

  return jsonb_build_object(
    'ok',true,'plan_id',v_plan,'target_weeks',v_target,'schedule_weeks',v_actual,
    'daily_minutes',p_daily_minutes,'lessons_per_day',v_lessons_per_day,'items',v_pos
  );
end
$$;

revoke all on function public.complete_dynamic_onboarding(text,integer,jsonb,text) from public;
grant execute on function public.complete_dynamic_onboarding(text,integer,jsonb,text) to authenticated;

-- Ao trocar de concurso, gera o cronograma automaticamente se o plano ainda não tiver agenda para o usuário.
create or replace function public.activate_study_contest(p_contest_slug text,p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_contest uuid;
  v_plan uuid;
  v_plan_slug text;
  v_existing integer:=0;
  v_pos integer:=0;
  v_minutes integer;
  r record;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;

  select c.id into v_contest from public.contests c where c.slug=p_contest_slug and c.ativo=true;
  if v_contest is null then raise exception 'Concurso/perfil indisponível'; end if;

  select p.id,p.slug into v_plan,v_plan_slug
  from public.study_plans p
  where p.contest_id=v_contest and p.active=true
  order by p.is_default desc,p.created_at
  limit 1;
  if v_plan is null then raise exception 'Este perfil ainda não possui matriz ativa'; end if;

  select coalesce(daily_study_minutes,360) into v_minutes from public.profiles where id=v_user;

  select count(*) into v_existing
  from public.user_personal_schedule_items
  where user_id=v_user and plan_id=v_plan;

  if v_plan_slug<>'enem-plano-40-dias' and v_existing=0 then
    return public.complete_dynamic_onboarding(
      p_contest_slug,
      greatest(120,least(480,coalesce(v_minutes,360))),
      '{}'::jsonb,
      p_name
    );
  end if;

  update public.profiles set
    focus_contest_id=v_contest,
    active_study_plan_id=v_plan,
    nome=coalesce(nullif(trim(p_name),''),nome),
    daily_study_minutes=case when v_plan_slug='enem-plano-40-dias' then coalesce(v_minutes,300) else daily_study_minutes end,
    schedule_target_weeks=case when v_plan_slug='enem-plano-40-dias' then 6 else schedule_target_weeks end,
    schedule_weeks=case when v_plan_slug='enem-plano-40-dias' then 6 else schedule_weeks end,
    onboarding_completed_at=coalesce(onboarding_completed_at,now())
  where id=v_user;

  if v_plan_slug='enem-plano-40-dias' then
    insert into public.user_subject_preferences(user_id,subject_id,weight,recommended_weight)
    select v_user,s.id,m.recommended_weight,m.recommended_weight
    from public.study_subjects s
    join public.subject_matrix_settings m on m.subject_id=s.id
    where s.plan_id=v_plan and s.active=true
    on conflict(user_id,subject_id) do update set recommended_weight=excluded.recommended_weight,updated_at=now();

    if v_existing=0 then
      for r in
        select l.id lesson_id,s.id subject_id,w.week_number study_day,l.position block_number,
          case when s.slug='matematica' then 90 when s.slug in('fisica','quimica','biologia') then 75 else 50 end estimated_minutes
        from public.study_lessons l
        join public.study_subjects s on s.id=l.subject_id
        join public.study_weeks w on w.id=l.week_id
        where s.plan_id=v_plan and s.active=true and l.active=true and w.active=true
        order by w.week_number,l.position
      loop
        v_pos:=v_pos+1;
        insert into public.user_personal_schedule_items(user_id,plan_id,subject_id,lesson_id,scheduled_for,study_day,week_number,position,estimated_minutes)
        values(v_user,v_plan,r.subject_id,r.lesson_id,current_date+(r.study_day-1),r.study_day,((r.study_day-1)/7)+1,v_pos,r.estimated_minutes)
        on conflict(user_id,lesson_id) do nothing;
      end loop;
      update public.profiles set schedule_generated_at=now() where id=v_user;
    end if;
  end if;

  return jsonb_build_object('ok',true,'contest_slug',p_contest_slug,'plan_id',v_plan,'plan_slug',v_plan_slug,'fixed_40_days',v_plan_slug='enem-plano-40-dias');
end
$$;

revoke all on function public.activate_study_contest(text,text) from public;
grant execute on function public.activate_study_contest(text,text) to authenticated;
