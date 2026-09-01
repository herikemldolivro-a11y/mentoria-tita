-- Mentoria Titã — nome de usuário para login e criação automática de perfil.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check check (
    username is null
    or (
      username = lower(username)
      and length(username) between 3 and 32
      and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
    )
  );

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_name text;
begin
  if new.email like '%@login.mentoriatita.app' then
    v_username := lower(split_part(new.email, '@', 1));
  else
    v_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  end if;

  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'name', '')), '');

  insert into public.profiles (id, email, nome, username, role, ativo)
  values (new.id, new.email, coalesce(v_name, 'Aluno'), v_username, 'student', true)
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_mentoria_profile on auth.users;
create trigger on_auth_user_created_mentoria_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Completa o nome de usuário de contas técnicas já criadas anteriormente.
update public.profiles
set username = lower(split_part(email, '@', 1))
where username is null
  and email like '%@login.mentoriatita.app';
