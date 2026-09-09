-- Mentoria Titã — CFO PMAL 2026 / Semana 1
-- 02/09/2026 a 09/09/2026 | 35 aulas-mãe
-- Português: lista 15; nivelamentos 1–4 com 4/5.
-- Demais matérias: lista 35; nivelamentos 1–4 com 9/10.
-- Revisões e nivelamentos NÃO entram como obrigação do cronograma semanal.

alter table public.study_weeks add column if not exists starts_on date;
alter table public.study_weeks add column if not exists ends_on date;

create table if not exists public.study_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.study_weeks(id) on delete cascade,
  study_date date not null,
  daypart text not null check (daypart in ('morning','afternoon','evening')),
  start_time time,
  end_time time,
  title text not null,
  optional boolean not null default false,
  notes text,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  unique (week_id, study_date, daypart)
);

create table if not exists public.study_schedule_block_lessons (
  block_id uuid not null references public.study_schedule_blocks(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  position integer not null default 1,
  primary key (block_id, lesson_id),
  unique (block_id, position)
);

alter table public.study_schedule_blocks enable row level security;
alter table public.study_schedule_block_lessons enable row level security;

drop policy if exists "Authenticated users read schedule blocks" on public.study_schedule_blocks;
create policy "Authenticated users read schedule blocks"
on public.study_schedule_blocks for select to authenticated using (true);

drop policy if exists "Authenticated users read schedule block lessons" on public.study_schedule_block_lessons;
create policy "Authenticated users read schedule block lessons"
on public.study_schedule_block_lessons for select to authenticated using (true);

create table if not exists public.lesson_leveling_stages (
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  stage_number integer not null check (stage_number between 1 and 4),
  question_count integer not null check (question_count between 1 and 50),
  required_correct integer not null check (required_correct between 1 and question_count),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, stage_number)
);

alter table public.lesson_leveling_stages enable row level security;

grant select on public.study_schedule_blocks to authenticated;
grant select on public.study_schedule_block_lessons to authenticated;
grant select, insert, update, delete on public.lesson_leveling_stages to authenticated;

drop policy if exists "Authenticated users read leveling stages" on public.lesson_leveling_stages;
create policy "Authenticated users read leveling stages"
on public.lesson_leveling_stages for select to authenticated using (true);

drop policy if exists "Admins manage leveling stages" on public.lesson_leveling_stages;
create policy "Admins manage leveling stages"
on public.lesson_leveling_stages for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.contests (slug, nome, sigla, logo_path, ativo)
values ('cfo-pmal', 'CFO PMAL 2026', 'CFO PMAL', '/concursos/cfo-pmal/logo.png', true)
on conflict (slug) do update
set nome = excluded.nome,
    sigla = excluded.sigla,
    logo_path = excluded.logo_path,
    ativo = true;

update public.study_plans
set is_default = false
where contest_id = (select id from public.contests where slug = 'cfo-pmal');

insert into public.study_plans (contest_id, slug, name, is_default, active)
select id, 'cfo-pmal-2026', 'CFO PMAL 2026', true, true
from public.contests where slug = 'cfo-pmal'
on conflict (slug) do update
set contest_id = excluded.contest_id,
    name = excluded.name,
    is_default = true,
    active = true;

insert into public.study_weeks (plan_id, week_number, title, position, starts_on, ends_on, active)
select id, 1, 'CFO PMAL — Semana 1', 1, date '2026-09-02', date '2026-09-09', true
from public.study_plans where slug = 'cfo-pmal-2026'
on conflict (plan_id, week_number) do update
set title = excluded.title,
    position = 1,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    active = true;

