-- Mentoria Titã — Caderno de Anotações por aula
-- Agenda do bloco: +2 dias após ativação; depois +4, +7 e +15 continuamente.

create table if not exists public.user_lesson_notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','active')),
  activated_at timestamptz,
  next_review_on date,
  review_step integer not null default 0 check (review_step >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.user_lesson_notebook_cards (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.user_lesson_notebooks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  position integer not null default 1 check (position >= 1),
  last_result boolean,
  consecutive_correct integer not null default 0 check (consecutive_correct >= 0),
  correct_total integer not null default 0 check (correct_total >= 0),
  incorrect_total integer not null default 0 check (incorrect_total >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notebook_id, position)
);

create table if not exists public.user_lesson_notebook_reviews (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.user_lesson_notebooks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  was_scheduled boolean not null default false,
  schedule_advanced boolean not null default false,
  score integer not null default 0,
  total integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

create table if not exists public.user_lesson_notebook_card_reviews (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.user_lesson_notebook_reviews(id) on delete cascade,
  card_id uuid not null references public.user_lesson_notebook_cards(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  is_correct boolean not null,
  reviewed_at timestamptz not null default now(),
  unique (review_id, card_id)
);

create index if not exists user_lesson_notebooks_due_idx
  on public.user_lesson_notebooks(user_id, next_review_on)
  where status = 'active';

create index if not exists user_lesson_notebook_cards_priority_idx
  on public.user_lesson_notebook_cards(notebook_id, last_result, incorrect_total desc, created_at);

alter table public.user_lesson_notebooks enable row level security;
alter table public.user_lesson_notebook_cards enable row level security;
alter table public.user_lesson_notebook_reviews enable row level security;
alter table public.user_lesson_notebook_card_reviews enable row level security;

drop policy if exists "Users manage own lesson notebooks" on public.user_lesson_notebooks;
create policy "Users manage own lesson notebooks"
on public.user_lesson_notebooks for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage own lesson notebook cards" on public.user_lesson_notebook_cards;
create policy "Users manage own lesson notebook cards"
on public.user_lesson_notebook_cards for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.user_lesson_notebooks n
    where n.id = notebook_id and n.user_id = auth.uid()
  )
);

drop policy if exists "Users read own lesson notebook reviews" on public.user_lesson_notebook_reviews;
create policy "Users read own lesson notebook reviews"
on public.user_lesson_notebook_reviews for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users read own lesson notebook card reviews" on public.user_lesson_notebook_card_reviews;
create policy "Users read own lesson notebook card reviews"
on public.user_lesson_notebook_card_reviews for select to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.user_lesson_notebooks to authenticated;
grant select, insert, update, delete on public.user_lesson_notebook_cards to authenticated;
grant select on public.user_lesson_notebook_reviews to authenticated;
grant select on public.user_lesson_notebook_card_reviews to authenticated;

create or replace function public.mt_touch_lesson_notebook_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mt_touch_lesson_notebooks on public.user_lesson_notebooks;
create trigger mt_touch_lesson_notebooks
before update on public.user_lesson_notebooks
for each row execute function public.mt_touch_lesson_notebook_updated_at();

drop trigger if exists mt_touch_lesson_notebook_cards on public.user_lesson_notebook_cards;
create trigger mt_touch_lesson_notebook_cards
before update on public.user_lesson_notebook_cards
for each row execute function public.mt_touch_lesson_notebook_updated_at();

create or replace function public.activate_lesson_notebook(p_notebook_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notebook public.user_lesson_notebooks%rowtype;
  v_count integer;
  v_next date;
begin
  select * into v_notebook
  from public.user_lesson_notebooks
  where id = p_notebook_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'Caderno não encontrado.'; end if;

  select count(*) into v_count
  from public.user_lesson_notebook_cards
  where notebook_id = p_notebook_id and user_id = auth.uid();

  if v_count = 0 then
    raise exception 'Adicione pelo menos um flashcard antes de finalizar o caderno.';
  end if;

  if v_notebook.activated_at is null then
    v_next := current_date + 2;
    update public.user_lesson_notebooks
    set status = 'active', activated_at = now(), next_review_on = v_next, review_step = 0
    where id = p_notebook_id;
  else
    v_next := v_notebook.next_review_on;
    update public.user_lesson_notebooks set status = 'active' where id = p_notebook_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'notebook_id', p_notebook_id,
    'card_count', v_count,
    'next_review_on', v_next,
    'review_step', case when v_notebook.activated_at is null then 0 else v_notebook.review_step end
  );
end;
$$;

grant execute on function public.activate_lesson_notebook(uuid) to authenticated;

create or replace function public.complete_lesson_notebook_review(p_notebook_id uuid, p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notebook public.user_lesson_notebooks%rowtype;
  v_review_id uuid;
  v_item record;
  v_card_id uuid;
  v_correct boolean;
  v_score integer := 0;
  v_total integer := 0;
  v_scheduled boolean := false;
  v_advanced boolean := false;
  v_next date;
  v_interval integer := 0;
begin
  select * into v_notebook
  from public.user_lesson_notebooks
  where id = p_notebook_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'Caderno não encontrado.'; end if;
  if jsonb_typeof(p_results) <> 'object' then raise exception 'Resultados inválidos.'; end if;

  v_scheduled := v_notebook.status = 'active'
    and v_notebook.next_review_on is not null
    and v_notebook.next_review_on <= current_date;

  insert into public.user_lesson_notebook_reviews(notebook_id,user_id,was_scheduled,schedule_advanced,score,total)
  values (p_notebook_id, auth.uid(), v_scheduled, false, 0, 0)
  returning id into v_review_id;

  for v_item in select key, value from jsonb_each_text(p_results)
  loop
    begin v_card_id := v_item.key::uuid;
    exception when invalid_text_representation then continue;
    end;

    if not exists (
      select 1 from public.user_lesson_notebook_cards
      where id = v_card_id and notebook_id = p_notebook_id and user_id = auth.uid()
    ) then continue; end if;

    v_correct := lower(v_item.value) = 'true';
    v_total := v_total + 1;
    if v_correct then v_score := v_score + 1; end if;

    update public.user_lesson_notebook_cards
    set last_result = v_correct,
        consecutive_correct = case when v_correct then consecutive_correct + 1 else 0 end,
        correct_total = correct_total + case when v_correct then 1 else 0 end,
        incorrect_total = incorrect_total + case when v_correct then 0 else 1 end,
        last_reviewed_at = now()
    where id = v_card_id;

    insert into public.user_lesson_notebook_card_reviews(review_id,card_id,user_id,is_correct)
    values (v_review_id,v_card_id,auth.uid(),v_correct);
  end loop;

  if v_total = 0 then
    delete from public.user_lesson_notebook_reviews where id = v_review_id;
    raise exception 'Nenhum flashcard foi revisado.';
  end if;

  if v_scheduled then
    v_interval := case when v_notebook.review_step = 0 then 4 when v_notebook.review_step = 1 then 7 else 15 end;
    v_next := current_date + v_interval;
    v_advanced := true;
    update public.user_lesson_notebooks
    set review_step = review_step + 1, next_review_on = v_next, last_reviewed_at = now()
    where id = p_notebook_id;
  else
    v_next := v_notebook.next_review_on;
    update public.user_lesson_notebooks set last_reviewed_at = now() where id = p_notebook_id;
  end if;

  update public.user_lesson_notebook_reviews
  set schedule_advanced = v_advanced, score = v_score, total = v_total, completed_at = now()
  where id = v_review_id;

  return jsonb_build_object(
    'ok', true,
    'review_id', v_review_id,
    'score', v_score,
    'total', v_total,
    'schedule_advanced', v_advanced,
    'next_review_on', v_next,
    'review_step', case when v_advanced then v_notebook.review_step + 1 else v_notebook.review_step end
  );
end;
$$;

grant execute on function public.complete_lesson_notebook_review(uuid, jsonb) to authenticated;
