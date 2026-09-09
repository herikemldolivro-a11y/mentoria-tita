-- Mentoria Titã — V9.3.8
-- Histórico de importações por lote + reversão com um clique.
-- Também reconstrói lotes antigos ainda sem batch_id, inclusive o último lote recém-importado.

create table if not exists public.question_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  question_count integer not null default 0 check (question_count >= 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  backfilled boolean not null default false
);

alter table public.questions
  add column if not exists import_batch_id uuid
  references public.question_import_batches(id) on delete set null;

create index if not exists questions_import_batch_idx
  on public.questions(import_batch_id);

create index if not exists question_import_batches_created_by_idx
  on public.question_import_batches(created_by, created_at desc);

alter table public.question_import_batches enable row level security;

drop policy if exists "Admins read question import batches"
  on public.question_import_batches;

create policy "Admins read question import batches"
on public.question_import_batches
for select to authenticated
using (public.is_admin());

grant select on public.question_import_batches to authenticated;

-- Backfill:
-- reconstrói blocos antigos usando o mesmo criador e considerando
-- uma nova importação quando muda plano/matéria/aula ou há pausa > 45 s.
do $$
declare
  v_group record;
  v_batch_id uuid;
begin
  create temp table if not exists mt_unbatched_question_groups (
    question_id uuid primary key,
    created_by uuid,
    group_number bigint,
    created_at timestamptz
  ) on commit drop;

  truncate table mt_unbatched_question_groups;

  insert into mt_unbatched_question_groups (
    question_id,
    created_by,
    group_number,
    created_at
  )
  with base as (
    select
      q.id,
      q.created_by,
      q.plan_id,
      q.subject_id,
      q.lesson_id,
      q.created_at,
      lag(q.created_at) over (
        partition by q.created_by
        order by q.created_at, q.id
      ) as previous_created_at,
      lag(q.plan_id) over (
        partition by q.created_by
        order by q.created_at, q.id
      ) as previous_plan_id,
      lag(q.subject_id) over (
        partition by q.created_by
        order by q.created_at, q.id
      ) as previous_subject_id,
      lag(q.lesson_id) over (
        partition by q.created_by
        order by q.created_at, q.id
      ) as previous_lesson_id
    from public.questions q
    where q.import_batch_id is null
      and q.created_by is not null
  ),
  marked as (
    select
      *,
      case
        when previous_created_at is null then 1
        when created_at - previous_created_at > interval '45 seconds' then 1
        when plan_id is distinct from previous_plan_id then 1
        when subject_id is distinct from previous_subject_id then 1
        when lesson_id is distinct from previous_lesson_id then 1
        else 0
      end as starts_new_group
    from base
  ),
  grouped as (
    select
      *,
      sum(starts_new_group) over (
        partition by created_by
        order by created_at, id
        rows between unbounded preceding and current row
      ) as group_number
    from marked
  )
  select
    id,
    created_by,
    group_number,
    created_at
  from grouped;

  for v_group in
    select
      created_by,
      group_number,
      count(*)::integer as question_count,
      min(created_at) as first_created_at
    from mt_unbatched_question_groups
    group by created_by, group_number
    order by min(created_at)
  loop
    insert into public.question_import_batches (
      created_by,
      question_count,
      created_at,
      backfilled
    )
    values (
      v_group.created_by,
      v_group.question_count,
      v_group.first_created_at,
      true
    )
    returning id into v_batch_id;

    update public.questions q
    set import_batch_id = v_batch_id
    from mt_unbatched_question_groups g
    where g.question_id = q.id
      and g.created_by = v_group.created_by
      and g.group_number = v_group.group_number;
  end loop;
end;
$$;

