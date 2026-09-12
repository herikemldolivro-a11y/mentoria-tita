-- ENEM · Plano 40 Dias — CFO PMPB
-- Estrutura base: perfil, plano, 40 dias, matérias e pesos estratégicos.
do $$
declare
  v_contest uuid;
  v_plan uuid;
  v_subject uuid;
  i integer;
  r record;
begin
  insert into public.contests(slug,nome,sigla,logo_path,ativo)
  values('enem-40-dias','ENEM · Plano 40 Dias — CFO PMPB','ENEM 40D',null,true)
  on conflict(slug) do update set nome=excluded.nome,sigla=excluded.sigla,logo_path=null,ativo=true;

  select id into v_contest from public.contests where slug='enem-40-dias';

  insert into public.study_plans(contest_id,slug,name,is_default,active)
  values(v_contest,'enem-plano-40-dias','ENEM · Plano 40 Dias — CFO PMPB',true,true)
  on conflict(slug) do update set contest_id=excluded.contest_id,name=excluded.name,is_default=true,active=true;

  select id into v_plan from public.study_plans where slug='enem-plano-40-dias';

  for i in 1..40 loop
    insert into public.study_weeks(plan_id,week_number,title,position,active)
    values(v_plan,i,'Dia '||i,i,true)
    on conflict(plan_id,week_number) do update set title=excluded.title,position=excluded.position,active=true;
  end loop;

  for r in
    select * from (values
      ('matematica','MATEMÁTICA','Matemática','P0 · Base diária do plano ENEM 40 dias.',1,2.50,2.50,100,100,80,20,10),
      ('fisica','FÍSICA','Física','P1 · Ciências da Natureza com foco em alto retorno ENEM.',2,2.10,1.75,95,90,70,20,10),
      ('quimica','QUÍMICA','Química','P1 · Ciências da Natureza com foco em alto retorno ENEM.',3,2.10,1.75,95,90,70,20,10),
      ('biologia','BIOLOGIA','Biologia','P2 · Ciências da Natureza com foco em alto retorno ENEM.',4,1.80,1.50,88,85,65,20,10),
      ('geografia','GEOGRAFIA','Geografia','P3 · Humanas seletiva, apenas pontos de maior retorno.',5,.85,.50,65,70,45,15,5),
      ('historia','HISTÓRIA','História','P3 · Humanas seletiva, com foco em Brasil e século XX.',6,.85,.50,65,70,45,15,5),
      ('linguagens','LINGUAGENS','Linguagens','P4 · Linguagens seletiva, apenas núcleo de maior retorno ENEM.',7,.75,.45,55,65,45,15,5),
      ('filosofia','FILOSOFIA','Filosofia','P4 · Filosofia seletiva para o ENEM.',8,.65,.40,50,60,40,15,5),
      ('sociologia','SOCIOLOGIA','Sociologia','P4 · Sociologia seletiva para o ENEM.',9,.65,.40,50,60,40,15,5)
    ) x(slug,short_name,name,description,position,recommended_weight,minimum_weight,priority_score,incidence_score,theory_minutes,question_minutes,rest_minutes)
  loop
    insert into public.study_subjects(plan_id,slug,short_name,name,description,position,active)
    values(v_plan,r.slug,r.short_name,r.name,r.description,r.position,true)
    on conflict(plan_id,slug) do update set short_name=excluded.short_name,name=excluded.name,description=excluded.description,position=excluded.position,active=true
    returning id into v_subject;

    insert into public.subject_matrix_settings(subject_id,recommended_weight,minimum_weight,priority_score,incidence_score,theory_minutes,question_minutes,rest_minutes,notes)
    values(v_subject,r.recommended_weight,r.minimum_weight,r.priority_score,r.incidence_score,r.theory_minutes,r.question_minutes,r.rest_minutes,'ENEM 40 dias · matriz fixa')
    on conflict(subject_id) do update set
      recommended_weight=excluded.recommended_weight,minimum_weight=excluded.minimum_weight,
      priority_score=excluded.priority_score,incidence_score=excluded.incidence_score,
      theory_minutes=excluded.theory_minutes,question_minutes=excluded.question_minutes,
      rest_minutes=excluded.rest_minutes,notes=excluded.notes,updated_at=now();
  end loop;
end
$$;
