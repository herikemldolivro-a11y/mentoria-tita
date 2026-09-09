-- Mentoria Titã — V9.2: integridade de texto + sincronização do plano ativo.
-- Corrige textos já corrompidos e endurece o fluxo para o problema não voltar.

alter table public.study_weeks add column if not exists starts_on date;
alter table public.study_weeks add column if not exists ends_on date;

create or replace function public.mt_fix_text(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := p_value;
  i integer;
begin
  if v is null then return null; end if;
  for i in 1..5 loop
    v := replace(v, '–', '–');
    v := replace(v, '—', '—');
    v := replace(v, '‘', '‘');
    v := replace(v, '’', '’');
    v := replace(v, '“', '“');
    v := replace(v, '”', '”');
    v := replace(v, '•', '•');
    v := replace(v, '…', '…');
    v := replace(v, '←', '←');
    v := replace(v, '→', '→');
    v := replace(v, '−', '−');
    v := replace(v, '≤', '≤');
    v := replace(v, '≥', '≥');
    v := replace(v, '✓', '✓');
    v := replace(v, '✔', '✔');
    v := replace(v, '✓', '✓');
    v := replace(v, '✔', '✔');
    v := replace(v, '−', '−');
    v := replace(v, '→', '→');
    v := replace(v, '≤', '≤');
    v := replace(v, '≥', '≥');
    v := replace(v, '•', '•');
    v := replace(v, '…', '…');
    v := replace(v, '“', '“');
    v := replace(v, '‘', '‘');
    v := replace(v, '–', '–');
    v := replace(v, '—', '—');
    v := replace(v, '’', '’');
    v := replace(v, '', '');
    v := replace(v, ' ', ' ');
    v := replace(v, '¡', '¡');
    v := replace(v, '¢', '¢');
    v := replace(v, '£', '£');
    v := replace(v, '¤', '¤');
    v := replace(v, '¥', '¥');
    v := replace(v, '¦', '¦');
    v := replace(v, '§', '§');
    v := replace(v, '¨', '¨');
    v := replace(v, '©', '©');
    v := replace(v, 'ª', 'ª');
    v := replace(v, '«', '«');
    v := replace(v, '¬', '¬');
    v := replace(v, '­', '­');
    v := replace(v, '®', '®');
    v := replace(v, '¯', '¯');
    v := replace(v, '°', '°');
    v := replace(v, '±', '±');
    v := replace(v, '²', '²');
    v := replace(v, '³', '³');
    v := replace(v, '´', '´');
    v := replace(v, 'µ', 'µ');
    v := replace(v, '¶', '¶');
    v := replace(v, '·', '·');
    v := replace(v, '¸', '¸');
    v := replace(v, '¹', '¹');
    v := replace(v, 'º', 'º');
    v := replace(v, '»', '»');
    v := replace(v, '¼', '¼');
    v := replace(v, '½', '½');
    v := replace(v, '¾', '¾');
    v := replace(v, '¿', '¿');
    v := replace(v, 'À', 'À');
    v := replace(v, 'Á', 'Á');
    v := replace(v, 'Â', 'Â');
    v := replace(v, 'Ã', 'Ã');
    v := replace(v, 'Ä', 'Ä');
    v := replace(v, 'Å', 'Å');
    v := replace(v, 'Æ', 'Æ');
    v := replace(v, 'Ç', 'Ç');
    v := replace(v, 'È', 'È');
    v := replace(v, 'É', 'É');
    v := replace(v, 'Ê', 'Ê');
    v := replace(v, 'Ë', 'Ë');
    v := replace(v, 'Ì', 'Ì');
    v := replace(v, 'Í', 'Í');
    v := replace(v, 'Î', 'Î');
    v := replace(v, 'Ï', 'Ï');
    v := replace(v, 'Ð', 'Ð');
    v := replace(v, 'Ñ', 'Ñ');
    v := replace(v, 'Ò', 'Ò');
    v := replace(v, 'Ó', 'Ó');
    v := replace(v, 'Ô', 'Ô');
    v := replace(v, 'Õ', 'Õ');
    v := replace(v, 'Ö', 'Ö');
    v := replace(v, '×', '×');
    v := replace(v, 'Ø', 'Ø');
    v := replace(v, 'Ù', 'Ù');
    v := replace(v, 'Ú', 'Ú');
    v := replace(v, 'Û', 'Û');
    v := replace(v, 'Ü', 'Ü');
    v := replace(v, 'Ý', 'Ý');
    v := replace(v, 'Þ', 'Þ');
    v := replace(v, 'ß', 'ß');
    v := replace(v, 'Ã ', 'à');
    v := replace(v, 'á', 'á');
    v := replace(v, 'â', 'â');
    v := replace(v, 'ã', 'ã');
    v := replace(v, 'ä', 'ä');
    v := replace(v, 'å', 'å');
    v := replace(v, 'æ', 'æ');
    v := replace(v, 'ç', 'ç');
    v := replace(v, 'è', 'è');
    v := replace(v, 'é', 'é');
    v := replace(v, 'ê', 'ê');
    v := replace(v, 'ë', 'ë');
    v := replace(v, 'ì', 'ì');
    v := replace(v, 'í', 'í');
    v := replace(v, 'î', 'î');
    v := replace(v, 'ï', 'ï');
    v := replace(v, 'ð', 'ð');
    v := replace(v, 'ñ', 'ñ');
    v := replace(v, 'ò', 'ò');
    v := replace(v, 'ó', 'ó');
    v := replace(v, 'ô', 'ô');
    v := replace(v, 'õ', 'õ');
    v := replace(v, 'ö', 'ö');
    v := replace(v, '÷', '÷');
    v := replace(v, 'ø', 'ø');
    v := replace(v, 'ù', 'ù');
    v := replace(v, 'ú', 'ú');
    v := replace(v, 'û', 'û');
    v := replace(v, 'ü', 'ü');
    v := replace(v, 'ý', 'ý');
    v := replace(v, 'þ', 'þ');
    v := replace(v, 'ÿ', 'ÿ');
    v := replace(v, 'Ì', 'Ì');
    v := replace(v, 'Ü', 'Ü');
    v := replace(v, 'Ê', 'Ê');
    v := replace(v, 'Ú', 'Ú');
    v := replace(v, 'ß', 'ß');
    v := replace(v, 'Î', 'Î');
    v := replace(v, 'Þ', 'Þ');
    v := replace(v, 'Ã', 'Ã');
    v := replace(v, 'È', 'È');
    v := replace(v, 'Ø', 'Ø');
    v := replace(v, 'Ö', 'Ö');
    v := replace(v, '×', '×');
    v := replace(v, 'Ñ', 'Ñ');
    v := replace(v, 'Ò', 'Ò');
    v := replace(v, 'Â', 'Â');
    v := replace(v, 'Ó', 'Ó');
    v := replace(v, 'Ô', 'Ô');
    v := replace(v, 'Ä', 'Ä');
    v := replace(v, 'Æ', 'Æ');
    v := replace(v, 'Ç', 'Ç');
    v := replace(v, 'Õ', 'Õ');
    v := replace(v, 'Å', 'Å');
    v := replace(v, 'É', 'É');
    v := replace(v, 'Ë', 'Ë');
    v := replace(v, 'Û', 'Û');
    v := replace(v, 'À', 'À');
    v := replace(v, 'Ù', 'Ù');
    v := replace(v, '', '');
  end loop;
  v := replace(v, chr(160), ' ');
  return v;
end;
$$;

update public.contests
set nome = public.mt_fix_text(nome),
    sigla = public.mt_fix_text(sigla);

update public.study_plans
set name = public.mt_fix_text(name);

update public.study_weeks
set title = regexp_replace(public.mt_fix_text(title), '^\s*#+\s*', '');

update public.study_subjects
set short_name = public.mt_fix_text(short_name),
    name = regexp_replace(public.mt_fix_text(name), '^\s*#+\s*', ''),
    description = public.mt_fix_text(description);

update public.study_lessons
set title = regexp_replace(public.mt_fix_text(title), '^\s*#+\s*', ''),
    priority = public.mt_fix_text(priority);

update public.study_lesson_topics
set topic = regexp_replace(public.mt_fix_text(topic), '^\s*#+\s*', '');

update public.questions
set statement = public.mt_fix_text(statement),
    banca = public.mt_fix_text(banca),
    exam_name = public.mt_fix_text(exam_name),
    source_code = public.mt_fix_text(source_code);

update public.question_keys
set explanation = public.mt_fix_text(explanation);

update public.user_revisions
set subject_name = public.mt_fix_text(subject_name),
    lesson_title = public.mt_fix_text(lesson_title);

update public.lesson_materials
set title = public.mt_fix_text(title),
    file_name = public.mt_fix_text(file_name);

update public.profiles
set nome = public.mt_fix_text(nome)
where nome is not null;

do $$
begin
  if to_regclass('public.study_schedule_blocks') is not null then
    execute 'update public.study_schedule_blocks set title = regexp_replace(public.mt_fix_text(title), ''^\s*#+\s*'', ''''), notes = public.mt_fix_text(notes)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'questions' and column_name = 'choices' and data_type = 'jsonb'
  ) then
    execute 'update public.questions set choices = public.mt_fix_text(choices::text)::jsonb where choices is not null';
  end if;
end;
$$;

-- Nomes canônicos e período do piloto CFO PMAL 2026.
update public.contests
set nome = 'CFO PMAL 2026', sigla = 'CFO PMAL'
where slug = 'cfo-pmal';

update public.study_plans
set name = 'CFO PMAL 2026', is_default = true, active = true
where slug = 'cfo-pmal-2026';

update public.study_weeks w
set title = 'CFO PMAL — Semana 1',
    starts_on = date '2026-09-02',
    ends_on = date '2026-09-09',
    active = true
from public.study_plans p
where w.plan_id = p.id
  and p.slug = 'cfo-pmal-2026'
  and w.week_number = 1;

-- Corrige perfis cujo concurso foco e cronograma ativo ficaram desencontrados.
-- Ex.: CFO PMAL selecionado, mas active_study_plan_id ainda apontando para PRF.
update public.profiles p
set active_study_plan_id = (
  select sp.id
  from public.study_plans sp
  where sp.contest_id = p.focus_contest_id
    and sp.active = true
  order by sp.is_default desc, sp.created_at asc
  limit 1
)
where p.focus_contest_id is not null
  and exists (
    select 1
    from public.study_plans sp
    where sp.contest_id = p.focus_contest_id and sp.active = true
  )
  and (
    p.active_study_plan_id is null
    or not exists (
      select 1
      from public.study_plans cp
      where cp.id = p.active_study_plan_id
        and cp.contest_id = p.focus_contest_id
        and cp.active = true
    )
  );

-- Mantém a troca de concurso e plano sempre sincronizada.
create or replace function public.set_focus_contest(p_contest_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_contest_id uuid;
  v_plan_id uuid;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  select id into v_contest_id
  from public.contests
  where slug = p_contest_slug and ativo = true;

  if v_contest_id is null then raise exception 'Concurso inválido ou inativo'; end if;

  select id into v_plan_id
  from public.study_plans
  where contest_id = v_contest_id and active = true
  order by is_default desc, created_at asc
  limit 1;

  update public.profiles
  set focus_contest_id = v_contest_id,
      active_study_plan_id = v_plan_id
  where id = v_user_id;

  if not found then raise exception 'Perfil não encontrado'; end if;
end;
$$;
revoke all on function public.set_focus_contest(text) from public;
grant execute on function public.set_focus_contest(text) to authenticated;

-- Prevenção em tabelas que recebem texto por ações do usuário/admin.
create or replace function public.mt_normalize_profile_text()
returns trigger language plpgsql set search_path = public as $$
begin
  new.nome := public.mt_fix_text(new.nome);
  return new;
end;
$$;
drop trigger if exists mt_normalize_profile_text_trigger on public.profiles;
create trigger mt_normalize_profile_text_trigger
before insert or update on public.profiles
for each row execute function public.mt_normalize_profile_text();

create or replace function public.mt_normalize_revision_text()
returns trigger language plpgsql set search_path = public as $$
begin
  new.subject_name := public.mt_fix_text(new.subject_name);
  new.lesson_title := public.mt_fix_text(new.lesson_title);
  return new;
end;
$$;
drop trigger if exists mt_normalize_revision_text_trigger on public.user_revisions;
create trigger mt_normalize_revision_text_trigger
before insert or update on public.user_revisions
for each row execute function public.mt_normalize_revision_text();

create or replace function public.mt_normalize_material_text()
returns trigger language plpgsql set search_path = public as $$
begin
  new.title := public.mt_fix_text(new.title);
  new.file_name := public.mt_fix_text(new.file_name);
  return new;
end;
$$;
drop trigger if exists mt_normalize_material_text_trigger on public.lesson_materials;
create trigger mt_normalize_material_text_trigger
before insert or update on public.lesson_materials
for each row execute function public.mt_normalize_material_text();

-- As triggers de contests/plans/weeks/subjects/lessons/topics/questions/question_keys
-- criadas na V9 já chamam public.mt_fix_text. Como a função foi substituída acima,
-- elas passam automaticamente a usar esta versão robusta.

do $$
begin
  if to_regclass('public.study_schedule_blocks') is not null then
    execute $fn$
      create or replace function public.mt_normalize_schedule_block_text()
      returns trigger
      language plpgsql
      set search_path = public
      as $body$
      begin
        new.title := regexp_replace(public.mt_fix_text(new.title), '^\s*#+\s*', '');
        new.notes := public.mt_fix_text(new.notes);
        return new;
      end;
      $body$;
    $fn$;
    execute 'drop trigger if exists mt_normalize_schedule_block_text_trigger on public.study_schedule_blocks';
    execute 'create trigger mt_normalize_schedule_block_text_trigger before insert or update on public.study_schedule_blocks for each row execute function public.mt_normalize_schedule_block_text()';
  end if;
end;
$$;
