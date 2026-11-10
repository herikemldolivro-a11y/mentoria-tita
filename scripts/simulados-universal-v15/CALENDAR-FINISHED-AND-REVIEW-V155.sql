-- TITÃ V15.5: separate finished exam events from next review events.
-- Does not delete rows or schedule new rounds.
-- A pending review is visible only after its immediately preceding round was completed.
create or replace function public.mt_simulado_calendar_entries()
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'id',r.id,
      'simulado_id',r.simulado_id,
      'titulo',case
        when r.completed_at is null then 'Revisão · ' || r.titulo
        when r.has_predecessor then 'Revisão · ' || r.titulo
        else r.titulo
      end,
      'dia_origem',r.dia_origem,
      'round_number',r.round_number,
      'scheduled_for',r.event_date,
      'event_kind',case
        when r.completed_at is null then 'review_pending'
        when r.has_predecessor then 'review_completed'
        else 'simulado_completed'
      end,
      'status',case when r.completed_at is null then 'scheduled' else 'completed' end,
      'completed_at',r.completed_at,
      'question_count',case when r.completed_at is null
        then (select count(*) from public.mt_simulado_round_scope sc
              where sc.user_id=r.user_id and sc.round_id=r.id)
        else (select count(*) from public.mt_simulado_round_answers a
              where a.user_id=r.user_id and a.round_id=r.id)
      end,
      'notebook_count',case when r.completed_at is not null then 0
        else (select count(*) from public.mt_simulado_flashcards c
              where c.user_id=r.user_id and c.simulado_id=r.simulado_id)
      end,
      'notebook_date',case when r.completed_at is not null then null else r.scheduled_for-1 end,
      'notebook_completed',case when r.completed_at is not null then true
        else exists(select 1 from public.mt_simulado_notebook_reviews n
                    where n.user_id=r.user_id and n.round_id=r.id)
      end,
      'notebook_completed_at',case when r.completed_at is not null then null
        else (select n.completed_at from public.mt_simulado_notebook_reviews n
              where n.user_id=r.user_id and n.round_id=r.id)
      end
    ) order by r.event_date,r.titulo,r.round_number
  ),
  '[]'::jsonb
)
from (
  select r.*,
    case when r.completed_at is null then r.scheduled_for
         else (r.completed_at at time zone 'America/Fortaleza')::date end as event_date,
    exists (
      select 1 from public.mt_simulado_review_rounds p
      where p.user_id=r.user_id and p.simulado_id=r.simulado_id
        and p.round_number=r.round_number-1 and p.completed_at is not null
    ) as has_predecessor
  from public.mt_simulado_review_rounds r
  where r.user_id=auth.uid()
    and (
      r.completed_at is not null
      or (
        r.scheduled_for is not null
        and exists (
          select 1 from public.mt_simulado_review_rounds p
          where p.user_id=r.user_id and p.simulado_id=r.simulado_id
            and p.round_number=r.round_number-1 and p.completed_at is not null
        )
        and exists (
          select 1 from public.mt_simulado_round_scope sc
          where sc.user_id=r.user_id and sc.round_id=r.id
        )
      )
    )
) r;
$function$;
