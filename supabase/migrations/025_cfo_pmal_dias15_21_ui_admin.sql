-- Mentoria Titã - V9.5.0
-- CFO PMAL 2026 - Dias 15 a 21: 42 aulas + 42 PDFs.
-- Ordem do dia segue explicitamente Aula 01..06 dos PDFs enviados.
-- Regra: Língua Portuguesa = 15 principal; demais = 35 principal; todas com 4 nivelamentos x 10, meta 9/10.

insert into public.study_weeks(plan_id,week_number,title,position,starts_on,ends_on,active)
select id,2,'CFO PMAL - Semana 2',2,date '2026-09-10',date '2026-09-16',true
from public.study_plans where slug='cfo-pmal-2026'
on conflict(plan_id,week_number) do update set ends_on=greatest(coalesce(public.study_weeks.ends_on,excluded.ends_on),excluded.ends_on),active=true;

insert into public.study_weeks(plan_id,week_number,title,position,starts_on,ends_on,active)
select id,3,'CFO PMAL - Semana 3',3,date '2026-09-17',date '2026-09-23',true
from public.study_plans where slug='cfo-pmal-2026'
on conflict(plan_id,week_number) do update set title=excluded.title,position=excluded.position,starts_on=excluded.starts_on,ends_on=excluded.ends_on,active=true;


with p as (select id from public.study_plans where slug='cfo-pmal-2026')
insert into public.study_subjects(plan_id,slug,short_name,name,description,position,active)
select p.id,x.slug,x.short_name,x.name,x.description,x.position,true
from p cross join (values
 ('direito-administrativo','D. ADM.','Direito Administrativo','Direito Administrativo aplicado ao edital do CFO PMAL.',9),
 ('direito-penal-militar','DPM','Direito Penal Militar','Direito Penal Militar aplicado ao edital do CFO PMAL.',10)
) as x(slug,short_name,name,description,position)
on conflict(plan_id,slug) do update set short_name=excluded.short_name,name=excluded.name,description=excluded.description,position=excluded.position,active=true;


-- Amplia o resolvedor de aliases para não repetir o problema de Português no Admin.
create or replace function public.mt_resolve_study_subject(p_plan_slug text,p_subject_slug text)
returns uuid language sql stable security invoker set search_path=public as $$
  select s.id
  from public.study_subjects s join public.study_plans p on p.id=s.plan_id
  where p.slug=p_plan_slug
    and s.slug=case lower(trim(p_subject_slug))
      when 'portugues' then 'lingua-portuguesa'
      when 'língua portuguesa' then 'lingua-portuguesa'
      when 'lingua portuguesa' then 'lingua-portuguesa'
      when 'dppm' then 'processo-penal-militar'
      when 'direito administrativo' then 'direito-administrativo'
      when 'direito penal militar' then 'direito-penal-militar'
      else lower(trim(p_subject_slug))
    end
  limit 1;
$$;

