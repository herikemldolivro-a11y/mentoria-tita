create table if not exists public.user_enem_daily_checkpoints (
  user_id uuid not null references auth.users(id) on delete cascade,
  study_day integer not null check (study_day between 2 and 40),
  checkpoint text not null check (checkpoint in ('essay_note_mil')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, study_day, checkpoint)
);

alter table public.user_enem_daily_checkpoints enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_enem_daily_checkpoints' and policyname = 'enem_daily_checkpoints_select_own'
  ) then
    create policy enem_daily_checkpoints_select_own on public.user_enem_daily_checkpoints
      for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_enem_daily_checkpoints' and policyname = 'enem_daily_checkpoints_insert_own'
  ) then
    create policy enem_daily_checkpoints_insert_own on public.user_enem_daily_checkpoints
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_enem_daily_checkpoints' and policyname = 'enem_daily_checkpoints_update_own'
  ) then
    create policy enem_daily_checkpoints_update_own on public.user_enem_daily_checkpoints
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_enem_daily_checkpoints' and policyname = 'enem_daily_checkpoints_delete_own'
  ) then
    create policy enem_daily_checkpoints_delete_own on public.user_enem_daily_checkpoints
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.user_enem_daily_checkpoints to authenticated;
