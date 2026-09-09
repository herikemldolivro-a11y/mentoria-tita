-- Mentoria Titã — V9.3.9
-- Dashboard individual de desempenho em questões.

create or replace function public.get_my_question_performance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select active_study_plan_id
  into v_plan_id
  from public.profiles
  where id = v_user_id;

  if v_plan_id is null then
    return jsonb_build_object(
      'total_answered', 0,
      'correct_count', 0,
      'incorrect_count', 0,
      'accuracy', 0,
      'today_answered', 0,
      'last7_answered', 0,
      'subjects', '[]'::jsonb,
      'daily', '[]'::jsonb
    );
  end if;

  with answer_rows as (
    select
      a.id,
      a.is_correct,
      a.answered_at,
      q.subject_id,
      s.name as subject_name,
      (a.answered_at at time zone 'America/Sao_Paulo')::date as local_day
    from public.user_question_answers a
    join public.questions q
      on q.id = a.question_id
    join public.study_subjects s
      on s.id = q.subject_id
    where a.user_id = v_user_id
      and q.plan_id = v_plan_id
  ),
  overall as (
    select
      count(*)::integer as total_answered,
      count(*) filter (where is_correct)::integer as correct_count,
      count(*) filter (where not is_correct)::integer as incorrect_count,
      case
        when count(*) = 0 then 0::numeric
        else round(
          count(*) filter (where is_correct)::numeric * 100 / count(*),
          1
        )
      end as accuracy,
      count(*) filter (
        where local_day = (now() at time zone 'America/Sao_Paulo')::date
      )::integer as today_answered,
      count(*) filter (
        where local_day >= (now() at time zone 'America/Sao_Paulo')::date - 6
      )::integer as last7_answered
    from answer_rows
  ),
  subject_stats as (
    select
      subject_id,
      subject_name,
      count(*)::integer as total,
      count(*) filter (where is_correct)::integer as correct,
      count(*) filter (where not is_correct)::integer as incorrect,
      case
        when count(*) = 0 then 0::numeric
        else round(
          count(*) filter (where is_correct)::numeric * 100 / count(*),
          1
        )
      end as accuracy
    from answer_rows
    group by subject_id, subject_name
  ),
  days as (
    select generate_series(
      (now() at time zone 'America/Sao_Paulo')::date - 6,
      (now() at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as day
  ),
  daily_stats as (
    select
      d.day,
      count(a.id)::integer as total,
      count(a.id) filter (where a.is_correct)::integer as correct,
      count(a.id) filter (where a.id is not null and not a.is_correct)::integer as incorrect
    from days d
    left join answer_rows a
      on a.local_day = d.day
    group by d.day
    order by d.day
  )
  select jsonb_build_object(
    'total_answered', o.total_answered,
    'correct_count', o.correct_count,
    'incorrect_count', o.incorrect_count,
    'accuracy', o.accuracy,
    'today_answered', o.today_answered,
    'last7_answered', o.last7_answered,
    'subjects', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'subject_name', ss.subject_name,
            'total', ss.total,
            'correct', ss.correct,
            'incorrect', ss.incorrect,
            'accuracy', ss.accuracy
          )
          order by ss.total desc, ss.subject_name
        )
        from subject_stats ss
      ),
      '[]'::jsonb
    ),
    'daily', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'day', ds.day,
            'total', ds.total,
            'correct', ds.correct,
            'incorrect', ds.incorrect
          )
          order by ds.day
        )
        from daily_stats ds
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from overall o;

  return v_result;
end;
$$;

revoke all on function public.get_my_question_performance() from public;
grant execute on function public.get_my_question_performance() to authenticated;