-- Se alguém já estiver com CFO PMAL como foco, aponta imediatamente para o plano novo.
update public.profiles
set active_study_plan_id = (select id from public.study_plans where slug = 'cfo-pmal-2026')
where focus_contest_id = (select id from public.contests where slug = 'cfo-pmal');

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
data(slug, short_name, name, description, position) as (
  values
  ('legislacao-pmal', 'LEGISLAÇÃO PMAL', 'Legislação PMAL', 'Lei Estadual nº 5.346/1992 e normas institucionais da PMAL.', 1),
('processo-penal-militar', 'PPM', 'Processo Penal Militar', 'Fundamentos do processo penal militar e do CPPM.', 2),
('lingua-portuguesa', 'PORTUGUÊS', 'Língua Portuguesa', 'Conteúdos linguísticos da semana, sem compreensão e interpretação de textos.', 3),
('informatica', 'INFORMÁTICA', 'Informática', 'Windows, organização da informação e Microsoft Office.', 4),
('conhecimentos-alagoas', 'ALAGOAS', 'Conhecimentos do Estado de Alagoas', 'História, formação social e geografia do Estado de Alagoas.', 5),
('direito-penal', 'DIREITO PENAL', 'Direito Penal', 'Parte geral do Direito Penal com foco em teoria do crime.', 6)
)
insert into public.study_subjects(plan_id, slug, short_name, name, description, position, active)
select p.id, d.slug, d.short_name, d.name, d.description, d.position, true
from p cross join data d
on conflict (plan_id, slug) do update
set short_name = excluded.short_name,
    name = excluded.name,
    description = excluded.description,
    position = excluded.position,
    active = true;

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
w as (
  select sw.id from public.study_weeks sw join p on p.id = sw.plan_id where sw.week_number = 1
),
data(subject_slug, position, lesson_slug, title, question_count) as (
  values
  ('legislacao-pmal', 1, 'lei-5346-generalidades-conceituacao', 'Lei Estadual nº 5.346/1992: generalidades e conceituação', 35),
('legislacao-pmal', 2, 'lei-5346-ingresso-hierarquia-disciplina', 'Lei Estadual nº 5.346/1992: ingresso, hierarquia e disciplina', 35),
('legislacao-pmal', 3, 'lei-5346-cargo-funcao-comando-subordinacao', 'Lei Estadual nº 5.346/1992: cargo, função, comando e subordinação', 35),
('legislacao-pmal', 4, 'lei-5346-direitos-prerrogativas', 'Lei Estadual nº 5.346/1992: direitos e prerrogativas', 35),
('legislacao-pmal', 5, 'lei-5346-deveres-obrigacoes-etica', 'Lei Estadual nº 5.346/1992: deveres, obrigações e ética', 35),
('legislacao-pmal', 6, 'lei-5346-violacao-deveres-conselhos', 'Lei Estadual nº 5.346/1992: violação de deveres e conselhos', 35),
('legislacao-pmal', 7, 'lei-5346-ausente-desertor-desaparecido-extraviado', 'Lei Estadual nº 5.346/1992: ausente, desertor, desaparecido e extraviado', 35),
('processo-penal-militar', 1, 'processo-penal-militar-aplicacao-cppm', 'Processo penal militar e aplicação do CPPM', 35),
('processo-penal-militar', 2, 'policia-judiciaria-militar', 'Polícia judiciária militar', 35),
('processo-penal-militar', 3, 'ipm-instauracao-desenvolvimento', 'Inquérito policial militar: instauração e desenvolvimento', 35),
('processo-penal-militar', 4, 'ipm-encerramento-arquivamento-valor-probatorio', 'IPM: encerramento, arquivamento e valor probatório', 35),
('processo-penal-militar', 5, 'acao-penal-militar', 'Ação penal militar', 35),
('processo-penal-militar', 6, 'processo-juiz-auxiliares-partes', 'Processo, juiz, auxiliares e partes', 35),
('lingua-portuguesa', 2, 'tipologia-generos-textuais', 'Tipologia e gêneros textuais', 15),
('lingua-portuguesa', 3, 'ortografia-oficial', 'Ortografia oficial', 15),
('lingua-portuguesa', 4, 'coesao-referenciacao-conectores', 'Coesão textual, referenciação e conectores', 15),
('lingua-portuguesa', 5, 'verbos-tempos-modos-emprego-texto', 'Verbos: tempos, modos e emprego no texto', 15),
('informatica', 1, 'windows-ambiente-interface-operacoes-basicas', 'Windows: ambiente, interface e operações básicas', 35),
('informatica', 2, 'arquivos-pastas-extensoes-organizacao-informacao', 'Arquivos, pastas, extensões e organização da informação', 35),
('informatica', 3, 'microsoft-word', 'Microsoft Word', 35),
('informatica', 4, 'microsoft-excel-estrutura-referencias', 'Microsoft Excel: estrutura e referências', 35),
('informatica', 5, 'microsoft-excel-formulas-funcoes-graficos-analise', 'Microsoft Excel: fórmulas, funções, gráficos e análise', 35),
('informatica', 6, 'microsoft-powerpoint', 'Microsoft PowerPoint', 35),
('conhecimentos-alagoas', 1, 'formacao-historica-colonizacao-portuguesa', 'Formação histórica e colonização portuguesa', 35),
('conhecimentos-alagoas', 2, 'economia-acucareira-formacao-social', 'Economia açucareira e formação social', 35),
('conhecimentos-alagoas', 3, 'emancipacao-pernambuco-elevacao-provincia', 'Emancipação de Pernambuco e elevação à Província', 35),
('conhecimentos-alagoas', 4, 'quilombo-palmares', 'Quilombo dos Palmares', 35),
('conhecimentos-alagoas', 5, 'regionalizacao-litoral-zona-mata-agreste-sertao', 'Regionalização geográfica: litoral, Zona da Mata, Agreste e Sertão', 35),
('conhecimentos-alagoas', 6, 'rio-sao-francisco-territorio-alagoano', 'Rio São Francisco e território alagoano', 35),
('direito-penal', 1, 'aplicacao-lei-penal', 'Aplicação da lei penal', 35),
('direito-penal', 2, 'teoria-crime-fato-tipico-conduta', 'Teoria do crime: fato típico e conduta', 35),
('direito-penal', 3, 'dolo-culpa-erro-resultado-agravador', 'Dolo, culpa, erro e resultado agravador', 35),
('direito-penal', 4, 'iter-criminis-tentativa', 'Iter criminis e tentativa', 35),
('direito-penal', 5, 'ilicitude-excludentes', 'Ilicitude e excludentes', 35),
('direito-penal', 6, 'imputabilidade-penal', 'Imputabilidade penal', 35)
)
insert into public.study_lessons(subject_id, week_id, slug, title, priority, position, question_count, active)
select s.id, w.id, d.lesson_slug, d.title, null, d.position, d.question_count, true
from data d
join public.study_subjects s on s.plan_id = (select id from p) and s.slug = d.subject_slug
cross join w
on conflict (subject_id, slug) do update
set week_id = excluded.week_id,
    title = excluded.title,
    position = excluded.position,
    question_count = excluded.question_count,
    active = true;

