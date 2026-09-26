create or replace function public.mt_pmal_sync_primary_list_completion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan_slug text;
  v_notebook_id uuid;
begin
  if new.kind <> 'lesson_list' or new.status <> 'completed' then
    return new;
  end if;

  select sp.slug into v_plan_slug
  from public.study_lessons l
  join public.study_subjects s on s.id=l.subject_id
  join public.study_plans sp on sp.id=s.plan_id
  where l.id=new.lesson_id
  limit 1;

  if v_plan_slug <> 'cfo-pmal-2026' then return new; end if;

  insert into public.user_lesson_progress(user_id,lesson_id,list_started_at,list_completed_at,updated_at)
  values(new.user_id,new.lesson_id,coalesce(new.started_at,now()),coalesce(new.completed_at,now()),now())
  on conflict(user_id,lesson_id) do update
  set list_started_at=coalesce(public.user_lesson_progress.list_started_at,excluded.list_started_at),
      list_completed_at=coalesce(public.user_lesson_progress.list_completed_at,excluded.list_completed_at),
      updated_at=now();

  select n.id into v_notebook_id
  from public.user_lesson_notebooks n
  where n.user_id=new.user_id and n.lesson_id=new.lesson_id
    and exists(select 1 from public.user_lesson_notebook_cards c where c.notebook_id=n.id and c.user_id=n.user_id)
  limit 1;

  if v_notebook_id is not null then
    update public.user_lesson_notebooks
    set status='active',activated_at=coalesce(activated_at,now()),updated_at=now()
    where id=v_notebook_id;
  end if;

  return new;
end;
$function$;

drop trigger if exists mt_pmal_sync_primary_list_completion_trigger on public.question_attempts;
create trigger mt_pmal_sync_primary_list_completion_trigger
after insert or update of status on public.question_attempts
for each row execute function public.mt_pmal_sync_primary_list_completion();
