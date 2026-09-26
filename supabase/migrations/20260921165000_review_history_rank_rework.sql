-- Mentoria TitÃ£ â€” revisÃ£o + ranks (espelho do backend LIVE jÃ¡ aplicado)
alter table public.user_question_answers
  drop constraint if exists user_question_answers_origin_check;

alter table public.user_question_answers
  add constraint user_question_answers_origin_check
  check (origin = any (array['bank'::text,'review'::text,'lesson_list'::text,'leveling'::text]));

create or replace function public.mt_track_saved_question_review_answer()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.origin='review' then
    update public.user_question_marks
    set review_last_reviewed_at=coalesce(new.answered_at,now()),
        review_last_result=new.is_correct,
        updated_at=now()
    where user_id=new.user_id
      and question_id=new.question_id
      and saved_for_review=true;
  end if;
  return new;
end;
$$;

create or replace function public.mt_rank_for_level(p_level integer)
returns jsonb
language sql
immutable
set search_path=public
as $$
  select case
    when coalesce(p_level,1)>=36 then jsonb_build_object('tier',8,'slug','tita-supremo','title','TitÃ£ Supremo','min_level',36,'max_level',null)
    when p_level>=31 then jsonb_build_object('tier',7,'slug','tita','title','TitÃ£','min_level',31,'max_level',35)
    when p_level>=26 then jsonb_build_object('tier',6,'slug','mini-tita','title','Mini-TitÃ£','min_level',26,'max_level',30)
    when p_level>=21 then jsonb_build_object('tier',5,'slug','elite','title','Elite','min_level',21,'max_level',25)
    when p_level>=16 then jsonb_build_object('tier',4,'slug','especialista','title','Especialista','min_level',16,'max_level',20)
    when p_level>=11 then jsonb_build_object('tier',3,'slug','operacional','title','Operacional','min_level',11,'max_level',15)
    when p_level>=6 then jsonb_build_object('tier',2,'slug','iniciante','title','Iniciante','min_level',6,'max_level',10)
    else jsonb_build_object('tier',1,'slug','recruta','title','Recruta','min_level',1,'max_level',5)
  end;
$$;