create or replace function public.admin_import_questions(p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_index integer := 0;
  v_ids jsonb := '[]'::jsonb;
  v_id uuid;
  v_batch_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if jsonb_typeof(p_questions) <> 'array'
     or jsonb_array_length(p_questions) = 0 then
    raise exception 'Envie um array JSON com pelo menos uma questão';
  end if;

  if jsonb_array_length(p_questions) > 500 then
    raise exception 'Importe no máximo 500 questões por lote';
  end if;

  insert into public.question_import_batches (
    created_by,
    question_count,
    backfilled
  )
  values (
    auth.uid(),
    jsonb_array_length(p_questions),
    false
  )
  returning id into v_batch_id;

  for v_item in
    select value
    from jsonb_array_elements(p_questions)
  loop
    v_index := v_index + 1;

    begin
      v_id := public.admin_upsert_question(v_item);

      update public.questions
      set import_batch_id = v_batch_id
      where id = v_id;

      v_ids := v_ids || jsonb_build_array(v_id);
    exception when others then
      raise exception 'Registro %: %', v_index, sqlerrm;
    end;
  end loop;

  return jsonb_build_object(
    'imported', v_index,
    'ids', v_ids,
    'batch_id', v_batch_id
  );
end;
$$;

revoke all on function public.admin_import_questions(jsonb) from public;
grant execute on function public.admin_import_questions(jsonb) to authenticated;

create or replace function public.admin_question_import_history(
  p_limit integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 100);
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  with selected_batches as (
    select b.*
    from public.question_import_batches b
    where b.created_by = auth.uid()
    order by b.created_at desc, b.id desc
    limit v_limit
  ),
  rows as (
    select
      b.id,
      b.created_at,
      b.question_count as original_count,
      b.deleted_at,
      count(q.id)::integer as current_count,
      count(q.id) filter (
        where coalesce(q.source_type, case when q.banca is null then 'authorial' else 'real' end) = 'real'
      )::integer as real_count,
      count(q.id) filter (
        where coalesce(q.source_type, case when q.banca is null then 'authorial' else 'real' end) = 'authorial'
      )::integer as authorial_count,
      count(q.id) filter (
        where exists (
          select 1
          from public.user_question_answers a
          where a.question_id = q.id
        )
        or exists (
          select 1
          from public.question_attempt_items i
          where i.question_id = q.id
        )
      )::integer as protected_count,
      coalesce(
        array_agg(distinct p.name order by p.name)
          filter (where p.name is not null),
        array[]::text[]
      ) as plans,
      coalesce(
        array_agg(distinct s.name order by s.name)
          filter (where s.name is not null),
        array[]::text[]
      ) as subjects,
      coalesce(
        array_agg(distinct l.title order by l.title)
          filter (where l.title is not null),
        array[]::text[]
      ) as lessons
    from selected_batches b
    left join public.questions q
      on q.import_batch_id = b.id
    left join public.study_plans p
      on p.id = q.plan_id
    left join public.study_subjects s
      on s.id = q.subject_id
    left join public.study_lessons l
      on l.id = q.lesson_id
    group by b.id, b.created_at, b.question_count, b.deleted_at
  ),
  banca_rows as (
    select
      b.id as batch_id,
      q.banca,
      count(*)::integer as count
    from selected_batches b
    join public.questions q
      on q.import_batch_id = b.id
    where nullif(trim(q.banca), '') is not null
    group by b.id, q.banca
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'created_at', r.created_at,
        'original_count', r.original_count,
        'current_count', r.current_count,
        'real_count', r.real_count,
        'authorial_count', r.authorial_count,
        'protected_count', r.protected_count,
        'plans', to_jsonb(r.plans),
        'subjects', to_jsonb(r.subjects),
        'lessons', to_jsonb(r.lessons),
        'deleted_at', r.deleted_at,
        'bancas', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'banca', br.banca,
                'count', br.count
              )
              order by br.count desc, br.banca
            )
            from banca_rows br
            where br.batch_id = r.id
          ),
          '[]'::jsonb
        )
      )
      order by r.created_at desc, r.id desc
    ),
    '[]'::jsonb
  )
  into v_result
  from rows r;

  return v_result;
end;
$$;

revoke all on function public.admin_question_import_history(integer) from public;
grant execute on function public.admin_question_import_history(integer) to authenticated;

create or replace function public.admin_delete_question_import_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.question_import_batches%rowtype;
  v_count integer := 0;
  v_protected integer := 0;
  v_deleted integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  select *
  into v_batch
  from public.question_import_batches
  where id = p_batch_id;

  if v_batch.id is null then
    raise exception 'Lote não encontrado';
  end if;

  if v_batch.deleted_at is not null then
    return jsonb_build_object(
      'ok', true,
      'deleted', 0,
      'protected', 0,
      'message', 'Esse lote já foi excluído'
    );
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where exists (
        select 1
        from public.user_question_answers a
        where a.question_id = q.id
      )
      or exists (
        select 1
        from public.question_attempt_items i
        where i.question_id = q.id
      )
    )::integer
  into v_count, v_protected
  from public.questions q
  where q.import_batch_id = p_batch_id;

  if v_protected > 0 then
    return jsonb_build_object(
      'ok', false,
      'deleted', 0,
      'protected', v_protected,
      'message',
      format(
        '%s questão(ões) já possuem respostas ou tentativas. O lote foi protegido para não quebrar o histórico.',
        v_protected
      )
    );
  end if;

  with deleted as (
    delete from public.questions q
    where q.import_batch_id = p_batch_id
    returning q.id
  )
  select count(*)::integer
  into v_deleted
  from deleted;

  update public.question_import_batches
  set
    deleted_at = now(),
    deleted_by = auth.uid()
  where id = p_batch_id;

  return jsonb_build_object(
    'ok', true,
    'deleted', v_deleted,
    'protected', 0,
    'original_count', v_batch.question_count
  );
end;
$$;

revoke all on function public.admin_delete_question_import_batch(uuid) from public;
grant execute on function public.admin_delete_question_import_batch(uuid) to authenticated;
