begin;

create table if not exists public.user_list_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.study_lessons(id) on delete restrict,
  review_number integer not null check (review_number between 1 and 4),
  recommended_for date not null,
  scheduled_for date,
  status text not null default 'draft' check (status in ('draft','scheduled','in_progress','completed')),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  new_count integer not null default 20 check (new_count >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id, review_number)
);

alter table public.user_list_reviews enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_list_reviews' and policyname='list reviews own select') then
    create policy "list reviews own select" on public.user_list_reviews for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='question_attempts' and column_name='list_review_id') then
    alter table public.question_attempts add column list_review_id uuid references public.user_list_reviews(id) on delete set null;
  end if;
end $$;

alter table public.question_attempts drop constraint if exists question_attempts_kind_check;
alter table public.question_attempts add constraint question_attempts_kind_check check (kind = any (array['lesson_list'::text,'leveling'::text,'list_review'::text]));

alter table public.question_attempts drop constraint if exists question_attempt_kind_lesson;
alter table public.question_attempts add constraint question_attempt_kind_lesson check (
  ((kind in ('lesson_list','list_review')) and lesson_id is not null)
  or kind = 'leveling'
);

create index if not exists user_list_reviews_user_date_idx on public.user_list_reviews(user_id, coalesce(scheduled_for,recommended_for), status);
create index if not exists question_attempts_list_review_idx on public.question_attempts(list_review_id) where list_review_id is not null;

create or replace function public.mt_list_review_gap_days(p_review_number integer)
returns integer language sql immutable as $$
  select case greatest(coalesce(p_review_number,1),1)
    when 1 then 1
    when 2 then 7
    when 3 then 14
    else 30
  end;
$$;

create or replace function public.mt_schedule_list_review_from_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.user_list_reviews%rowtype;
  v_next integer;
begin
  if old.status is distinct from new.status and new.status = 'completed' then
    if new.kind = 'lesson_list' and new.lesson_id is not null then
      insert into public.user_list_reviews(user_id,lesson_id,review_number,recommended_for,status)
      values(new.user_id,new.lesson_id,1,current_date + public.mt_list_review_gap_days(1),'draft')
      on conflict(user_id,lesson_id,review_number) do nothing;
    elsif new.kind = 'list_review' and new.list_review_id is not null then
      update public.user_list_reviews
      set status='completed', completed_at=coalesce(completed_at,now()), updated_at=now()
      where id=new.list_review_id and user_id=new.user_id
      returning * into v_review;

      if v_review.id is not null and v_review.review_number < 4 then
        v_next := v_review.review_number + 1;
        insert into public.user_list_reviews(user_id,lesson_id,review_number,recommended_for,status)
        values(new.user_id,new.lesson_id,v_next,current_date + public.mt_list_review_gap_days(v_next),'draft')
        on conflict(user_id,lesson_id,review_number) do nothing;
      end if;

      if to_regprocedure('public.mt_award_xp_internal(uuid,text,text,integer,jsonb)') is not null then
        perform public.mt_award_xp_internal(
          new.user_id,
          'list_review_completed',
          'list-review:'||new.list_review_id::text,
          70,
          jsonb_build_object('review_id',new.list_review_id,'lesson_id',new.lesson_id)
        );
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists mt_list_review_schedule_trigger on public.question_attempts;
create trigger mt_list_review_schedule_trigger
after update of status on public.question_attempts
for each row execute function public.mt_schedule_list_review_from_attempt();

-- Backfill: quem já concluiu lista principal ganha a primeira revisão recomendada.
insert into public.user_list_reviews(user_id,lesson_id,review_number,recommended_for,status)
select lp.user_id, lp.lesson_id, 1, (lp.list_completed_at::date + public.mt_list_review_gap_days(1)), 'draft'
from public.user_lesson_progress lp
where lp.list_completed_at is not null
on conflict(user_id,lesson_id,review_number) do nothing;

