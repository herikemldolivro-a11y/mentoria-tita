-- ENEM 40 dias — conteúdos dos Dias 21–30.
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
21	1	matematica	Verde	Função do 1º grau P2	🟢 Interpretação/modelagem
21	2	fisica	Mista	Termologia II P2	🟢 Leis da Termodinâmica, máquinas térmicas, Carnot; Otto§🟠 Termologia II P2
21	3	quimica	Verde	Estequiometria P3	🟢 Pureza, rendimento, limitante e problemas integrados
22	1	matematica	Verde	Função do 2º grau P1	🟢 Função do 2º grau P1
22	2	fisica	Verde	Ondulatória P1	🟢 Natureza das ondas, transversal/longitudinal, velocidade/frequência/λ
22	3	biologia	Verde	Ecologia P3	🟢 Populações, relações ecológicas e sucessão
23	1	matematica	Verde	Função do 2º grau P2	🟢 Vértice, máximo/mínimo, aplicações
23	2	fisica	Verde	Ondulatória P2	🟢 Reflexão, refração, difração, interferência, ressonância
23	3	quimica	Verde	Soluções P1	🟢 Dissolução, concentração e molaridade
24	1	matematica	Verde	Geometria Plana P1	🟢 Fundamentos, ângulos, triângulos
24	2	quimica	Mista	Soluções P2	🟢 ppm, diluição, mistura; titulação§🟠 Soluções P2
24	3	biologia	Verde	Ecologia P4	🟢 Biomas, impactos antrópicos, problemas ambientais, conservação e gráficos
25	1	matematica	Verde	Geometria Plana P2	🟢 Semelhança, Tales, Pitágoras, quadriláteros
25	2	fisica	Mista	Ondulatória P3 + Óptica Geométrica	🟢/🟠 Acústica, ondas sonoras, cordas/tubos§🟠 óptica essencial
25	3	historia	Laranja	República/Vargas/Ditadura/Século XX	🟠 República Velha, Vargas, 1964–85, abertura/redemocratização; Guerras e Guerra Fria apenas conexões de alto retorno
26	1	matematica	Verde	Geometria Plana P3	🟢 Áreas, perímetros, polígonos, circunferência/arcos
26	2	fisica	Verde	Cinemática II P1	🟢 Cinemática II P1
26	3	quimica	Verde	Termoquímica P1	🟢 Entalpia e processos endo/exotérmicos
27	1	matematica	Mista	Trigonometria	🟢 Sen/cos/tan e triângulo retângulo; leis§🟠 Trigonometria
27	2	fisica	Verde	Cinemática II P2	🟢 Cinemática II P2
27	3	biologia	Verde	Genética P1	🟢 Fundamentos, 1ª Lei, heredogramas
28	1	matematica	Laranja	Função Trigonométrica	🟠 Função Trigonométrica
28	2	fisica	Verde	Dinâmica II P1	🟢 Dinâmica II P1
28	3	quimica	Mista	Termoquímica P2	🟢 Energia de ligação e cálculos§🔴 exercícios repetitivos
29	1	matematica	Verde	Geometria Espacial P1	🟢 Prismas, paralelepípedos, pirâmides
29	2	quimica	Mista	Cinética Química	🟢 Conceitos, fatores, lei da velocidade§🔴 exercício puro
29	3	biologia	Verde	Genética P2	🟢 2ª Lei, interações gênicas, doenças/probabilidade
30	1	matematica	Verde	Geometria Espacial P2	🟢 Cilindro, cone, esfera, sólidos compostos e projeção
30	2	quimica	Verde	Equilíbrio Químico P1	🟢 Conceito, constante, Le Chatelier/equilíbrio dinâmico
30	3	filosofia	Laranja	Núcleo de Filosofia ENEM	🟠 Fundamentos/Logos + Clássica → Racionalismo/Empirismo/Kant → Nietzsche/Foucault → Ética/Política
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
