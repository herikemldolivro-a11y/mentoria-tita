"use client";

import { CalendarDays, CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  loadRevisionDrafts,
  loadRevisionEvent,
  loadRevisionEvents,
  scheduleRevisionById,
  createManualRevision,
} from "@/lib/study-database";
import {
  toDateKey,
  type RevisionDraft,
  type RevisionEvent,
} from "@/lib/revision-system";

function defaultDate(event: RevisionEvent) {
  const base = event.completedAt ? new Date(event.completedAt) : new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + 4);
  return toDateKey(base);
}

export function CompletedRevisionScheduler({
  revisionId,
}: {
  revisionId: string;
}) {
  const router = useRouter();

  const [revision, setRevision] = useState<RevisionEvent | null>(null);
  const [events, setEvents] = useState<RevisionEvent[]>([]);
  const [drafts, setDrafts] = useState<RevisionDraft[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number>(2);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [current, nextEvents, nextDrafts] = await Promise.all([
          loadRevisionEvent(revisionId),
          loadRevisionEvents(),
          loadRevisionDrafts(),
        ]);

        if (!alive) return;

        setRevision(current);
        setEvents(nextEvents);
        setDrafts(nextDrafts);

        if (current) {
          const nextNumber = Math.min(5, Math.max(2, current.revisionNumber + 1));
          setSelectedNumber(nextNumber);
          setDate(defaultDate(current));
        }
      } catch (error) {
        if (alive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o agendador.",
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [revisionId]);

  const sameLessonEvents = useMemo(() => {
    if (!revision) return [];
    return events.filter(
      (item) =>
        item.subjectSlug === revision.subjectSlug &&
        item.lessonSlug === revision.lessonSlug &&
        item.id !== revision.id,
    );
  }, [events, revision]);

  const sameLessonDrafts = useMemo(() => {
    if (!revision) return [];
    return drafts.filter(
      (item) =>
        item.subjectSlug === revision.subjectSlug &&
        item.lessonSlug === revision.lessonSlug,
    );
  }, [drafts, revision]);

  if (loading) {
    return (
      <section className="mb-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-xs font-black tracking-[.1em] text-[var(--muted)]">
          <LoaderCircle className="animate-spin" size={16} />
          CARREGANDO AGENDADOR DE REVISÕES
        </div>
      </section>
    );
  }

  if (!revision || revision.status !== "completed") return null;

  const options = [2, 3, 4, 5];

  function eventFor(number: number) {
    return sameLessonEvents.find((item) => item.revisionNumber === number) ?? null;
  }

  function draftFor(number: number) {
    return sameLessonDrafts.find((item) => item.revisionNumber === number) ?? null;
  }

  async function schedule() {
    if (!revision || !date || saving) return;

    const existingEvent = eventFor(selectedNumber);
    if (existingEvent) {
      setErrorMessage(
        existingEvent.status === "completed"
          ? `A ${selectedNumber}ª revisão desta aula já foi concluída.`
          : `A ${selectedNumber}ª revisão desta aula já está agendada.`,
      );
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const existingDraft = draftFor(selectedNumber);

      if (existingDraft) {
        await scheduleRevisionById(existingDraft.id, date);
      } else {
        await createManualRevision({
          subjectSlug: revision.subjectSlug,
          subjectName: revision.subjectName,
          lessonSlug: revision.lessonSlug,
          lessonTitle: revision.lessonTitle,
          revisionNumber: selectedNumber,
          date,
        });
      }

      setMessage(`${selectedNumber}ª revisão agendada com sucesso.`);
      window.setTimeout(() => {
        router.push("/revisoes");
        router.refresh();
      }, 650);
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
    <section className="mb-6 overflow-hidden rounded-[28px] border border-emerald-500/35 bg-[linear-gradient(120deg,rgba(16,185,129,.10),var(--surface)_55%)] shadow-[0_18px_55px_rgba(0,0,0,.14)]">
      <div className="border-b border-emerald-500/20 p-5 sm:p-6">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-emerald-400">
          <CheckCircle2 size={15} />
          ESTA AULA JÁ FOI REVISADA
        </span>

        <h2 className="mt-2 font-serif text-3xl text-[var(--ink)] sm:text-4xl">
          Agendar nova revisão desta aula
        </h2>

        <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
          {revision.subjectName} · {revision.lessonTitle}
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <span className="text-[9px] font-black tracking-[.14em] text-[var(--muted)]">
          ESCOLHA A REVISÃO
        </span>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {options.map((number) => {
            const existing = eventFor(number);
            const previous = number <= revision.revisionNumber;
            const disabled = previous || Boolean(existing);
            const selected = selectedNumber === number;

            return (
              <button
                key={number}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSelectedNumber(number);
                  setErrorMessage(null);
                  setMessage(null);
                }}
                className="min-h-16 rounded-xl border px-3 py-2 text-center text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  borderColor: selected
                    ? "rgba(210,166,78,.75)"
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
                    {existing.status === "completed"
                      ? "CONCLUÍDA"
                      : "JÁ AGENDADA"}
                  </span>
                ) : draftFor(number) ? (
                  <span className="mt-1 block text-[7px] font-bold text-emerald-400">
                    PRONTA PARA AGENDAR
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label className="mt-5 block text-[9px] font-black tracking-[.14em] text-[var(--muted)]">
          DATA
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setErrorMessage(null);
              setMessage(null);
            }}
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-base font-medium text-[var(--ink)] outline-none"
          />
        </label>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400">
            {message}
          </div>
        ) : null}

        <button
          type="button"
          disabled={saving || !date}
          onClick={() => void schedule()}
          className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[11px] font-black tracking-[.12em] text-[#111] disabled:opacity-45"
        >
          {saving ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <CalendarDays size={17} />
          )}
          {saving
            ? "AGENDANDO..."
            : `AGENDAR ${selectedNumber}ª REVISÃO`}
        </button>
      </div>
    </section>
  );
}
