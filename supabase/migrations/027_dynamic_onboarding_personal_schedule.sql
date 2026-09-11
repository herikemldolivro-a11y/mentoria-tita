-- Mentoria Tita V3: onboarding dinamico, pesos por materia e cronograma pessoal
-- Esta migration espelha a estrutura aplicada no projeto Supabase de producao.

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists daily_study_minutes integer,
  add column if not exists schedule_target_weeks integer,
  add column if not exists schedule_weeks integer,
  add column if not exists schedule_generated_at timestamptz;

create table if not exists public.registration_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text,
  active boolean not null default true,
  max_uses integer not null default 1 check (max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.profiles
  add column if not exists registration_code_id uuid references public.registration_codes(id) on delete set null;

create table if not exists public.subject_matrix_settings (
  subject_id uuid primary key references public.study_subjects(id) on delete cascade,
  recommended_weight numeric(5,2) not null default 1.00 check (recommended_weight between 0.10 and 5.00),
  minimum_weight numeric(5,2) not null default 0.35 check (minimum_weight between 0.05 and 5.00),
  priority_score integer not null default 50 check (priority_score between 0 and 100),
  incidence_score integer not null default 50 check (incidence_score between 0 and 100),
  theory_minutes integer not null default 50 check (theory_minutes between 15 and 180),
  question_minutes integer not null default 30 check (question_minutes between 10 and 120),
  rest_minutes integer not null default 20 check (rest_minutes between 0 and 60),
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.subject_matrix_settings(subject_id)
select id from public.study_subjects
on conflict (subject_id) do nothing;

create table if not exists public.subject_visuals (
  subject_slug text primary key,
  image_path text,
  accent text not null default '#bfc2c7',
  tagline text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.subject_visuals(subject_slug,image_path,accent,tagline)
values
  ('lingua-portuguesa','/subjects/lingua-portuguesa.webp','#d4d4d4','Domine a palavra, a interpretação e a escrita.'),
  ('direito-penal','/subjects/direito-penal.webp','#b7b8bb','Lei, tipicidade e estratégia de prova.')
on conflict (subject_slug) do update set
  image_path=excluded.image_path,
  accent=excluded.accent,
  tagline=excluded.tagline,
  updated_at=now();

create table if not exists public.user_subject_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  weight numeric(5,2) not null default 1.00 check (weight between 0.10 and 5.00),
  recommended_weight numeric(5,2) not null default 1.00,
  updated_at timestamptz not null default now(),
  primary key (user_id,subject_id)
);

create table if not exists public.user_personal_schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  scheduled_for date not null,
  study_day integer not null check (study_day > 0),
  week_number integer not null check (week_number > 0),
  position integer not null check (position > 0),
  estimated_minutes integer not null check (estimated_minutes > 0),
  created_at timestamptz not null default now(),
  unique (user_id,lesson_id)
);

create index if not exists user_personal_schedule_user_date_idx
  on public.user_personal_schedule_items(user_id,scheduled_for,position);

alter table public.registration_codes enable row level security;
alter table public.subject_matrix_settings enable row level security;
alter table public.subject_visuals enable row level security;
alter table public.user_subject_preferences enable row level security;
alter table public.user_personal_schedule_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='registration_codes' and policyname='registration_codes_admin') then
    create policy registration_codes_admin on public.registration_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_matrix_settings' and policyname='subject_matrix_read') then
    create policy subject_matrix_read on public.subject_matrix_settings for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_matrix_settings' and policyname='subject_matrix_admin') then
    create policy subject_matrix_admin on public.subject_matrix_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_visuals' and policyname='subject_visuals_read') then
    create policy subject_visuals_read on public.subject_visuals for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_visuals' and policyname='subject_visuals_admin') then
    create policy subject_visuals_admin on public.subject_visuals for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_subject_preferences' and policyname='user_subject_preferences_own') then
    create policy user_subject_preferences_own on public.user_subject_preferences for all to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_personal_schedule_items' and policyname='user_personal_schedule_own') then
    create policy user_personal_schedule_own on public.user_personal_schedule_items for all to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
  end if;
end $$;

create or replace function public.validate_registration_code(p_code text)
returns boolean
language sql
security definer
set search_path='public','extensions'
as $$
  select exists(
    select 1 from public.registration_codes c
    where c.code_hash=encode(extensions.digest(upper(trim(coalesce(p_code,''))),'sha256'),'hex')
      and c.active=true
      and c.uses_count<c.max_uses
      and (c.expires_at is null or c.expires_at>now())
  );
$$;

create or replace function public.create_registration_code(
  p_code text default null,
  p_label text default null,
  p_max_uses integer default 1,
  p_expires_at timestamptz default null
)
returns table(id uuid,code text)
language plpgsql
security definer
set search_path='public','extensions'
as $$
declare v_code text; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  v_code:=upper(trim(coalesce(nullif(p_code,''),'TITA-'||substr(encode(extensions.gen_random_bytes(6),'hex'),1,12))));
  if p_max_uses is null or p_max_uses<1 then raise exception 'Quantidade de usos inválida'; end if;
  insert into public.registration_codes(code_hash,label,max_uses,expires_at,created_by)
  values(encode(extensions.digest(v_code,'sha256'),'hex'),nullif(trim(p_label),''),p_max_uses,p_expires_at,auth.uid())
  returning registration_codes.id into v_id;
  return query select v_id,v_code;
end $$;