with p as (select id from public.study_plans where slug='cfo-pmal-2026'),
data(week_number,subject_slug,lesson_position,lesson_slug,title,question_count,pdf_path,day_number,day_order) as (
  values
    (2,'direito-penal',11,'crimes-funcionais-administracao','Crimes praticados por funcionário público contra a Administração',35,'/materials/cfo-pmal/dias-01-39/d15-01-direito-penal-crimes-funcionais-administracao.pdf',15,1),
    (2,'legislacao-pmal',15,'rdpmal-punicoes-aplicacao-competencia','RDPMAL: punições, aplicação e competência',35,'/materials/cfo-pmal/dias-01-39/d15-02-legislacao-rdpmal-punicoes-aplicacao-competencia.pdf',15,2),
    (2,'processo-penal-militar',13,'citacao-intimacao-notificacao','Citação, intimação e notificação',35,'/materials/cfo-pmal/dias-01-39/d15-03-dppm-citacao-intimacao-notificacao.pdf',15,3),
    (2,'direito-constitucional',4,'principios-fundamentais','Princípios fundamentais',35,'/materials/cfo-pmal/dias-01-39/d15-04-direito-constitucional-principios-fundamentais.pdf',15,4),
    (2,'lingua-portuguesa',10,'pontuacao','Pontuação',15,'/materials/cfo-pmal/dias-01-39/d15-05-portugues-pontuacao.pdf',15,5),
    (2,'informatica',12,'seguranca-informacao-malware-backup','Segurança da informação, malware e backup',35,'/materials/cfo-pmal/dias-01-39/d15-06-informatica-seguranca-malware-backup.pdf',15,6),
    (3,'legislacao-pmal',16,'rdpmal-comportamento-cancelamento-recursos-recompensas','RDPMAL: comportamento, cancelamento, recursos e recompensas',35,'/materials/cfo-pmal/dias-01-39/d16-01-legislacao-rdpmal-comportamento-recursos-recompensas.pdf',16,1),
    (3,'processo-penal-militar',14,'interrogatorio-confissao','Interrogatório e confissão',35,'/materials/cfo-pmal/dias-01-39/d16-02-dppm-interrogatorio-confissao.pdf',16,2),
    (3,'direito-constitucional',5,'direitos-individuais-coletivos-i','Direitos e deveres individuais e coletivos I',35,'/materials/cfo-pmal/dias-01-39/d16-03-direito-constitucional-direitos-individuais-coletivos-i.pdf',16,3),
    (3,'direito-penal',12,'particular-administracao-justica','Crimes praticados por particular e contra a Administração da Justiça',35,'/materials/cfo-pmal/dias-01-39/d16-04-direito-penal-particular-administracao-justica.pdf',16,4),
    (3,'direito-constitucional',6,'direitos-individuais-coletivos-ii','Direitos e deveres individuais e coletivos II',35,'/materials/cfo-pmal/dias-01-39/d16-05-direito-constitucional-direitos-individuais-coletivos-ii.pdf',16,5),
    (3,'legislacao-pmal',17,'crimes-racismo-discriminacao','Crimes de racismo e discriminação',35,'/materials/cfo-pmal/dias-01-39/d16-06-legislacao-crimes-racismo-discriminacao.pdf',16,6),
    (3,'legislacao-pmal',18,'crimes-hediondos','Crimes hediondos',35,'/materials/cfo-pmal/dias-01-39/d17-01-legislacao-crimes-hediondos.pdf',17,1),
    (3,'processo-penal-militar',15,'pericias-exames-cadeia-probatoria','Perícias, exames e cadeia probatória',35,'/materials/cfo-pmal/dias-01-39/d17-02-dppm-pericias-exames-cadeia-probatoria.pdf',17,2),
    (3,'direito-constitucional',7,'remedios-constitucionais','Remédios constitucionais',35,'/materials/cfo-pmal/dias-01-39/d17-03-direito-constitucional-remedios-constitucionais.pdf',17,3),
    (3,'legislacao-pmal',19,'organizacao-criminosa-crimes-correlatos','Organização criminosa e crimes correlatos',35,'/materials/cfo-pmal/dias-01-39/d17-04-legislacao-organizacao-criminosa-crimes-correlatos.pdf',17,4),
    (3,'direito-constitucional',8,'direitos-sociais','Direitos sociais',35,'/materials/cfo-pmal/dias-01-39/d17-05-direito-constitucional-direitos-sociais.pdf',17,5),
    (3,'processo-penal-militar',16,'testemunhas-acareacao','Testemunhas e acareação',35,'/materials/cfo-pmal/dias-01-39/d17-06-dppm-testemunhas-acareacao.pdf',17,6),
    (3,'legislacao-pmal',20,'organizacao-criminosa-meios-obtencao-prova','Organização criminosa: meios de obtenção da prova',35,'/materials/cfo-pmal/dias-01-39/d18-01-legislacao-organizacao-criminosa-meios-prova.pdf',18,1),
    (3,'processo-penal-militar',17,'reconhecimento-documentos-indicios','Reconhecimento, documentos e indícios',35,'/materials/cfo-pmal/dias-01-39/d18-02-dppm-reconhecimento-documentos-indicios.pdf',18,2),
    (3,'lingua-portuguesa',11,'concordancia-verbal-nominal','Concordância verbal e nominal',15,'/materials/cfo-pmal/dias-01-39/d18-03-portugues-concordancia-verbal-nominal.pdf',18,3),
    (3,'direito-constitucional',9,'nacionalidade','Nacionalidade',35,'/materials/cfo-pmal/dias-01-39/d18-04-direito-constitucional-nacionalidade.pdf',18,4),
    (3,'direito-administrativo',1,'estado-governo-administracao-publica','Estado, governo e Administração Pública',35,'/materials/cfo-pmal/dias-01-39/d18-05-direito-administrativo-estado-governo-administracao.pdf',18,5),
    (3,'direito-penal-militar',1,'aplicacao-lei-penal-militar','Aplicação da lei penal militar',35,'/materials/cfo-pmal/dias-01-39/d18-06-direito-penal-militar-aplicacao-lei.pdf',18,6),
    (3,'legislacao-pmal',21,'crimes-tortura','Crimes de tortura',35,'/materials/cfo-pmal/dias-01-39/d19-01-legislacao-crimes-tortura.pdf',19,1),
    (3,'processo-penal-militar',18,'processo-ordinario','Processo ordinário',35,'/materials/cfo-pmal/dias-01-39/d19-02-dppm-processo-ordinario.pdf',19,2),
    (3,'lingua-portuguesa',12,'regencia-verbal-nominal','Regência verbal e nominal',15,'/materials/cfo-pmal/dias-01-39/d19-03-portugues-regencia-verbal-nominal.pdf',19,3),
    (3,'direito-constitucional',10,'direitos-politicos','Direitos políticos e partidos políticos',35,'/materials/cfo-pmal/dias-01-39/d19-04-direito-constitucional-direitos-politicos.pdf',19,4),
    (3,'direito-administrativo',2,'conceito-objeto-fontes','Conceito, objeto e fontes',35,'/materials/cfo-pmal/dias-01-39/d19-05-direito-administrativo-conceito-objeto-fontes.pdf',19,5),
    (3,'direito-penal-militar',2,'conceito-classificacao-crime-militar','Crime militar: conceito e classificação',35,'/materials/cfo-pmal/dias-01-39/d19-06-direito-penal-militar-conceito-classificacao.pdf',19,6),
    (3,'legislacao-pmal',22,'crimes-ambientais-parte-geral-responsabilidade','Lei de Crimes Ambientais: parte geral e responsabilidade',35,'/materials/cfo-pmal/dias-01-39/d20-01-legislacao-crimes-ambientais-parte-geral.pdf',20,1),
    (3,'processo-penal-militar',19,'processos-especiais-visao-geral','Processos especiais: visão geral',35,'/materials/cfo-pmal/dias-01-39/d20-02-dppm-processos-especiais-visao-geral.pdf',20,2),
    (3,'lingua-portuguesa',13,'crase','Crase',15,'/materials/cfo-pmal/dias-01-39/d20-03-portugues-crase.pdf',20,3),
    (3,'direito-constitucional',11,'organizacao-politico-administrativa-entes','Organização político-administrativa e entes federativos',35,'/materials/cfo-pmal/dias-01-39/d20-04-direito-constitucional-organizacao-politico-administrativa.pdf',20,4),
    (3,'direito-administrativo',3,'ato-administrativo-conceito-requisitos-atributos','Ato administrativo: conceito, requisitos e atributos',35,'/materials/cfo-pmal/dias-01-39/d20-05-direito-administrativo-ato-conceito-requisitos-atributos.pdf',20,5),
    (3,'direito-penal-militar',3,'crime-militar-tempo-paz','Crime militar em tempo de paz',35,'/materials/cfo-pmal/dias-01-39/d20-06-direito-penal-militar-tempo-paz.pdf',20,6),
    (3,'legislacao-pmal',23,'crimes-ambientais','Crimes ambientais',35,'/materials/cfo-pmal/dias-01-39/d21-01-legislacao-crimes-ambientais.pdf',21,1),
    (3,'processo-penal-militar',20,'desercao-oficial-praca','Deserção de oficial e de praça',35,'/materials/cfo-pmal/dias-01-39/d21-02-dppm-desercao-oficial-praca.pdf',21,2),
    (3,'direito-constitucional',12,'intervencoes-estado-sitio','Intervenções e estado de sítio',35,'/materials/cfo-pmal/dias-01-39/d21-03-direito-constitucional-intervencoes-estado-sitio.pdf',21,3),
    (3,'direito-administrativo',4,'classificacao-especies-atos','Classificação e espécies de atos administrativos',35,'/materials/cfo-pmal/dias-01-39/d21-04-direito-administrativo-classificacao-especies-atos.pdf',21,4),
    (3,'direito-penal-militar',4,'imputabilidade-penal-militar','Imputabilidade penal militar',35,'/materials/cfo-pmal/dias-01-39/d21-05-direito-penal-militar-imputabilidade.pdf',21,5),
    (3,'direito-constitucional',13,'administracao-publica-constitucional','Administração Pública constitucional',35,'/materials/cfo-pmal/dias-01-39/d21-06-direito-constitucional-administracao-publica.pdf',21,6)
)
insert into public.study_lessons(subject_id,week_id,slug,title,priority,position,question_count,pdf_path,active)
select s.id,w.id,d.lesson_slug,d.title,null,d.lesson_position,d.question_count,d.pdf_path,true
from data d join p on true
join public.study_subjects s on s.plan_id=p.id and s.slug=d.subject_slug
join public.study_weeks w on w.plan_id=p.id and w.week_number=d.week_number
on conflict(subject_id,slug) do update set week_id=excluded.week_id,title=excluded.title,position=excluded.position,question_count=excluded.question_count,pdf_path=excluded.pdf_path,active=true;

