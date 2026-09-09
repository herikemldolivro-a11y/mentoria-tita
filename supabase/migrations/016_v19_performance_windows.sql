-- Mentoria Tita V1.9 - desempenho filtrável por 24h, 7d ou 30d.
create or replace function public.get_my_question_performance_window(p_window text default '7d')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_plan_id uuid;v_reset timestamptz;v_window_start timestamptz;v_start timestamptz;v_result jsonb;v_days integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado';end if;
  if p_window not in ('24h','7d','30d') then raise exception 'Janela inválida';end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  select reset_at into v_reset from public.user_performance_resets where user_id=v_user_id;
  v_window_start:=case p_window when '24h' then now()-interval '24 hours' when '7d' then now()-interval '7 days' else now()-interval '30 days' end;
  v_start:=case when v_reset is null then v_window_start else greatest(v_reset,v_window_start) end;
  v_days:=case p_window when '24h' then 1 when '7d' then 7 else 30 end;
  if v_plan_id is null then return jsonb_build_object('window',p_window,'total_answered',0,'correct_count',0,'incorrect_count',0,'accuracy',0,'subjects','[]'::jsonb,'daily','[]'::jsonb);end if;
  with answer_rows as(
    select a.id,a.is_correct,a.answered_at,q.subject_id,s.name subject_name,(a.answered_at at time zone 'America/Sao_Paulo')::date local_day
    from public.user_question_answers a join public.questions q on q.id=a.question_id join public.study_subjects s on s.id=q.subject_id
    where a.user_id=v_user_id and q.plan_id=v_plan_id and a.answered_at>=v_start
  ), overall as(
    select count(*)::integer total_answered,count(*) filter(where is_correct)::integer correct_count,count(*) filter(where not is_correct)::integer incorrect_count,
      case when count(*)=0 then 0::numeric else round(count(*) filter(where is_correct)::numeric*100/count(*),1) end accuracy from answer_rows
  ), subject_stats as(
    select subject_id,subject_name,count(*)::integer total,count(*) filter(where is_correct)::integer correct,count(*) filter(where not is_correct)::integer incorrect,
      case when count(*)=0 then 0::numeric else round(count(*) filter(where is_correct)::numeric*100/count(*),1) end accuracy
    from answer_rows group by subject_id,subject_name
  ), days as(
    select generate_series((now() at time zone 'America/Sao_Paulo')::date-(v_days-1),(now() at time zone 'America/Sao_Paulo')::date,interval '1 day')::date as bucket_day
  ), daily_stats as(
    select d.bucket_day,count(a.id)::integer total,count(a.id) filter(where a.is_correct)::integer correct,count(a.id) filter(where a.id is not null and not a.is_correct)::integer incorrect
    from days d left join answer_rows a on a.local_day=d.bucket_day group by d.bucket_day order by d.bucket_day
  )
  select jsonb_build_object('window',p_window,'window_start',v_start,'total_answered',o.total_answered,'correct_count',o.correct_count,'incorrect_count',o.incorrect_count,'accuracy',o.accuracy,
    'subjects',coalesce((select jsonb_agg(jsonb_build_object('subject_name',ss.subject_name,'total',ss.total,'correct',ss.correct,'incorrect',ss.incorrect,'accuracy',ss.accuracy) order by ss.total desc,ss.subject_name) from subject_stats ss),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(jsonb_build_object('day',ds.bucket_day,'total',ds.total,'correct',ds.correct,'incorrect',ds.incorrect) order by ds.bucket_day) from daily_stats ds),'[]'::jsonb))
  into v_result from overall o;
  return v_result;
end $$;
