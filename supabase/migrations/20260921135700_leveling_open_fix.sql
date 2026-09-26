-- CorreÃ§Ã£o dos nivelamentos da Mentoria TitÃ£.
-- O banco LIVE jÃ¡ recebeu esta correÃ§Ã£o; este arquivo mantÃ©m o projeto local sincronizado.

create or replace function public.mt_manual_level_state(
  p_user_id uuid,
  p_plan_id uuid,
  p_lesson_id uuid,
  p_level integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_available integer:=0;
  v_revision_done boolean:=false;
  v_passed boolean:=false;
  v_attempt_id uuid;
  v_score integer;
  v_total integer;
  v_best integer;
  v_calendar_passed boolean:=false;
begin
  select count(*)::integer into v_available
  from public.questions q
  where q.plan_id=p_plan_id
    and q.lesson_id=p_lesson_id
    and q.active=true
    and q.level=p_level
    and public.mt_question_visible_to_user(q.id,p_user_id);

  select (
    exists(
      select 1 from public.user_revisions r
      where r.user_id=p_user_id
        and r.lesson_id=p_lesson_id
        and r.revision_number=p_level
        and r.status='completed'
    )
    or exists(
      select 1 from public.user_list_reviews r
      where r.user_id=p_user_id
        and r.lesson_id=p_lesson_id
        and r.review_number=p_level
        and r.status='completed'
    )
  ) into v_revision_done;

  select exists(
    select 1 from public.question_attempts a
    where a.user_id=p_user_id
      and a.lesson_id=p_lesson_id
      and a.kind='leveling'
      and a.manual_leveling_level=p_level
      and a.status='completed'
      and coalesce(a.score,0)>=coalesce(a.required_correct,ceil(a.total*.9)::integer)
  ) into v_passed;

  select exists(
    select 1 from public.user_leveling_schedule ls
    where ls.user_id=p_user_id
      and ls.lesson_id=p_lesson_id
      and ls.leveling_number=p_level
      and ls.status='completed'
  ) into v_calendar_passed;

  v_passed:=v_passed or v_calendar_passed;

  select a.id,a.score,a.total
  into v_attempt_id,v_score,v_total
  from public.question_attempts a
  where a.user_id=p_user_id
    and a.lesson_id=p_lesson_id
    and a.kind='leveling'
    and a.manual_leveling_level=p_level
    and a.status='in_progress'
  order by a.started_at desc
  limit 1;

  select max(coalesce(a.score,0))
  into v_best
  from public.question_attempts a
  where a.user_id=p_user_id
    and a.lesson_id=p_lesson_id
    and a.kind='leveling'
    and a.manual_leveling_level=p_level
    and a.status='completed';

  return jsonb_build_object(
    'level',p_level,
    'available_count',v_available,
    'revision_completed',v_revision_done,
    'unlocked',v_revision_done,
    'no_questions',v_available<10,
    'attempt_id',v_attempt_id,
    'status',case
      when v_passed then 'completed'
      when v_attempt_id is not null then 'in_progress'
      else null
    end,
    'score',coalesce(v_score,v_best),
    'total',v_total,
    'passed',v_passed,
    'locked_reason',case
      when not v_revision_done then 'Conclua a RevisÃ£o '||p_level::text||' desta aula'
      when v_available<10 then 'Banco insuficiente neste nÃ­vel: '||v_available::text||'/10 questÃµes disponÃ­veis.'
      else null
    end
  );
end;
$$;

create or replace function public.get_leveling_rule(p_revision_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.user_revisions%rowtype;
  v_plan_id uuid;
  v_level integer;
  v_count integer;
  v_required integer;
  v_available integer;
begin
  if v_user_id is null then raise exception 'UsuÃ¡rio nÃ£o autenticado'; end if;

  select * into v_revision
  from public.user_revisions
  where id=p_revision_id and user_id=v_user_id;

  if v_revision.id is null then raise exception 'RevisÃ£o nÃ£o encontrada'; end if;

  select active_study_plan_id into v_plan_id
  from public.profiles
  where id=v_user_id;

  v_level:=least(greatest(v_revision.revision_number,1),4);

  select question_count,required_correct
  into v_count,v_required
  from public.lesson_leveling_stages
  where lesson_id=v_revision.lesson_id
    and stage_number=v_level
    and active=true
  limit 1;

  if v_count is null then v_count:=10; end if;
  if v_required is null then v_required:=least(9,v_count); end if;

  select count(*) into v_available
  from public.questions q
  where q.plan_id=v_plan_id
    and q.lesson_id=v_revision.lesson_id
    and q.active=true
    and q.level=v_level
    and public.mt_question_visible_to_user(q.id,v_user_id);

  return jsonb_build_object(
    'revision_id',v_revision.id,
    'lesson_id',v_revision.lesson_id,
    'stage_number',v_level,
    'question_count',v_count,
    'required_correct',v_required,
    'available_questions',v_available
  );
end;
$$;