-- 4 nivelamentos de 10 / meta 9 em todas as aulas CFO PMAL atualmente cadastradas.
with target_lessons as (
  select l.id lesson_id from public.study_lessons l
  join public.study_subjects s on s.id=l.subject_id
  join public.study_plans p on p.id=s.plan_id
  where p.slug='cfo-pmal-2026' and p.active and s.active and l.active
), stages as (select generate_series(1,4) stage_number)
insert into public.lesson_leveling_stages(lesson_id,stage_number,question_count,required_correct,active,updated_at)
select tl.lesson_id,st.stage_number,10,9,true,now() from target_lessons tl cross join stages st
on conflict(lesson_id,stage_number) do update set question_count=10,required_correct=9,active=true,updated_at=now();

do $$
begin
  if to_regclass('public.lesson_leveling_settings') is not null then
    execute $compat$
      insert into public.lesson_leveling_settings(lesson_id,question_count,required_correct,active)
      select l.id,10,9,true from public.study_lessons l
      join public.study_subjects s on s.id=l.subject_id
      join public.study_plans p on p.id=s.plan_id
      where p.slug='cfo-pmal-2026' and p.active and s.active and l.active
      on conflict(lesson_id) do update set question_count=10,required_correct=9,active=true
    $compat$;
  end if;
