-- Mentoria Titã — sequência individual de login.
-- Pode ser executada depois da migration 001_contest_focus.sql.

alter table public.profiles
  add column if not exists login_streak integer not null default 0,
  add column if not exists last_login_date date;

create or replace function public.touch_login_streak()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_last date;
  v_streak integer;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select last_login_date, login_streak
  into v_last, v_streak
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Perfil não encontrado';
  end if;

  if v_last = v_today then
    return greatest(v_streak, 1);
  elsif v_last = v_today - 1 then
    v_streak := greatest(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  update public.profiles
  set login_streak = v_streak,
      last_login_date = v_today
  where id = v_user_id;

  return v_streak;
end;
$$;

revoke all on function public.touch_login_streak() from public;
grant execute on function public.touch_login_streak() to authenticated;
