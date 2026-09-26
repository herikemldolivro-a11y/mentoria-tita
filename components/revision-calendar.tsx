"use client";
import { RevisionPrefilledScheduler } from "@/components/revision-prefilled-scheduler";

// MT_REVISION_SCHEDULE_CHOOSER_V2
import { RevisionScheduleChooserV2 } from "@/components/revision-schedule-chooser-v2";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type MouseEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import {
  loadLevelingCalendar,
  startScheduledLeveling,
  type LevelingCalendarRow,
} from "@/lib/leveling-calendar-system";
import { prfSubjects } from "@/lib/prf-week-one";
import { createClient } from "@/lib/supabase/client";
import { loadStudyTaxonomy } from "@/lib/question-bank";
import {
  formatDatePtBr,
  parseDateKey,
  todayKey,
  toDateKey,
  type RevisionDraft,
  type RevisionEvent,
} from "@/lib/revision-system";
import {
  createManualRevision,
  listenStudyUpdated,
  loadRevisionDrafts,
  loadRevisionEvents,
  removeRevision,
  scheduleNextRevisionFromCompletedRevision,
  scheduleRevisionById,
  queueRevisionDraft,
} from "@/lib/study-database";

const weekDays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const gold = "#d2a64e";
const green = "#31c765";

function startOfCalendarMonth(reference: Date) {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1, 12);
  first.setDate(first.getDate() - first.getDay());
  return first;
}

function monthCells(reference: Date) {
  const start = startOfCalendarMonth(reference);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function monthTitle(date: Date) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// MT_CALENDAR_POINTER_DRAG_V3
function calendarDateAtPoint(clientX: number, clientY: number) {
  const hit = document.elementFromPoint(clientX, clientY);
  const cell = hit?.closest<HTMLElement>("[data-revision-date]");
  return cell?.dataset.revisionDate ?? null;
}

function useRevisionPointerDrag(input: {
  disabled?: boolean;
  onDrop: (date: string) => void | Promise<void>;
  onTarget: (date: string | null) => void;
}) {
  const stateRef = useRef<{ pointerId: number; startX: number; startY: number; dragging: boolean; element: HTMLDivElement } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  function reset() {
    const state = stateRef.current;
    if (state) {
      try {
        if (state.element.hasPointerCapture(state.pointerId)) state.element.releasePointerCapture(state.pointerId);
      } catch {}
    }
    stateRef.current = null;
    setDragging(false);
    input.onTarget(null);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (input.disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button,a,input,select,textarea")) return;

    suppressClickRef.current = false;
    stateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      element: event.currentTarget,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = stateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);

    if (!state.dragging && distance >= 5) {
      state.dragging = true;
      setDragging(true);
      suppressClickRef.current = true;
      if (event.pointerType !== "mouse" && "vibrate" in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
    }

    if (!state.dragging) return;
    event.preventDefault();
    input.onTarget(calendarDateAtPoint(event.clientX, event.clientY));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = stateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const wasDragging = state.dragging;
    const targetDate = wasDragging ? calendarDateAtPoint(event.clientX, event.clientY) : null;

    if (wasDragging) {
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 350);
    }

    reset();
    if (wasDragging && targetDate) void input.onDrop(targetDate);
  }

  function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
    const state = stateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    reset();
  }

  return {
    dragging,
    suppressClickRef,
    pointerProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}

function EventChip({ event, onRemove, onOpen, onMove, onDragTarget }: {
  event: RevisionEvent;
  onRemove: (id: string) => void;
  onOpen: (event: RevisionEvent) => void;
  onMove: (id: string, date: string) => void | Promise<void>;
  onDragTarget: (date: string | null) => void;
}) {
  const completed = event.status === "completed";
  const due = !completed && event.date <= todayKey();
  const { dragging, suppressClickRef, pointerProps } = useRevisionPointerDrag({
    disabled: completed,
    onDrop: (date) => onMove(event.id, date),
    onTarget: onDragTarget,
  });

  return (
    <div
      {...pointerProps}
      onClick={() => { if (!suppressClickRef.current) onOpen(event); }}
      onContextMenu={(event) => { if (dragging) event.preventDefault(); }}
      className={`group relative rounded-xl border px-2.5 py-2 transition ${completed ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
      style={{
        touchAction: completed ? "auto" : "none",
        userSelect: dragging ? "none" : undefined,
        borderColor: completed ? "rgba(49,199,101,.34)" : due ? "rgba(210,166,78,.48)" : "var(--border)",
        background: completed ? "rgba(49,199,101,.07)" : due ? "rgba(210,166,78,.075)" : "var(--surface)",
        boxShadow: dragging ? "0 16px 42px rgba(0,0,0,.38), 0 0 0 2px rgba(210,166,78,.72)" : "none",
        transform: dragging ? "scale(1.035)" : undefined,
        opacity: dragging ? 0.82 : 1,
        zIndex: dragging ? 30 : undefined,
      }}
      title={completed ? "Revisão concluída" : "SEGURE O CARD E ARRASTE PARA OUTRO DIA"}
    >
      <div className="flex items-start gap-1.5">
        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border ${dragging ? "border-[rgba(210,166,78,.65)] bg-[rgba(210,166,78,.16)] text-[var(--gold-bright)]" : "border-transparent text-[var(--muted)]"}`}>
          <GripVertical size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: completed ? green : due ? gold : "#6b6e75" }} />
            <strong className="truncate text-[9px] font-black tracking-[.08em] text-[var(--ink)]">{event.subjectName}</strong>
          </div>
          <span className="mt-1 block truncate text-[9px] text-[var(--muted)]">{event.revisionNumber}ª revisão · {event.lessonTitle}</span>
          {!completed ? <span className="mt-1 block text-[7px] font-black tracking-[.1em] text-[var(--gold-bright)]">SEGURE E ARRASTE</span> : null}
        </div>
                {completed ? (
          <button
            type="button"
            onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onOpen(event);
            }}
            className="mr-1 min-h-8 shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 text-[7px] font-black tracking-[.08em] text-emerald-400"
            title="Agendar outra revisão desta aula"
          >
            AGENDAR 2ª / 3ª / 4ª / 5ª
          </button>
        ) : null}
