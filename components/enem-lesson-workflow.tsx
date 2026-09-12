"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  Circle,
  ExternalLink,
  GripVertical,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";
import { addDaysToDateKey, formatDatePtBr, todayKey, type RevisionEvent } from "@/lib/revision-system";
import {
  listenStudyUpdated,
  loadLessonProgress,
  loadLessonRevision,
  saveLessonProgress,
  type LessonProgressState,
} from "@/lib/study-database";

type PriorityTone = "green" | "orange" | "red" | "mixed";

const priorityStyles: Record<PriorityTone, { label: string; border: string; bg: string; text: string; dot: string }> = {
  green: {
    label: "PRIORIDADE TOTAL",
    border: "rgba(52,211,153,.34)",
    bg: "linear-gradient(145deg,rgba(16,185,129,.13),rgba(6,78,59,.045))",
    text: "#86efac",
    dot: "#34d399",
  },
  orange: {
    label: "SELETIVA",
    border: "rgba(251,146,60,.38)",
    bg: "linear-gradient(145deg,rgba(249,115,22,.13),rgba(124,45,18,.045))",
    text: "#fdba74",
    dot: "#fb923c",
  },
  red: {
    label: "RELANCE",
    border: "rgba(248,113,113,.35)",
    bg: "linear-gradient(145deg,rgba(239,68,68,.12),rgba(127,29,29,.04))",
    text: "#fca5a5",
    dot: "#f87171",
  },
  mixed: {
    label: "PRIORIDADE MISTA",
    border: "rgba(251,191,36,.34)",
    bg: "linear-gradient(135deg,rgba(16,185,129,.11),rgba(249,115,22,.10))",
    text: "#fde68a",
    dot: "#fbbf24",
  },
};

function toneFrom(value: string | null | undefined): PriorityTone {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("mista") || normalized.includes("/")) return "mixed";
  if (normalized.includes("laranja") || normalized.includes("🟠")) return "orange";
  if (normalized.includes("vermel") || normalized.includes("🔴")) return "red";
  return "green";
}

function parseLinkedItem(raw: string, fallback: PriorityTone) {
  const value = raw.trim();
  const marker = value.match(/^(🟢\/🟠|🟠\/🟢|🟢|🟠|🔴)\s*/u)?.[1] ?? "";
  const tone: PriorityTone = marker.includes("/") ? "mixed" : marker === "🟠" ? "orange" : marker === "🔴" ? "red" : marker === "🟢" ? "green" : fallback;
  return {
    tone,
    text: value.replace(/^(🟢\/🟠|🟠\/🟢|🟢|🟠|🔴)\s*/u, "").trim(),
  };
}

const initialState: LessonProgressState = {
  theoryStarted: false,
  theoryCompleted: false,
  listStarted: false,
  listCompleted: false,
  studyMode: null,
};

