-- ENEM 40 dias — conteúdos dos Dias 11–20.
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
11	1	matematica	Verde	Escalas + Vazão	🟢 Escalas + Vazão
11	2	fisica	Mista	Eletrodinâmica P3	🟢/🟠 Kirchhoff, geradores, receptores, capacitores§🔴 Ponte de Wheatstone se consumir muito tempo
11	3	quimica	Mista	Ligações P2 + Geometria Molecular	🟢 Polaridade, geometrias, interações intermoleculares, metálica§🟠 Ligações P2 + Geometria Molecular
12	1	matematica	Verde	Gráficos e Tabelas	🟢 Gráficos e Tabelas
12	2	fisica	Mista	Eletrostática	🟢 Eletrização, Coulomb, campo, potencial; Faraday§🟠 Eletrostática
12	3	biologia	Verde	Metabolismo I: Respiração + Fermentação	🟢 Glicólise, Krebs, fosforilação, fermentações
13	1	matematica	Mista	Estatística	🟢 Média, mediana, moda, ponderada; dispersão§🟠 Estatística
13	2	fisica	Verde	Termologia I P1	🟢 Termometria, estados físicos e mudanças de fase
13	3	quimica	Verde	Química Inorgânica P1	🟢 NOX, ácidos e bases
14	1	matematica	Verde	Matemática Financeira P1	🟢 Aumentos, descontos, inflação, lucro/prejuízo
14	2	quimica	Verde	Química Inorgânica P2	🟢 Óxidos, sais, neutralização e reações inorgânicas
14	3	biologia	Verde	Metabolismo II	🟢 Fotossíntese, fase fotoquímica, Calvin; Quimiossíntese
15	1	matematica	Verde	Matemática Financeira P2	🟢 Juros simples/compostos e parcelamentos
15	2	biologia	Verde	Bioquímica	🟢 Enzimas, proteínas, biomoléculas, vitaminas
15	3	linguagens	Laranja	Funções + Figuras + Tipologias, núcleo ENEM	🟠 Funções da linguagem; figuras mais cobradas; narrativa, descrição, argumentação, exposição e injunção
16	1	matematica	Verde	Conjuntos + Expressões Algébricas	🟢 Conjuntos + Expressões Algébricas
16	2	fisica	Verde	Termologia I P2	🟢 Calorimetria, calor sensível, capacidade térmica e trocas
16	3	quimica	Verde	Estequiometria P1	🟢 Fundamentos + primeiros cálculos
17	1	matematica	Verde	Produtos Notáveis + Fatoração	🟢 Produtos Notáveis + Fatoração
17	2	fisica	Mista	Termologia I P3	🟢/🟠 Dilatação térmica, líquidos, mecanismos de transmissão/isolamento
17	3	biologia	Verde	Biologia Molecular P1	🟢 Bases nitrogenadas, DNA/RNA, estruturas
18	1	matematica	Verde	Equações do 1º grau + Sistemas	🟢 Equações do 1º grau + Sistemas
18	2	fisica	Verde	Termologia II P1	🟢 Gases e transformações termodinâmicas
18	3	biologia	Mista	Biologia Molecular P2	🟢 Replicação, transcrição, tradução, código genético; splicing§🟠 Biologia Molecular P2
19	1	matematica	Verde	Equação do 2º grau + Inequações	🟢 Equação do 2º grau + Inequações
19	2	quimica	Verde	Estequiometria P2	🟢 Estequiometria P2
19	3	biologia	Verde	Ecologia P1	🟢 Conceitos, ecossistemas, cadeias, teias e pirâmides
20	1	matematica	Verde	Função do 1º grau P1	🟢 Função do 1º grau P1
20	2	biologia	Verde	Ecologia P2	🟢 Ciclos biogeoquímicos e fluxo de energia/matéria
20	3	geografia	Laranja	Urbana/Demografia + Agrária/Ambiental	🟠 Urbanização, migração, transição demográfica, estrutura fundiária, reforma agrária, Revolução Verde e impactos
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
