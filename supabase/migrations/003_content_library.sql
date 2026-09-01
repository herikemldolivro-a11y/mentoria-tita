-- Mentoria Titã - biblioteca central de materiais das aulas
-- Requer a migration 002_study_system.sql.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  material_type text not null default 'theory' check (material_type in ('theory')),
  title text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  allow_download boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lesson_materials_one_active_theory_idx
  on public.lesson_materials(lesson_id, material_type)
  where is_active = true;

create index if not exists lesson_materials_lesson_id_idx
  on public.lesson_materials(lesson_id);

alter table public.lesson_materials enable row level security;

-- Aluno: lê apenas o material ativo do plano que está atribuído ao seu perfil.
drop policy if exists "Students read active lesson materials" on public.lesson_materials;
create policy "Students read active lesson materials"
on public.lesson_materials
for select
to authenticated
using (
  public.is_admin()
  or (
    is_active = true
    and exists (
      select 1
      from public.study_lessons l
      join public.study_subjects s on s.id = l.subject_id
      join public.profiles p on p.id = auth.uid()
      where l.id = lesson_materials.lesson_id
        and p.active_study_plan_id = s.plan_id
    )
  )
);

-- Administração do catálogo de materiais.
drop policy if exists "Admins insert lesson materials" on public.lesson_materials;
create policy "Admins insert lesson materials"
on public.lesson_materials
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update lesson materials" on public.lesson_materials;
create policy "Admins update lesson materials"
on public.lesson_materials
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete lesson materials" on public.lesson_materials;
create policy "Admins delete lesson materials"
on public.lesson_materials
for delete
to authenticated
using (public.is_admin());

-- Bucket privado. O aluno acessa através de URL assinada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-materials',
  'lesson-materials',
  false,
  104857600,
  array['application/pdf','image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- O administrador pode enviar/substituir/apagar arquivos.
drop policy if exists "Admins upload lesson material files" on storage.objects;
create policy "Admins upload lesson material files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lesson-materials'
  and public.is_admin()
);

drop policy if exists "Admins update lesson material files" on storage.objects;
create policy "Admins update lesson material files"
on storage.objects
for update
to authenticated
using (bucket_id = 'lesson-materials' and public.is_admin())
with check (bucket_id = 'lesson-materials' and public.is_admin());

drop policy if exists "Admins delete lesson material files" on storage.objects;
create policy "Admins delete lesson material files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'lesson-materials' and public.is_admin());

-- Leitura dos bytes: admin ou usuário cujo plano ativo contém a aula correspondente.
drop policy if exists "Users read assigned lesson material files" on storage.objects;
create policy "Users read assigned lesson material files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lesson-materials'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.lesson_materials m
      join public.study_lessons l on l.id = m.lesson_id
      join public.study_subjects s on s.id = l.subject_id
      join public.profiles p on p.id = auth.uid()
      where m.storage_path = storage.objects.name
        and m.is_active = true
        and p.active_study_plan_id = s.plan_id
    )
  )
);

-- Publicação atômica do metadado após o upload no Storage.
create or replace function public.publish_lesson_material(
  p_lesson_id uuid,
  p_title text,
  p_file_name text,
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_allow_download boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_version integer;
  v_material_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if not exists (select 1 from public.study_lessons where id = p_lesson_id) then
    raise exception 'Aula inválida';
  end if;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.lesson_materials
  where lesson_id = p_lesson_id
    and material_type = 'theory';

  update public.lesson_materials
  set is_active = false,
      updated_at = now()
  where lesson_id = p_lesson_id
    and material_type = 'theory'
    and is_active = true;

  insert into public.lesson_materials (
    lesson_id,
    material_type,
    title,
    file_name,
    storage_path,
    mime_type,
    file_size,
    version,
    is_active,
    allow_download,
    created_by
  )
  values (
    p_lesson_id,
    'theory',
    coalesce(nullif(trim(p_title), ''), p_file_name),
    p_file_name,
    p_storage_path,
    p_mime_type,
    greatest(coalesce(p_file_size, 0), 0),
    v_version,
    true,
    coalesce(p_allow_download, true),
    v_user_id
  )
  returning id into v_material_id;

  return v_material_id;
end;
$$;

revoke all on function public.publish_lesson_material(uuid, text, text, text, text, bigint, boolean) from public;
grant execute on function public.publish_lesson_material(uuid, text, text, text, text, bigint, boolean) to authenticated;

-- Corrige título nulo/vazio caso uma versão antiga tenha sido criada por script externo.
alter table public.lesson_materials alter column title set not null;