export function EnemLessonWorkflow({ subject, lesson }: { subject: PrfSubject; lesson: MatrixLesson }) {
  const router = useRouter();
  const [state, setState] = useState<LessonProgressState>(initialState);
  const [review, setReview] = useState<RevisionEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fallbackTone = toneFrom(lesson.priority);
  const linkedItems = useMemo(
    () => (lesson.topics.length ? lesson.topics : [`${lesson.title}`]).map((item) => parseLinkedItem(item, fallbackTone)),
    [fallbackTone, lesson.title, lesson.topics],
  );

  const refresh = useCallback(async () => {
    const [nextState, nextReview] = await Promise.all([
      loadLessonProgress(subject.slug, lesson.slug),
      loadLessonRevision(subject.slug, lesson.slug, 1),
    ]);
    setState(nextState);
    setReview(nextReview);
  }, [lesson.slug, subject.slug]);

  useEffect(() => {
    void refresh().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar esta aula."));
    return listenStudyUpdated(() => void refresh());
  }, [refresh]);

  async function persist(next: LessonProgressState) {
    const previous = state;
    setState(next);
    setSaving(true);
    setErrorMessage(null);
    try {
      await saveLessonProgress(subject.slug, lesson.slug, next);
    } catch (error) {
      setState(previous);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o progresso.");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function toggleTheory() {
    const completed = !state.theoryCompleted;
    await persist({
      ...state,
      theoryStarted: completed ? true : state.theoryStarted,
      theoryCompleted: completed,
      studyMode: completed ? "external-video" : state.studyMode,
      listStarted: completed ? state.listStarted : false,
      listCompleted: completed ? state.listCompleted : false,
    });
  }

  async function toggleExternalList() {
    if (!state.theoryCompleted) return;
    const completed = !state.listCompleted;
    await persist({
      ...state,
      listStarted: completed ? true : state.listStarted,
      listCompleted: completed,
    });
  }

  function openCalendar() {
    if (!(state.theoryCompleted && state.listCompleted)) return;

    const params = new URLSearchParams({
      subject: subject.slug,
      lesson: lesson.slug,
      revision: "1",
      date: addDaysToDateKey(todayKey(), 2),
      source: "enem-lesson",
    });

    router.push(`/revisoes?${params.toString()}`);
  }

  const lessonCompleted = state.theoryCompleted && state.listCompleted;
  const mainStyle = priorityStyles[fallbackTone];

  return (
    <div className="grid gap-6">
      <div className="space-y-6">
        {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{errorMessage}</div> : null}

        <section className="overflow-hidden rounded-[26px] border bg-[var(--surface)] p-5 sm:p-7" style={{ borderColor: mainStyle.border }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.18em]" style={{ color: state.theoryCompleted ? "#6ee7b7" : mainStyle.text }}>
                {state.theoryCompleted ? <Check size={15} /> : <Circle size={12} />} ETAPA 01 · TEORIA EXTERNA
              </span>
              <h2 className="mt-3 font-serif text-3xl text-[var(--ink)]">Use a matriz como guia do que assistir.</h2>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
                Aqui não existe PDF nem videoaula hospedada. Abra seu cursinho, siga os blocos conectados abaixo e volte apenas para registrar a conclusão.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[8px] font-black tracking-[.12em]" style={{ borderColor: mainStyle.border, background: mainStyle.bg, color: mainStyle.text }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: mainStyle.dot }} />
              {mainStyle.label}
            </span>
          </div>

          <div className="mt-6 rounded-[22px] border p-4 sm:p-5" style={{ borderColor: mainStyle.border, background: mainStyle.bg }}>
            <span className="text-[8px] font-black tracking-[.14em]" style={{ color: mainStyle.text }}>TÓPICO-BASE · {subject.shortName}</span>
            <strong className="mt-1.5 block font-serif text-2xl text-[var(--ink)]">{lesson.title}</strong>
            <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">As aulas/partes abaixo estão ligadas a este tópico. A cor diz quanto tempo vale investir.</p>

            <div className="relative mt-5 space-y-3 pl-7">
              <span className="pointer-events-none absolute bottom-5 left-[10px] top-5 w-px bg-white/[.10]" aria-hidden="true" />
              {linkedItems.map((item, index) => {
                const style = priorityStyles[item.tone];
                return (
                  <div key={`${lesson.slug}-${index}-${item.text}`} className="relative rounded-2xl border p-4" style={{ borderColor: style.border, background: style.bg }}>
                    <span className="absolute -left-[24px] top-5 grid h-5 w-5 place-items-center rounded-full border-4 border-[#111216]" style={{ background: style.dot, boxShadow: `0 0 18px ${style.dot}33` }} />
                    <div className="flex items-start gap-3">
                      <BookOpenCheck size={17} className="mt-0.5 shrink-0" style={{ color: style.text }} />
                      <div>
                        <span className="text-[8px] font-black tracking-[.13em]" style={{ color: style.text }}>{style.label}</span>
                        <p className="mt-1 text-xs leading-6 text-[var(--ink)]">{item.text || lesson.title}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!state.theoryStarted ? (
              <button type="button" disabled={saving} onClick={() => void persist({ ...state, theoryStarted: true, studyMode: "external-video" })} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/[.12] bg-white/[.04] px-5 text-[10px] font-black tracking-[.1em] text-white/75">
                <ExternalLink size={15} /> INICIAR ESTUDO EXTERNO
              </button>
            ) : null}
            <button type="button" disabled={saving} onClick={() => void toggleTheory()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 text-[10px] font-black tracking-[.1em]" style={{ borderColor: state.theoryCompleted ? "rgba(52,211,153,.35)" : mainStyle.border, background: state.theoryCompleted ? "rgba(16,185,129,.08)" : mainStyle.bg, color: state.theoryCompleted ? "#6ee7b7" : mainStyle.text }}>
              {state.theoryCompleted ? <RotateCcw size={15} /> : <Check size={15} />}
              {state.theoryCompleted ? "DESMARCAR TEORIA" : "MARCAR TEORIA COMO CONCLUÍDA"}
            </button>
          </div>
        </section>

        <section className="rounded-[26px] border p-5 sm:p-7" style={{ borderColor: state.listCompleted ? "rgba(52,211,153,.35)" : state.theoryCompleted ? "rgba(255,255,255,.13)" : "var(--border)", background: "var(--surface)", opacity: state.theoryCompleted ? 1 : .55 }}>
          <span className="text-[10px] font-black tracking-[.18em]" style={{ color: state.listCompleted ? "#6ee7b7" : "var(--muted)" }}>ETAPA 02 · LISTA FORA DA PLATAFORMA</span>
          <h2 className="mt-3 font-serif text-3xl text-[var(--ink)]">Resolva no seu banco e confirme aqui.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
            A Mentoria Titã não abre nem corrige esta lista. Use a Assaad ou o banco que você escolher; aqui ela serve como checklist para liberar a revisão e o nivelamento.
          </p>

          {!state.theoryCompleted ? (
            <button type="button" disabled className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--muted)]"><LockKeyhole size={15} /> CONCLUA A TEORIA</button>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" disabled={saving} onClick={() => void toggleExternalList()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 text-[10px] font-black tracking-[.1em]" style={{ borderColor: state.listCompleted ? "rgba(52,211,153,.38)" : "rgba(255,255,255,.14)", background: state.listCompleted ? "rgba(16,185,129,.08)" : "rgba(255,255,255,.035)", color: state.listCompleted ? "#6ee7b7" : "var(--ink)" }}>
                {state.listCompleted ? <RotateCcw size={15} /> : <Check size={15} />}
                {state.listCompleted ? "DESMARCAR LISTA" : "MARCAR LISTA EXTERNA COMO CONCLUÍDA"}
              </button>
              {state.listCompleted && !review ? (
                <button type="button" disabled={saving} onClick={openCalendar} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-[10px] font-black tracking-[.1em] text-[#07110b]">
                  <GripVertical size={15} /> IR AO CALENDÁRIO COM ESTA AULA <ArrowRight size={15} />
                </button>
              ) : null}
            </div>
          )}
        </section>

        <section id="revisao" className="rounded-[26px] border p-5 sm:p-7" style={{ borderColor: review ? "rgba(52,211,153,.30)" : lessonCompleted ? "rgba(255,255,255,.15)" : "var(--border)", background: "var(--surface)", opacity: lessonCompleted ? 1 : .55 }}>
          <span className="text-[10px] font-black tracking-[.18em]" style={{ color: review ? "#6ee7b7" : "var(--muted)" }}>ETAPA 03 · AGENDAR REVISÃO</span>
          <h2 className="mt-3 font-serif text-3xl text-[var(--ink)]">A aula já vai preenchida para o calendário.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
            Ao abrir a agenda, <strong className="text-[var(--ink)]">{subject.shortName} · {lesson.title}</strong> já estará selecionada. Você só escolhe o dia da revisão; não procura matéria e não digita assunto novamente.
          </p>

          {!lessonCompleted ? (
            <button type="button" disabled className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--muted)]"><LockKeyhole size={15} /> CONCLUA TEORIA + LISTA</button>
          ) : review ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[.06] p-4">
              <Check size={17} className="text-emerald-400" />
              <div className="min-w-0 flex-1"><strong className="block text-sm text-emerald-300">Revisão agendada</strong><span className="mt-1 block text-[10px] text-[var(--muted)]">{formatDatePtBr(review.date)} · o nivelamento continua integrado ao fluxo.</span></div>
              <button type="button" onClick={() => router.push("/revisoes")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-500/25 px-3 text-[9px] font-black text-emerald-300"><CalendarClock size={14} /> ABRIR AGENDA</button>
            </div>
          ) : (
            <button type="button" disabled={saving} onClick={openCalendar} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-[10px] font-black tracking-[.1em] text-[#07110b]">
              <CalendarClock size={15} /> ABRIR CALENDÁRIO · AULA JÁ PREENCHIDA
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
