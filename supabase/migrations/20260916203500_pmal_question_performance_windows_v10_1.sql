create or replace function public.get_my_question_performance_window(p_window text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_mode text := lower(coalesce(p_window, '7d'));
  v_start timestamptz;
  v_end timestamptz := now();
  v_today_brazil date := (now() at time zone 'America/Sao_Paulo')::date;
  v_series jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_correct integer := 0;
  v_incorrect integer := 0;
  v_accuracy numeric := 0;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  if v_mode not in ('24h','7d','30d') then v_mode := '7d'; end if;

  if v_mode = '24h' then
    v_start := date_trunc('hour', now()) - interval '23 hours';
    with buckets as (
      select generate_series(v_start, date_trunc('hour', now()), interval '1 hour') as bucket_start
    ), agg as (
      select date_trunc('hour', answered_at) as bucket_start,
             count(*)::integer as total,
             count(*) filter (where is_correct)::integer as correct,
             count(*) filter (where not is_correct)::integer as incorrect
      from public.user_question_answers
      where user_id=v_user and answered_at>=v_start and answered_at<=v_end
      group by 1
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'label',to_char(b.bucket_start at time zone 'America/Sao_Paulo','HH24"h"'),
      'bucket_start',b.bucket_start,
      'total',coalesce(a.total,0),
      'correct',coalesce(a.correct,0),
      'incorrect',coalesce(a.incorrect,0)
    ) order by b.bucket_start),'[]'::jsonb)
    into v_series
    from buckets b left join agg a using(bucket_start);
  else
    v_start := (((v_today_brazil - case when v_mode='30d' then 29 else 6 end)::date)::timestamp at time zone 'America/Sao_Paulo');
    with days as (
      select generate_series(
        v_today_brazil - case when v_mode='30d' then 29 else 6 end,
        v_today_brazil,
        interval '1 day'
      )::date as day
    ), agg as (
      select (answered_at at time zone 'America/Sao_Paulo')::date as day,
             count(*)::integer as total,
             count(*) filter (where is_correct)::integer as correct,
             count(*) filter (where not is_correct)::integer as incorrect
      from public.user_question_answers
      where user_id=v_user and answered_at>=v_start and answered_at<=v_end
      group by 1
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'label',to_char(d.day,'DD/MM'),
      'bucket_start',d.day,
      'total',coalesce(a.total,0),
      'correct',coalesce(a.correct,0),
      'incorrect',coalesce(a.incorrect,0)
    ) order by d.day),'[]'::jsonb)
    into v_series
    from days d left join agg a using(day);
  end if;

  select count(*)::integer,
         count(*) filter (where is_correct)::integer,
         count(*) filter (where not is_correct)::integer
  into v_total,v_correct,v_incorrect
  from public.user_question_answers
  where user_id=v_user and answered_at>=v_start and answered_at<=v_end;

  if v_total>0 then v_accuracy:=round((v_correct::numeric/v_total::numeric)*100,1); end if;
  return jsonb_build_object('window',v_mode,'total',v_total,'correct',v_correct,'incorrect',v_incorrect,'accuracy',v_accuracy,'series',v_series);
end;
$$;

revoke all on function public.get_my_question_performance_window(text) from public, anon;
grant execute on function public.get_my_question_performance_window(text) to authenticated;
