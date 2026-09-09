-- Mentoria Titã - XP, níveis, ranks, conquistas e métricas de sessão
-- Idempotente. O projeto Supabase conectado já recebeu esta estrutura em 07/09/2026.

create table if not exists public.user_xp_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  source_key text not null,
  xp integer not null check (xp > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id,event_type,source_key)
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  title text not null,
  tier integer not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id,code)
);

create index if not exists user_xp_events_user_created_idx on public.user_xp_events(user_id, created_at desc);
create index if not exists user_achievements_user_unlocked_idx on public.user_achievements(user_id, unlocked_at desc);

alter table public.user_xp_profiles enable row level security;
alter table public.user_xp_events enable row level security;
alter table public.user_achievements enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_xp_profiles' and policyname='xp profile own select') then
    create policy "xp profile own select" on public.user_xp_profiles for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_xp_events' and policyname='xp events own select') then
    create policy "xp events own select" on public.user_xp_events for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_achievements' and policyname='achievements own select') then
    create policy "achievements own select" on public.user_achievements for select using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.mt_xp_step_for_level(p_level integer)
returns integer language sql immutable as $$
  select greatest(
    140,
    140 + 40 * greatest(coalesce(p_level,1)-1,0)
      + 3 * greatest(coalesce(p_level,1)-1,0) * greatest(coalesce(p_level,1)-1,0)
  )::integer;
$$;

create or replace function public.mt_total_xp_for_level(p_level integer)
returns bigint language plpgsql immutable as $$
declare
  v_target integer := greatest(coalesce(p_level,1),1);
  v_i integer;
  v_total bigint := 0;
begin
  if v_target <= 1 then return 0; end if;
  for v_i in 1..(v_target-1) loop
    v_total := v_total + public.mt_xp_step_for_level(v_i);
  end loop;
  return v_total;
end;
$$;

create or replace function public.mt_level_for_xp(p_total_xp bigint)
returns integer language plpgsql immutable as $$
declare
  v_xp bigint := greatest(coalesce(p_total_xp,0),0);
  v_level integer := 1;
begin
  while v_level < 200 and v_xp >= public.mt_total_xp_for_level(v_level+1) loop
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

create or replace function public.mt_rank_for_level(p_level integer)
returns jsonb language sql immutable as $$
  select case
    when coalesce(p_level,1) >= 36 then jsonb_build_object('tier',8,'slug','tita-violeta','title','Titã Violeta','min_level',36,'max_level',null)
    when p_level >= 31 then jsonb_build_object('tier',7,'slug','rubi','title','Rubi','min_level',31,'max_level',35)
    when p_level >= 26 then jsonb_build_object('tier',6,'slug','diamante','title','Diamante','min_level',26,'max_level',30)
    when p_level >= 21 then jsonb_build_object('tier',5,'slug','elite','title','Elite','min_level',21,'max_level',25)
    when p_level >= 16 then jsonb_build_object('tier',4,'slug','especialista','title','Especialista','min_level',16,'max_level',20)
    when p_level >= 11 then jsonb_build_object('tier',3,'slug','operacional','title','Operacional','min_level',11,'max_level',15)
    when p_level >= 6 then jsonb_build_object('tier',2,'slug','iniciante','title','Iniciante','min_level',6,'max_level',10)
    else jsonb_build_object('tier',1,'slug','recruta','title','Recruta','min_level',1,'max_level',5)
  end;
$$;

create or replace function public.mt_unlock_rank_achievements(p_user_id uuid,p_level integer)
returns void language plpgsql security definer set search_path='public' as $$
declare
  v_threshold integer;
  v_rank jsonb;
