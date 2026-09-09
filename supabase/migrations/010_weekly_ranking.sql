-- Mentoria Titã — XP / Ranking semanal V1.5
-- Já aplicado no projeto ck ykfrgrxhrjcvxvvojs em 07/09/2026.
-- Mantido aqui para versionamento e futura replicação de ambiente.

create or replace function public.mt_rank_for_level(p_level integer)
returns jsonb
language sql
immutable
as $$
  select case
    when coalesce(p_level, 1) >= 36 then jsonb_build_object('tier',8,'slug','tita-violeta','title','Titã','min_level',36,'max_level',null)
    when p_level >= 31 then jsonb_build_object('tier',7,'slug','rubi','title','Rubi','min_level',31,'max_level',35)
    when p_level >= 26 then jsonb_build_object('tier',6,'slug','diamante','title','Diamante','min_level',26,'max_level',30)
    when p_level >= 21 then jsonb_build_object('tier',5,'slug','elite','title','Elite','min_level',21,'max_level',25)
    when p_level >= 16 then jsonb_build_object('tier',4,'slug','especialista','title','Especialista','min_level',16,'max_level',20)
    when p_level >= 11 then jsonb_build_object('tier',3,'slug','operacional','title','Operacional','min_level',11,'max_level',15)
    when p_level >= 6 then jsonb_build_object('tier',2,'slug','iniciante','title','Iniciante','min_level',6,'max_level',10)
    else jsonb_build_object('tier',1,'slug','recruta','title','Recruta','min_level',1,'max_level',5)
  end;
$$;

update public.user_achievements
set title='Titã'
where code='rank-tita-violeta' and title is distinct from 'Titã';

create or replace function public.get_weekly_xp_ranking(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit,100),10),500);
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_leaders jsonb;
  v_me jsonb;
  v_participants integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  v_week_start := date_trunc('week', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  v_week_end := v_week_start + interval '7 days';

  with base as (
    select p.id user_id,
      coalesce(nullif(btrim(p.nome),''),nullif(btrim(p.username),''),'Aluno') display_name,
      coalesce(x.total_xp,0)::bigint total_xp,
      coalesce(sum(e.xp) filter (where e.created_at >= v_week_start and e.created_at < v_week_end),0)::bigint weekly_xp
    from public.profiles p
    left join public.user_xp_profiles x on x.user_id=p.id
    left join public.user_xp_events e on e.user_id=p.id
    where coalesce(p.ativo,true)=true
    group by p.id,p.nome,p.username,x.total_xp
  ), ranked as (
    select b.*, row_number() over(order by weekly_xp desc,total_xp desc,lower(display_name),user_id) position
    from base b
  ), enriched as (
    select r.user_id,r.position::integer position,r.display_name,r.weekly_xp,r.total_xp,
      public.mt_level_for_xp(r.total_xp) level,
      public.mt_rank_for_level(public.mt_level_for_xp(r.total_xp)) rank,
      case when r.weekly_xp <= 0 then 0 when r.position=1 then 3 when r.position=2 then 2 when r.position=3 then 1 else 0 end prize_weeks,
      (r.user_id=v_user_id) is_me
    from ranked r
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position',position,'display_name',display_name,'weekly_xp',weekly_xp,'total_xp',total_xp,
    'level',level,'rank',rank,'prize_weeks',prize_weeks,'is_me',is_me
  ) order by position),'[]'::jsonb)
  into v_leaders
  from enriched
  where position <= v_limit;

  with base as (
    select p.id user_id,
      coalesce(nullif(btrim(p.nome),''),nullif(btrim(p.username),''),'Aluno') display_name,
      coalesce(x.total_xp,0)::bigint total_xp,
      coalesce(sum(e.xp) filter (where e.created_at >= v_week_start and e.created_at < v_week_end),0)::bigint weekly_xp
    from public.profiles p
    left join public.user_xp_profiles x on x.user_id=p.id
    left join public.user_xp_events e on e.user_id=p.id
    where coalesce(p.ativo,true)=true
    group by p.id,p.nome,p.username,x.total_xp
  ), ranked as (
    select b.*, row_number() over(order by weekly_xp desc,total_xp desc,lower(display_name),user_id) position
    from base b
  )
  select jsonb_build_object(
    'position',r.position::integer,'display_name',r.display_name,'weekly_xp',r.weekly_xp,'total_xp',r.total_xp,
    'level',public.mt_level_for_xp(r.total_xp),'rank',public.mt_rank_for_level(public.mt_level_for_xp(r.total_xp)),
    'prize_weeks',case when r.weekly_xp <= 0 then 0 when r.position=1 then 3 when r.position=2 then 2 when r.position=3 then 1 else 0 end,'is_me',true
  )
  into v_me
  from ranked r
  where r.user_id=v_user_id;

  select count(*)::integer into v_participants
  from public.profiles
  where coalesce(ativo,true)=true;

  return jsonb_build_object(
    'week_start',timezone('America/Fortaleza',v_week_start)::date,
    'week_end',(timezone('America/Fortaleza',v_week_end)::date - 1),
    'participants',v_participants,'leaders',v_leaders,'me',v_me,
    'prizes',jsonb_build_array(
      jsonb_build_object('position',1,'weeks',3),
      jsonb_build_object('position',2,'weeks',2),
      jsonb_build_object('position',3,'weeks',1)
    )
  );
end;
$$;

grant execute on function public.get_weekly_xp_ranking(integer) to authenticated;
