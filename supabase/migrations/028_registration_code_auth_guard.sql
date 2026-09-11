-- Protege o cadastro publico no proprio trigger de auth.
-- A validacao no cliente existe apenas para UX; esta funcao e a barreira real.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path='public','extensions'
as $$
declare
  v_username text;
  v_name text;
  v_code text;
  v_code_id uuid;
  v_self_register boolean := coalesce((new.raw_user_meta_data->>'self_register')::boolean,false);
begin
  if new.email like '%@login.mentoriatita.app' then
    v_username := lower(split_part(new.email, '@', 1));
  else
    v_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  end if;

  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'name', '')), '');

  if v_self_register then
    v_code := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code','')));
    if v_code='' then raise exception 'Código de acesso obrigatório'; end if;

    select id into v_code_id
    from public.registration_codes
    where code_hash=encode(extensions.digest(v_code,'sha256'),'hex')
      and active=true
      and uses_count<max_uses
      and (expires_at is null or expires_at>now())
    for update;

    if v_code_id is null then raise exception 'Código de acesso inválido ou esgotado'; end if;

    update public.registration_codes
      set uses_count=uses_count+1,
          last_used_at=now(),
          active=case when uses_count+1>=max_uses then false else active end
    where id=v_code_id;
  end if;

  insert into public.profiles (id,email,nome,username,role,ativo,registration_code_id)
  values (new.id,new.email,coalesce(v_name,'Aluno'),v_username,'student',true,v_code_id)
  on conflict (id) do update set
    email=excluded.email,
    nome=coalesce(nullif(public.profiles.nome,''),excluded.nome),
    username=coalesce(public.profiles.username,excluded.username),
    registration_code_id=coalesce(public.profiles.registration_code_id,excluded.registration_code_id);

  return new;
end;
$$;
