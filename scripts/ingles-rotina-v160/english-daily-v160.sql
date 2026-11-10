-- TITÃ · English Daily V16.0 · 10 Nov 2026
-- Preserves all original english_texts, vocabulary, legacy spaced-review rows,
-- old scores and user_english_text_progress records. Nothing is deleted.
CREATE TABLE IF NOT EXISTS public.mt_english_daily_readings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id uuid NOT NULL REFERENCES public.english_texts(id) ON DELETE CASCADE,
  assigned_for date NOT NULL,
  slot smallint NOT NULL CHECK (slot IN (1,2)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,text_id),
  UNIQUE(user_id,assigned_for,slot)
);
CREATE TABLE IF NOT EXISTS public.mt_english_word_cycles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_id uuid NOT NULL REFERENCES public.user_english_vocabulary(id) ON DELETE CASCADE,
  stage smallint NOT NULL DEFAULT 1 CHECK(stage BETWEEN 1 AND 4),
  due_on date,
  wrong_streak integer NOT NULL DEFAULT 0 CHECK(wrong_streak>=0),
  last_correct boolean,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,vocab_id),
  CHECK ((stage=4 AND due_on IS NULL) OR (stage<=3 AND due_on IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS mt_english_cycles_due_idx
  ON public.mt_english_word_cycles(user_id,due_on) WHERE due_on IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.mt_english_favorite_phrases (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_id uuid NOT NULL REFERENCES public.user_english_vocabulary(id) ON DELETE CASCADE,
  phrase_en text NOT NULL CHECK(length(trim(phrase_en)) BETWEEN 5 AND 600),
  source text NOT NULL DEFAULT 'context' CHECK(source IN ('context','ai','manual')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,vocab_id)
);
CREATE TABLE IF NOT EXISTS public.mt_english_favorite_daily_reviews (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  on_date date NOT NULL,
  reviewed_ids jsonb NOT NULL CHECK(jsonb_typeof(reviewed_ids)='array'),
  total integer NOT NULL CHECK(total BETWEEN 1 AND 10),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,on_date)
);
ALTER TABLE public.mt_english_daily_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_english_word_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_english_favorite_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt_english_favorite_daily_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.mt_english_daily_readings TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.mt_english_word_cycles TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.mt_english_favorite_phrases TO authenticated;
GRANT SELECT,INSERT ON public.mt_english_favorite_daily_reviews TO authenticated;
DO $policy$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mt_english_daily_readings' AND policyname='mt_en_read_own') THEN
  CREATE POLICY mt_en_read_own ON public.mt_english_daily_readings FOR ALL TO authenticated
  USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mt_english_word_cycles' AND policyname='mt_en_cycles_own') THEN
  CREATE POLICY mt_en_cycles_own ON public.mt_english_word_cycles FOR ALL TO authenticated
  USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mt_english_favorite_phrases' AND policyname='mt_en_phrases_own') THEN
  CREATE POLICY mt_en_phrases_own ON public.mt_english_favorite_phrases FOR ALL TO authenticated
  USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mt_english_favorite_daily_reviews' AND policyname='mt_en_favday_own') THEN
  CREATE POLICY mt_en_favday_own ON public.mt_english_favorite_daily_reviews FOR ALL TO authenticated
  USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
 END IF;
END
$policy$;

-- Fix only the scheduling trigger for NEW words; never rewrite a legacy review history.
CREATE OR REPLACE FUNCTION public.mt_schedule_new_english_vocab()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
 INSERT INTO public.mt_english_word_cycles(user_id,vocab_id,stage,due_on)
 VALUES(new.user_id,new.id,1,
   (new.saved_at AT TIME ZONE 'America/Fortaleza')::date+2)
 ON CONFLICT(user_id,vocab_id) DO NOTHING;
 RETURN new;
END;
$function$;

-- Future favorites enter the sentence bank automatically.
CREATE OR REPLACE FUNCTION public.mt_english_ensure_favorite_phrase()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
 IF new.starred THEN
  INSERT INTO public.mt_english_favorite_phrases(user_id,vocab_id,phrase_en,source)
  VALUES(new.user_id,new.id,
    CASE WHEN length(trim(coalesce(new.context,'')))>=5
      THEN left(new.context,600)
      ELSE 'Try to use the word "'||left(new.word,80)||'" in a sentence about your day.' END,
    'context')
  ON CONFLICT(user_id,vocab_id) DO NOTHING;
 END IF;
 RETURN new;
END;
$function$;
DROP TRIGGER IF EXISTS mt_english_favorite_phrase_trigger ON public.user_english_vocabulary;
CREATE TRIGGER mt_english_favorite_phrase_trigger AFTER INSERT OR UPDATE OF starred ON public.user_english_vocabulary
 FOR EACH ROW EXECUTE FUNCTION public.mt_english_ensure_favorite_phrase();

-- Catch up historical saved words at a manageable pace (15 legacy words / day).
-- They remain historically saved/reviewed; this creates only a new cycle pointer.
WITH pending AS (
 SELECT v.user_id,v.id AS vocab_id,
   min(r.scheduled_for) FILTER (WHERE r.status='scheduled') AS earliest_legacy,
   row_number() OVER (PARTITION BY v.user_id ORDER BY v.saved_at,v.id) AS seq
 FROM public.user_english_vocabulary v
 LEFT JOIN public.user_english_vocab_spaced_reviews r
   ON r.user_id=v.user_id AND r.vocab_id=v.id
 GROUP BY v.user_id,v.id,v.saved_at
)
INSERT INTO public.mt_english_word_cycles(user_id,vocab_id,stage,due_on)
SELECT user_id,vocab_id,1,
 CASE
  WHEN earliest_legacy IS NOT NULL AND earliest_legacy>date '2026-11-10'
    THEN earliest_legacy
  ELSE date '2026-11-10'+((seq-1)/15)::integer
 END
FROM pending
ON CONFLICT(user_id,vocab_id) DO NOTHING;

-- Seed existing 33 favorites with their authentic reading context until AI text is available.
INSERT INTO public.mt_english_favorite_phrases(user_id,vocab_id,phrase_en,source)
SELECT v.user_id,v.id,
  CASE WHEN length(trim(coalesce(v.context,'')))>=5 THEN left(v.context,600)
   ELSE 'Try to use the word "'||left(v.word,80)||'" in a sentence about your day.' END,
  'context'
FROM public.user_english_vocabulary v WHERE v.starred
ON CONFLICT(user_id,vocab_id) DO NOTHING;

-- Fixed 2-new-texts/day plan: do not reassign old completed texts.
WITH pending_texts AS (
 SELECT p.user_id,t.id AS text_id,
 row_number() OVER(PARTITION BY p.user_id ORDER BY t.position,t.id) AS rn
 FROM (SELECT DISTINCT user_id FROM public.user_english_text_progress
       UNION SELECT DISTINCT user_id FROM public.user_english_vocabulary) p
 CROSS JOIN public.english_texts t
 WHERE t.active=true AND NOT EXISTS (
  SELECT 1 FROM public.user_english_text_progress done
  WHERE done.user_id=p.user_id AND done.text_id=t.id
    AND (done.status='completed' OR done.completed_at IS NOT NULL)
 )
)
INSERT INTO public.mt_english_daily_readings(user_id,text_id,assigned_for,slot)
SELECT user_id,text_id,date '2026-11-10'+((rn-1)/2)::integer,
 ((rn-1)%2+1)::smallint
FROM pending_texts
ON CONFLICT DO NOTHING;

-- Auto-enroll any NEW real catalog texts after the last assigned date/slot.
CREATE OR REPLACE FUNCTION public.mt_english_prepare_daily_readings()
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
 u uuid:=auth.uid();
 t record;
 d date;
 n smallint;
 last_date date;
 last_slot smallint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Faça login para organizar as leituras.'; END IF;
 FOR t IN
   SELECT x.id FROM public.english_texts x
   WHERE x.active=true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_english_text_progress p
      WHERE p.user_id=u AND p.text_id=x.id
      AND (p.status='completed' OR p.completed_at IS NOT NULL)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.mt_english_daily_readings p
      WHERE p.user_id=u AND p.text_id=x.id
    )
   ORDER BY x.position,x.id
 LOOP
   SELECT p.assigned_for,p.slot INTO last_date,last_slot
   FROM public.mt_english_daily_readings p WHERE p.user_id=u
   ORDER BY p.assigned_for DESC,p.slot DESC LIMIT 1;
   IF last_date IS NULL THEN d:=date '2026-11-10'; n:=1;
   ELSIF last_slot=1 THEN d:=last_date; n:=2;
   ELSE d:=last_date+1; n:=1; END IF;
   IF d<date '2026-11-10' THEN d:=date '2026-11-10'; END IF;
   INSERT INTO public.mt_english_daily_readings(user_id,text_id,assigned_for,slot)
   VALUES(u,t.id,d,n) ON CONFLICT DO NOTHING;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'planned',
   (SELECT count(*) FROM public.mt_english_daily_readings p WHERE p.user_id=u));
