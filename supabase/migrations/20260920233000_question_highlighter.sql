-- Mentoria TitÃ£ - marca-texto persistente por usuÃ¡rio/questÃ£o
create table if not exists public.user_question_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  start_offset integer not null,
  end_offset integer not null,
  color text not null default 'purple',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_question_highlights_valid_range check (start_offset >= 0 and end_offset > start_offset),
  constraint user_question_highlights_valid_color check (color in ('purple','yellow','pink','green','blue','orange'))
);

create index if not exists idx_user_question_highlights_lookup
  on public.user_question_highlights(user_id,question_id,start_offset,end_offset);

alter table public.user_question_highlights enable row level security;

revoke all on table public.user_question_highlights from public;
revoke all on table public.user_question_highlights from anon;
revoke all on table public.user_question_highlights from authenticated;

create or replace function public.get_question_highlights(p_question_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'UsuÃ¡rio nÃ£o autenticado.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'start_offset', h.start_offset,
        'end_offset', h.end_offset,
        'color', h.color
      )
      order by h.start_offset,h.end_offset,h.created_at
    )
    from public.user_question_highlights h
    where h.user_id=v_user and h.question_id=p_question_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.add_question_highlight(
  p_question_id uuid,
  p_start_offset integer,
  p_end_offset integer,
  p_color text default 'purple'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_len integer;
  v_id uuid;
  v_color text := lower(coalesce(p_color,'purple'));
begin
  if v_user is null then
    raise exception 'UsuÃ¡rio nÃ£o autenticado.';
  end if;

  select char_length(statement) into v_len
  from public.questions
  where id=p_question_id;

  if v_len is null then
    raise exception 'QuestÃ£o nÃ£o encontrada.';
  end if;

  if p_start_offset is null or p_end_offset is null
     or p_start_offset < 0 or p_end_offset <= p_start_offset or p_end_offset > v_len then
    raise exception 'Trecho selecionado invÃ¡lido.';
  end if;

  if v_color not in ('purple','yellow','pink','green','blue','orange') then
    v_color := 'purple';
  end if;

  delete from public.user_question_highlights h
  where h.user_id=v_user
    and h.question_id=p_question_id
    and h.start_offset < p_end_offset
    and h.end_offset > p_start_offset;

  insert into public.user_question_highlights(user_id,question_id,start_offset,end_offset,color)
  values(v_user,p_question_id,p_start_offset,p_end_offset,v_color)
  returning id into v_id;

  return jsonb_build_object(
    'id',v_id,
    'start_offset',p_start_offset,
    'end_offset',p_end_offset,
    'color',v_color
  );
end;
$$;

create or replace function public.clear_question_highlights(p_question_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'UsuÃ¡rio nÃ£o autenticado.';
  end if;

  delete from public.user_question_highlights
  where user_id=v_user and question_id=p_question_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.get_question_highlights(uuid) from public,anon;
revoke all on function public.add_question_highlight(uuid,integer,integer,text) from public,anon;
revoke all on function public.clear_question_highlights(uuid) from public,anon;

grant execute on function public.get_question_highlights(uuid) to authenticated;
grant execute on function public.add_question_highlight(uuid,integer,integer,text) to authenticated;
grant execute on function public.clear_question_highlights(uuid) to authenticated;
