create table if not exists public.user_enem_english_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id text not null,
  reading_completed_at timestamptz,
  answer text,
  is_correct boolean,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, reading_id),
  constraint user_enem_english_progress_answer_check check (answer is null or answer in ('A','B','C','D','E'))
);

create table if not exists public.user_enem_english_vocab (
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id text not null,
  word text not null,
  word_key text not null,
  translation text not null default '',
  context text not null default '',
  saved_at timestamptz not null default now(),
  primary key (user_id, reading_id, word_key)
);

alter table public.user_enem_english_progress enable row level security;
alter table public.user_enem_english_vocab enable row level security;

drop policy if exists "Users read own ENEM English progress" on public.user_enem_english_progress;
create policy "Users read own ENEM English progress" on public.user_enem_english_progress for select using (user_id = auth.uid());
drop policy if exists "Users insert own ENEM English progress" on public.user_enem_english_progress;
create policy "Users insert own ENEM English progress" on public.user_enem_english_progress for insert with check (user_id = auth.uid());
drop policy if exists "Users update own ENEM English progress" on public.user_enem_english_progress;
create policy "Users update own ENEM English progress" on public.user_enem_english_progress for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users read own ENEM English vocab" on public.user_enem_english_vocab;
create policy "Users read own ENEM English vocab" on public.user_enem_english_vocab for select using (user_id = auth.uid());
drop policy if exists "Users insert own ENEM English vocab" on public.user_enem_english_vocab;
create policy "Users insert own ENEM English vocab" on public.user_enem_english_vocab for insert with check (user_id = auth.uid());
drop policy if exists "Users delete own ENEM English vocab" on public.user_enem_english_vocab;
create policy "Users delete own ENEM English vocab" on public.user_enem_english_vocab for delete using (user_id = auth.uid());

create index if not exists user_enem_english_progress_user_completed_idx on public.user_enem_english_progress(user_id, completed_at);
create index if not exists user_enem_english_vocab_user_saved_idx on public.user_enem_english_vocab(user_id, saved_at desc);