END;
$function$;

-- Compatibility: the existing English review widget now sees the new 2→4→7 engine.
CREATE OR REPLACE FUNCTION public.get_english_spaced_review_queue(p_on_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
 u uuid:=auth.uid();
 d date:=coalesce(p_on_date,(now() at time zone 'America/Fortaleza')::date);
 cards jsonb;
 future_n integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',v.id,'word',v.word,'translation',v.translation,'context',v.context,
  'starred',v.starred,'saved_at',v.saved_at,'text_title',t.title,
  'last_result',CASE WHEN c.last_correct THEN 'correct'
                     WHEN c.last_correct=false THEN 'wrong' ELSE NULL END,
  'wrong_total',coalesce(f.wrong_total,0),
  'correct_total',coalesce(f.correct_total,0),
  'is_error',coalesce(c.last_correct=false,false),
  'due_stages',jsonb_build_array(jsonb_build_object(
   'interval_days',CASE c.stage WHEN 1 THEN 2 WHEN 2 THEN 4 ELSE 7 END,
   'scheduled_for',c.due_on)),
  'due_since',c.due_on
 ) ORDER BY c.due_on,c.last_correct ASC NULLS LAST,v.saved_at,v.id),'[]'::jsonb)
 INTO cards
 FROM public.mt_english_word_cycles c
 JOIN public.user_english_vocabulary v ON v.id=c.vocab_id AND v.user_id=u
 LEFT JOIN public.english_texts t ON t.id=v.text_id
 LEFT JOIN public.user_english_vocab_flashcard_results f
   ON f.user_id=u AND f.vocab_id=v.id
 WHERE c.user_id=u AND c.stage<=3 AND c.due_on<=d;
 SELECT count(*) INTO future_n FROM public.mt_english_word_cycles c
 WHERE c.user_id=u AND c.stage<=3 AND c.due_on>d;
 RETURN jsonb_build_object('date',d,'cards',cards,
   'count',jsonb_array_length(cards),'future_scheduled',future_n);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_english_spaced_review(p_vocab_id uuid,p_correct boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
 u uuid:=auth.uid();
 d date:=(now() at time zone 'America/Fortaleza')::date;
 s public.mt_english_word_cycles%rowtype;
 next_stage smallint;
 next_due date;
 stats jsonb;
BEGIN
 IF u IS NULL OR p_correct IS NULL THEN RAISE EXCEPTION 'Revisão inválida ou sessão expirada.';END IF;
 SELECT * INTO s FROM public.mt_english_word_cycles
 WHERE user_id=u AND vocab_id=p_vocab_id FOR UPDATE;
 IF NOT FOUND OR s.stage>=4 OR s.due_on>d
 THEN RAISE EXCEPTION 'Esta palavra não está liberada para revisar hoje.';END IF;
 stats:=public.record_english_vocab_flashcard(p_vocab_id,p_correct);
 IF p_correct THEN
  next_stage:=s.stage+1;
  next_due:=CASE next_stage WHEN 2 THEN d+4 WHEN 3 THEN d+7 ELSE NULL END;
 ELSE
  next_stage:=s.stage;
  next_due:=d+1;
 END IF;
 UPDATE public.mt_english_word_cycles SET
  stage=next_stage,due_on=next_due,last_correct=p_correct,
  wrong_streak=CASE WHEN p_correct THEN 0 ELSE wrong_streak+1 END,
  last_reviewed_at=now(),updated_at=now()
 WHERE user_id=u AND vocab_id=p_vocab_id;
 RETURN jsonb_build_object('ok',true,'correct',p_correct,
  'completed_stages',1,'next_stage',next_stage,'next_date',next_due,
  'stats',stats);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mt_english_favorite_daily(p_on_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
 u uuid:=auth.uid();
 d date:=coalesce(p_on_date,(now() at time zone 'America/Fortaleza')::date);
 cards jsonb;
 finished timestamptz;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',q.id,'word',q.word,'translation',q.translation,
  'phrase_en',q.phrase_en,'source',q.source
 ) ORDER BY q.rank),'[]'::jsonb)
 INTO cards
 FROM (
  SELECT v.id,v.word,v.translation,
    coalesce(p.phrase_en,nullif(v.context,''),'Use the word '||v.word||' in a sentence.') AS phrase_en,
    coalesce(p.source,'context') AS source,
    md5(d::text||':'||v.id::text) AS rank
  FROM public.user_english_vocabulary v
  LEFT JOIN public.mt_english_favorite_phrases p
    ON p.user_id=u AND p.vocab_id=v.id
  WHERE v.user_id=u AND v.starred
  ORDER BY rank LIMIT 10
 ) q;
 SELECT f.completed_at INTO finished FROM public.mt_english_favorite_daily_reviews f
 WHERE f.user_id=u AND f.on_date=d;
 RETURN jsonb_build_object('date',d,'cards',cards,'total',jsonb_array_length(cards),
  'completed',finished IS NOT NULL,'completed_at',finished);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mt_english_complete_favorite_daily(p_on_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
 u uuid:=auth.uid();
 d date:=coalesce(p_on_date,(now() at time zone 'America/Fortaleza')::date);
 today date:=(now() at time zone 'America/Fortaleza')::date;
 result_cards jsonb;
 total_count integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado';END IF;
 IF d>today OR d<date '2026-11-10' THEN RAISE EXCEPTION 'Revise as frases no dia correto.';END IF;
 result_cards:=public.mt_english_favorite_daily(d)->'cards';
 total_count:=jsonb_array_length(result_cards);
 IF total_count=0 THEN RAISE EXCEPTION 'Favorite palavras antes desta atividade.';END IF;
 INSERT INTO public.mt_english_favorite_daily_reviews(user_id,on_date,reviewed_ids,total)
 VALUES(u,d,(SELECT coalesce(jsonb_agg(card->>'id'),'[]'::jsonb)
            FROM jsonb_array_elements(result_cards) card),total_count)
 ON CONFLICT(user_id,on_date) DO NOTHING;
 RETURN jsonb_build_object('ok',true,'date',d,'total',total_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mt_english_calendar_summary(p_on_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
 u uuid:=auth.uid();
 d date:=coalesce(p_on_date,(now() at time zone 'America/Fortaleza')::date);
 reading_cards jsonb;
 due_count integer;
 favorite_count integer;
 done boolean;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado';END IF;
 PERFORM public.mt_english_prepare_daily_readings();
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',t.id,'title',t.title,'slot',p.slot,
   'completed',coalesce(pr.status='completed' OR pr.completed_at IS NOT NULL,false),
   'mode',t.mode,'url','/ingles/texto/'||t.id
 ) ORDER BY p.slot),'[]'::jsonb)
 INTO reading_cards FROM public.mt_english_daily_readings p
 JOIN public.english_texts t ON t.id=p.text_id
 LEFT JOIN public.user_english_text_progress pr
   ON pr.user_id=u AND pr.text_id=p.text_id
 WHERE p.user_id=u AND p.assigned_for=d;
 SELECT count(*) INTO due_count FROM public.mt_english_word_cycles c
 WHERE c.user_id=u AND c.stage<=3 AND c.due_on<=d;
 SELECT least(count(*),10) INTO favorite_count FROM public.user_english_vocabulary v
 WHERE v.user_id=u AND v.starred;
 SELECT exists(SELECT 1 FROM public.mt_english_favorite_daily_reviews f
   WHERE f.user_id=u AND f.on_date=d) INTO done;
 RETURN jsonb_build_object('date',d,'readings',reading_cards,
  'words_due',due_count,'favorite_phrases',favorite_count,
  'favorite_completed',done);
END;
$function$;
