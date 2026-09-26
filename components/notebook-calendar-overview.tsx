"use client";

import { ArrowRight, CalendarClock, LoaderCircle, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatNotebookDate, isNotebookDue, listenNotebookUpdated, loadNotebookHub, notebookTodayKey, type LessonNotebookHub } from "@/lib/notebook-system";

export function NotebookCalendarOverview() {
  const [hub, setHub] = useState<LessonNotebookHub | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await loadNotebookHub();
    setHub(data);
    setLoading(false);
  }

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
    const unlisten = listenNotebookUpdated(() => void refresh());
    return unlisten;
  }, []);

  const today = notebookTodayKey();
  const due = useMemo(() => (hub?.notebooks ?? []).filter((item) => isNotebookDue(item, today)), [hub, today]);
  const upcoming = useMemo(() => (hub?.notebooks ?? []).filter((item) => item.status === "active" && item.next_review_on && item.next_review_on > today).sort((a,b) => String(a.next_review_on).localeCompare(String(b.next_review_on))).slice(0,5), [hub, today]);

  return (
    <section className="mb-5 overflow-hidden rounded-[28px] border border-amber-300/18 bg-[radial-gradient(circle_at_85%_0%,rgba(245,190,64,.15),transparent_40%),var(--surface)]">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.18em] text-[var(--gold-bright)]"><NotebookPen size={14}/> CADERNO DE ANOTAÇÕES</span><h3 className="mt-2 font-serif text-2xl text-[var(--ink)] sm:text-3xl">{due.length} disponíve{due.length === 1 ? "l" : "is"} hoje.</h3><p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">Revisão por bloco da aula. Flashcards que você errou aparecem primeiro.</p></div>
        <Link href="/caderno" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/22 bg-amber-300/[.05] px-4 text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)]">VER CADERNOS <ArrowRight size={14}/></Link>
      </header>
      <div className="p-5 sm:p-6">
        {loading ? <div className="flex min-h-16 items-center justify-center gap-2 text-xs text-[var(--muted)]"><LoaderCircle className="animate-spin" size={15}/> Carregando...</div> : null}
        {!loading && !due.length ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--muted)]">0 disponíveis hoje. Seus próximos cadernos continuam programados normalmente.</div> : null}
        <div className="space-y-2">
          {due.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-fuchsia-400/18 bg-fuchsia-400/[.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><span className="text-[7px] font-black tracking-[.12em] text-fuchsia-400">DISPONÍVEL · {item.subject_name}</span><strong className="mt-1 block truncate text-sm text-[var(--ink)]">{item.lesson_title}</strong><span className="mt-1 block text-[9px] text-[var(--muted)]">{item.card_count} flashcards · {item.incorrect_count} com erro anterior</span></div><Link href={`/caderno/${item.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-fuchsia-500 px-4 text-[8px] font-black tracking-[.1em] text-white">INICIAR <ArrowRight size={13}/></Link></div>)}
        </div>
        {upcoming.length ? <div className="mt-5 border-t border-[var(--border)] pt-4"><span className="inline-flex items-center gap-2 text-[7px] font-black tracking-[.13em] text-[var(--muted)]"><CalendarClock size={12}/> PRÓXIMOS BLOCOS</span><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((item) => <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><strong className="block truncate text-[10px] text-[var(--ink)]">{item.lesson_title}</strong><span className="mt-1 block text-[8px] text-[var(--muted)]">{formatNotebookDate(item.next_review_on)} · {item.card_count} cards</span></div>)}</div></div> : null}
      </div>
    </section>
  );
}
