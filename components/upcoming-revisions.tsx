"use client";

import { ArrowRight, CalendarClock, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatShortDatePtBr,
  todayKey,
  type RevisionEvent,
} from "@/lib/revision-system";
import { listenStudyUpdated, loadRevisionEvents } from "@/lib/study-database";

const gold = "#d2a64e";

export function UpcomingRevisions() {
  const [events, setEvents] = useState<RevisionEvent[]>([]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const next = await loadRevisionEvents();
        setEvents(
          next
            .filter((event) => event.status !== "completed")
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 4),
        );
      } catch {
        setEvents([]);
      }
    };
    void refresh();
    return listenStudyUpdated(() => void refresh());
  }, []);

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]"><CalendarClock size={14} /> PRÓXIMAS REVISÕES</span>
          <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Agenda de domínio</h2>
        </div>
        <Link href="/revisoes" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)]">ABRIR CALENDÁRIO <ArrowRight size={14} /></Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-center">
          <Clock3 className="mx-auto text-[var(--muted)]" size={20} />
          <strong className="mt-2 block text-sm text-[var(--ink)]">Nenhuma revisão agendada ainda.</strong>
          <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">Depois de concluir teoria + lista de uma aula, a Revisão 1 pode ser enviada ao seu calendário pessoal.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {events.map((event) => {
            const due = event.date <= todayKey();
            return (
              <Link key={event.id} href={`/revisoes/${event.id}`} className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)]" style={{ color: due ? gold : "var(--muted)" }}>
                  {due ? <CalendarClock size={17} /> : <Clock3 size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-black tracking-[.13em]" style={{ color: due ? gold : "var(--muted)" }}>{due ? "PENDENTE" : formatShortDatePtBr(event.date).toUpperCase()}</span>
                  <strong className="mt-1 block truncate text-xs text-[var(--ink)]">{event.subjectName} · Revisão {event.revisionNumber}</strong>
                  <span className="mt-0.5 block truncate text-[9px] text-[var(--muted)]">{event.lessonTitle}</span>
                </div>
                <ArrowRight className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--gold-bright)]" size={16} />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
