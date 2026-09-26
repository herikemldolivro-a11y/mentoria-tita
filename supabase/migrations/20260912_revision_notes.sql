alter table public.user_revisions
  add column if not exists notes text;

comment on column public.user_revisions.notes is
  'Observações opcionais registradas pelo aluno ao agendar ou revisar a revisão.';