<button
          type="button"
          onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
          onClick={(clickEvent: MouseEvent<HTMLButtonElement>) => { clickEvent.stopPropagation(); onRemove(event.id); }}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[var(--muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
          aria-label="Remover revisão"
        ><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

function DraftChip({ draft, focused, onUseRecommended, onRemove, onSchedule, onDragTarget }: {
  draft: RevisionDraft;
  focused: boolean;
  onUseRecommended: (draft: RevisionDraft) => void;
  onRemove: (id: string) => void;
  onSchedule: (id: string, date: string) => void | Promise<void>;
  onDragTarget: (date: string | null) => void;
}) {
  const { dragging, pointerProps } = useRevisionPointerDrag({
    onDrop: (date) => onSchedule(draft.id, date),
    onTarget: onDragTarget,
  });

  return (
    <div
      {...pointerProps}
      onContextMenu={(event) => { if (dragging) event.preventDefault(); }}
      className="group cursor-grab rounded-2xl border p-4 transition active:cursor-grabbing sm:p-5"
      style={{
        touchAction: "none",
        userSelect: dragging ? "none" : undefined,
        borderColor: dragging ? "rgba(210,166,78,.78)" : focused ? "rgba(210,166,78,.58)" : "rgba(210,166,78,.32)",
        background: focused ? "linear-gradient(120deg, rgba(210,166,78,.11), var(--surface) 65%)" : "rgba(210,166,78,.045)",
        boxShadow: dragging ? "0 20px 58px rgba(0,0,0,.38), 0 0 0 2px rgba(210,166,78,.68)" : focused ? "0 18px 50px rgba(0,0,0,.12)" : "none",
        transform: dragging ? "scale(1.018)" : undefined,
        opacity: dragging ? 0.84 : 1,
        zIndex: dragging ? 30 : undefined,
      }}
      title="SEGURE ESTE CARD E ARRASTE PARA O DIA DESEJADO"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-[var(--gold-bright)] ${dragging ? "border-[rgba(210,166,78,.75)] bg-[rgba(210,166,78,.18)]" : "border-[rgba(210,166,78,.3)] bg-[rgba(210,166,78,.08)]"}`}><GripVertical size={19} /></span>
          <div className="min-w-0">
            <span className="text-[9px] font-black tracking-[.15em] text-[var(--gold-bright)]">AGUARDANDO AGENDAMENTO · {draft.revisionNumber}ª REVISÃO</span>
            <strong className="mt-1 block font-serif text-xl text-[var(--ink)]">{draft.lessonTitle}</strong>
            <span className="mt-1 block text-[10px] text-[var(--muted)]">{draft.subjectName}</span>
            <span className="mt-2 inline-flex rounded-lg border border-[rgba(210,166,78,.25)] bg-[rgba(210,166,78,.07)] px-2.5 py-1.5 text-[8px] font-black tracking-[.12em] text-[var(--gold-bright)]">SEGURE O CARD E ARRASTE PARA O DIA</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-2">
            <span className="block text-[8px] font-black tracking-[.12em] text-emerald-400">RECOMENDADO</span>
            <strong className="mt-0.5 block text-xs text-[var(--ink)]">{formatDatePtBr(draft.recommendedDate)}</strong>
          </div>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onUseRecommended(draft)} className="min-h-11 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 text-[9px] font-black tracking-[.11em] text-emerald-400 transition hover:bg-emerald-500/20">AGENDAR NO RECOMENDADO</button>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(draft.id)} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition hover:border-red-500/30 hover:text-red-400" aria-label="Cancelar agendamento"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );
}

// MT_COMPLETED_REVISION_CLICK_SCHEDULE_V1
function completedRevisionDefaultDate(event: RevisionEvent) {
  const base = event.completedAt ? new Date(event.completedAt) : new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + 4);
  return toDateKey(base);
}

function CompletedRevisionScheduleModal({
  event,
  onClose,
  onOpen,
  onSchedule,
}: {
  event: RevisionEvent;
  onClose: () => void;
  onOpen: () => void;
  onSchedule: (date: string) => Promise<void>;
}) {
  const [date, setDate] = useState(() => completedRevisionDefaultDate(event));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nextNumber = event.revisionNumber + 1;

  async function schedule() {
    if (!date || saving) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      await onSchedule(date);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível agendar a próxima revisão.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-black tracking-[.18em] text-emerald-400">
              {event.revisionNumber}ª REVISÃO CONCLUÍDA
            </span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">
              {event.lessonTitle}
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              {event.subjectName} · escolha a data da {nextNumber}ª revisão.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        </div>

        <label className="mt-6 block text-[10px] font-black tracking-[.12em] text-[var(--muted)]">
          DATA DA {nextNumber}ª REVISÃO
          <input
            type="date"
            value={date}
            onChange={(changeEvent) => setDate(changeEvent.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-base font-medium text-[var(--ink)] outline-none"
          />
        </label>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="button"
          disabled={saving || !date}
          onClick={() => void schedule()}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.12em] text-[#111] disabled:opacity-45"
        >
          <CalendarDays size={16} />
          {saving
            ? "AGENDANDO..."
            : `AGENDAR ${nextNumber}ª REVISÃO`}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"
        >
          ABRIR REVISÃO CONCLUÍDA
        </button>
      </section>
    </div>
  );
}

function AddRevisionModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [subjectSlug, setSubjectSlug] = useState<"contabilidade" | "raciocinio-logico">("contabilidade");
  const subject = prfSubjects.find((item) => item.slug === subjectSlug) ?? prfSubjects[0];
  const lessons = subject.lessons.filter((lesson) => lesson.weekOne);
  const [lessonSlug, setLessonSlug] = useState(lessons[0]?.slug ?? "");
  const [revisionNumber, setRevisionNumber] = useState(1);
  const [date, setDate] = useState(defaultDate);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lesson = subject.lessons.find((item) => item.slug === lessonSlug);
    if (!lesson || !date) return;
    await createManualRevision({
      subjectSlug: subject.slug,
      subjectName: subject.shortName,
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      revisionNumber,
      date,
    });
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[0_30px_100px_rgba(0,0,0,.5)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-black tracking-[.2em] text-[var(--gold-bright)]">AGENDA DE REVISÃO</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Adicionar revisão</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-[10px] font-black tracking-[.12em] text-[var(--muted)]">
            MATÉRIA
            <select
              value={subjectSlug}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const nextSlug = event.target.value as typeof subjectSlug;
                const nextSubject = prfSubjects.find((item) => item.slug === nextSlug) ?? prfSubjects[0];
                setSubjectSlug(nextSlug);
                setLessonSlug(nextSubject.lessons.find((lesson) => lesson.weekOne)?.slug ?? "");
              }}
              className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-medium text-[var(--ink)] outline-none"
            >
              {prfSubjects.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-black tracking-[.12em] text-[var(--muted)]">
            REVISÃO
            <select
              value={revisionNumber}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setRevisionNumber(Number(event.target.value))}
              className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-medium text-[var(--ink)] outline-none"
            >
              <option value={1}>1ª REVISÃO</option>
              <option value={2}>2ª REVISÃO</option>
              <option value={3}>3ª REVISÃO</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-[10px] font-black tracking-[.12em] text-[var(--muted)]">
          AULA-MÃE
          <select
            value={lessonSlug}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setLessonSlug(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-medium text-[var(--ink)] outline-none"
          >
            {lessons.map((lesson) => (
              <option key={lesson.slug} value={lesson.slug}>
                {lesson.title}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-[10px] font-black tracking-[.12em] text-[var(--muted)]">
          DATA
          <input
            type="date"
            value={date}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-medium text-[var(--ink)] outline-none"
            required
          />
        </label>

        <button
          type="submit"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-xs font-black tracking-[.12em] text-[#111] transition hover:bg-[var(--gold-bright)]"
        >
          <Plus size={16} /> ADICIONAR À AGENDA
        </button>
      </form>
    </div>
  );
}


async function scheduleNextCompletedRevision(...args: unknown[]): Promise<void> {
  const revision = args.find((value) => {
    if (!value || typeof value !== "object") return false;
    const row = value as Record<string, unknown>;
    return (
      typeof row.subjectSlug === "string" &&
      typeof row.subjectName === "string" &&
      typeof row.lessonSlug === "string" &&
      typeof row.lessonTitle === "string" &&
      typeof row.revisionNumber === "number"
    );
  }) as Record<string, unknown> | undefined;

  if (!revision) return;

  const currentRevisionNumber = Number(revision.revisionNumber);
  const nextRevisionNumber = currentRevisionNumber + 1;

  // A Titã trabalha com a cadeia de revisões até a quinta.
  if (!Number.isFinite(nextRevisionNumber) || nextRevisionNumber > 5) {
    return;
  }

  let recommendedDate = args.find(
    (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
  ) as string | undefined;

  if (!recommendedDate) {
    const completedAt =
      typeof revision.completedAt === "string" ? revision.completedAt : null;

    if (!completedAt) return;

    const completedDate = new Date(completedAt);
    if (Number.isNaN(completedDate.getTime())) return;

    const { addDaysToDateKey, toDateKey } = await import("@/lib/revision-system");
    recommendedDate = addDaysToDateKey(toDateKey(completedDate), 4);
  }

  const { queueRevisionDraft } = await import("@/lib/study-database");

  await queueRevisionDraft({
    subjectSlug: String(revision.subjectSlug),
    subjectName: String(revision.subjectName),
    lessonSlug: String(revision.lessonSlug),
    lessonTitle: String(revision.lessonTitle),
    revisionNumber: nextRevisionNumber,
    recommendedDate,
  });
}
export function RevisionCalendar() {
  const router = useRouter();
  const [referenceMonth, setReferenceMonth] = useState(() => new Date());
  const [events, setEvents] = useState<RevisionEvent[]>([]);
  const [levelingEvents, setLevelingEvents] = useState<LevelingCalendarRow[]>([]);
  const [drafts, setDrafts] = useState<RevisionDraft[]>([]);
  const [focusedDraftId, setFocusedDraftId] = useState<string | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  const [completedRevisionForSchedule, setCompletedRevisionForSchedule] = useState<RevisionEvent | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [revisionScheduleChooser, setRevisionScheduleChooser] = useState<RevisionEvent | null>(null);
  const [prefilledRevisionDraft, setPrefilledRevisionDraft] = useState<RevisionDraft | null>(null); // MT_PREFILLED_REVISION_STATE_V7_2
  const [hydrated, setHydrated] = useState(false);

  async function refresh() {
    const [nextEvents, nextDrafts, levelingPayload] = await Promise.all([
      loadRevisionEvents(),
      loadRevisionDrafts(),
      loadLevelingCalendar().catch(() => ({ events: [] as LevelingCalendarRow[] })),
    ]);
    setEvents(nextEvents);
    setDrafts(nextDrafts);
    setLevelingEvents(levelingPayload.events ?? []);
    return { nextEvents, nextDrafts };
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        const { nextDrafts } = await refresh();
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get("agendar");
        let targetDraft = targetId ? nextDrafts.find((draft) => draft.id === targetId) : null;

        // MT_PREFILLED_REVISION_INIT_V7_2
        if (!targetDraft) {
          const directSubject = params.get("subject");
          const directLesson = params.get("lesson");
          const directRevision = Number(params.get("revision") || "1");
          const directDate = params.get("date") || todayKey();

          if (directSubject && directLesson) {
            const taxonomy = await loadStudyTaxonomy();
            const subject = taxonomy.subjects.find((item) => item.slug === directSubject);
            const lesson = subject?.lessons.find((item) => item.slug === directLesson);

            if (subject && lesson) {
              targetDraft = await queueRevisionDraft({
                subjectSlug: subject.slug,
                subjectName: subject.name,
                lessonSlug: lesson.slug,
                lessonTitle: lesson.title,
                revisionNumber: Number.isFinite(directRevision) ? directRevision : 1,
                recommendedDate: directDate,
              });
            }
          }
        }
        if (targetDraft) {
          setPrefilledRevisionDraft(targetDraft);
          setFocusedDraftId(targetDraft.id);
          setReferenceMonth(parseDateKey(targetDraft.recommendedDate));
        }
      } finally {
        setHydrated(true);
      }
    };
    void initialize();
    return listenStudyUpdated(() => void refresh());
  }, []);

  const cells = useMemo(() => monthCells(referenceMonth), [referenceMonth]);
  const month = referenceMonth.getMonth();
  const pendingCount = events.filter((event) => event.status !== "completed").length;
  const dueCount = events.filter((event) => event.status !== "completed" && event.date <= todayKey()).length;
  const completedCount = events.filter((event) => event.status === "completed").length;

  function navigateMonth(offset: number) {
    setReferenceMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  async function placeRevisionOnDate(id: string, date: string) {
    await scheduleRevisionById(id, date);
    setFocusedDraftId(null);
    setDropTargetDate(null);
    await refresh();
  }

  async function dropOnDate(dropEvent: DragEvent<HTMLDivElement>, date: string) {
    dropEvent.preventDefault();
    const draftId = dropEvent.dataTransfer.getData("text/revision-draft-id");
    if (draftId) return placeRevisionOnDate(draftId, date);
    const id = dropEvent.dataTransfer.getData("text/revision-id");
    if (id) return placeRevisionOnDate(id, date);
    setDropTargetDate(null);
  }

  async function useRecommendedDate(draft: RevisionDraft) {
    await scheduleRevisionById(draft.id, draft.recommendedDate);
    setReferenceMonth(parseDateKey(draft.recommendedDate));
    setFocusedDraftId(null);
    await refresh();
  }

  async function removeDraft(id: string) {
    await removeRevision(id);
    if (focusedDraftId === id) setFocusedDraftId(null);
    await refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Remover esta revisão do calendário?")) return;
    await removeRevision(id);
    await refresh();
  }

  // MT_SAVE_PREFILLED_REVISION_V7_2
  async function savePrefilledRevision(draft: RevisionDraft, date: string, notes: string) {
    await scheduleRevisionById(draft.id, date);

    if (notes.trim()) {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_revisions")
        .update({ notes: notes.trim() })
        .eq("id", draft.id);
      if (error) throw error;
    }

    setPrefilledRevisionDraft(null);
    setFocusedDraftId(null);
    setReferenceMonth(parseDateKey(date));
    window.history.replaceState({}, "", "/revisoes");
    await refresh();
  }

  function open(event: RevisionEvent) {
    if (event.status === "completed") {
      setRevisionScheduleChooser(event);
      return;
    }

    router.push(`/revisoes/${event.id}`);
  }

  async function scheduleChosenRevision(
    source: RevisionEvent,
    revisionNumber: number,
    date: string,
  ) {
    const duplicate = events.find(
      (item) =>
        item.id !== source.id &&
        item.subjectSlug === source.subjectSlug &&
        item.lessonSlug === source.lessonSlug &&
        item.revisionNumber === revisionNumber,
    );

    if (duplicate) {
      throw new Error(
        duplicate.status === "completed"
          ? `A ${revisionNumber}ª revisão desta aula já foi concluída.`
          : `A ${revisionNumber}ª revisão desta aula já está agendada.`,
      );
    }

    await createManualRevision({
      subjectSlug: source.subjectSlug,
      subjectName: source.subjectName,
      lessonSlug: source.lessonSlug,
      lessonTitle: source.lessonTitle,
      revisionNumber,
      date,
    });

    setRevisionScheduleChooser(null);
    setReferenceMonth(parseDateKey(date));
    await refresh();
  }

  async function openLeveling(event: LevelingCalendarRow) {
    // MT_OPEN_SCHEDULED_LEVELING_V1
    if (event.attempt_id) {
      router.push(`/questoes/banco/nivelamento/${event.attempt_id}`);
      return;
    }

    try {
      const result = await startScheduledLeveling(event.id);

      if (result.ok && result.attempt_id) {
        router.push(`/questoes/banco/nivelamento/${result.attempt_id}`);
        return;
      }

      // Sem questões automáticas ou revisão ainda não concluída:
      // abre a revisão exatamente na ETAPA 02, onde o guia global mostra
      // onde pesquisar e quantas questões fazer.
      router.push(`/revisoes/${event.revision_id}#nivelamento`);
    } catch {
      router.push(`/revisoes/${event.revision_id}#nivelamento`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1260px] px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
      <section className="overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <header className="flex flex-col gap-5 border-b border-[var(--border)] p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">
              <CalendarDays size={15} /> REVISÕES · AGENDA PESSOAL
            </span>
            <h1 className="mt-2 font-serif text-4xl tracking-[-.035em] text-[var(--ink)] sm:text-5xl">Seu calendário de domínio.</h1>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-[var(--muted)]">
              SEGURE o card da revisão e ARRASTE para outro dia. O dia de destino acende em dourado; ao soltar, a nova data é salva. Esta agenda já é individual e fica vinculada ao seu login no Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalDate(todayKey())}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-xs font-black tracking-[.11em] text-[#111] transition hover:bg-[var(--gold-bright)]"
          >
            <Plus size={16} /> ADICIONAR REVISÃO
          </button>
        </header>

        {drafts.length > 0 ? (
          <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--gold)_2%,var(--background))] p-4 sm:p-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">AULAS PARA AGENDAR</span>
                <strong className="mt-1 block font-serif text-xl text-[var(--ink)]">Segure e arraste a aula para o dia que quiser.</strong>
              </div>
              <span className="text-[9px] text-[var(--muted)]">Ou use a data recomendada em um clique.</span>
            </div>
            <div className="space-y-2">
              {drafts.map((draft) => (
                <DraftChip
                  key={draft.id}
                  draft={draft}
                  focused={draft.id === focusedDraftId}
                  onUseRecommended={useRecommendedDate}
                  onRemove={removeDraft}
                  onSchedule={placeRevisionOnDate}
                  onDragTarget={setDropTargetDate}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid border-b border-[var(--border)] sm:grid-cols-3">
          <div className="p-4 sm:border-r sm:border-[var(--border)] sm:p-5">
            <span className="text-[9px] font-black tracking-[.15em] text-[var(--muted)]">AGENDADAS</span>
            <strong className="mt-1 block font-serif text-3xl text-[var(--ink)]">{pendingCount}</strong>
          </div>
          <div className="border-t border-[var(--border)] p-4 sm:border-r sm:border-t-0 sm:p-5">
            <span className="text-[9px] font-black tracking-[.15em] text-[var(--muted)]">PENDENTES HOJE</span>
            <strong className="mt-1 block font-serif text-3xl" style={{ color: dueCount > 0 ? gold : "var(--ink)" }}>{dueCount}</strong>
          </div>
          <div className="border-t border-[var(--border)] p-4 sm:border-t-0 sm:p-5">
            <span className="text-[9px] font-black tracking-[.15em] text-[var(--muted)]">CONCLUÍDAS</span>
            <strong className="mt-1 block font-serif text-3xl" style={{ color: completedCount > 0 ? green : "var(--ink)" }}>{completedCount}</strong>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]"
              aria-label="Mês anterior"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]"
              aria-label="Próximo mês"
            >
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setReferenceMonth(new Date())}
              className="min-h-10 rounded-xl border border-[var(--border)] px-3 text-[9px] font-black tracking-[.12em] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"
            >
              HOJE
            </button>
          </div>
          <h2 className="font-serif text-2xl text-[var(--ink)] sm:text-3xl">{monthTitle(referenceMonth)}</h2>
          <div className="flex items-center gap-3 text-[9px] font-bold text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d2a64e]" /> Pendente</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#31c765]" /> Concluída</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--background)]">
              {weekDays.map((day) => (
                <div key={day} className="px-3 py-3 text-center text-[9px] font-black tracking-[.16em] text-[var(--muted)]">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((date) => {
                const key = toDateKey(date);
                const isToday = key === todayKey();
                const inMonth = date.getMonth() === month;
                const recommendedDraftsForDate = drafts.filter((draft) => draft.recommendedDate === key);
                const isRecommended = recommendedDraftsForDate.length > 0;
                const isFocusedRecommendation = recommendedDraftsForDate.some((draft) => draft.id === focusedDraftId);
                const dayEvents = events
                  .filter((event) => event.date === key)
                  .sort((a, b) => a.revisionNumber - b.revisionNumber);
                const dayLevelings = levelingEvents.filter((event) => (event.scheduled_for ?? event.recommended_for) === key);

                return (
                  <div
                    key={key}
                    data-revision-date={key}
                    onDragOver={(event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault();
                      setDropTargetDate(key);
                    }}
                    onDrop={(event: DragEvent<HTMLDivElement>) => dropOnDate(event, key)}
                    onDoubleClick={() => setModalDate(key)}
                    className="relative min-h-[152px] border-b border-r p-2.5 transition"
                    style={{
                      opacity: inMonth ? 1 : 0.38,
                      borderColor: dropTargetDate === key
                        ? "rgba(210,166,78,.72)"
                        : isRecommended
                          ? "rgba(49,199,101,.45)"
                          : "var(--border)",
                      background: dropTargetDate === key
                        ? "linear-gradient(145deg, rgba(210,166,78,.16), rgba(210,166,78,.055))"
                        : isRecommended
                          ? isFocusedRecommendation
                            ? "linear-gradient(145deg, rgba(49,199,101,.18), rgba(49,199,101,.07))"
                            : "rgba(49,199,101,.08)"
                          : "transparent",
                      boxShadow: dropTargetDate === key
                        ? "inset 0 0 0 2px rgba(210,166,78,.7)"
                        : isFocusedRecommendation
                          ? "inset 0 0 0 2px rgba(49,199,101,.55)"
                          : "none",
                    }}
                  >
                    {isRecommended ? (
                      <span className="absolute right-2 top-2 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-1 text-[7px] font-black tracking-[.12em] text-emerald-400">
                        RECOMENDADO
                      </span>
                    ) : null}
                    <div className="mb-2 flex items-center justify-between pr-20">
                      <button
                        type="button"
                        onClick={() => setModalDate(key)}
                        className="grid h-7 min-w-7 place-items-center rounded-lg px-1 text-[10px] font-black"
                        style={{
                          background: isRecommended ? green : isToday ? gold : "transparent",
                          color: isRecommended || isToday ? "#07110a" : "var(--muted)",
                        }}
                        title={isRecommended ? "Data recomendada — clique para adicionar ou arraste a aula para cá" : "Adicionar revisão neste dia"}
                      >
                        {date.getDate()}
                      </button>
                      {dayEvents.length > 0 ? (
                        <span className="text-[8px] font-black text-[var(--muted)]">{dayEvents.length}</span>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventChip
                          key={event.id}
                          event={event}
                          onRemove={remove}
                          onOpen={open}
                          onMove={placeRevisionOnDate}
                          onDragTarget={setDropTargetDate}
                        />
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="block px-2 text-[8px] font-bold text-[var(--muted)]">+ {dayEvents.length - 3} revisão(ões)</span>
                      ) : null}
                      {dayLevelings.slice(0, 2).map((leveling) => (
                        <button key={leveling.id} type="button" data-mt-leveling-inline="v18" onClick={() => void openLeveling(leveling)} className="w-full rounded-xl border border-violet-400/25 bg-violet-400/[.075] px-2.5 py-2 text-left transition hover:border-violet-300/45">
                          <span className="block truncate text-[8px] font-black tracking-[.08em] text-violet-300">NIVELAMENTO {leveling.leveling_number}</span>
                          <span className="mt-1 block truncate text-[8px] text-[var(--muted)]">{leveling.subject_name} · {leveling.required_count ?? 10} questões · meta {leveling.required_correct ?? 9}/{leveling.required_count ?? 10}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Clock3 className="text-[var(--gold-bright)]" size={18} />
          <strong className="mt-3 block font-serif text-lg text-[var(--ink)]">Revisão 1 · +2 dias</strong>
          <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">Ao terminar teoria + lista, a recomendação inicial é agendar a primeira revisão para dois dias depois.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <RotateCcw className="text-[var(--gold-bright)]" size={18} />
          <strong className="mt-3 block font-serif text-lg text-[var(--ink)]">Revisão 2 · +4 dias</strong>
          <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">Depois de concluir a Revisão 1, a próxima recomendação é quatro dias após a data em que você realmente revisou.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Check className="text-[var(--gold-bright)]" size={18} />
          <strong className="mt-3 block font-serif text-lg text-[var(--ink)]">Nivelamento · meta 9/10</strong>
          <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">A revisão só fecha após releitura + nivelamento. Se fizer 8/10 ou menos, entra um novo bloco de 10 questões.</p>
        </div>
      </section>

      {!hydrated ? <p className="mt-4 text-xs text-[var(--muted)]">Carregando agenda...</p> : null}

      {completedRevisionForSchedule ? (
        <CompletedRevisionScheduleModal
          event={completedRevisionForSchedule}
          onClose={() => setCompletedRevisionForSchedule(null)}
          onOpen={() => {
            const id = completedRevisionForSchedule.id;
            setCompletedRevisionForSchedule(null);
            router.push(`/revisoes/${id}`);
          }}
          onSchedule={(date) =>
            scheduleNextCompletedRevision(
              completedRevisionForSchedule,
              date,
            )
          }
        />
      ) : null}

      {revisionScheduleChooser ? (
        <RevisionScheduleChooserV2
          event={revisionScheduleChooser}
          existingEvents={events}
          onClose={() => setRevisionScheduleChooser(null)}
          onOpenCompleted={() => {
            const id = revisionScheduleChooser.id;
            setRevisionScheduleChooser(null);
            router.push(`/revisoes/${id}`);
          }}
          onSchedule={(revisionNumber, date) =>
            scheduleChosenRevision(
              revisionScheduleChooser,
              revisionNumber,
              date,
            )
          }
        />
      ) : null}

      {/* MT_PREFILLED_REVISION_RENDER_V7_2 */}
      {prefilledRevisionDraft ? (
        <RevisionPrefilledScheduler
          draft={prefilledRevisionDraft}
          onClose={() => {
            setPrefilledRevisionDraft(null);
            window.history.replaceState({}, "", "/revisoes");
          }}
          onSave={(date, notes) => savePrefilledRevision(prefilledRevisionDraft, date, notes)}
        />
      ) : null}

      {modalDate ? (
        <AddRevisionModal
          defaultDate={modalDate}
          onClose={() => setModalDate(null)}
          onCreated={() => void refresh()}
        />
      ) : null}
    </div>
  );
}





