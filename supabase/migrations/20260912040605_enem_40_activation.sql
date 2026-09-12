-- Ativação segura de perfil/plano e geração do calendário fixo do ENEM.
create or replace function public.activate_study_contest(p_contest_slug text,p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_contest uuid;
  v_plan uuid;
  v_plan_slug text;
  v_existing integer:=0;
  v_pos integer:=0;
  v_minutes integer;
  r record;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;

  select c.id into v_contest from public.contests c where c.slug=p_contest_slug and c.ativo=true;
  if v_contest is null then raise exception 'Concurso/perfil indisponível'; end if;

  select p.id,p.slug into v_plan,v_plan_slug
  from public.study_plans p
  where p.contest_id=v_contest and p.active=true
  order by p.is_default desc,p.created_at
  limit 1;
  if v_plan is null then raise exception 'Este perfil ainda não possui matriz ativa'; end if;

  select coalesce(daily_study_minutes,300) into v_minutes from public.profiles where id=v_user;

  update public.profiles set
    focus_contest_id=v_contest,
    active_study_plan_id=v_plan,
    nome=coalesce(nullif(trim(p_name),''),nome),
    daily_study_minutes=case when v_plan_slug='enem-plano-40-dias' then coalesce(v_minutes,300) else daily_study_minutes end,
    schedule_target_weeks=case when v_plan_slug='enem-plano-40-dias' then 6 else schedule_target_weeks end,
    schedule_weeks=case when v_plan_slug='enem-plano-40-dias' then 6 else schedule_weeks end,
    onboarding_completed_at=coalesce(onboarding_completed_at,now())
  where id=v_user;

  if v_plan_slug='enem-plano-40-dias' then
    insert into public.user_subject_preferences(user_id,subject_id,weight,recommended_weight)
    select v_user,s.id,m.recommended_weight,m.recommended_weight
    from public.study_subjects s
    join public.subject_matrix_settings m on m.subject_id=s.id
    where s.plan_id=v_plan and s.active=true
    on conflict(user_id,subject_id) do update set recommended_weight=excluded.recommended_weight,updated_at=now();

    select count(*) into v_existing
    from public.user_personal_schedule_items
    where user_id=v_user and plan_id=v_plan;

    if v_existing=0 then
      for r in
        select l.id lesson_id,s.id subject_id,w.week_number study_day,l.position block_number,
          case when s.slug='matematica' then 90 when s.slug in('fisica','quimica','biologia') then 75 else 50 end estimated_minutes
        from public.study_lessons l
        join public.study_subjects s on s.id=l.subject_id
        join public.study_weeks w on w.id=l.week_id
        where s.plan_id=v_plan and s.active=true and l.active=true and w.active=true
        order by w.week_number,l.position
      loop
        v_pos:=v_pos+1;
        insert into public.user_personal_schedule_items(user_id,plan_id,subject_id,lesson_id,scheduled_for,study_day,week_number,position,estimated_minutes)
        values(v_user,v_plan,r.subject_id,r.lesson_id,current_date+(r.study_day-1),r.study_day,((r.study_day-1)/7)+1,v_pos,r.estimated_minutes)
        on conflict(user_id,lesson_id) do nothing;
      end loop;
      update public.profiles set schedule_generated_at=now() where id=v_user;
    end if;
  end if;

  return jsonb_build_object(
    'ok',true,'contest_slug',p_contest_slug,'plan_id',v_plan,'plan_slug',v_plan_slug,
    'fixed_40_days',v_plan_slug='enem-plano-40-dias'
  );
end
$$;

revoke all on function public.activate_study_contest(text,text) from public;
grant execute on function public.activate_study_contest(text,text) to authenticated;
