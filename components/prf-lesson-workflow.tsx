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
  queueRevisionDraft,
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

export function PrfLessonWorkflow({ subject, lesson }: { subject: PrfSubject; lesson: MatrixLesson }) {
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
      window.sessionStorage.setItem(
        "mentoria-tita:list-return",
        (window.location.pathname.startsWith("/cronograma/pprn/") ? `${window.location.pathname}?lista=concluida#revisao` : `/cronograma/semana-1/${subject.slug}/${lesson.slug}?lista=concluida#revisao`),
      ); // MT_LIST_RETURN_TO_REVISION_V1
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
    setSaving(true);
    setErrorMessage(null);
    try {
      const draft = await queueRevisionDraft({
        subjectSlug: subject.slug,
        subjectName: subject.shortName,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        revisionNumber: 1,
        recommendedDate: recommendedReviewDate,
      });
      router.push(`/revisoes?agendar=${draft.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível preparar a revisão.");
    } finally {
      setSaving(false);
    }
  }

  const questionCount = lesson.questionCount ?? 35;
  const listAvailable = pprnOpenAccess || state.theoryCompleted;
  const lessonCompleted = state.theoryCompleted && state.listCompleted;
  const recommendedReviewDate = addDaysToDateKey(todayKey(), 2);
  const review1Due = review1 ? isRevisionDue(review1) : false;
  const review1Completed = review1?.status === "completed";
  const review2Completed = review2?.status === "completed";
  const reviewStepStatus = review1Completed ? "completed" : review1Due ? "available" : review1 ? "scheduled" : "locked";
  const levelingStatus = review1Completed ? "completed" : review1?.rereadConfirmed ? "available" : "locked";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{errorMessage}</div> : null}
        <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.2em]" style={{ color: state.theoryCompleted ? green : gold }}>
                {state.theoryCompleted ? <Check size={15} /> : <Circle size={12} />} ETAPA 01 · TEORIA
              </span>
              <h2 className="mt-3 font-serif text-3xl text-[var(--ink)]">Escolha como estudar esta aula.</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">Use o PDF da Mentoria Titã ou assista à videoaula no cursinho que você já utiliza. Depois registre a conclusão para liberar a lista.</p>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[9px] font-black tracking-[0.12em]" style={{ color: state.theoryCompleted ? green : gold, borderColor: state.theoryCompleted ? "rgba(49,199,101,.35)" : "rgba(210,166,78,.35)", background: state.theoryCompleted ? "rgba(49,199,101,.07)" : "rgba(210,166,78,.06)" }}>
              {state.theoryCompleted ? "CONCLUÍDA" : state.theoryStarted ? "EM ANDAMENTO" : "DISPONÍVEL"}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => updateState({ ...state, theoryStarted: true, studyMode: "platform-pdf" })} className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: state.studyMode === "platform-pdf" ? "rgba(210,166,78,.5)" : "var(--border)", background: state.studyMode === "platform-pdf" ? "rgba(210,166,78,.07)" : "var(--background)" }}>
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--gold-bright)]"><FileText size={20} /></span>
              <strong className="mt-4 block font-serif text-xl text-[var(--ink)]">PDF da plataforma</strong>
              <span className="mt-2 block text-xs leading-6 text-[var(--muted)]">Abrir o material da Mentoria Titã dentro da própria plataforma.</span>
            </button>

            <button type="button" onClick={() => updateState({ ...state, theoryStarted: true, studyMode: "external-video" })} className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: state.studyMode === "external-video" ? "rgba(210,166,78,.5)" : "var(--border)", background: state.studyMode === "external-video" ? "rgba(210,166,78,.07)" : "var(--background)" }}>
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--gold-bright)]"><MonitorPlay size={20} /></span>
              <strong className="mt-4 block font-serif text-xl text-[var(--ink)]">Vou ver videoaula no meu cursinho</strong>
              <span className="mt-2 block text-xs leading-6 text-[var(--muted)]">Use seu cursinho normalmente e volte para registrar a conclusão da teoria.</span>
            </button>
          </div>

          {state.studyMode === "platform-pdf" ? (
            <LessonMaterialReader
              subjectSlug={subject.slug}
              lessonSlug={lesson.slug}
              lessonTitle={lesson.title}
            />
          ) : null}

          {state.studyMode === "external-video" ? (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
              <span className="text-[9px] font-black tracking-[.15em] text-[var(--gold-bright)]">MODO VIDEOAULA EXTERNA</span>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Estude estes tópicos no seu cursinho e depois volte para marcar a teoria como concluída.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {lesson.topics.map((topic, index) => <span key={`${lesson.slug}-${index}-${topic}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] text-[var(--muted)]">{topic}</span>)}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {!state.theoryStarted ? <button type="button" onClick={() => updateState({ ...state, theoryStarted: true })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-xs font-black tracking-[0.12em] text-[#111]"><Play size={16} /> INICIAR TEORIA</button> : null}
            {state.theoryStarted ? (
              <button type="button" onClick={toggleTheoryCompleted} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-6 text-xs font-black tracking-[0.12em] transition" style={{ borderColor: state.theoryCompleted ? "rgba(49,199,101,.4)" : "rgba(210,166,78,.38)", background: state.theoryCompleted ? "rgba(49,199,101,.09)" : "rgba(210,166,78,.08)", color: state.theoryCompleted ? green : gold }}>
                {state.theoryCompleted ? <RotateCcw size={16} /> : <Check size={16} />}{state.theoryCompleted ? "DESMARCAR CONCLUSÃO" : "MARCAR TEORIA COMO CONCLUÍDA"}
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-[26px] border p-5 transition sm:p-7" style={{ borderColor: state.listCompleted ? "rgba(49,199,101,.42)" : listAvailable ? "rgba(210,166,78,.38)" : "var(--border)", background: state.listCompleted ? "rgba(49,199,101,.05)" : listAvailable ? "rgba(210,166,78,.04)" : "var(--surface)", opacity: listAvailable ? 1 : 0.58 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-[10px] font-black tracking-[0.2em]" style={{ color: state.listCompleted ? green : listAvailable ? gold : "var(--muted)" }}>ETAPA 02 · FIXAÇÃO</span>
              <h2 className="mt-3 font-serif text-3xl text-[var(--ink)]">Lista de 35 questões</h2>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">O banco bruto desta aula será filtrado automaticamente e 35 questões serão congeladas para a tentativa do aluno.</p>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border)] px-3 py-1.5 text-[9px] font-black tracking-[0.12em]" style={{ color: state.listCompleted ? green : listAvailable ? gold : "var(--muted)" }}>{state.listCompleted ? <Check size={13} /> : listAvailable ? <FileQuestion size={13} /> : <LockKeyhole size={13} />} {state.listCompleted ? "CONCLUÍDA" : "35 QUESTÕES"}</span>
          </div>

          <div className="mt-6">
            {!listAvailable ? (
              <button type="button" disabled className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-6 text-xs font-black tracking-[0.12em] text-[var(--muted)]"><LockKeyhole size={16} /> CONCLUA A TEORIA PARA LIBERAR</button>
            ) : state.listCompleted ? (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[.06] p-4"><strong className="inline-flex items-center gap-2 text-sm text-emerald-400"><Check size={17} /> LISTA CONCLUÍDA</strong><p className="mt-2 text-xs leading-6 text-[var(--muted)]">Seu resultado está salvo e a próxima etapa da trilha foi liberada.</p></div>
            ) : questionStatus?.attempt_id && questionStatus.attempt_status === "in_progress" ? (
              <div className="flex flex-wrap gap-3"><Link href={`/questoes/lista/${questionStatus.attempt_id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-xs font-black tracking-[0.12em] text-[#111]">CONTINUAR LISTA <ArrowRight size={17} /></Link><button type="button" disabled={saving} onClick={completeInProgressList} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-5 text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]"><Check size={16} /> MARCAR LISTA COMO CONCLUÍDA</button></div>
            ) : questionStatus?.can_skip ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[.07] p-4 sm:p-5">
                <span className="text-[9px] font-black tracking-[.15em] text-amber-300">LISTA SEM 35 QUESTOES VALIDAS</span>
                <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Esta aula tem {questionStatus.available_count} questoes utilizaveis de {questionStatus.required_count} exigidas. Na Reta Final PPRN voce pode pular esta aula e ela sera marcada como concluida.</p>
                <button type="button" disabled={saving} onClick={skipCurrentLesson} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-5 text-[10px] font-black tracking-[.1em] text-amber-200 disabled:cursor-wait disabled:opacity-60"><Check size={16} /> PULAR AULA E MARCAR CONCLUIDA</button>
              </div>
            ) : questionStatus && questionStatus.available_count < questionStatus.required_count ? ( /* MT_PPRN_SKIP_SHORT_LIST_V14_UI */
              <div className="rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_6%,var(--background))] p-4 sm:p-5"><span className="text-[9px] font-black tracking-[.15em] text-[var(--gold-bright)]">BANCO AINDA INCOMPLETO</span><strong className="mt-2 block font-serif text-2xl text-[var(--ink)]">{questionStatus.available_count} / {questionStatus.required_count} questões disponíveis</strong><p className="mt-2 text-xs leading-6 text-[var(--muted)]">Esta lista será liberada quando houver pelo menos 35 questões cadastradas para esta aula.</p></div>
            ) : (
              <button type="button" disabled={saving} onClick={openQuestionList} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-xs font-black tracking-[0.12em] text-[#111] disabled:cursor-wait disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={16} /> : null} INICIAR LISTA — 35 QUESTÕES <ArrowRight size={17} /></button>
            )}
          </div>
        </section>

        <section id="revisao" className="rounded-[26px] border p-5 sm:p-7" style={{ borderColor: review1 ? "rgba(49,199,101,.28)" : lessonCompleted ? "rgba(210,166,78,.4)" : "var(--border)", background: "var(--surface)", opacity: lessonCompleted ? 1 : 0.55 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-[10px] font-black tracking-[.2em]" style={{ color: review1 ? green : lessonCompleted ? gold : "var(--muted)" }}>ETAPA 03 · AGENDAR REVISÃO</span>
              <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Agende a revisão pelo calendário.</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">Ao concluir teoria + lista, abra o calendário. A aula irá para a área de agendamento e só será salva em uma data depois que você escolher um dia, arrastar o card ou aceitar a recomendação de +2 dias.</p>
            </div>
            <CalendarClock size={22} style={{ color: review1 ? green : lessonCompleted ? gold : "var(--muted)" }} />
          </div>

          {!lessonCompleted ? (
            <button type="button" disabled className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--muted)]"><LockKeyhole size={15} /> CONCLUA TEORIA + LISTA</button>
          ) : !review1 ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_5%,var(--background))] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[9px] font-black tracking-[.15em] text-[var(--gold-bright)]">RECOMENDADO</span>
                  <strong className="mt-1 block font-serif text-xl text-[var(--ink)]">Revisão 1 · {formatDatePtBr(recommendedReviewDate)}</strong>
                  <p className="mt-2 max-w-xl text-[10px] leading-5 text-[var(--muted)]">Abra o calendário para escolher a data. Nada será agendado automaticamente: a aula ficará aguardando no topo da agenda até você arrastá-la para um dia ou aceitar a recomendação de +2 dias.</p>
                </div>
                <button type="button" disabled={saving} onClick={openReviewCalendar} className="inline-flex disabled:cursor-wait disabled:opacity-60 min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111] transition hover:bg-[var(--gold-bright)]"><CalendarClock size={15} /> ABRIR CALENDÁRIO PARA AGENDAR</button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
                <span className="text-[9px] font-black tracking-[.14em]" style={{ color: green }}>REVISÃO 1</span>
                <strong className="mt-1 block text-sm text-[var(--ink)]">{review1Completed ? "Concluída" : `Agendada para ${formatDatePtBr(review1.date)}`}</strong>
                <span className="mt-1 block text-[10px] text-[var(--muted)]">{review1Completed ? "Releitura + nivelamento aprovados." : review1Due ? "Já está disponível para fazer." : "Pode ser arrastada para outra data no calendário."}</span>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <span className="text-[9px] font-black tracking-[.14em] text-[var(--muted)]">REVISÃO 2</span>
                <strong className="mt-1 block text-sm text-[var(--ink)]">{review2 ? (review2Completed ? "Concluída" : `Agendada para ${formatDatePtBr(review2.date)}`) : review1Completed ? "Recomendação: +4 dias" : "Aparece após concluir a Revisão 1"}</strong>
                <span className="mt-1 block text-[10px] text-[var(--muted)]">O intervalo é contado a partir do dia em que a Revisão 1 foi realmente feita.</span>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Link href="/revisoes" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]">ABRIR CALENDÁRIO <ArrowRight size={15} /></Link>
                {!review1Completed ? <Link href={`/revisoes/${review1.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]">{review1Due ? "INICIAR REVISÃO 1" : "VER REVISÃO 1"} <ArrowRight size={15} /></Link> : null}
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <span className="text-[9px] font-black tracking-[0.18em] text-[var(--muted)]">FLUXO COMPLETO DA AULA</span>
          <h3 className="mt-2 font-serif text-2xl text-[var(--ink)]">Sua trilha</h3>

          <div className="mt-5 space-y-3">
            <FlowStep icon={BookOpen} title="Teoria" status={state.theoryCompleted ? "completed" : "available"} subtitle={state.theoryCompleted ? "Concluída" : "Disponível"} />
            <FlowStep icon={FileQuestion} title="Lista · 35 questões" status={state.listCompleted ? "completed" : listAvailable ? "available" : "locked"} subtitle={state.listCompleted ? "Concluída" : listAvailable ? "Disponível" : "Bloqueada"} />
            <FlowStep icon={CalendarClock} title="Agendar revisão" status={review1 ? "completed" : lessonCompleted ? "available" : "locked"} subtitle={review1 ? `Revisão 1 · ${formatDatePtBr(review1.date)}` : lessonCompleted ? "Recomendado: +2 dias" : "Após teoria + lista"} />
            <FlowStep icon={RefreshCcw} title="Revisão" status={reviewStepStatus} subtitle={review1Completed ? "Revisão 1 concluída" : review1 ? (review1Due ? "Disponível agora" : `Agendada · ${formatDatePtBr(review1.date)}`) : "Aguardando agendamento"} />
            <FlowStep icon={ClipboardCheck} title="Nivelamento" status={levelingStatus} subtitle={review1Completed ? "Aprovado com meta ≥ 9/10" : review1?.rereadConfirmed ? "Bloco de 10 disponível" : "Após releitura da revisão"} />
            <FlowStep icon={Database} title="Banco de questões" status="locked" subtitle="Questões livres por matéria e tópico" />
          </div>

          <div className="mt-5 rounded-2xl border p-4 text-xs leading-6" style={{ borderColor: lessonCompleted ? "rgba(49,199,101,.3)" : "var(--border)", background: lessonCompleted ? "rgba(49,199,101,.06)" : "var(--background)", color: lessonCompleted ? green : "var(--muted)" }}>
            {lessonCompleted ? "Aula-base concluída. A próxima aula da matéria está liberada e o ciclo de revisão já pode ser agendado." : "Conclua teoria + lista para liberar a próxima aula e o agendamento da Revisão 1."}
          </div>
        </section>

        {hydrated ? <p className="mt-3 px-2 text-[9px] leading-relaxed text-[var(--muted)]">Progresso sincronizado com sua conta. Você pode continuar em outro dispositivo usando o mesmo login.</p> : null}
      </aside>
    </div>
  );
}

function FlowStep({
  icon: Icon,
  title,
  subtitle,
  status,
}: {
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  status: "completed" | "available" | "scheduled" | "locked";
}) {
  const isCompleted = status === "completed";
  const isAvailable = status === "available";
  const isScheduled = status === "scheduled";
  const color = isCompleted ? green : isAvailable ? gold : "var(--muted)";
  const borderColor = isCompleted ? "rgba(49,199,101,.35)" : isAvailable ? "rgba(210,166,78,.3)" : "var(--border)";
  const background = isCompleted ? "rgba(49,199,101,.06)" : isAvailable ? "rgba(210,166,78,.04)" : "var(--background)";

  return (
    <div className="flex gap-3 rounded-2xl border p-3.5" style={{ borderColor, background, opacity: status === "locked" || isScheduled ? 0.62 : 1 }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border" style={{ borderColor, color, background: isCompleted ? "rgba(49,199,101,.12)" : isAvailable ? "rgba(210,166,78,.1)" : "var(--surface)" }}><Icon size={17} /></span>
      <div><strong className="block text-sm text-[var(--ink)]">{title}</strong><span className="text-[10px] leading-relaxed" style={{ color }}>{subtitle}</span></div>
    </div>
  );
}


