"use client";

import { CalendarDays, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  toDateKey,
  type RevisionEvent,
} from "@/lib/revision-system";

function recommendedDate(event: RevisionEvent) {
  const base = event.completedAt ? new Date(event.completedAt) : new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + 4);
  return toDateKey(base);
}

export function RevisionScheduleChooserV2({
  event,
  existingEvents,
  onClose,
  onOpenCompleted,
  onSchedule,
}: {
  event: RevisionEvent;
  existingEvents: RevisionEvent[];
  onClose: () => void;
  onOpenCompleted: () => void;
  onSchedule: (revisionNumber: number, date: string) => Promise<void>;
}) {
  const options = useMemo(() => [2, 3, 4, 5], []);
  const available = options.filter((number) => number > event.revisionNumber);

  const existingByNumber = useMemo(() => {
    const map = new Map<number, RevisionEvent>();
    for (const item of existingEvents) {
      if (
        item.subjectSlug === event.subjectSlug &&
        item.lessonSlug === event.lessonSlug &&
        item.id !== event.id
      ) {
        map.set(item.revisionNumber, item);
      }
    }
    return map;
  }, [existingEvents, event]);

  const firstAvailable =
    available.find((number) => !existingByNumber.has(number)) ??
    available[0] ??
    Math.min(5, event.revisionNumber + 1);

  const [revisionNumber, setRevisionNumber] = useState(firstAvailable);
  const [date, setDate] = useState(() => recommendedDate(event));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit() {
    if (!date || saving) return;

    const existing = existingByNumber.get(revisionNumber);
    if (existing) {
      setErrorMessage(
        existing.status === "completed"
          ? `A ${revisionNumber}ª revisão desta aula já foi concluída.`
          : `A ${revisionNumber}ª revisão desta aula já está agendada.`,
      );
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await onSchedule(revisionNumber, date);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível agendar a revisão.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <section className="w-full max-w-[480px] rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[0_32px_100px_rgba(0,0,0,.62)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[9px] font-black tracking-[.18em] text-emerald-400">
              AULA REVISADA · {event.revisionNumber}ª REVISÃO CONCLUÍDA
            </span>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)]">
              {event.lessonTitle}
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              {event.subjectName} · escolha qual revisão você quer agendar.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-6">
          <span className="text-[9px] font-black tracking-[.14em] text-[var(--muted)]">
            QUAL REVISÃO?
          </span>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {options.map((number) => {
              const previous = number <= event.revisionNumber;
              const existing = existingByNumber.get(number);
              const disabled = previous || Boolean(existing);
              const selected = revisionNumber === number;

              return (
                <button
                  key={number}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setRevisionNumber(number);
                    setErrorMessage(null);
                  }}
                  className="min-h-14 rounded-xl border px-2 text-center text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-35"
                  style={{
                    borderColor: selected
                      ? "rgba(210,166,78,.7)"
                      : "var(--border)",
                    background: selected
                      ? "rgba(210,166,78,.12)"
                      : "var(--background)",
                    color: selected
                      ? "var(--gold-bright)"
                      : "var(--ink)",
                  }}
                >
                  <span className="block">{number}ª REVISÃO</span>
                  {existing ? (
                    <span className="mt-1 block text-[7px] font-bold text-[var(--muted)]">
                      {existing.status === "completed" ? "CONCLUÍDA" : "JÁ AGENDADA"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-5 block text-[9px] font-black tracking-[.14em] text-[var(--muted)]">
          DATA
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
          onClick={() => void submit()}
          className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-4 text-[10px] font-black tracking-[.12em] text-[#111] disabled:opacity-45"
        >
          <CalendarDays size={16} />
          {saving
            ? "AGENDANDO..."
            : `AGENDAR ${revisionNumber}ª REVISÃO`}
        </button>

        <button
          type="button"
          onClick={onOpenCompleted}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"
        >
          ABRIR ESTA REVISÃO CONCLUÍDA
        </button>
      </section>
    </div>
  );
}
