-- Mentoria Titã — V9.3
-- Correção definitiva de textos visíveis + organização da Semana 1 por matéria
-- + PDFs já enviados pelo usuário ligados às respectivas aulas.

create or replace function public.mt_fix_text(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := p_value;
  i integer;
begin
  if v is null then return null; end if;

  for i in 1..6 loop
    v := replace(v, 'â€”', '—');
    v := replace(v, 'â€“', '–');
    v := replace(v, 'â€™', '’');
    v := replace(v, 'â€˜', '‘');
    v := replace(v, 'â€œ', '“');
    v := replace(v, 'â€', '”');
    v := replace(v, 'â€¢', '•');
    v := replace(v, 'â€¦', '…');
    v := replace(v, 'Â ', ' ');
    v := replace(v, 'Âº', 'º');
    v := replace(v, 'Âª', 'ª');
    v := replace(v, 'Â§', '§');

    v := replace(v, 'Ã¡', 'á');
    v := replace(v, 'Ã ', 'à');
    v := replace(v, 'Ã¢', 'â');
    v := replace(v, 'Ã£', 'ã');
    v := replace(v, 'Ã¤', 'ä');
    v := replace(v, 'Ã©', 'é');
    v := replace(v, 'Ãª', 'ê');
    v := replace(v, 'Ã¨', 'è');
    v := replace(v, 'Ã«', 'ë');
    v := replace(v, 'Ã­', 'í');
    v := replace(v, 'Ã¬', 'ì');
    v := replace(v, 'Ã®', 'î');
    v := replace(v, 'Ã¯', 'ï');
    v := replace(v, 'Ã³', 'ó');
    v := replace(v, 'Ã²', 'ò');
    v := replace(v, 'Ã´', 'ô');
    v := replace(v, 'Ãµ', 'õ');
    v := replace(v, 'Ã¶', 'ö');
    v := replace(v, 'Ãº', 'ú');
    v := replace(v, 'Ã¹', 'ù');
    v := replace(v, 'Ã»', 'û');
    v := replace(v, 'Ã¼', 'ü');
    v := replace(v, 'Ã§', 'ç');
    v := replace(v, 'Ã±', 'ñ');

    v := replace(v, 'Ã', 'Á');
    v := replace(v, 'Ã€', 'À');
    v := replace(v, 'Ã‚', 'Â');
    v := replace(v, 'Ã‰', 'É');
    v := replace(v, 'ÃŠ', 'Ê');
    v := replace(v, 'Ã', 'Í');
    v := replace(v, 'Ã“', 'Ó');
    v := replace(v, 'Ã”', 'Ô');
    v := replace(v, 'Ã•', 'Õ');
    v := replace(v, 'Ãš', 'Ú');
    v := replace(v, 'Ã‡', 'Ç');
    v := replace(v, 'Ãƒ', 'Ã');

    v := replace(v, 'ï»¿', '');
    v := replace(v, '﻿', '');
  end loop;

  return btrim(replace(v, chr(160), ' '));
end;
$$;

create or replace function public.mt_clean_heading(p_value text)
returns text
language sql
immutable
as $$
  select case
    when p_value is null then null
    else btrim(
      regexp_replace(
        regexp_replace(public.mt_fix_text(p_value), '^\s*#+\s*', ''),
        '^\s*[-–—]\s+',
        ''
      )
    )
  end
$$;

-- Corrige o conteúdo visível já existente.
update public.contests
set nome = public.mt_clean_heading(nome),
    sigla = public.mt_clean_heading(sigla);

update public.study_plans
set name = public.mt_clean_heading(name);

update public.study_weeks
set title = public.mt_clean_heading(title);

update public.study_subjects
set short_name = public.mt_clean_heading(short_name),
    name = public.mt_clean_heading(name),
    description = public.mt_fix_text(description);

update public.study_lessons
set title = public.mt_clean_heading(title),
    priority = public.mt_clean_heading(priority);

update public.study_lesson_topics
set topic = public.mt_clean_heading(topic);

update public.questions
set statement = public.mt_fix_text(statement),
    banca = public.mt_clean_heading(banca),
    exam_name = public.mt_clean_heading(exam_name),
    source_code = public.mt_clean_heading(source_code);

update public.question_keys
set explanation = public.mt_fix_text(explanation);

update public.user_revisions
set subject_name = public.mt_clean_heading(subject_name),
    lesson_title = public.mt_clean_heading(lesson_title);

update public.lesson_materials
set title = public.mt_clean_heading(title),
    file_name = public.mt_fix_text(file_name);

update public.profiles
set nome = public.mt_clean_heading(nome)
where nome is not null;

do $$
begin
  if to_regclass('public.study_schedule_blocks') is not null then
    update public.study_schedule_blocks
    set title = public.mt_clean_heading(title),
        notes = public.mt_fix_text(notes);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'questions'
      and column_name = 'choices'
      and data_type = 'jsonb'
  ) then
    execute 'update public.questions set choices = public.mt_fix_text(choices::text)::jsonb where choices is not null';
  end if;
end;
$$;

-- CFO PMAL: nomes canônicos. Assim a tela não depende de texto previamente corrompido.
update public.contests
set nome = 'CFO PMAL 2026',
    sigla = 'CFO PMAL'
where slug = 'cfo-pmal';

update public.study_plans
set name = 'CFO PMAL 2026',
    is_default = true,
    active = true
where slug = 'cfo-pmal-2026';

update public.study_weeks w
set title = 'CFO PMAL — Semana 1',
    starts_on = date '2026-09-02',
    ends_on = date '2026-09-09',
    active = true
