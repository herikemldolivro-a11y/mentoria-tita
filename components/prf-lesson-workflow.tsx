"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  Circle,
  ClipboardCheck,
  Database,
  FileQuestion,
  FileText,
  LockKeyhole,
  LoaderCircle,
  MonitorPlay,
  Play,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { LessonMaterialReader } from "@/components/lesson-material-reader";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";
import {
  completeLessonListEarly,
  loadLessonQuestionStatus,
  startLessonQuestionAttempt,
  type LessonQuestionStatus,
  skipPprnLesson,
} from "@/lib/question-bank";
import {
  addDaysToDateKey,
  formatDatePtBr,
  isRevisionDue,
  todayKey,
  type RevisionEvent,
} from "@/lib/revision-system";
import {
  listenStudyUpdated,
  loadLessonProgress,
  loadLessonRevision,
  saveLessonProgress,
  type LessonProgressState,
} from "@/lib/study-database";

const green = "#31c765";
const gold = "#d2a64e";

type StudyMode = "platform-pdf" | "external-video" | null;

type LocalLessonState = LessonProgressState & { studyMode: StudyMode };

const initialState: LocalLessonState = {
  theoryStarted: false,
  theoryCompleted: false,
  listStarted: false,
  listCompleted: false,
  studyMode: null,
};

