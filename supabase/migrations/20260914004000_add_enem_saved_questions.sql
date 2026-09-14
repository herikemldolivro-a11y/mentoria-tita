create table if not exists public.user_enem_saved_questions (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  subject_slug text not null,
  lesson_slug text not null,
  lesson_title text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, question_id, lesson_slug)
);

alter table public.user_enem_saved_questions enable row level security;

drop policy if exists "users_manage_own_enem_saved_questions" on public.user_enem_saved_questions;
create policy "users_manage_own_enem_saved_questions"
on public.user_enem_saved_questions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists user_enem_saved_questions_lesson_idx
on public.user_enem_saved_questions (user_id, subject_slug, lesson_slug, saved_at desc);