from public.study_plans p
where w.plan_id = p.id
  and p.slug = 'cfo-pmal-2026'
  and w.week_number = 1;

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
),
data(slug, short_name, name, description, position) as (
  values
  ('legislacao-pmal', 'LEGISLAÇÃO PMAL', 'Legislação PMAL', 'Lei Estadual nº 5.346/1992 e normas institucionais da PMAL.', 1),
('processo-penal-militar', 'PPM', 'Processo Penal Militar', 'Processo penal militar, polícia judiciária militar, IPM e ação penal militar.', 2),
('lingua-portuguesa', 'PORTUGUÊS', 'Língua Portuguesa', 'Tipologia e gêneros textuais, ortografia, coesão e verbos.', 3),
('informatica', 'INFORMÁTICA', 'Informática', 'Windows, organização de arquivos e Microsoft Office.', 4),
('conhecimentos-alagoas', 'ALAGOAS', 'Conhecimentos do Estado de Alagoas', 'Formação histórica, sociedade e geografia do Estado de Alagoas.', 5),
('direito-penal', 'DIREITO PENAL', 'Direito Penal', 'Aplicação da lei penal e fundamentos da teoria do crime.', 6)
)
update public.study_subjects s
set short_name = d.short_name,
    name = d.name,
    description = d.description,
    position = d.position,
    active = true
from p, data d
where s.plan_id = p.id
  and s.slug = d.slug;

with p as (
  select id from public.study_plans where slug = 'cfo-pmal-2026'
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
update public.study_lessons l
set title = d.title,
    position = d.position,
    question_count = d.question_count,
    active = true
from data d
join public.study_subjects s
  on s.plan_id = (select id from p)
 and s.slug = d.subject_slug
where l.subject_id = s.id
  and l.slug = d.lesson_slug;

-- PDFs já enviados neste chat. A Aula 01 de interpretação NÃO entra na Semana 1.
update public.study_lessons l
set pdf_path = case l.slug
  when 'lei-5346-generalidades-conceituacao' then '/materials/cfo-pmal/semana-1/legislacao-pmal-aula-01.pdf'
  when 'lei-5346-ingresso-hierarquia-disciplina' then '/materials/cfo-pmal/semana-1/legislacao-pmal-aula-02.pdf'
  when 'tipologia-generos-textuais' then '/materials/cfo-pmal/semana-1/portugues-aula-02-tipologia-generos.pdf'
  else l.pdf_path
end
from public.study_subjects s
join public.study_plans p on p.id = s.plan_id
where l.subject_id = s.id
  and p.slug = 'cfo-pmal-2026'
  and l.slug in (
    'lei-5346-generalidades-conceituacao',
    'lei-5346-ingresso-hierarquia-disciplina',
    'tipologia-generos-textuais'
  );

-- Sincroniza plano ativo com o concurso foco.
update public.profiles pr
set active_study_plan_id = (
  select sp.id
  from public.study_plans sp
  where sp.contest_id = pr.focus_contest_id
    and sp.active = true
  order by sp.is_default desc, sp.created_at asc
  limit 1
)
where pr.focus_contest_id is not null
  and exists (
    select 1
    from public.study_plans sp
    where sp.contest_id = pr.focus_contest_id
      and sp.active = true
  )
  and pr.active_study_plan_id is distinct from (
    select sp.id
    from public.study_plans sp
    where sp.contest_id = pr.focus_contest_id
      and sp.active = true
    order by sp.is_default desc, sp.created_at asc
    limit 1
  );

-- Proteção para futuras gravações nas tabelas de cronograma.
create or replace function public.mt_normalize_week_v93()
returns trigger
language plpgsql
as $$
begin
  new.title := public.mt_clean_heading(new.title);
  return new;
end;
$$;

create or replace function public.mt_normalize_subject_v93()
returns trigger
language plpgsql
as $$
begin
  new.short_name := public.mt_clean_heading(new.short_name);
  new.name := public.mt_clean_heading(new.name);
  new.description := public.mt_fix_text(new.description);
  return new;
end;
$$;

create or replace function public.mt_normalize_lesson_v93()
returns trigger
language plpgsql
as $$
begin
  new.title := public.mt_clean_heading(new.title);
  new.priority := public.mt_clean_heading(new.priority);
  return new;
end;
$$;

create or replace function public.mt_normalize_topic_v93()
returns trigger
language plpgsql
as $$
begin
  new.topic := public.mt_clean_heading(new.topic);
  return new;
end;
$$;

drop trigger if exists mt_v93_week_text on public.study_weeks;
create trigger mt_v93_week_text
before insert or update on public.study_weeks
for each row execute function public.mt_normalize_week_v93();

drop trigger if exists mt_v93_subject_text on public.study_subjects;
create trigger mt_v93_subject_text
before insert or update on public.study_subjects
for each row execute function public.mt_normalize_subject_v93();

drop trigger if exists mt_v93_lesson_text on public.study_lessons;
create trigger mt_v93_lesson_text
before insert or update on public.study_lessons
for each row execute function public.mt_normalize_lesson_v93();

drop trigger if exists mt_v93_topic_text on public.study_lesson_topics;
create trigger mt_v93_topic_text
before insert or update on public.study_lesson_topics
for each row execute function public.mt_normalize_topic_v93();

create or replace function public.mt_normalize_schedule_block_v93()
returns trigger
language plpgsql
as $$
begin
  new.title := public.mt_clean_heading(new.title);
  new.notes := public.mt_fix_text(new.notes);
  return new;
end;
$$;

drop trigger if exists mt_v93_schedule_text on public.study_schedule_blocks;
create trigger mt_v93_schedule_text
before insert or update on public.study_schedule_blocks
for each row execute function public.mt_normalize_schedule_block_v93();
