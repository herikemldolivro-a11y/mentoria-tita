do $$
declare
  v_plan uuid;
  v_subject uuid;
  v_sint_oracao uuid;
  v_sint_periodo uuid;
  v_subordinacao uuid;
  v_concordancia uuid;
  v_regencia uuid;
  v_crase uuid;
  v_colocacao uuid;
  v_pontuacao uuid;
begin
  select p.id into v_plan
  from public.study_plans p
  join public.contests c on c.id=p.contest_id
  where c.slug='cfo-pmal' and p.active=true
  order by p.is_default desc,p.created_at
  limit 1;

  select s.id into v_subject
  from public.study_subjects s
  where s.plan_id=v_plan and s.slug='lingua-portuguesa'
  limit 1;

  if v_plan is null or v_subject is null then
    raise exception 'Plano ou matéria de Língua Portuguesa do CFO PMAL não encontrados';
  end if;

  select id into v_sint_oracao from public.study_lessons where subject_id=v_subject and slug='sintaxe-oracao-termos-oracao';
  select id into v_sint_periodo from public.study_lessons where subject_id=v_subject and slug='coordenacao';
  select id into v_subordinacao from public.study_lessons where subject_id=v_subject and slug='subordinacao';
  select id into v_concordancia from public.study_lessons where subject_id=v_subject and slug='concordancia-verbal-nominal';
  select id into v_regencia from public.study_lessons where subject_id=v_subject and slug='regencia-verbal-nominal';
  select id into v_crase from public.study_lessons where subject_id=v_subject and slug='crase';
  select id into v_colocacao from public.study_lessons where subject_id=v_subject and slug='colocacao-pronominal';
  select id into v_pontuacao from public.study_lessons where subject_id=v_subject and slug='pontuacao';

  update public.study_lessons set title='02 - SINTAXE DA ORAÇÃO', question_count=115, position=16, active=true where id=v_sint_oracao;
  update public.study_lessons set title='03 - SINTAXE DO PERÍODO', question_count=115, position=17, active=true where id=v_sint_periodo;
  update public.study_lessons set title='04 - CONCORDÂNCIA', question_count=115, position=18, active=true where id=v_concordancia;
  update public.study_lessons set title='05 - REGÊNCIA', question_count=115, position=19, active=true where id=v_regencia;
  update public.study_lessons set title='06 - CRASE', question_count=115, position=20, active=true where id=v_crase;
  update public.study_lessons set title='07 - COLOCAÇÃO PRONOMINAL', question_count=115, position=21, active=true where id=v_colocacao;
  update public.study_lessons set title='08 - PONTUAÇÃO', question_count=115, position=22, active=true where id=v_pontuacao;

  if v_subordinacao is not null then
    update public.study_lessons set active=false where id=v_subordinacao;
    delete from public.study_schedule_block_lessons where lesson_id=v_subordinacao;
    delete from public.user_personal_schedule_items where lesson_id=v_subordinacao;
  end if;

  update public.study_lessons set position=23 where subject_id=v_subject and slug='semantica-significacao-palavras';
  update public.study_lessons set position=24 where subject_id=v_subject and slug='reescrita-substituicao-equivalencia-estruturas';

  delete from public.study_lesson_topics
  where lesson_id in (v_sint_oracao,v_sint_periodo,v_concordancia,v_regencia,v_crase,v_colocacao,v_pontuacao);

  insert into public.study_lesson_topics(lesson_id,topic,position) values
    (v_sint_oracao,'Termos essenciais: sujeito e predicado',1),
    (v_sint_oracao,'Predicação verbal: verbo intransitivo',2),
    (v_sint_oracao,'Predicação verbal: verbos transitivos',3),
    (v_sint_oracao,'Predicação verbal: verbo de ligação',4),
    (v_sint_oracao,'Termos integrantes da oração',5),
    (v_sint_oracao,'Objeto direto e objeto indireto',6),
    (v_sint_oracao,'Complemento nominal e agente da passiva',7),
    (v_sint_oracao,'Predicativo do sujeito e do objeto',8),

    (v_sint_periodo,'Frase, oração e período',1),
    (v_sint_periodo,'Período simples e período composto',2),
    (v_sint_periodo,'Coordenação e orações coordenadas',3),
    (v_sint_periodo,'Subordinação e orações subordinadas',4),
    (v_sint_periodo,'Orações subordinadas substantivas, adjetivas e adverbiais',5),
    (v_sint_periodo,'Orações reduzidas',6),
    (v_sint_periodo,'Funções sintáticas das orações subordinadas',7),

    (v_concordancia,'Concordância verbal',1),
    (v_concordancia,'Concordância com sujeito simples e composto',2),
    (v_concordancia,'Concordância com expressões partitivas e coletivas',3),
    (v_concordancia,'Concordância com pronomes relativos',4),
    (v_concordancia,'Concordância nominal',5),

    (v_regencia,'Regência verbal',1),
    (v_regencia,'Regência nominal',2),
    (v_regencia,'Transitividade e preposições exigidas',3),
    (v_regencia,'Mudança de sentido conforme a regência',4),

    (v_crase,'Crase em contexto de regência verbal',1),
    (v_crase,'Crase em contexto de regência nominal',2),
    (v_crase,'Casos obrigatórios, proibidos e facultativos',3),
    (v_crase,'Locuções e expressões com crase',4),

    (v_colocacao,'Conceitos iniciais de colocação pronominal',1),
    (v_colocacao,'Próclise',2),
    (v_colocacao,'Ênclise',3),
    (v_colocacao,'Mesóclise',4),
    (v_colocacao,'Colocação pronominal em locuções verbais',5),

    (v_pontuacao,'Ponto final',1),
    (v_pontuacao,'Dois-pontos',2),
    (v_pontuacao,'Ponto e vírgula',3),
    (v_pontuacao,'Ponto de interrogação',4),
    (v_pontuacao,'Efeitos sintáticos e semânticos da pontuação',5);
end $$;