end;
$$;

-- Blocos dos Dias 15 a 21.
do $$
declare v_plan_id uuid; v_week2 uuid; v_week3 uuid;
begin
  select id into v_plan_id from public.study_plans where slug='cfo-pmal-2026' limit 1;
  select id into v_week2 from public.study_weeks where plan_id=v_plan_id and week_number=2 limit 1;
  select id into v_week3 from public.study_weeks where plan_id=v_plan_id and week_number=3 limit 1;
  if v_week2 is null or v_week3 is null then raise exception 'Semanas 2/3 do CFO PMAL não encontradas'; end if;

  insert into public.study_schedule_blocks(week_id,study_date,daypart,start_time,end_time,title,optional,notes,position)
  values
    (v_week2,date '2026-09-16','afternoon',time '13:30',time '17:00','Dia 15 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week2,date '2026-09-16','evening',time '19:00',time '22:00','Dia 15 - Noite',false,'Aulas 4 a 6.',3),
    (v_week3,date '2026-09-17','afternoon',time '13:30',time '17:00','Dia 16 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week3,date '2026-09-17','evening',time '19:00',time '22:00','Dia 16 - Noite',false,'Aulas 4 a 6.',3),
    (v_week3,date '2026-09-18','afternoon',time '13:30',time '17:00','Dia 17 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week3,date '2026-09-18','evening',time '19:00',time '22:00','Dia 17 - Noite',false,'Aulas 4 a 6.',3),
    (v_week3,date '2026-09-19','afternoon',time '13:30',time '17:00','Dia 18 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week3,date '2026-09-19','evening',time '19:00',time '22:00','Dia 18 - Noite',false,'Aulas 4 a 6.',3),
    (v_week3,date '2026-09-20','afternoon',time '13:30',time '17:00','Dia 19 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week3,date '2026-09-20','evening',time '19:00',time '22:00','Dia 19 - Noite',false,'Aulas 4 a 6.',3),
    (v_week3,date '2026-09-21','afternoon',time '13:30',time '17:00','Dia 20 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week3,date '2026-09-21','evening',time '19:00',time '22:00','Dia 20 - Noite',false,'Aulas 4 a 6.',3),
    (v_week3,date '2026-09-22','afternoon',time '13:30',time '17:00','Dia 21 - Tarde',false,'Aulas 1 a 3.',2),
    (v_week3,date '2026-09-22','evening',time '19:00',time '22:00','Dia 21 - Noite',false,'Aulas 4 a 6.',3)
  on conflict(week_id,study_date,daypart) do update set start_time=excluded.start_time,end_time=excluded.end_time,title=excluded.title,optional=false,notes=excluded.notes,position=excluded.position;

  delete from public.study_schedule_block_lessons bl using public.study_schedule_blocks b
  where bl.block_id=b.id and b.study_date between date '2026-09-16' and date '2026-09-22' and b.week_id in (v_week2,v_week3);
end;
$$;

with p as (select id from public.study_plans where slug='cfo-pmal-2026'),
data(study_date,daypart,subject_slug,lesson_slug,position) as (
  values
    ('2026-09-16','afternoon','direito-penal','crimes-funcionais-administracao',1),
    ('2026-09-16','afternoon','legislacao-pmal','rdpmal-punicoes-aplicacao-competencia',2),
    ('2026-09-16','afternoon','processo-penal-militar','citacao-intimacao-notificacao',3),
    ('2026-09-16','evening','direito-constitucional','principios-fundamentais',1),
    ('2026-09-16','evening','lingua-portuguesa','pontuacao',2),
    ('2026-09-16','evening','informatica','seguranca-informacao-malware-backup',3),
    ('2026-09-17','afternoon','legislacao-pmal','rdpmal-comportamento-cancelamento-recursos-recompensas',1),
    ('2026-09-17','afternoon','processo-penal-militar','interrogatorio-confissao',2),
    ('2026-09-17','afternoon','direito-constitucional','direitos-individuais-coletivos-i',3),
    ('2026-09-17','evening','direito-penal','particular-administracao-justica',1),
    ('2026-09-17','evening','direito-constitucional','direitos-individuais-coletivos-ii',2),
    ('2026-09-17','evening','legislacao-pmal','crimes-racismo-discriminacao',3),
    ('2026-09-18','afternoon','legislacao-pmal','crimes-hediondos',1),
    ('2026-09-18','afternoon','processo-penal-militar','pericias-exames-cadeia-probatoria',2),
    ('2026-09-18','afternoon','direito-constitucional','remedios-constitucionais',3),
    ('2026-09-18','evening','legislacao-pmal','organizacao-criminosa-crimes-correlatos',1),
    ('2026-09-18','evening','direito-constitucional','direitos-sociais',2),
    ('2026-09-18','evening','processo-penal-militar','testemunhas-acareacao',3),
    ('2026-09-19','afternoon','legislacao-pmal','organizacao-criminosa-meios-obtencao-prova',1),
    ('2026-09-19','afternoon','processo-penal-militar','reconhecimento-documentos-indicios',2),
    ('2026-09-19','afternoon','lingua-portuguesa','concordancia-verbal-nominal',3),
    ('2026-09-19','evening','direito-constitucional','nacionalidade',1),
    ('2026-09-19','evening','direito-administrativo','estado-governo-administracao-publica',2),
    ('2026-09-19','evening','direito-penal-militar','aplicacao-lei-penal-militar',3),
    ('2026-09-20','afternoon','legislacao-pmal','crimes-tortura',1),
    ('2026-09-20','afternoon','processo-penal-militar','processo-ordinario',2),
    ('2026-09-20','afternoon','lingua-portuguesa','regencia-verbal-nominal',3),
    ('2026-09-20','evening','direito-constitucional','direitos-politicos',1),
    ('2026-09-20','evening','direito-administrativo','conceito-objeto-fontes',2),
    ('2026-09-20','evening','direito-penal-militar','conceito-classificacao-crime-militar',3),
    ('2026-09-21','afternoon','legislacao-pmal','crimes-ambientais-parte-geral-responsabilidade',1),
    ('2026-09-21','afternoon','processo-penal-militar','processos-especiais-visao-geral',2),
    ('2026-09-21','afternoon','lingua-portuguesa','crase',3),
    ('2026-09-21','evening','direito-constitucional','organizacao-politico-administrativa-entes',1),
    ('2026-09-21','evening','direito-administrativo','ato-administrativo-conceito-requisitos-atributos',2),
    ('2026-09-21','evening','direito-penal-militar','crime-militar-tempo-paz',3),
    ('2026-09-22','afternoon','legislacao-pmal','crimes-ambientais',1),
    ('2026-09-22','afternoon','processo-penal-militar','desercao-oficial-praca',2),
    ('2026-09-22','afternoon','direito-constitucional','intervencoes-estado-sitio',3),
    ('2026-09-22','evening','direito-administrativo','classificacao-especies-atos',1),
    ('2026-09-22','evening','direito-penal-militar','imputabilidade-penal-militar',2),
    ('2026-09-22','evening','direito-constitucional','administracao-publica-constitucional',3)
)
insert into public.study_schedule_block_lessons(block_id,lesson_id,position)
select b.id,l.id,d.position
from data d
join public.study_subjects s on s.plan_id=(select id from p) and s.slug=d.subject_slug
join public.study_lessons l on l.subject_id=s.id and l.slug=d.lesson_slug
join public.study_schedule_blocks b on b.week_id=l.week_id and b.study_date=d.study_date::date and b.daypart=d.daypart
on conflict(block_id,lesson_id) do update set position=excluded.position;

-- Verificação final: deve retornar 42 linhas, todas com PDF e 4 nivelamentos.
with target(subject_slug,lesson_slug,day_number,day_order) as (
  values
    ('direito-penal','crimes-funcionais-administracao',15,1),
    ('legislacao-pmal','rdpmal-punicoes-aplicacao-competencia',15,2),
    ('processo-penal-militar','citacao-intimacao-notificacao',15,3),
    ('direito-constitucional','principios-fundamentais',15,4),
    ('lingua-portuguesa','pontuacao',15,5),
    ('informatica','seguranca-informacao-malware-backup',15,6),
    ('legislacao-pmal','rdpmal-comportamento-cancelamento-recursos-recompensas',16,1),
    ('processo-penal-militar','interrogatorio-confissao',16,2),
    ('direito-constitucional','direitos-individuais-coletivos-i',16,3),
    ('direito-penal','particular-administracao-justica',16,4),
    ('direito-constitucional','direitos-individuais-coletivos-ii',16,5),
    ('legislacao-pmal','crimes-racismo-discriminacao',16,6),
    ('legislacao-pmal','crimes-hediondos',17,1),
    ('processo-penal-militar','pericias-exames-cadeia-probatoria',17,2),
    ('direito-constitucional','remedios-constitucionais',17,3),
    ('legislacao-pmal','organizacao-criminosa-crimes-correlatos',17,4),
    ('direito-constitucional','direitos-sociais',17,5),
    ('processo-penal-militar','testemunhas-acareacao',17,6),
    ('legislacao-pmal','organizacao-criminosa-meios-obtencao-prova',18,1),
    ('processo-penal-militar','reconhecimento-documentos-indicios',18,2),
    ('lingua-portuguesa','concordancia-verbal-nominal',18,3),
    ('direito-constitucional','nacionalidade',18,4),
    ('direito-administrativo','estado-governo-administracao-publica',18,5),
    ('direito-penal-militar','aplicacao-lei-penal-militar',18,6),
    ('legislacao-pmal','crimes-tortura',19,1),
    ('processo-penal-militar','processo-ordinario',19,2),
    ('lingua-portuguesa','regencia-verbal-nominal',19,3),
    ('direito-constitucional','direitos-politicos',19,4),
    ('direito-administrativo','conceito-objeto-fontes',19,5),
    ('direito-penal-militar','conceito-classificacao-crime-militar',19,6),
    ('legislacao-pmal','crimes-ambientais-parte-geral-responsabilidade',20,1),
    ('processo-penal-militar','processos-especiais-visao-geral',20,2),
    ('lingua-portuguesa','crase',20,3),
    ('direito-constitucional','organizacao-politico-administrativa-entes',20,4),
    ('direito-administrativo','ato-administrativo-conceito-requisitos-atributos',20,5),
    ('direito-penal-militar','crime-militar-tempo-paz',20,6),
    ('legislacao-pmal','crimes-ambientais',21,1),
    ('processo-penal-militar','desercao-oficial-praca',21,2),
    ('direito-constitucional','intervencoes-estado-sitio',21,3),
    ('direito-administrativo','classificacao-especies-atos',21,4),
    ('direito-penal-militar','imputabilidade-penal-militar',21,5),
    ('direito-constitucional','administracao-publica-constitucional',21,6)
)
select t.day_number as dia,t.day_order as aula,s.name as materia,l.title as assunto,l.question_count as principal,
       4 as nivelamentos,10 as questoes_por_nivelamento,l.pdf_path
from target t
join public.study_plans p on p.slug='cfo-pmal-2026'
join public.study_subjects s on s.plan_id=p.id and s.slug=t.subject_slug
join public.study_lessons l on l.subject_id=s.id and l.slug=t.lesson_slug
order by t.day_number,t.day_order;

with target(subject_slug,lesson_slug) as (
  values
    ('direito-penal','crimes-funcionais-administracao'),
    ('legislacao-pmal','rdpmal-punicoes-aplicacao-competencia'),
    ('processo-penal-militar','citacao-intimacao-notificacao'),
    ('direito-constitucional','principios-fundamentais'),
    ('lingua-portuguesa','pontuacao'),
    ('informatica','seguranca-informacao-malware-backup'),
    ('legislacao-pmal','rdpmal-comportamento-cancelamento-recursos-recompensas'),
    ('processo-penal-militar','interrogatorio-confissao'),
    ('direito-constitucional','direitos-individuais-coletivos-i'),
    ('direito-penal','particular-administracao-justica'),
    ('direito-constitucional','direitos-individuais-coletivos-ii'),
    ('legislacao-pmal','crimes-racismo-discriminacao'),
    ('legislacao-pmal','crimes-hediondos'),
    ('processo-penal-militar','pericias-exames-cadeia-probatoria'),
    ('direito-constitucional','remedios-constitucionais'),
    ('legislacao-pmal','organizacao-criminosa-crimes-correlatos'),
    ('direito-constitucional','direitos-sociais'),
    ('processo-penal-militar','testemunhas-acareacao'),
    ('legislacao-pmal','organizacao-criminosa-meios-obtencao-prova'),
    ('processo-penal-militar','reconhecimento-documentos-indicios'),
    ('lingua-portuguesa','concordancia-verbal-nominal'),
    ('direito-constitucional','nacionalidade'),
    ('direito-administrativo','estado-governo-administracao-publica'),
    ('direito-penal-militar','aplicacao-lei-penal-militar'),
    ('legislacao-pmal','crimes-tortura'),
    ('processo-penal-militar','processo-ordinario'),
    ('lingua-portuguesa','regencia-verbal-nominal'),
    ('direito-constitucional','direitos-politicos'),
    ('direito-administrativo','conceito-objeto-fontes'),
    ('direito-penal-militar','conceito-classificacao-crime-militar'),
    ('legislacao-pmal','crimes-ambientais-parte-geral-responsabilidade'),
    ('processo-penal-militar','processos-especiais-visao-geral'),
    ('lingua-portuguesa','crase'),
    ('direito-constitucional','organizacao-politico-administrativa-entes'),
    ('direito-administrativo','ato-administrativo-conceito-requisitos-atributos'),
    ('direito-penal-militar','crime-militar-tempo-paz'),
    ('legislacao-pmal','crimes-ambientais'),
    ('processo-penal-militar','desercao-oficial-praca'),
    ('direito-constitucional','intervencoes-estado-sitio'),
    ('direito-administrativo','classificacao-especies-atos'),
    ('direito-penal-militar','imputabilidade-penal-militar'),
    ('direito-constitucional','administracao-publica-constitucional')
)
select count(*) as aulas_encontradas,
       count(*) filter(where l.pdf_path is not null) as aulas_com_pdf
from target t
join public.study_plans p on p.slug='cfo-pmal-2026'
join public.study_subjects s on s.plan_id=p.id and s.slug=t.subject_slug
join public.study_lessons l on l.subject_id=s.id and l.slug=t.lesson_slug;
-- Esperado: 42 / 42