export function PrfLessonWorkflow({
  subject,
  lesson,
  contestLabel = "MENTORIA TITÃ",
  questionListEnabled = true,
}: {
  subject: PrfSubject;
  lesson: MatrixLesson;
  contestLabel?: string;
  questionListEnabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<LocalLessonState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pprnOpenAccess, setPprnOpenAccess] = useState(false); // MT_PPRN_LIST_ALWAYS_AVAILABLE_V13
  const [review1, setReview1] = useState<RevisionEvent | null>(null);
  const [review2, setReview2] = useState<RevisionEvent | null>(null);
  const [questionStatus, setQuestionStatus] = useState<LessonQuestionStatus | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const { data: profile } = await supabase.from("profiles").select("active_study_plan_id").eq("id", auth.user.id).maybeSingle();
          if (profile?.active_study_plan_id) {
            const { data: activePlan } = await supabase.from("study_plans").select("slug").eq("id", profile.active_study_plan_id).maybeSingle();
            setPprnOpenAccess(activePlan?.slug === "pprn-reta-final-2026");
          }
        }
      } catch {
        setPprnOpenAccess(false);
      }
      const [lessonState, firstReview, secondReview, nextQuestionStatus] = await Promise.all([
        loadLessonProgress(subject.slug, lesson.slug),
        loadLessonRevision(subject.slug, lesson.slug, 1),
        loadLessonRevision(subject.slug, lesson.slug, 2),
        loadLessonQuestionStatus(subject.slug, lesson.slug).catch(() => null),
      ]);
      setState({ ...initialState, ...lessonState });
      setReview1(firstReview);
      setReview2(secondReview);
      setQuestionStatus(nextQuestionStatus);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o progresso da aula.");
    } finally {
      setHydrated(true);
    }
  }, [subject.slug, lesson.slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAll(), 0);
    const unlisten = listenStudyUpdated(() => void refreshAll());
    return () => {
      window.clearTimeout(timer);
      unlisten();
    };
  }, [refreshAll]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined" || window.location.hash !== "#revisao") return;
    const timer = window.setTimeout(() => {
      document.getElementById("revisao")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hydrated]); // MT_SCROLL_REVISION_V1

  async function updateState(next: LocalLessonState) {
    const previous = state;
    setState(next);
    setSaving(true);
    setErrorMessage(null);
    try {
      await saveLessonProgress(subject.slug, lesson.slug, next);
    } catch (error) {
      setState(previous);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o progresso.");
    } finally {
      setSaving(false);
    }
  }

  function toggleTheoryCompleted() {
    const completed = !state.theoryCompleted;
    updateState({
      ...state,
      theoryStarted: completed ? true : state.theoryStarted,
      theoryCompleted: completed,
      listStarted: completed ? state.listStarted : false,
      listCompleted: completed ? state.listCompleted : false,
    });
  }

  async function openQuestionList() {
    if (!questionListEnabled) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const attempt = await startLessonQuestionAttempt(subject.slug, lesson.slug);
      if (!attempt.ok || !attempt.attempt_id) {
        const available = attempt.available_count ?? questionStatus?.available_count ?? 0;
        setQuestionStatus((current) => ({
          available_count: available,
          required_count: attempt.required_count ?? current?.required_count ?? questionCount,
          attempt_id: current?.attempt_id ?? null,
          attempt_status: current?.attempt_status ?? null,
        }));
        return;
      }

      const pmalRevisionHref =         `/revisoes?subject=${encodeURIComponent(subject.slug)}&lesson=${encodeURIComponent(lesson.slug)}&revision=1&date=${encodeURIComponent(recommendedReviewDate)}`;

      // MT_DIRECT_LESSON_RETURN_V55
      const isDirectLesson =
        window.location.pathname.startsWith("/cronograma/pmal/aula/") ||
        window.location.pathname.startsWith("/cronograma/aula/");

      const returnHref = isDirectLesson
        ? pmalRevisionHref
        : window.location.pathname.startsWith("/cronograma/pprn/")
          ? `${window.location.pathname}?lista=concluida#revisao`
          : `/cronograma/semana-1/${subject.slug}/${lesson.slug}?lista=concluida#revisao`;

      window.sessionStorage.setItem(
        "mentoria-tita:list-return",
        isDirectLesson
          ? `/revisoes?subject=${encodeURIComponent(subject.slug)}&lesson=${encodeURIComponent(lesson.slug)}&revision=1&date=${recommendedReviewDate}`
          : (window.location.pathname.startsWith("/cronograma/pprn/")
              ? `${window.location.pathname}?lista=concluida#revisao`
              : `/cronograma/semana-1/${subject.slug}/${lesson.slug}?lista=concluida#revisao`),
      ); // MT_PMAL_LIST_RETURN_FALLBACK_V12
router.push(`/questoes/lista/${attempt.attempt_id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível iniciar a lista.");
    } finally {
      setSaving(false);
    }
  }

  async function completeInProgressList() {
    if (!questionStatus?.attempt_id) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await completeLessonListEarly(questionStatus.attempt_id);
      await refreshAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível concluir a lista.");
    } finally {
      setSaving(false);
    }
  }
  async function skipCurrentLesson() {
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await skipPprnLesson(subject.slug, lesson.slug);
      if (!result?.ok) throw new Error("Nao foi possivel pular esta aula.");
      router.push(`/cronograma/semana-1/${subject.slug}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel pular esta aula.");
    } finally {
      setSaving(false);
    }
  } // MT_PPRN_SKIP_SHORT_LIST_V14_FN

  async function openReviewCalendar() {
    if (!lessonCompleted || saving) return;
    setErrorMessage(null);

    const params = new URLSearchParams({
      subject: subject.slug,
      lesson: lesson.slug,
      revision: "1",
      date: recommendedReviewDate,
    });

    // MT_PMAL_PREFILL_CALENDAR_V7_3
    // O PrincipalCalendar recebe matéria/aula/revisão prontas e abre o modal travado.
    // O usuário só escolhe/confirma a DATA.
    router.push(`/revisoes?${params.toString()}`);
  }

  const questionCount = questionListEnabled ? (lesson.questionCount ?? 35) : 0;
  const listAvailable = questionListEnabled && (pprnOpenAccess || state.theoryCompleted);
  const listSatisfied = !questionListEnabled || state.listCompleted;
  const lessonCompleted = state.theoryCompleted && listSatisfied;
  const recommendedReviewDate = addDaysToDateKey(todayKey(), 2);
  const review1Due = review1 ? isRevisionDue(review1) : false;
  const review1Completed = review1?.status === "completed";
  const review2Completed = review2?.status === "completed";
  const reviewStepStatus = review1Completed ? "completed" : review1Due ? "available" : review1 ? "scheduled" : "locked";
  const levelingStatus = review1Completed ? "completed" : review1?.rereadConfirmed ? "available" : "locked";
  const effectiveStudyMode: StudyMode = state.studyMode ?? "platform-pdf";
  const currentStageNumber = !state.theoryCompleted
    ? 1
    : questionListEnabled && !state.listCompleted
      ? 2
      : !review1
        ? 3
        : !review1Completed
          ? 4
          : !review1.rereadConfirmed
            ? 5
            : 6;
  const stageProgress = Math.max(8, Math.round((currentStageNumber / 6) * 100));

  return (
    <div data-mt-unified-lesson-v57="1" className="flex h-auto min-h-0 flex-col gap-3 lg:h-full lg:overflow-hidden">
      {errorMessage ? (
        <div className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <header className="shrink-0 rounded-[24px] border border-white/[.09] bg-[radial-gradient(circle_at_78%_10%,rgba(124,58,237,.10),transparent_28%),#090b10] px-5 py-4 text-white shadow-[0_18px_60px_rgba(0,0,0,.22)] sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div className="min-w-0">
            <span className="text-[9px] font-black tracking-[.15em] text-violet-300">
              {contestLabel} · {subject.shortName}
            </span>
            <h1 className="mt-2 truncate font-serif text-3xl leading-none tracking-[-.035em] text-white xl:text-[38px]">
              {lesson.title}
            </h1>
            <p className="mt-2 text-[10px] text-white/46">
              {subject.name} · {questionListEnabled ? `${questionCount} questões` : "somente teoria nesta fase"}
            </p>
          </div>

          <div className="border-white/[.08] lg:border-l lg:pl-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-black tracking-[.14em] text-white/42">PROGRESSO DA AULA</span>
              <strong className="text-sm text-white">{currentStageNumber}/6 etapas</strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all" style={{ width: `${stageProgress}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }, (_, index) => {
                const number = index + 1;
                const done = number < currentStageNumber;
                const current = number === currentStageNumber;
                return (
                  <span
                    key={number}
                    className={`grid h-8 w-8 place-items-center rounded-full border text-[10px] font-black ${
                      done
                        ? "border-emerald-300/40 bg-emerald-400 text-[#04150d]"
                        : current
                          ? "border-amber-300/50 bg-amber-300 text-[#171006] shadow-[0_0_20px_rgba(251,191,36,.28)]"
                          : "border-white/[.12] bg-white/[.03] text-white/40"
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : number}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.65fr)_330px_340px] lg:overflow-hidden">
        <section
          className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border p-4 lg:h-full"
          style={{
            borderColor: state.theoryCompleted ? "rgba(49,199,101,.46)" : "rgba(210,166,78,.34)",
            background: state.theoryCompleted
              ? "linear-gradient(145deg,rgba(6,42,29,.72),rgba(7,13,13,.96))"
              : "linear-gradient(145deg,rgba(45,31,8,.34),rgba(8,10,13,.97))",
          }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em]" style={{ color: state.theoryCompleted ? green : gold }}>
                {state.theoryCompleted ? <Check size={14} /> : <BookOpen size={14} />} ETAPA 01 · TEORIA
              </span>
              <p className="mt-1.5 max-w-2xl text-[10px] leading-5 text-white/50">
                Estude pelo material da Mentoria Titã ou pela sua videoaula. O conteúdo principal fica nesta coluna.
              </p>
            </div>
            <span className="shrink-0 rounded-full border px-3 py-1.5 text-[8px] font-black tracking-[.1em]" style={{ color: state.theoryCompleted ? green : gold, borderColor: state.theoryCompleted ? "rgba(49,199,101,.35)" : "rgba(210,166,78,.35)" }}>
              {state.theoryCompleted ? "CONCLUÍDA" : state.theoryStarted ? "EM ANDAMENTO" : "DISPONÍVEL"}
            </span>
          </div>

          <div className="mt-3 grid shrink-0 grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => updateState({ ...state, theoryStarted: true, studyMode: "platform-pdf" })}
              className="flex min-h-[82px] items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5"
              style={{ borderColor: effectiveStudyMode === "platform-pdf" ? "rgba(210,166,78,.52)" : "rgba(255,255,255,.10)", background: effectiveStudyMode === "platform-pdf" ? "rgba(210,166,78,.09)" : "rgba(255,255,255,.025)" }}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.10] bg-black/20 text-amber-300"><FileText size={18} /></span>
              <div className="min-w-0"><strong className="block text-sm text-white">PDF da plataforma</strong><span className="mt-1 block text-[9px] leading-4 text-white/38">Material dentro da Titã</span></div>
            </button>

            <button
              type="button"
              onClick={() => updateState({ ...state, theoryStarted: true, studyMode: "external-video" })}
              className="flex min-h-[82px] items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5"
              style={{ borderColor: effectiveStudyMode === "external-video" ? "rgba(210,166,78,.52)" : "rgba(255,255,255,.10)", background: effectiveStudyMode === "external-video" ? "rgba(210,166,78,.09)" : "rgba(255,255,255,.025)" }}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.10] bg-black/20 text-white/65"><MonitorPlay size={18} /></span>
              <div className="min-w-0"><strong className="block text-sm text-white">Videoaula externa</strong><span className="mt-1 block text-[9px] leading-4 text-white/38">Use seu cursinho</span></div>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {effectiveStudyMode === "platform-pdf" ? (
              <LessonMaterialReader
                subjectSlug={subject.slug}
                lessonSlug={lesson.slug}
                lessonTitle={lesson.title}
                compact
              />
            ) : (
              <div className="mt-3 min-h-[250px] rounded-2xl border border-white/[.08] bg-black/20 p-4">
                <span className="text-[8px] font-black tracking-[.14em] text-amber-300">MODO VIDEOAULA EXTERNA</span>
                <p className="mt-2 text-[10px] leading-5 text-white/45">Estude estes tópicos no seu cursinho e depois volte para marcar a teoria como concluída.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lesson.topics.map((topic, index) => (
                    <span key={`${lesson.slug}-${index}-${topic}`} className="rounded-lg border border-white/[.08] bg-white/[.03] px-2.5 py-1.5 text-[9px] text-white/50">{topic}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 shrink-0">
            {!state.theoryStarted ? (
              <button type="button" onClick={() => updateState({ ...state, theoryStarted: true, studyMode: effectiveStudyMode })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-[10px] font-black tracking-[.1em] text-[#151008]"><Play size={15} /> INICIAR TEORIA</button>
            ) : (
              <button type="button" onClick={toggleTheoryCompleted} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-[10px] font-black tracking-[.1em]" style={{ borderColor: state.theoryCompleted ? "rgba(49,199,101,.45)" : "rgba(210,166,78,.42)", background: state.theoryCompleted ? "rgba(49,199,101,.09)" : "rgba(210,166,78,.08)", color: state.theoryCompleted ? green : gold }}>
                {state.theoryCompleted ? <RotateCcw size={15} /> : <Check size={15} />}{state.theoryCompleted ? "DESMARCAR CONCLUSÃO" : "MARCAR TEORIA COMO CONCLUÍDA"}
              </button>
            )}
          </div>
        </section>

        <div className="grid min-h-0 gap-3 lg:h-full lg:grid-rows-2">
          <section
            className="flex min-h-0 flex-col overflow-y-auto rounded-[24px] border p-4 [scrollbar-width:thin]"
            style={{
              borderColor: state.listCompleted ? "rgba(49,199,101,.40)" : listAvailable ? "rgba(245,185,55,.48)" : "rgba(255,255,255,.10)",
              background: state.listCompleted ? "rgba(49,199,101,.055)" : listAvailable ? "linear-gradient(145deg,rgba(53,37,9,.58),rgba(13,12,9,.96))" : "#0b0d12",
              opacity: questionListEnabled ? 1 : 0.72,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/[.07] text-amber-300"><FileQuestion size={18} /></span>
              <div><span className="text-[9px] font-black tracking-[.14em] text-amber-300">ETAPA 02 · FIXAÇÃO</span><h2 className="mt-2 font-serif text-2xl leading-none text-white">{questionListEnabled ? `Lista de ${questionCount} questões` : "Lista ainda não liberada"}</h2></div>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-white/45">
              {questionListEnabled ? "O banco desta aula é filtrado automaticamente e congelado para sua tentativa." : "Esta aula está somente com teoria por enquanto. A lista aparecerá quando o banco de questões estiver pronto."}
            </p>
            <div className="mt-auto pt-4">
              {!questionListEnabled ? (
                <div className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-[9px] font-bold text-white/35">SEM LISTA NESTA FASE</div>
              ) : questionStatus?.attempt_id ? (
                <div className="space-y-2">
                  <button type="button" disabled={saving} onClick={() => router.push(`/questoes/lista/${questionStatus.attempt_id}`)} className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-[10px] font-black tracking-[.08em] text-[#151008]">CONTINUAR LISTA <ArrowRight size={15} /></button>
                  {questionStatus.attempt_status === "in_progress" ? <button type="button" disabled={saving} onClick={completeInProgressList} className="w-full rounded-xl border border-white/[.08] px-3 py-2 text-[8px] font-black text-white/40">CONCLUIR TENTATIVA ATUAL</button> : null}
                </div>
              ) : !listAvailable ? (
                <div className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-[9px] font-bold text-white/35"><LockKeyhole className="mr-2 inline" size={13} /> CONCLUA A TEORIA</div>
              ) : questionStatus && questionStatus.available_count < questionStatus.required_count ? (
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3"><strong className="text-sm text-white">{questionStatus.available_count} / {questionStatus.required_count}</strong><span className="mt-1 block text-[9px] text-white/38">Banco ainda incompleto.</span>{pprnOpenAccess ? <button type="button" disabled={saving} onClick={skipCurrentLesson} className="mt-2 w-full rounded-lg border border-amber-300/20 py-2 text-[8px] font-black text-amber-200">PULAR AULA E MARCAR CONCLUÍDA</button> : null}</div>
              ) : (
                <button type="button" disabled={saving} onClick={openQuestionList} className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-[10px] font-black tracking-[.08em] text-[#151008] disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={15} /> : null} INICIAR LISTA — {questionCount} QUESTÕES <ArrowRight size={15} /></button>
              )}
            </div>
          </section>

          <section id="revisao" className="flex min-h-0 flex-col overflow-y-auto rounded-[24px] border border-white/[.09] bg-[#0b0d12] p-4 [scrollbar-width:thin]" style={{ opacity: lessonCompleted || review1 ? 1 : 0.65 }}>
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[.05] text-violet-200"><CalendarClock size={18} /></span><div><span className="text-[9px] font-black tracking-[.14em] text-white/38">ETAPA 03 · AGENDAR REVISÃO</span><h2 className="mt-2 font-serif text-2xl leading-none text-white">Escolha apenas o dia.</h2></div></div>
            <p className="mt-3 text-[10px] leading-5 text-white/42">Matéria, aula e Revisão 1 seguem preenchidas. Você só escolhe a data no calendário.</p>
            <div className="mt-auto pt-4">
              {!lessonCompleted ? (
                <div className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-center text-[8px] font-black tracking-[.08em] text-white/30"><LockKeyhole className="mr-2 inline" size={13} /> CONCLUA TEORIA {questionListEnabled ? "+ LISTA" : ""}</div>
              ) : !review1 ? (
                <button type="button" disabled={saving} onClick={openReviewCalendar} className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/[.07] px-4 text-[9px] font-black tracking-[.08em] text-amber-200"><CalendarClock size={14} /> AGENDAR REVISÃO · {formatDatePtBr(recommendedReviewDate)}</button>
              ) : (
                <div className="space-y-2"><div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3"><strong className="text-xs text-white">Revisão 1 · {formatDatePtBr(review1.date)}</strong><span className="mt-1 block text-[9px] text-white/38">{review1Completed ? "Concluída" : review1Due ? "Disponível agora" : "Agendada"}</span></div>{!review1Completed ? <Link href={`/revisoes/${review1.id}`} className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-lg border border-white/[.08] text-[8px] font-black text-white/55">{review1Due ? "INICIAR REVISÃO" : "VER REVISÃO"} <ArrowRight size={13} /></Link> : null}</div>
              )}
            </div>
          </section>
        </div>

        <aside className="min-h-0 lg:h-full">
          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-violet-400/30 bg-[radial-gradient(circle_at_90%_0%,rgba(124,58,237,.20),transparent_32%),#0b0913] p-4 text-white shadow-[0_18px_65px_rgba(70,35,140,.12)]">
            <div className="shrink-0"><span className="text-[8px] font-black tracking-[.15em] text-violet-200/70">FLUXO COMPLETO DA AULA</span><h3 className="mt-1.5 font-serif text-2xl text-white">Sua trilha</h3></div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <CompactFlowStep index={1} icon={BookOpen} title="Teoria" status={state.theoryCompleted ? "completed" : "available"} subtitle={state.theoryCompleted ? "Concluída" : "Disponível"} />
              <CompactFlowStep index={2} icon={FileQuestion} title={questionListEnabled ? `Lista · ${questionCount} questões` : "Lista de questões"} status={!questionListEnabled ? (state.theoryCompleted ? "completed" : "locked") : state.listCompleted ? "completed" : listAvailable ? "available" : "locked"} subtitle={!questionListEnabled ? "Sem lista nesta fase" : state.listCompleted ? "Concluída" : listAvailable ? "Disponível" : "Após teoria"} />
              <CompactFlowStep index={3} icon={CalendarClock} title="Agendar revisão" status={review1 ? "completed" : lessonCompleted ? "available" : "locked"} subtitle={review1 ? `Revisão 1 · ${formatDatePtBr(review1.date)}` : lessonCompleted ? "Escolha a data" : "Após teoria + lista"} />
              <CompactFlowStep index={4} icon={RefreshCcw} title="Revisão" status={reviewStepStatus} subtitle={review1Completed ? "Concluída" : review1 ? (review1Due ? "Disponível agora" : "Aguardando data") : "Aguardando agendamento"} />
              <CompactFlowStep index={5} icon={ClipboardCheck} title="Nivelamento" status={levelingStatus} subtitle={review1Completed ? "Concluído" : review1?.rereadConfirmed ? "Disponível" : "Após releitura da revisão"} />
              <CompactFlowStep index={6} icon={Database} title="Banco de questões" status="locked" subtitle="Questões livres por matéria e tópico" />
            </div>
            <div className="mt-3 shrink-0 rounded-2xl border border-violet-300/20 bg-violet-300/[.055] p-3 text-[9px] leading-5 text-violet-100/68">
              {lessonCompleted ? "Aula-base concluída. A próxima aula e o ciclo de revisão estão liberados." : `Conclua teoria${questionListEnabled ? " + lista" : ""} para avançar.`}
            </div>
            <Link href="/questoes/banco" className="mt-2 inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[.08] text-[8px] font-black tracking-[.08em] text-white/45 transition hover:text-white/80">ABRIR BANCO DE QUESTÕES <ArrowRight size={12} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CompactFlowStep({
  index,
  icon: Icon,
  title,
  subtitle,
  status,
}: {
  index: number;
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  status: "completed" | "available" | "scheduled" | "locked";
}) {
  const completed = status === "completed";
  const available = status === "available";
  const scheduled = status === "scheduled";
  const accent = completed ? "#31c765" : available ? "#f6c34b" : "rgba(255,255,255,.34)";
  const border = completed ? "rgba(49,199,101,.32)" : available ? "rgba(246,195,75,.35)" : "rgba(255,255,255,.08)";
  const background = completed ? "rgba(49,199,101,.055)" : available ? "rgba(246,195,75,.055)" : "rgba(255,255,255,.018)";

  return (
    <div className="relative flex min-h-[62px] items-center gap-3 rounded-2xl border px-3 py-2.5" style={{ borderColor: border, background, opacity: status === "locked" || scheduled ? 0.62 : 1 }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border" style={{ borderColor: border, color: accent, background: "rgba(0,0,0,.18)" }}>
        {completed ? <Check size={15} strokeWidth={3} /> : <Icon size={16} />}
      </span>
      <div className="min-w-0 flex-1"><strong className="block truncate text-[12px] text-white">{title}</strong><span className="mt-0.5 block truncate text-[9px]" style={{ color: accent }}>{subtitle}</span></div>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[.08] bg-black/20 text-[9px] font-black text-white/45">{completed ? <Check size={12} /> : index}</span>
    </div>
  );
}
