create table if not exists public.user_pmal_english_cycle (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_on date not null default date '2026-09-16',
  initialized_at timestamptz not null default now()
);

alter table public.user_pmal_english_cycle enable row level security;

revoke all on table public.user_pmal_english_cycle from anon, authenticated;

drop policy if exists user_pmal_english_cycle_select_own on public.user_pmal_english_cycle;
create policy user_pmal_english_cycle_select_own
on public.user_pmal_english_cycle for select
to authenticated
using (user_id = auth.uid());

grant select on table public.user_pmal_english_cycle to authenticated;

create or replace function public.ensure_pmal_english_cycle_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_plan uuid;
  v_existing date;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;

  select started_on into v_existing
  from public.user_pmal_english_cycle
  where user_id = v_user;

  if v_existing is not null then
    return jsonb_build_object('initialized', false, 'started_on', v_existing);
  end if;

  select p.id into v_plan
  from public.study_plans p
  join public.contests c on c.id = p.contest_id
  where c.slug = 'cfo-pmal' and p.active = true
  order by p.is_default desc, p.created_at
  limit 1;

  if v_plan is null then raise exception 'Plano CFO PMAL não encontrado'; end if;

  delete from public.user_english_question_answers a
  using public.english_questions q, public.english_texts t
  where a.user_id = v_user
    and a.question_id = q.id
    and q.text_id = t.id
    and t.plan_id = v_plan;

  delete from public.user_english_text_progress p
  using public.english_texts t
  where p.user_id = v_user
    and p.text_id = t.id
    and t.plan_id = v_plan;

  insert into public.user_pmal_english_cycle(user_id, started_on)
  values(v_user, date '2026-09-16');

  return jsonb_build_object('initialized', true, 'started_on', '2026-09-16');
end;
$function$;

revoke all on function public.ensure_pmal_english_cycle_v1() from public, anon;
grant execute on function public.ensure_pmal_english_cycle_v1() to authenticated;