create or replace function public.set_list_review_schedule(p_review_id uuid, p_date date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.user_list_reviews%rowtype;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  if p_date is null then raise exception 'Escolha uma data para a revisão'; end if;

  update public.user_list_reviews
  set scheduled_for=p_date,
      status=case when status='completed' then status else 'scheduled' end,
      updated_at=now()
  where id=p_review_id and user_id=v_user_id and status <> 'completed'
  returning * into v_row;

  if v_row.id is null then raise exception 'Revisão de lista não encontrada ou já concluída'; end if;
  return jsonb_build_object('id',v_row.id,'scheduled_for',v_row.scheduled_for,'status',v_row.status);
end;
$$;

create or replace function public.start_list_review_attempt(p_review_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.user_list_reviews%rowtype;
  v_attempt_id uuid;
  v_ids uuid[] := array[]::uuid[];
  v_wrong uuid[] := array[]::uuid[];
  v_new uuid[] := array[]::uuid[];
  v_fill uuid[] := array[]::uuid[];
  v_wrong_count integer := 0;
  v_new_count integer := 0;
  v_total integer := 0;
  v_i integer;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':list-review:' || p_review_id::text));

  select * into v_review from public.user_list_reviews where id=p_review_id and user_id=v_user_id;
  if v_review.id is null then raise exception 'Revisão de lista não encontrada'; end if;
  if v_review.status='completed' then raise exception 'Esta revisão já foi concluída'; end if;
  if v_review.scheduled_for is null then raise exception 'Escolha um dia no calendário antes de iniciar a revisão'; end if;

  select id into v_attempt_id
  from public.question_attempts
  where user_id=v_user_id and list_review_id=p_review_id and kind='list_review' and status='in_progress'
  order by started_at desc limit 1;

  if v_attempt_id is not null then
    return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',true,'wrong_count',v_review.wrong_count,'new_count',v_review.new_count);
  end if;

  with latest as (
    select distinct on (a.question_id) a.question_id,a.is_correct,a.answered_at
    from public.user_question_answers a
    join public.questions q on q.id=a.question_id
    where a.user_id=v_user_id and q.lesson_id=v_review.lesson_id and q.active=true
    order by a.question_id,a.answered_at desc
  )
  select coalesce(array_agg(question_id order by random()),array[]::uuid[])
  into v_wrong
  from latest where is_correct=false;

  v_wrong_count := coalesce(array_length(v_wrong,1),0);

  select coalesce(array_agg(id order by random()),array[]::uuid[])
  into v_new
  from (
    select q.id
    from public.questions q
    where q.lesson_id=v_review.lesson_id and q.active=true
      and not (q.id = any(v_wrong))
      and not exists (
        select 1 from public.user_question_answers a
        where a.user_id=v_user_id and a.question_id=q.id
      )
    order by random()
    limit 20
  ) fresh;

  v_new_count := coalesce(array_length(v_new,1),0);

  if v_new_count < 20 then
    select coalesce(array_agg(id order by random()),array[]::uuid[])
    into v_fill
    from (
      select q.id
      from public.questions q
      where q.lesson_id=v_review.lesson_id and q.active=true
        and not (q.id = any(v_wrong))
        and not (q.id = any(v_new))
      order by (
        select max(a.answered_at) from public.user_question_answers a
        where a.user_id=v_user_id and a.question_id=q.id
      ) nulls first, random()
      limit (20-v_new_count)
    ) fallback;
    v_new := v_new || v_fill;
    v_new_count := coalesce(array_length(v_new,1),0);
  end if;

  v_ids := v_wrong || v_new;
  v_total := coalesce(array_length(v_ids,1),0);
  if v_total = 0 then raise exception 'Não há questões disponíveis para montar esta revisão'; end if;

  -- Embaralha sem perder a composição: erros + 20 questões adicionais.
  select array_agg(x order by random()) into v_ids from unnest(v_ids) x;

  insert into public.question_attempts(user_id,lesson_id,kind,status,total,list_review_id)
  values(v_user_id,v_review.lesson_id,'list_review','in_progress',v_total,p_review_id)
  returning id into v_attempt_id;

  for v_i in 1..array_length(v_ids,1) loop
    insert into public.question_attempt_items(attempt_id,question_id,position)
    values(v_attempt_id,v_ids[v_i],v_i);
  end loop;

  update public.user_list_reviews
  set status='in_progress',wrong_count=v_wrong_count,new_count=v_new_count,updated_at=now()
  where id=p_review_id;

  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'continued',false,'wrong_count',v_wrong_count,'new_count',v_new_count,'total',v_total);
end;
$$;

create or replace function public.get_list_learning_hub()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_catalog jsonb;
  v_reviews jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then raise exception 'Nenhum plano ativo atribuído'; end if;

  with day_map as (
    select b.week_id,b.study_date,dense_rank() over(partition by b.week_id order by b.study_date)::integer as day_number
    from public.study_schedule_blocks b
    join public.study_weeks w on w.id=b.week_id
    where w.plan_id=v_plan_id and w.active=true and w.week_number < 90
    group by b.week_id,b.study_date
  ), rows as (
    select distinct
      w.week_number, dm.day_number, b.study_date,
      l.id as lesson_id,l.title as lesson_title,l.slug as lesson_slug,l.question_count,l.pdf_path,
      s.name as subject_name,s.slug as subject_slug,
      (lp.theory_completed_at is not null) as theory_completed,
      (lp.list_completed_at is not null) as list_completed,
      (select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.lesson_id=l.id and qa.kind='lesson_list' and qa.status='in_progress' order by qa.started_at desc limit 1) as attempt_id
    from public.study_weeks w
    join public.study_schedule_blocks b on b.week_id=w.id
    join day_map dm on dm.week_id=b.week_id and dm.study_date=b.study_date
    join public.study_schedule_block_lessons bl on bl.block_id=b.id
    join public.study_lessons l on l.id=bl.lesson_id and l.active=true
    join public.study_subjects s on s.id=l.subject_id and s.active=true
    left join public.user_lesson_progress lp on lp.user_id=v_user_id and lp.lesson_id=l.id
    where w.plan_id=v_plan_id and w.active=true and w.week_number < 90
  )
  select coalesce(jsonb_agg(to_jsonb(rows) order by week_number,day_number,subject_name,lesson_title),'[]'::jsonb)
  into v_catalog from rows;

  with rr as (
    select r.id,r.review_number,r.recommended_for,r.scheduled_for,r.status,r.wrong_count,r.new_count,
      l.id as lesson_id,l.title as lesson_title,l.slug as lesson_slug,
      s.name as subject_name,s.slug as subject_slug,
      (select qa.id from public.question_attempts qa where qa.user_id=v_user_id and qa.list_review_id=r.id order by qa.started_at desc limit 1) as attempt_id
    from public.user_list_reviews r
    join public.study_lessons l on l.id=r.lesson_id
    join public.study_subjects s on s.id=l.subject_id
    where r.user_id=v_user_id and s.plan_id=v_plan_id
    order by coalesce(r.scheduled_for,r.recommended_for),r.review_number
  )
  select coalesce(jsonb_agg(to_jsonb(rr)),'[]'::jsonb) into v_reviews from rr;

  return jsonb_build_object('catalog',v_catalog,'reviews',v_reviews);
end;
$$;

commit;
