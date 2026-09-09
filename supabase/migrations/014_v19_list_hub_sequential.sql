-- Mentoria Tita V1.9 - catalogo de listas com Semana > Dia > Materia > Aula,
-- topicos e desbloqueio sequencial 1 -> 2 -> 3.
create or replace function public.get_list_learning_hub() returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_plan_id uuid; v_catalog jsonb; v_reviews jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;
  with day_map as (
    select b.week_id,b.study_date,dense_rank() over(partition by b.week_id order by b.study_date)::integer day_number
    from public.study_schedule_blocks b join public.study_weeks w on w.id=b.week_id
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90
    group by b.week_id,b.study_date
  ), base as (
    select distinct w.week_number,dm.day_number,b.study_date,l.id lesson_id,l.title lesson_title,l.slug lesson_slug,l.question_count,
      s.name subject_name,s.slug subject_slug,(lp.theory_completed_at is not null) theory_completed,(lp.list_completed_at is not null) list_completed,
      (select count(*)::integer from public.questions q where q.plan_id=v_plan_id and q.lesson_id=l.id and q.active=true) available_count,
      coalesce((select jsonb_agg(t.topic order by t.position) from public.study_lesson_topics t where t.lesson_id=l.id),'[]'::jsonb) topics,
      a1.id a1_id,a1.status a1_status,a1.score a1_score,a1.total a1_total,
      a2.id a2_id,a2.status a2_status,a2.score a2_score,a2.total a2_total,
      a3.id a3_id,a3.status a3_status,a3.score a3_score,a3.total a3_total
    from public.study_weeks w
    join public.study_schedule_blocks b on b.week_id=w.id
    join day_map dm on dm.week_id=b.week_id and dm.study_date=b.study_date
    join public.study_schedule_block_lessons bl on bl.block_id=b.id
    join public.study_lessons l on l.id=bl.lesson_id and l.active=true
    join public.study_subjects s on s.id=l.subject_id and s.active=true
    left join public.user_lesson_progress lp on lp.user_id=v_user_id and lp.lesson_id=l.id
    left join lateral(select qa.id,qa.status,qa.score,qa.total from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=1 order by qa.started_at desc limit 1) a1 on true
    left join lateral(select qa.id,qa.status,qa.score,qa.total from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=2 order by qa.started_at desc limit 1) a2 on true
    left join lateral(select qa.id,qa.status,qa.score,qa.total from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.practice_list_number=3 order by qa.started_at desc limit 1) a3 on true
    where w.plan_id=v_plan_id and w.active=true and w.week_number<90
  ), rows as (
    select base.*,
      jsonb_build_array(
        jsonb_build_object('list_number',1,'size',least(35,greatest(1,question_count)),'target_size',least(35,greatest(1,question_count)),'unlocked',available_count>0,'locked_reason',case when available_count=0 then 'Sem questões disponíveis' else null end,'attempt_id',a1_id,'status',a1_status,'score',a1_score,'actual_size',coalesce(a1_total,least(least(35,greatest(1,question_count)),available_count))),
        jsonb_build_object('list_number',2,'size',20,'target_size',20,'unlocked',coalesce(a1_status='completed',false) and available_count>=least(35,greatest(1,question_count))+20,'locked_reason',case when coalesce(a1_status='completed',false)=false then 'Conclua a Lista 1' when available_count<least(35,greatest(1,question_count))+20 then 'Aguardando mais questões' else null end,'attempt_id',a2_id,'status',a2_status,'score',a2_score,'actual_size',coalesce(a2_total,20)),
        jsonb_build_object('list_number',3,'size',15,'target_size',15,'unlocked',coalesce(a2_status='completed',false) and available_count>=least(35,greatest(1,question_count))+35,'locked_reason',case when coalesce(a2_status='completed',false)=false then 'Conclua a Lista 2' when available_count<least(35,greatest(1,question_count))+35 then 'Aguardando mais questões' else null end,'attempt_id',a3_id,'status',a3_status,'score',a3_score,'actual_size',coalesce(a3_total,15))
      ) practice_lists
    from base
  )
  select coalesce(jsonb_agg((to_jsonb(rows)-'a1_id'-'a1_status'-'a1_score'-'a1_total'-'a2_id'-'a2_status'-'a2_score'-'a2_total'-'a3_id'-'a3_status'-'a3_score'-'a3_total') order by week_number,day_number,subject_name,lesson_title),'[]'::jsonb)
  into v_catalog from rows;

  with rr as (
    select r.id,r.review_number,r.recommended_for,r.scheduled_for,r.status,r.wrong_count,r.new_count,
      l.id lesson_id,l.title lesson_title,l.slug lesson_slug,s.name subject_name,s.slug subject_slug,
      (select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.list_review_id=r.id order by qa.started_at desc limit 1) attempt_id
    from public.user_list_reviews r
    join public.study_lessons l on l.id=r.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    where r.user_id=v_user_id and s.plan_id=v_plan_id
    order by coalesce(r.scheduled_for,r.recommended_for),r.review_number
  ) select coalesce(jsonb_agg(to_jsonb(rr)),'[]'::jsonb) into v_reviews from rr;
  return jsonb_build_object('catalog',v_catalog,'reviews',v_reviews);
end $$;