begin
  foreach v_threshold in array array[1,6,11,16,21,26,31,36] loop
    if p_level >= v_threshold then
      v_rank := public.mt_rank_for_level(v_threshold);
      insert into public.user_achievements(user_id,code,title,tier)
      values (p_user_id,'rank-'||(v_rank->>'slug'),v_rank->>'title',(v_rank->>'tier')::integer)
      on conflict (user_id,code) do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.mt_award_xp_internal(
  p_user_id uuid,p_event_type text,p_source_key text,p_xp integer,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='public' as $$
declare
  v_event_id uuid;
  v_daily_id uuid;
  v_daily_xp integer := 0;
  v_old_xp bigint;
  v_new_xp bigint;
  v_old_level integer;
  v_new_level integer;
  v_awarded integer := 0;
begin
  if p_user_id is null or coalesce(trim(p_event_type),'')='' or coalesce(trim(p_source_key),'')='' or p_xp <= 0 then
    return jsonb_build_object('awarded',0);
  end if;
  insert into public.user_xp_profiles(user_id) values (p_user_id) on conflict(user_id) do nothing;
  select total_xp into v_old_xp from public.user_xp_profiles where user_id=p_user_id for update;

  if p_event_type <> 'daily_activity' then
    insert into public.user_xp_events(user_id,event_type,source_key,xp,metadata)
    values (p_user_id,'daily_activity',current_date::text,25,jsonb_build_object('date',current_date))
    on conflict(user_id,event_type,source_key) do nothing returning id into v_daily_id;
    if v_daily_id is not null then v_daily_xp := 25; end if;
  end if;

  insert into public.user_xp_events(user_id,event_type,source_key,xp,metadata)
  values (p_user_id,p_event_type,p_source_key,p_xp,coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,event_type,source_key) do nothing returning id into v_event_id;
  if v_event_id is not null then v_awarded := p_xp; end if;
  v_awarded := v_awarded + v_daily_xp;

  if v_awarded = 0 then
    v_new_xp := v_old_xp;
    v_new_level := public.mt_level_for_xp(v_new_xp);
    perform public.mt_unlock_rank_achievements(p_user_id,v_new_level);
    return jsonb_build_object('awarded',0,'total_xp',v_new_xp,'level',v_new_level,'rank',public.mt_rank_for_level(v_new_level));
  end if;

  v_old_level := public.mt_level_for_xp(v_old_xp);
  v_new_xp := v_old_xp + v_awarded;
  v_new_level := public.mt_level_for_xp(v_new_xp);
  update public.user_xp_profiles set total_xp=v_new_xp,updated_at=now() where user_id=p_user_id;
  perform public.mt_unlock_rank_achievements(p_user_id,v_new_level);
  return jsonb_build_object('awarded',v_awarded,'event_xp',case when v_event_id is null then 0 else p_xp end,'daily_xp',v_daily_xp,'total_xp',v_new_xp,'level',v_new_level,'level_up',v_new_level>v_old_level,'levels_gained',greatest(v_new_level-v_old_level,0),'rank',public.mt_rank_for_level(v_new_level));
end;
$$;

create or replace function public.mt_xp_from_attempt_item()
returns trigger language plpgsql security definer set search_path='public' as $$
declare v_user_id uuid; v_kind text; v_xp integer;
begin
  if old.selected_answer is null and new.selected_answer is not null then
    select user_id,kind into v_user_id,v_kind from public.question_attempts where id=new.attempt_id;
    if v_user_id is not null then
      v_xp := case when new.is_correct then 12 else 4 end;
      perform public.mt_award_xp_internal(v_user_id,case when new.is_correct then 'question_correct' else 'question_wrong' end,'attempt:'||new.attempt_id::text||':'||new.question_id::text,v_xp,jsonb_build_object('attempt_id',new.attempt_id,'question_id',new.question_id,'origin',v_kind,'correct',new.is_correct));
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.mt_xp_from_bank_answer()
returns trigger language plpgsql security definer set search_path='public' as $$
begin
  if new.origin='bank' then
    perform public.mt_award_xp_internal(new.user_id,case when new.is_correct then 'question_correct' else 'question_wrong' end,'bank:'||new.question_id::text,case when new.is_correct then 12 else 4 end,jsonb_build_object('question_id',new.question_id,'origin','bank','correct',new.is_correct));
  end if;
  return new;
end;
$$;

create or replace function public.mt_xp_from_lesson_progress()
returns trigger language plpgsql security definer set search_path='public' as $$
declare v_started_new boolean; v_theory_new boolean; v_list_new boolean;
begin
  v_started_new := new.theory_started_at is not null and (tg_op='INSERT' or old.theory_started_at is null);
  v_theory_new := new.theory_completed_at is not null and (tg_op='INSERT' or old.theory_completed_at is null);
  v_list_new := new.list_completed_at is not null and (tg_op='INSERT' or old.list_completed_at is null);
  if v_started_new then perform public.mt_award_xp_internal(new.user_id,'lesson_started','lesson-start:'||new.lesson_id::text,10,jsonb_build_object('lesson_id',new.lesson_id)); end if;
  if v_theory_new then perform public.mt_award_xp_internal(new.user_id,'theory_completed','theory-complete:'||new.lesson_id::text,40,jsonb_build_object('lesson_id',new.lesson_id)); end if;
  if v_list_new then perform public.mt_award_xp_internal(new.user_id,'lesson_list_completed','list-complete:'||new.lesson_id::text,80,jsonb_build_object('lesson_id',new.lesson_id)); end if;
  return new;
end;
$$;

create or replace function public.mt_xp_from_leveling_result()
returns trigger language plpgsql security definer set search_path='public' as $$
declare v_revision_number integer := 1;
begin
  select greatest(coalesce(revision_number,1),1) into v_revision_number from public.user_revisions where id=new.revision_id;
  perform public.mt_award_xp_internal(new.user_id,'leveling_completed','leveling-round:'||new.id::text,60+(15*least(v_revision_number,4)),jsonb_build_object('revision_id',new.revision_id,'revision_number',v_revision_number,'score',new.score,'passed',new.passed));
  if new.passed then
    perform public.mt_award_xp_internal(new.user_id,'leveling_passed','leveling-pass:'||new.revision_id::text,40+(20*least(v_revision_number,4)),jsonb_build_object('revision_id',new.revision_id,'revision_number',v_revision_number,'score',new.score));
  end if;
  return new;
end;
$$;

drop trigger if exists mt_xp_attempt_item_trigger on public.question_attempt_items;
create trigger mt_xp_attempt_item_trigger after update of selected_answer,is_correct on public.question_attempt_items for each row execute function public.mt_xp_from_attempt_item();
drop trigger if exists mt_xp_bank_answer_trigger on public.user_question_answers;
create trigger mt_xp_bank_answer_trigger after insert on public.user_question_answers for each row execute function public.mt_xp_from_bank_answer();
drop trigger if exists mt_xp_lesson_progress_trigger on public.user_lesson_progress;
create trigger mt_xp_lesson_progress_trigger after insert or update of theory_started_at,theory_completed_at,list_completed_at on public.user_lesson_progress for each row execute function public.mt_xp_from_lesson_progress();
drop trigger if exists mt_xp_leveling_result_trigger on public.user_leveling_attempts;
create trigger mt_xp_leveling_result_trigger after insert on public.user_leveling_attempts for each row execute function public.mt_xp_from_leveling_result();

create or replace function public.get_my_xp_dashboard()
returns jsonb language plpgsql security definer set search_path='public' as $$
declare
  v_user_id uuid := auth.uid(); v_total bigint; v_level integer; v_floor bigint; v_next bigint; v_recent jsonb; v_today integer; v_answers integer; v_correct integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  insert into public.user_xp_profiles(user_id) values(v_user_id) on conflict(user_id) do nothing;
  select total_xp into v_total from public.user_xp_profiles where user_id=v_user_id;
  v_level := public.mt_level_for_xp(v_total); v_floor := public.mt_total_xp_for_level(v_level); v_next := public.mt_total_xp_for_level(v_level+1);
  perform public.mt_unlock_rank_achievements(v_user_id,v_level);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.unlocked_at desc),'[]'::jsonb) into v_recent from (select code,title,tier,unlocked_at from public.user_achievements where user_id=v_user_id order by unlocked_at desc limit 8) x;
  select coalesce(sum(xp),0)::integer into v_today from public.user_xp_events where user_id=v_user_id and created_at>=date_trunc('day',now()) and created_at<date_trunc('day',now())+interval '1 day';
  select count(*),count(*) filter(where is_correct) into v_answers,v_correct from public.user_question_answers where user_id=v_user_id;
  return jsonb_build_object('total_xp',v_total,'level',v_level,'rank',public.mt_rank_for_level(v_level),'level_xp',v_total-v_floor,'level_required',v_next-v_floor,'xp_to_next',v_next-v_total,'progress_percent',case when v_next=v_floor then 100 else round(((v_total-v_floor)::numeric*100/(v_next-v_floor)),1) end,'today_xp',v_today,'answers_total',v_answers,'answers_correct',v_correct,'recent_achievements',v_recent);
