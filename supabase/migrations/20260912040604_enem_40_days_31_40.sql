-- ENEM 40 dias — conteúdos dos Dias 31–40.
do $$
declare
  v_plan uuid;
  v_week uuid;
  v_subject uuid;
  v_lesson uuid;
  v_topic text;
  v_topic_pos integer;
  r record;
begin
  select id into v_plan from public.study_plans where slug='enem-plano-40-dias';
  if v_plan is null then raise exception 'Plano ENEM 40 dias ainda não foi criado'; end if;

  for r in
    select
      split_part(line,E'\t',1)::integer as study_day,
      split_part(line,E'\t',2)::integer as block_number,
      split_part(line,E'\t',3) as subject_slug,
      split_part(line,E'\t',4) as priority,
      split_part(line,E'\t',5) as lesson_title,
      split_part(line,E'\t',6) as topics
    from regexp_split_to_table($matrix$
31	1	matematica	Laranja	Geometria Analítica	🟠 Plano, reta, distância, ponto médio, circunferência
31	2	fisica	Verde	Dinâmica II P2	🟢 Dinâmica II P2
31	3	quimica	Mista	Equilíbrio Químico P2	🟢/🟠 pH/equilíbrio iônico, hidrólise, tampão, Kps
32	1	matematica	Verde	Progressão Aritmética	🟢 Progressão Aritmética
32	2	fisica	Mista	Dinâmica III	🟢/🟠 Dinâmica III
32	3	biologia	Verde	Genética P3	🟢 ABO/Rh, Biotecnologia e Engenharia Genética
33	1	matematica	Mista	PG	🟢 Termo geral, soma e crescimento§🔴 Fibonacci/sequências lógicas só relance
33	2	quimica	Verde	Eletroquímica P1	🟢 NOX, oxirredução, balanceamento, pilhas
33	3	biologia	Verde	Evolução + Classificação	🟢 Origem da vida, Darwin/Lamarck/Neodarwinismo, especiação, cladogramas/taxonomia
34	1	matematica	Verde	Análise Combinatória P1	🟢 PFC + permutação
34	2	quimica	Verde	Eletroquímica P2	🟢 Eletrólise, corrosão e proteção
34	3	biologia	Verde	Fisiologia P1	🟢 Digestório + cardiorrespiratório
35	1	matematica	Verde	Análise Combinatória P2	🟢 Arranjo + combinação
35	2	biologia	Verde	Fisiologia P2	🟢 Endócrino + Nervoso + Imunológico
35	3	sociologia	Laranja	Núcleo Sociologia ENEM	🟠 Cultura/identidade + Comte/Durkheim/Marx/Weber + consciência coletiva + trabalho/política/movimentos sociais + indústria cultural
36	1	matematica	Verde	Probabilidade P1	🟢 Espaço amostral, eventos, união/interseção/complementar
36	2	fisica	Verde	Estática + Hidrostática	🟢 Equilíbrio/torque + pressão, empuxo e princípios fundamentais
36	3	quimica	Mista	Radioatividade + Química Ambiental	🟢/🟠 Emissões/meia-vida + tratamento de água, poluição, petróleo/energia e sustentabilidade
37	1	matematica	Verde	Probabilidade P2	🟢 Independência + condicional + combinatória
37	2	fisica	Mista	Magnetismo e Eletromagnetismo	🟠/🟢 Campo magnético, indução e aplicações ENEM
37	3	biologia	Mista	Botânica	🟢 Grupos, vasos, fisiologia, fitormônios, tropismos; reprodução/morfologia§🟠 Botânica
38	1	matematica	Laranja	Função Exponencial	🟠 Função Exponencial
38	2	fisica	Laranja	fechamento do núcleo / aplicações finais de Magnetismo, se necessário	🟠 Se o capítulo já estiver terminado no Dia 37, este bloco vira fechamento de Física com tópicos residuais identificados no curso, sem revisão geral
38	3	quimica	Verde	Química Orgânica P1	🟢 Fundamentos, cadeias, nomenclatura e funções
39	1	matematica	Laranja	Logaritmo + Função Logarítmica	🟠 Logaritmo + Função Logarítmica
39	2	quimica	Verde	Química Orgânica P2	🟢 Propriedades + isomeria§🟢 Continuação no mesmo bloco: reações orgânicas, polímeros, saponificação/detergentes e petróleo
39	3	biologia	Mista	Doenças + Histologia + Zoologia	🟢/🟠 Doenças prioritárias, tecido muscular, artrópodes/cordados; filos restantes seletivos
40	1	matematica	Laranja	Matrizes + Função Racional	🟠 Fecha Matemática
40	2	biologia	Verde	Fisiologia P3	🟢 Excretor + Hematopoiético + Reprodutor. Fecha Biologia
40	3	linguagens	Laranja	Núcleo final ENEM	🟠 Variações linguísticas + campanhas/charges + coesão/progressão + interpretação crítica + poemas/literatura seletiva
$matrix$,E'\n') line
    where btrim(line)<>''
  loop
    select id into v_week from public.study_weeks where plan_id=v_plan and week_number=r.study_day;
    select id into v_subject from public.study_subjects where plan_id=v_plan and slug=r.subject_slug;

    insert into public.study_lessons(subject_id,week_id,slug,title,priority,position,question_count,pdf_path,active)
    values(v_subject,v_week,'dia-'||r.study_day||'-bloco-'||r.block_number||'-'||r.subject_slug,r.lesson_title,r.priority,r.block_number,35,null,true)
    on conflict(subject_id,slug) do update set
      week_id=excluded.week_id,title=excluded.title,priority=excluded.priority,position=excluded.position,
      question_count=excluded.question_count,pdf_path=null,active=true
    returning id into v_lesson;

    delete from public.study_lesson_topics where lesson_id=v_lesson;
    v_topic_pos:=0;
    foreach v_topic in array string_to_array(r.topics,'§') loop
      v_topic_pos:=v_topic_pos+1;
      insert into public.study_lesson_topics(lesson_id,topic,position) values(v_lesson,v_topic,v_topic_pos);
    end loop;
  end loop;
end
$$;
