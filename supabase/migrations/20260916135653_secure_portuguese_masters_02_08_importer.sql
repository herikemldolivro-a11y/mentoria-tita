create or replace function public.mt_import_portuguese_masters_02_08_v1(p_lesson_slug text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_plan uuid;
  v_subject uuid;
  v_lesson uuid;
  v_count integer:=0;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  if not exists(select 1 from public.profiles where id=v_user and role='admin') then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if p_lesson_slug not in (
    'sintaxe-oracao-termos-oracao','coordenacao','concordancia-verbal-nominal',
    'regencia-verbal-nominal','crase','colocacao-pronominal','pontuacao'
  ) then
    raise exception 'Aula de destino não autorizada: %',p_lesson_slug;
  end if;

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

  select l.id into v_lesson
  from public.study_lessons l
  where l.subject_id=v_subject and l.slug=p_lesson_slug and l.active=true
  limit 1;

  if v_plan is null or v_subject is null or v_lesson is null then
    raise exception 'Plano, matéria ou aula não encontrados';
  end if;

  if jsonb_typeof(p_items) <> 'array' then raise exception 'Pacote inválido'; end if;

  update public.questions
  set active=false,updated_at=now()
  where lesson_id=v_lesson and active=true;

  insert into public.questions(
    id,plan_id,subject_id,lesson_id,statement,question_type,choices,level,banca,ano,
    exam_name,source_code,active,created_by,source_type,updated_at
  )
  select
    x.id,v_plan,v_subject,v_lesson,x.statement,x.question_type,x.choices,x.level,x.banca,x.ano,
    x.exam_name,x.source_code,true,v_user,x.source_type,now()
  from jsonb_to_recordset(p_items) as x(
    id uuid, statement text, question_type text, choices jsonb, level smallint,
    banca text, ano integer, exam_name text, source_code text, source_type text,
    correct_answer text, explanation text
  )
  on conflict(id) do update set
    plan_id=excluded.plan_id,subject_id=excluded.subject_id,lesson_id=excluded.lesson_id,
    statement=excluded.statement,question_type=excluded.question_type,choices=excluded.choices,
    level=excluded.level,banca=excluded.banca,ano=excluded.ano,exam_name=excluded.exam_name,
    source_code=excluded.source_code,active=true,source_type=excluded.source_type,updated_at=now();

  insert into public.question_keys(question_id,correct_answer,explanation,updated_at)
  select x.id,x.correct_answer,x.explanation,now()
  from jsonb_to_recordset(p_items) as x(id uuid,correct_answer text,explanation text)
  on conflict(question_id) do update
  set correct_answer=excluded.correct_answer,
      explanation=excluded.explanation,
      updated_at=now();

  select count(*) into v_count
  from public.questions
  where lesson_id=v_lesson and active=true;

  update public.study_lessons
  set question_count=greatest(v_count,1)
  where id=v_lesson;

  return jsonb_build_object('ok',true,'lesson_slug',p_lesson_slug,'imported',v_count);
end $$;

revoke all on function public.mt_import_portuguese_masters_02_08_v1(text,jsonb) from public,anon;
grant execute on function public.mt_import_portuguese_masters_02_08_v1(text,jsonb) to authenticated;
