-- ENEM 40 dias — conteúdos dos Dias 1–10.
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
1	1	matematica	Verde	Matemática Básica + Conjuntos Numéricos	🟢 Banco: Matemática Básica + Conjuntos Numéricos. Aulas: Sistema Decimal, Operações Fundamentais, Decimais, Inteiros negativos, Conjuntos Numéricos
1	2	fisica	Mista	Energia e suas Transformações + Ferramental Matemático	🟢/🟠 Energia, regra de 3, unidades, notação e gráficos aplicados
1	3	quimica	Verde	Propriedades da Matéria	🟢 Estados físicos, mudanças, propriedades gerais/específicas, densidade
2	1	matematica	Verde	Frações + Divisibilidade + Múltiplos/Divisores	🟢 Frações + Divisibilidade + Múltiplos/Divisores
2	2	fisica	Verde	Cinemática I P1	🟢 Fundamentos do movimento, posição/deslocamento, velocidade e leitura inicial de gráficos
2	3	biologia	Verde	Fundamentos da Biologia	🟢 O que é vida, organização biológica, célula e metabolismo introdutório
3	1	matematica	Verde	MMC/MDC + Potenciação + Radiciação	🟢 MMC/MDC + Potenciação + Radiciação
3	2	fisica	Mista	Cinemática I P2	🟢 Continuação + gráficos/aplicações§🔴 resolução repetitiva
3	3	quimica	Verde	Separação de Misturas P1	🟢 Métodos e identificação das misturas
4	1	matematica	Verde	Razão	🟢 Razão
4	2	quimica	Mista	Separação de Misturas P2	🟢 Processos restantes + tratamento de água/esgoto/mineração§🟠 Separação de Misturas P2
4	3	biologia	Verde	Citologia: Células + Membrana	🟢 Procariontes/eucariontes, membrana, estrutura e transportes principais
5	1	matematica	Verde	Proporção + Grandezas Proporcionais	🟢 Proporção + Grandezas Proporcionais
5	2	fisica	Verde	Dinâmica I P1	🟢 Fundamentos, forças, Leis de Newton
5	3	geografia	Laranja	Econômica/Industrialização/Globalização	🟠 Capitalismo, fases, indústria, DIT, globalização e conexões
6	1	matematica	Verde	Regra de Três Simples	🟢 Regra de Três Simples
6	2	fisica	Verde	Dinâmica I P2	🟢 Aplicações das forças e Leis de Newton
6	3	quimica	Verde	Atomística	🟢 Modelos atômicos, íons, isótopos/isóbaros/isótonos, leis ponderais
7	1	matematica	Verde	Regra de Três Composta + Divisão Proporcional + Avançada	🟢 Regra de Três Composta + Divisão Proporcional + Avançada
7	2	fisica	Verde	Potência e Eficiência	🟢 Potência e Eficiência
7	3	biologia	Verde	Organelas + Transportes	🟢 Núcleo, ribossomos, organelas e transportes celulares
8	1	matematica	Verde	Porcentagem P1	🟢 Conceitos, taxa, cálculo básico
8	2	fisica	Verde	Eletrodinâmica P1	🟢 Corrente, efeitos da corrente, conceitos fundamentais
8	3	quimica	Verde	Tabela Periódica e Propriedades	🟢 Tabela Periódica e Propriedades
9	1	matematica	Verde	Porcentagem P2	🟢 Aumentos/reduções, sucessivas, reversa
9	2	fisica	Verde	Eletrodinâmica P2	🟢 1ª/2ª Lei de Ohm, resistores e circuitos básicos
9	3	biologia	Mista	Divisão Celular	🟢 Mitose, meiose, ploidia§🟠 cromossomos/aneuploidias
10	1	matematica	Verde	Conversão de Unidades + Notação Científica	🟢 Conversão de Unidades + Notação Científica
10	2	quimica	Verde	Ligações Químicas P1	🟢 Iônica, covalente e coordenada
10	3	historia	Laranja	Brasil Colônia + Escravidão / transição para Império	🟠 Plantation, açúcar, sociedade colonial, escravidão, crise colonial, Corte e Independência
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
