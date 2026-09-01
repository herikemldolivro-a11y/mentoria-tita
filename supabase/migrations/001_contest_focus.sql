-- Mentoria Titã — concurso foco do aluno
-- Execute no SQL Editor do Supabase antes de testar o onboarding.

create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  sigla text not null,
  logo_path text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.contests enable row level security;

drop policy if exists "Authenticated users can read active contests" on public.contests;
create policy "Authenticated users can read active contests"
on public.contests
for select
to authenticated
using (ativo = true);

alter table public.profiles
  add column if not exists focus_contest_id uuid
  references public.contests(id)
  on delete set null;

insert into public.contests (slug, nome, sigla, logo_path, ativo)
values
  ('pcal', 'Polícia Civil de Alagoas', 'PCAL', '/concursos/pcal/logo.png', true),
  ('cfo-pmal', 'CFO PMAL', 'CFO PMAL', '/concursos/cfo-pmal/logo.png', true),
  ('cfo-pmsp', 'CFO PMSP', 'CFO PMSP', '/concursos/cfo-pmsp/logo.png', true),
  ('soldado-pmsp', 'Soldado PMSP', 'PMSP', '/concursos/soldado-pmsp/logo.png', true),
  ('pmpe', 'Polícia Militar de Pernambuco', 'PMPE', '/concursos/pmpe/logo.png', true),
  ('pcba', 'Polícia Civil da Bahia', 'PCBA', '/concursos/pcba/logo.png', true),
  ('pcma', 'Polícia Civil do Maranhão', 'PCMA', '/concursos/pcma/logo.png', true),
  ('prf', 'Polícia Rodoviária Federal', 'PRF', '/concursos/prf/logo.png', true),
  ('pf', 'Polícia Federal', 'PF', '/concursos/pf/logo.png', true)
on conflict (slug) do update
set
  nome = excluded.nome,
  sigla = excluded.sigla,
  logo_path = excluded.logo_path,
  ativo = excluded.ativo;

create or replace function public.set_focus_contest(p_contest_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_contest_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select id
  into v_contest_id
  from public.contests
  where slug = p_contest_slug
    and ativo = true;

  if v_contest_id is null then
    raise exception 'Concurso inválido ou inativo';
  end if;

  update public.profiles
  set focus_contest_id = v_contest_id
  where id = v_user_id;

  if not found then
    raise exception 'Perfil não encontrado';
  end if;
end;
$$;

revoke all on function public.set_focus_contest(text) from public;
grant execute on function public.set_focus_contest(text) to authenticated;

create index if not exists profiles_focus_contest_id_idx
  on public.profiles(focus_contest_id);