delete from public.study_lesson_topics
where lesson_id in (
  select l.id
  from public.study_lessons l
  join public.study_subjects s on s.id = l.subject_id
  join public.study_plans p on p.id = s.plan_id
  where p.slug = 'cfo-pmal-2026'
);

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
data(subject_slug, lesson_slug, position, topic) as (
  values
  ('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 1, 'Finalidade do Estatuto — art. 1º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 2, 'Natureza, missão e subordinação da PMAL — art. 2º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 3, 'Policiais militares de carreira e temporários — art. 3º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 4, 'Serviço e carreira policial militar — arts. 4º e 5º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 5, 'Polícia ostensiva, ordem pública e serviço ativo — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 6, 'Posto, graduação e precedência — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 7, 'Cargo e função — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 8, 'Hierarquia e disciplina — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 9, 'Matrícula e nomeação — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 10, 'PM temporário, serviço temporário, comissionado, efetivação e interinidade — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 11, 'Legislação básica, peculiar e específica — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 12, 'Ausente, deserção, desaparecido/extraviado e OPM — art. 6º'),
('legislacao-pmal', 'lei-5346-generalidades-conceituacao', 13, 'Expressões equivalentes de serviço ativo — parágrafo único do art. 6º'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 1, 'Regra geral e condições de ingresso — arts. 7º e 8º'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 2, 'Idade, altura e requisitos do CFO PMAL 2026'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 3, 'Formação, serviço temporário, comissionamento e efetivação — art. 8º'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 4, 'Hierarquia e disciplina — arts. 9º e 10'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 5, 'Círculos e escala hierárquica — art. 11'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 6, 'Praças Especiais — art. 11'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 7, 'Precedência e antiguidade — arts. 12 e 13'),
('legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 8, 'Precedência do Aspirante a Oficial e do Cadete — art. 14'),
('legislacao-pmal', 'lei-5346-cargo-funcao-comando-subordinacao', 1, 'Lei Estadual nº 5.346/1992: cargo, função, comando e subordinação'),
('legislacao-pmal', 'lei-5346-direitos-prerrogativas', 1, 'Lei Estadual nº 5.346/1992: direitos e prerrogativas'),
('legislacao-pmal', 'lei-5346-deveres-obrigacoes-etica', 1, 'Lei Estadual nº 5.346/1992: deveres, obrigações e ética'),
('legislacao-pmal', 'lei-5346-violacao-deveres-conselhos', 1, 'Lei Estadual nº 5.346/1992: violação de deveres e conselhos'),
('legislacao-pmal', 'lei-5346-ausente-desertor-desaparecido-extraviado', 1, 'Lei Estadual nº 5.346/1992: ausente, desertor, desaparecido e extraviado'),
('processo-penal-militar', 'processo-penal-militar-aplicacao-cppm', 1, 'Processo penal militar e aplicação do CPPM'),
('processo-penal-militar', 'policia-judiciaria-militar', 1, 'Polícia judiciária militar'),
('processo-penal-militar', 'ipm-instauracao-desenvolvimento', 1, 'Inquérito policial militar: instauração e desenvolvimento'),
('processo-penal-militar', 'ipm-encerramento-arquivamento-valor-probatorio', 1, 'IPM: encerramento, arquivamento e valor probatório'),
('processo-penal-militar', 'acao-penal-militar', 1, 'Ação penal militar'),
('processo-penal-militar', 'processo-juiz-auxiliares-partes', 1, 'Processo, juiz, auxiliares e partes'),
('lingua-portuguesa', 'tipologia-generos-textuais', 1, 'Narração, descrição, exposição, argumentação e injunção'),
('lingua-portuguesa', 'tipologia-generos-textuais', 2, 'Diferença entre tipo textual e gênero textual'),
('lingua-portuguesa', 'tipologia-generos-textuais', 3, 'Notícia, reportagem, crônica, artigo de opinião, editorial, entrevista e resenha'),
('lingua-portuguesa', 'tipologia-generos-textuais', 4, 'Conto, parábola, carta/e-mail, edital, manual, receita, anúncio/publicidade e verbete'),
('lingua-portuguesa', 'tipologia-generos-textuais', 5, 'Narração x descrição e predominância global'),
('lingua-portuguesa', 'tipologia-generos-textuais', 6, 'Exposição x argumentação'),
('lingua-portuguesa', 'tipologia-generos-textuais', 7, 'Parábola, edital e crônica: gênero x tipo'),
('lingua-portuguesa', 'tipologia-generos-textuais', 8, 'Sequências textuais secundárias dentro do mesmo gênero'),
('lingua-portuguesa', 'ortografia-oficial', 1, 'Ortografia oficial'),
('lingua-portuguesa', 'coesao-referenciacao-conectores', 1, 'Coesão textual, referenciação e conectores'),
('lingua-portuguesa', 'verbos-tempos-modos-emprego-texto', 1, 'Verbos: tempos, modos e emprego no texto'),
('informatica', 'windows-ambiente-interface-operacoes-basicas', 1, 'Windows: ambiente, interface e operações básicas'),
('informatica', 'arquivos-pastas-extensoes-organizacao-informacao', 1, 'Arquivos, pastas, extensões e organização da informação'),
('informatica', 'microsoft-word', 1, 'Microsoft Word'),
('informatica', 'microsoft-excel-estrutura-referencias', 1, 'Microsoft Excel: estrutura e referências'),
('informatica', 'microsoft-excel-formulas-funcoes-graficos-analise', 1, 'Microsoft Excel: fórmulas, funções, gráficos e análise'),
('informatica', 'microsoft-powerpoint', 1, 'Microsoft PowerPoint'),
('conhecimentos-alagoas', 'formacao-historica-colonizacao-portuguesa', 1, 'Formação histórica e colonização portuguesa'),
('conhecimentos-alagoas', 'economia-acucareira-formacao-social', 1, 'Economia açucareira e formação social'),
('conhecimentos-alagoas', 'emancipacao-pernambuco-elevacao-provincia', 1, 'Emancipação de Pernambuco e elevação à Província'),
('conhecimentos-alagoas', 'quilombo-palmares', 1, 'Quilombo dos Palmares'),
('conhecimentos-alagoas', 'regionalizacao-litoral-zona-mata-agreste-sertao', 1, 'Regionalização geográfica: litoral, Zona da Mata, Agreste e Sertão'),
('conhecimentos-alagoas', 'rio-sao-francisco-territorio-alagoano', 1, 'Rio São Francisco e território alagoano'),
('direito-penal', 'aplicacao-lei-penal', 1, 'Aplicação da lei penal'),
('direito-penal', 'teoria-crime-fato-tipico-conduta', 1, 'Teoria do crime: fato típico e conduta'),
('direito-penal', 'dolo-culpa-erro-resultado-agravador', 1, 'Dolo, culpa, erro e resultado agravador'),
('direito-penal', 'iter-criminis-tentativa', 1, 'Iter criminis e tentativa'),
('direito-penal', 'ilicitude-excludentes', 1, 'Ilicitude e excludentes'),
('direito-penal', 'imputabilidade-penal', 1, 'Imputabilidade penal')
)
insert into public.study_lesson_topics(lesson_id, topic, position)
select l.id, d.topic, d.position
from data d
join public.study_subjects s on s.plan_id = (select id from p) and s.slug = d.subject_slug
join public.study_lessons l on l.subject_id = s.id and l.slug = d.lesson_slug;

delete from public.study_schedule_blocks
where week_id = (
  select w.id
  from public.study_weeks w
  join public.study_plans p on p.id = w.plan_id
  where p.slug = 'cfo-pmal-2026' and w.week_number = 1
);

with w as (
  select sw.id
  from public.study_weeks sw
  join public.study_plans p on p.id = sw.plan_id
  where p.slug = 'cfo-pmal-2026' and sw.week_number = 1
),
data(study_date, daypart, start_time, end_time, title, optional, notes, position) as (
  values
  ('2026-09-02', 'morning', '09:00', '11:00', 'Trabalho — sem estudo obrigatório', true, 'Manhã reservada ao trabalho. Não conta para a conclusão da semana.', 1),
('2026-09-02', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-02', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3),
('2026-09-03', 'morning', '09:00', '11:00', 'Bloco opcional — Adiantamento / Pendências', true, 'Pode ser usado para adiantar aulas, finalizar questões, antecipar a primeira aula do dia seguinte ou recuperar atraso. Não conta como obrigatório.', 1),
('2026-09-03', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-03', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3),
('2026-09-04', 'morning', '09:00', '11:00', 'Bloco opcional — Adiantamento / Pendências', true, 'Pode ser usado para adiantar aulas, finalizar questões, antecipar a primeira aula do dia seguinte ou recuperar atraso. Não conta como obrigatório.', 1),
('2026-09-04', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-04', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3),
('2026-09-05', 'morning', '09:00', '11:00', 'Bloco opcional — Adiantamento / Pendências', true, 'Pode ser usado para adiantar aulas, finalizar questões, antecipar a primeira aula do dia seguinte ou recuperar atraso. Não conta como obrigatório.', 1),
('2026-09-05', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-05', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3),
('2026-09-06', 'morning', '09:00', '11:00', 'Bloco opcional — Adiantamento / Pendências', true, 'Pode ser usado para adiantar aulas, finalizar questões, antecipar a primeira aula do dia seguinte ou recuperar atraso. Não conta como obrigatório.', 1),
('2026-09-06', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-06', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3),
('2026-09-07', 'morning', '09:00', '11:00', 'Bloco opcional — Adiantamento / Pendências', true, 'Pode ser usado para adiantar aulas, finalizar questões, antecipar a primeira aula do dia seguinte ou recuperar atraso. Não conta como obrigatório.', 1),
('2026-09-07', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-07', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3),
('2026-09-08', 'morning', '09:00', '11:00', 'Bloco opcional — Adiantamento / Pendências', true, 'Pode ser usado para adiantar aulas, finalizar questões, antecipar a primeira aula do dia seguinte ou recuperar atraso. Não conta como obrigatório.', 1),
('2026-09-08', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-08', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3),
('2026-09-09', 'morning', '09:00', '11:00', 'Bloco opcional — Adiantamento / Pendências', true, 'Pode ser usado para adiantar aulas, finalizar questões, antecipar a primeira aula do dia seguinte ou recuperar atraso. Não conta como obrigatório.', 1),
('2026-09-09', 'afternoon', '13:30', '17:00', 'Bloco principal — Tarde', false, 'Teoria + lista principal de questões. O objetivo é concluir o conteúdo, sem rigidez artificial de minutos por aula.', 2),
('2026-09-09', 'evening', '19:00', '22:00', 'Bloco principal — Noite', false, 'Teoria + lista principal de questões. Conteúdos relacionados podem ser estudados em sequência no mesmo bloco.', 3)
)
insert into public.study_schedule_blocks(week_id, study_date, daypart, start_time, end_time, title, optional, notes, position)
select w.id, d.study_date::date, d.daypart, d.start_time::time, d.end_time::time, d.title, d.optional, d.notes, d.position
from w cross join data d;

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
w as (
  select sw.id from public.study_weeks sw join p on p.id = sw.plan_id where sw.week_number = 1
),
data(study_date, daypart, subject_slug, lesson_slug, position) as (
  values
  ('2026-09-02', 'afternoon', 'legislacao-pmal', 'lei-5346-generalidades-conceituacao', 1),
('2026-09-02', 'afternoon', 'legislacao-pmal', 'lei-5346-ingresso-hierarquia-disciplina', 2),
('2026-09-02', 'evening', 'lingua-portuguesa', 'tipologia-generos-textuais', 1),
('2026-09-02', 'evening', 'lingua-portuguesa', 'ortografia-oficial', 2),
('2026-09-03', 'afternoon', 'processo-penal-militar', 'processo-penal-militar-aplicacao-cppm', 1),
('2026-09-03', 'afternoon', 'processo-penal-militar', 'policia-judiciaria-militar', 2),
('2026-09-03', 'evening', 'informatica', 'windows-ambiente-interface-operacoes-basicas', 1),
('2026-09-03', 'evening', 'informatica', 'arquivos-pastas-extensoes-organizacao-informacao', 2),
('2026-09-04', 'afternoon', 'direito-penal', 'aplicacao-lei-penal', 1),
('2026-09-04', 'afternoon', 'direito-penal', 'teoria-crime-fato-tipico-conduta', 2),
('2026-09-04', 'evening', 'conhecimentos-alagoas', 'formacao-historica-colonizacao-portuguesa', 1),
('2026-09-04', 'evening', 'conhecimentos-alagoas', 'economia-acucareira-formacao-social', 2),
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
('2026-09-07', 'evening', 'direito-penal', 'iter-criminis-tentativa', 2),
('2026-09-07', 'evening', 'direito-penal', 'ilicitude-excludentes', 3),
('2026-09-08', 'afternoon', 'legislacao-pmal', 'lei-5346-deveres-obrigacoes-etica', 1),
('2026-09-08', 'afternoon', 'legislacao-pmal', 'lei-5346-violacao-deveres-conselhos', 2),
('2026-09-08', 'afternoon', 'legislacao-pmal', 'lei-5346-ausente-desertor-desaparecido-extraviado', 3),
('2026-09-08', 'evening', 'informatica', 'microsoft-excel-formulas-funcoes-graficos-analise', 1),
('2026-09-08', 'evening', 'informatica', 'microsoft-powerpoint', 2),
('2026-09-09', 'afternoon', 'processo-penal-militar', 'acao-penal-militar', 1),
('2026-09-09', 'afternoon', 'processo-penal-militar', 'processo-juiz-auxiliares-partes', 2),
('2026-09-09', 'evening', 'conhecimentos-alagoas', 'rio-sao-francisco-territorio-alagoano', 1),
('2026-09-09', 'evening', 'direito-penal', 'imputabilidade-penal', 2)
)
insert into public.study_schedule_block_lessons(block_id, lesson_id, position)
select b.id, l.id, d.position
from data d
join public.study_schedule_blocks b
  on b.week_id = (select id from w)
 and b.study_date = d.study_date::date
 and b.daypart = d.daypart
join public.study_subjects s on s.plan_id = (select id from p) and s.slug = d.subject_slug
join public.study_lessons l on l.subject_id = s.id and l.slug = d.lesson_slug
on conflict (block_id, lesson_id) do update
set position = excluded.position;

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
lesson_data as (
  select l.id as lesson_id, s.slug as subject_slug
  from public.study_lessons l
  join public.study_subjects s on s.id = l.subject_id
  where s.plan_id = (select id from p)
),
stages as (
  select generate_series(1,4) as stage_number
)
insert into public.lesson_leveling_stages(lesson_id, stage_number, question_count, required_correct, active)
select ld.lesson_id,
       st.stage_number,
       case when ld.subject_slug = 'lingua-portuguesa' then 5 else 10 end,
       case when ld.subject_slug = 'lingua-portuguesa' then 4 else 9 end,
       true
from lesson_data ld cross join stages st
on conflict (lesson_id, stage_number) do update
set question_count = excluded.question_count,
    required_correct = excluded.required_correct,
    active = true,
    updated_at = now();

do $$
begin
  if to_regclass('public.lesson_leveling_settings') is not null then
    execute $sql$
      insert into public.lesson_leveling_settings(lesson_id, question_count, required_correct, active)
      select l.id,
             case when s.slug = 'lingua-portuguesa' then 5 else 10 end,
             case when s.slug = 'lingua-portuguesa' then 4 else 9 end,
             true
      from public.study_lessons l
      join public.study_subjects s on s.id = l.subject_id
      join public.study_plans p on p.id = s.plan_id
      where p.slug = 'cfo-pmal-2026'
      on conflict (lesson_id) do update
      set question_count = excluded.question_count,
          required_correct = excluded.required_correct,
          active = true
    $sql$;
  end if;
end;
$$;

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
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  select id into v_contest_id
  from public.contests
  where slug = p_contest_slug and ativo = true;

  if v_contest_id is null then raise exception 'Concurso inválido ou inativo'; end if;

  select id into v_plan_id
  from public.study_plans
  where contest_id = v_contest_id and active = true
  order by is_default desc, created_at asc
  limit 1;

  update public.profiles
  set focus_contest_id = v_contest_id,
      active_study_plan_id = v_plan_id
  where id = v_user_id;

  if not found then raise exception 'Perfil não encontrado'; end if;
end;
$$;

revoke all on function public.set_focus_contest(text) from public;
grant execute on function public.set_focus_contest(text) to authenticated;

create or replace function public.admin_leveling_stage_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador'; end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.plan_name, x.subject_position, x.lesson_position, x.stage_number), '[]'::jsonb)
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
        st.stage_number,
        st.question_count,
        st.required_correct,
        st.active,
        count(q.id) filter (where q.active) as available_questions
      from public.study_lessons l
      join public.study_subjects s on s.id = l.subject_id
      join public.study_plans p on p.id = s.plan_id
      join public.lesson_leveling_stages st on st.lesson_id = l.id
      left join public.questions q on q.lesson_id = l.id
      where p.active = true and l.active = true and s.active = true
      group by p.id,p.name,s.id,s.name,s.position,l.id,l.title,l.position,
               st.stage_number,st.question_count,st.required_correct,st.active
    ) x
  );
end;
$$;

revoke all on function public.admin_leveling_stage_catalog() from public;
grant execute on function public.admin_leveling_stage_catalog() to authenticated;

create or replace function public.admin_upsert_leveling_stage(
  p_lesson_id uuid,
  p_stage_number integer,
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
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador'; end if;
  if p_stage_number not between 1 and 4 then raise exception 'Nivelamento deve ficar entre 1 e 4'; end if;
  if p_question_count not between 1 and 50 then raise exception 'Quantidade de questões inválida'; end if;
  if p_required_correct not between 1 and p_question_count then raise exception 'Meta de acertos inválida'; end if;

  insert into public.lesson_leveling_stages(lesson_id, stage_number, question_count, required_correct, active, updated_at)
  values(p_lesson_id,p_stage_number,p_question_count,p_required_correct,p_active,now())
  on conflict(lesson_id,stage_number) do update
  set question_count=excluded.question_count,
      required_correct=excluded.required_correct,
      active=excluded.active,
      updated_at=now();
end;
$$;

revoke all on function public.admin_upsert_leveling_stage(uuid,integer,integer,integer,boolean) from public;
grant execute on function public.admin_upsert_leveling_stage(uuid,integer,integer,integer,boolean) to authenticated;

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
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  select * into v_revision
  from public.user_revisions
  where id = p_revision_id and user_id = v_user_id;

  if v_revision.id is null then raise exception 'Revisão não encontrada'; end if;

  select question_count, required_correct
  into v_count, v_required
  from public.lesson_leveling_stages
  where lesson_id = v_revision.lesson_id
    and stage_number = least(greatest(v_revision.revision_number,1),4)
    and active = true;

  if v_count is null then v_count := 10; end if;
  if v_required is null then v_required := least(9,v_count); end if;

  select count(*) into v_available
  from public.questions
  where lesson_id = v_revision.lesson_id and active = true;

  return jsonb_build_object(
    'revision_id',v_revision.id,
    'lesson_id',v_revision.lesson_id,
    'stage_number',least(greatest(v_revision.revision_number,1),4),
    'question_count',v_count,
    'required_correct',v_required,
    'available_questions',v_available
  );
end;
$$;

revoke all on function public.get_leveling_rule(uuid) from public;
grant execute on function public.get_leveling_rule(uuid) to authenticated;

-- Motor do nivelamento: usa a regra configurada para o estágio da revisão.
create or replace function public.start_leveling_question_attempt(p_revision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.user_revisions%rowtype;
  v_stage integer;
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

  v_stage := least(greatest(v_revision.revision_number, 1), 4);

  select st.question_count, st.required_correct
  into v_count, v_required
  from public.lesson_leveling_stages st
  where st.lesson_id = v_revision.lesson_id
    and st.stage_number = v_stage
    and st.active = true;

  if v_count is null then v_count := 10; end if;
  if v_required is null then v_required := least(9, v_count); end if;

  select count(*) into v_available
  from public.questions
  where lesson_id = v_revision.lesson_id
    and active = true;

  if v_available < v_count then
    return jsonb_build_object(
      'ok', false,
      'stage_number', v_stage,
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
      'stage_number', v_stage,
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
          and olda.lesson_id = v_revision.lesson_id
          and olda.kind = 'leveling'
          and olda.status = 'completed'
          and oldi.question_id = q.id
      ) then 2 else 0 end,
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
    'stage_number', v_stage,
    'attempt_id', v_attempt_id,
    'continued', false,
    'required_count', v_count,
    'required_correct', v_required
  );
end;
$$;

revoke all on function public.start_leveling_question_attempt(uuid) from public;
grant execute on function public.start_leveling_question_attempt(uuid) to authenticated;