create or replace function public.complete_dynamic_onboarding(
  p_contest_slug text,
  p_daily_minutes integer,
  p_weights jsonb default '{}'::jsonb,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
 v_user uuid:=auth.uid(); v_contest uuid; v_plan uuid; v_target integer; v_actual integer:=1; v_day integer:=1; v_used integer:=0; v_pos integer:=0; v_est integer; v_capacity bigint; v_total bigint; v_scale numeric:=1; r record; v_weight numeric; v_recommended numeric; v_min numeric; v_date date; v_week integer;
begin
 if v_user is null then raise exception 'Usuário não autenticado'; end if;
 if p_daily_minutes<120 or p_daily_minutes>480 then raise exception 'Carga diária deve ficar entre 2 e 8 horas'; end if;
 select c.id into v_contest from public.contests c where c.slug=p_contest_slug and c.ativo=true;
 if v_contest is null then raise exception 'Concurso indisponível'; end if;
 select p.id into v_plan from public.study_plans p where p.contest_id=v_contest and p.active=true order by p.is_default desc,p.created_at limit 1;
 if v_plan is null then raise exception 'Este concurso ainda não possui matriz ativa'; end if;
 v_target:=case when p_daily_minutes<=240 then 12 when p_daily_minutes<=360 then 8 else 6 end;
 update public.profiles set focus_contest_id=v_contest,active_study_plan_id=v_plan,nome=coalesce(nullif(trim(p_name),''),nome),daily_study_minutes=p_daily_minutes,schedule_target_weeks=v_target,onboarding_completed_at=now(),schedule_generated_at=now() where id=v_user;
 delete from public.user_subject_preferences where user_id=v_user and subject_id in (select id from public.study_subjects where plan_id=v_plan);
 for r in select s.id,s.slug,coalesce(m.recommended_weight,1.0) rec,coalesce(m.minimum_weight,.35) minw from public.study_subjects s left join public.subject_matrix_settings m on m.subject_id=s.id where s.plan_id=v_plan and s.active=true order by s.position loop
   v_recommended:=r.rec; v_min:=r.minw;
   begin v_weight:=coalesce((p_weights->>r.slug)::numeric,v_recommended); exception when others then v_weight:=v_recommended; end;
   v_weight:=greatest(v_min,least(2.50,v_weight));
   insert into public.user_subject_preferences(user_id,subject_id,weight,recommended_weight) values(v_user,r.id,v_weight,v_recommended) on conflict(user_id,subject_id) do update set weight=excluded.weight,recommended_weight=excluded.recommended_weight,updated_at=now();
 end loop;
 delete from public.user_personal_schedule_items where user_id=v_user;
 select coalesce(sum(coalesce(m.theory_minutes,50)+coalesce(m.question_minutes,30)+coalesce(m.rest_minutes,20)),0) into v_total from public.study_lessons l join public.study_subjects s on s.id=l.subject_id left join public.subject_matrix_settings m on m.subject_id=s.id where s.plan_id=v_plan and s.active=true and l.active=true;
 v_capacity:=v_target*6*p_daily_minutes;
 if v_total>0 and v_total>v_capacity then v_scale:=greatest(.45,v_capacity::numeric/v_total::numeric); end if;
 for r in select l.id lesson_id,l.subject_id,l.position lesson_position,s.position subject_position,coalesce(pref.weight,coalesce(m.recommended_weight,1.0)) weight,coalesce(m.priority_score,50) priority_score,coalesce(m.theory_minutes,50)+coalesce(m.question_minutes,30)+coalesce(m.rest_minutes,20) base_minutes from public.study_lessons l join public.study_subjects s on s.id=l.subject_id left join public.subject_matrix_settings m on m.subject_id=s.id left join public.user_subject_preferences pref on pref.user_id=v_user and pref.subject_id=s.id where s.plan_id=v_plan and s.active=true and l.active=true order by (l.position::numeric/greatest(coalesce(pref.weight,m.recommended_weight,1.0),.10)),coalesce(m.priority_score,50) desc,s.position,l.position loop
   v_est:=greatest(35,round(r.base_minutes*v_scale)::integer);
   if v_used>0 and v_used+v_est>p_daily_minutes then v_day:=v_day+1; v_used:=0; end if;
   v_pos:=v_pos+1; v_week:=((v_day-1)/6)+1; v_date:=current_date+((v_day-1)+floor((v_day-1)/6)::integer);
   insert into public.user_personal_schedule_items(user_id,plan_id,subject_id,lesson_id,scheduled_for,study_day,week_number,position,estimated_minutes) values(v_user,v_plan,r.subject_id,r.lesson_id,v_date,v_day,v_week,v_pos,v_est);
   v_used:=v_used+v_est; v_actual:=greatest(v_actual,v_week);
 end loop;
 update public.profiles set schedule_weeks=v_actual,schedule_generated_at=now() where id=v_user;
 return jsonb_build_object('ok',true,'plan_id',v_plan,'target_weeks',v_target,'schedule_weeks',v_actual,'daily_minutes',p_daily_minutes,'items',v_pos);
end $$;

revoke all on function public.validate_registration_code(text) from public;
grant execute on function public.validate_registration_code(text) to anon, authenticated;
revoke all on function public.create_registration_code(text,text,integer,timestamptz) from public;
grant execute on function public.create_registration_code(text,text,integer,timestamptz) to authenticated;
revoke all on function public.complete_dynamic_onboarding(text,integer,jsonb,text) from public;
grant execute on function public.complete_dynamic_onboarding(text,integer,jsonb,text) to authenticated;