end;
$$;

create or replace function public.get_attempt_experience_meta(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare
  v_user_id uuid := auth.uid(); v_attempt public.question_attempts%rowtype; v_revision_number integer; v_session_questions integer:=0; v_session_correct integer:=0; v_session_seconds integer:=0; v_elapsed integer:=0; v_rank jsonb; v_xp jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select * into v_attempt from public.question_attempts where id=p_attempt_id and user_id=v_user_id;
  if v_attempt.id is null then raise exception 'Tentativa não encontrada'; end if;
  if v_attempt.revision_id is not null then select revision_number into v_revision_number from public.user_revisions where id=v_attempt.revision_id and user_id=v_user_id; end if;
  v_elapsed := greatest(0,extract(epoch from (coalesce(v_attempt.completed_at,now())-v_attempt.started_at))::integer);
  if v_attempt.kind='leveling' and v_attempt.revision_id is not null then
    select coalesce(sum(total),0)::integer,coalesce(sum(score),0)::integer,coalesce(sum(greatest(0,extract(epoch from (coalesce(completed_at,now())-started_at)))),0)::integer
    into v_session_questions,v_session_correct,v_session_seconds
    from public.question_attempts where user_id=v_user_id and revision_id=v_attempt.revision_id and kind='leveling' and (status='completed' or id=p_attempt_id);
  else
    v_session_questions:=v_attempt.total; v_session_correct:=coalesce(v_attempt.score,0); v_session_seconds:=v_elapsed;
  end if;
  select public.get_my_xp_dashboard() into v_xp; v_rank:=v_xp->'rank';
  return jsonb_build_object('attempt_id',v_attempt.id,'kind',v_attempt.kind,'status',v_attempt.status,'revision_id',v_attempt.revision_id,'revision_number',v_revision_number,'required_correct',v_attempt.required_correct,'score',v_attempt.score,'total',v_attempt.total,'elapsed_seconds',v_elapsed,'session_questions',v_session_questions,'session_correct',v_session_correct,'session_seconds',v_session_seconds,'xp',v_xp,'rank',v_rank);
end;
$$;

grant execute on function public.get_my_xp_dashboard() to authenticated;
grant execute on function public.get_attempt_experience_meta(uuid) to authenticated;
