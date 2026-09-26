"use client";

import { ArrowLeft, Check, Eye, LoaderCircle, NotebookPen, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  completeLessonNotebookReview,
  formatNotebookDate,
  isNotebookDue,
  loadNotebookById,
  sortNotebookCardsForReview,
  type LessonNotebookDetail,
  type NotebookReviewResult,
} from "@/lib/notebook-system";

export function NotebookReviewRunner({ notebookId }: { notebookId: string }) {
  const [notebook, setNotebook] = useState<LessonNotebookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<NotebookReviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadNotebookById(notebookId)
      .then((data) => { if (alive) setNotebook(data); })
      .catch((error) => { if (alive) setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o caderno."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [notebookId]);

  const cards = useMemo(() => sortNotebookCardsForReview(notebook?.cards ?? []), [notebook]);
  const current = cards[position] ?? null;
  const dueAtStart = notebook ? isNotebookDue(notebook) : false;

  function markCurrent(correct: boolean) {
    if (!current) return;
    setResults((existing) => ({ ...existing, [current.id]: correct }));
    setRevealed(false);
    if (position < cards.length - 1) setPosition((value) => value + 1);
  }

  async function finish() {
    if (!notebook || finishing || Object.keys(results).length !== cards.length) return;
    setFinishing(true);
    setErrorMessage(null);
    try {
      const result = await completeLessonNotebookReview(notebook.id, results);
      setSummary(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível finalizar a revisão.");
    } finally {
      setFinishing(false);
    }
  }

  if (loading) return <div className="grid min-h-72 place-items-center text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={17}/> CARREGANDO CADERNO</span></div>;
  if (errorMessage && !notebook) return <div className="rounded-2xl border border-red-500/25 bg-red-500/[.07] p-5 text-sm text-red-400">{errorMessage}</div>;
  if (!notebook) return <div className="rounded-2xl border border-[var(--border)] p-8 text-center text-[var(--muted)]">Caderno não encontrado.</div>;
  if (!cards.length) return <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-10 text-center"><NotebookPen className="mx-auto text-[var(--gold-bright)]"/><h2 className="mt-4 font-serif text-3xl text-[var(--ink)]">Este caderno ainda está vazio.</h2><Link href="/caderno" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black text-[#111]">VOLTAR AO CADERNO</Link></div>;

  if (summary) {
    return (
      <section className="overflow-hidden rounded-[30px] border border-emerald-400/20 bg-[var(--surface)]">
        <div className="bg-[radial-gradient(circle_at_80%_0%,rgba(52,211,153,.18),transparent_42%),#090b0c] p-7 text-center text-white sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[.08] text-emerald-300"><Check size={29}/></span>
          <span className="mt-5 block text-[9px] font-black tracking-[.18em] text-emerald-300">REVISÃO CONCLUÍDA</span>
          <h2 className="mt-2 font-serif text-4xl">{summary.score}/{summary.total} lembrados</h2>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-white/45">{summary.schedule_advanced ? `Como esta revisão estava disponível no calendário, o bloco avançou. Próxima revisão: ${formatNotebookDate(summary.next_review_on)}.` : `Esta foi uma revisão extra. O calendário original do caderno permaneceu em ${formatNotebookDate(summary.next_review_on)}.`}</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
          <button type="button" onClick={() => { setResults({}); setPosition(0); setRevealed(false); setSummary(null); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-[10px] font-black tracking-[.1em] text-[var(--muted)]"><RotateCcw size={15}/> REVISAR DE NOVO</button>
          <Link href="/caderno" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111]">VOLTAR AOS CADERNOS</Link>
        </div>
      </section>
    );
  }

  const answered = Object.keys(results).length;
  const allDone = answered === cards.length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-amber-300/18 bg-[radial-gradient(circle_at_85%_0%,rgba(245,190,64,.13),transparent_38%),var(--surface)]">
        <div className="p-5 sm:p-7">
          <span className="text-[8px] font-black tracking-[.18em] text-[var(--gold-bright)]">CADERNO DE ANOTAÇÕES · {dueAtStart ? "REVISÃO PROGRAMADA" : "REVISÃO EXTRA"}</span>
          <h1 className="mt-2 font-serif text-3xl text-[var(--ink)] sm:text-4xl">{notebook.subject_name} · {notebook.lesson_title}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-[8px] font-black tracking-[.08em]">
            <span className="rounded-full border border-[var(--border)] px-3 py-2 text-[var(--muted)]">{position + 1}/{cards.length}</span>
            {current?.last_result === false ? <span className="rounded-full border border-red-400/25 bg-red-400/[.06] px-3 py-2 text-red-400">ERRO ANTERIOR · PRIORIDADE</span> : null}
            <span className="rounded-full border border-violet-400/20 bg-violet-400/[.05] px-3 py-2 text-violet-300">ERROS PRIMEIRO · ANTIGOS DEPOIS</span>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/15"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#d2a64e,#8b5cf6)] transition-all" style={{ width: `${(answered / cards.length) * 100}%` }}/></div>
        </div>
      </section>

      {errorMessage ? <div className="rounded-2xl border border-red-500/25 bg-red-500/[.07] p-4 text-xs text-red-400">{errorMessage}</div> : null}

      {!allDone && current ? (
        <section className="overflow-hidden rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_25px_80px_rgba(0,0,0,.12)]">
          <div className="p-6 sm:p-9">
            <span className="text-[8px] font-black tracking-[.18em] text-[var(--gold-bright)]">FRENTE</span>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-[var(--ink)] sm:text-4xl">{current.front}</h2>
            {!revealed ? (
              <button type="button" onClick={() => setRevealed(true)} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[.06] text-[10px] font-black tracking-[.1em] text-violet-300"><Eye size={16}/> REVELAR EXPLICAÇÃO</button>
            ) : (
              <div className="mt-8 border-t border-[var(--border)] pt-7">
                <span className="text-[8px] font-black tracking-[.18em] text-violet-400">VERSO</span>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[var(--ink)]/80">{current.back}</p>
                <p className="mt-7 text-center text-[9px] font-black tracking-[.12em] text-[var(--muted)]">VOCÊ LEMBROU ANTES DE VER O VERSO?</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => markCurrent(false)} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/[.06] px-5 text-[10px] font-black tracking-[.1em] text-red-400"><X size={16}/> ERREI</button>
                  <button type="button" onClick={() => markCurrent(true)} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[.08] px-5 text-[10px] font-black tracking-[.1em] text-emerald-400"><Check size={16}/> ACERTEI</button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {allDone ? (
        <section className="rounded-[26px] border border-emerald-400/20 bg-emerald-400/[.045] p-6 text-center">
          <Check className="mx-auto text-emerald-400" size={28}/>
          <h2 className="mt-3 font-serif text-3xl text-[var(--ink)]">Bloco inteiro revisado.</h2>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Você passou pelos {cards.length} flashcards desta aula. Agora finalize para registrar o resultado.</p>
          <button type="button" disabled={finishing} onClick={() => void finish()} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-[10px] font-black tracking-[.12em] text-[#07130d] disabled:opacity-45">{finishing ? <LoaderCircle className="animate-spin" size={16}/> : <Check size={16}/>} FINALIZAR REVISÃO DO CADERNO</button>
        </section>
      ) : null}

      {!allDone && position > 0 ? <button type="button" onClick={() => { setPosition((value) => Math.max(0, value - 1)); setRevealed(false); }} className="inline-flex min-h-10 items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> VOLTAR UM FLASHCARD</button> : null}
    </div>
  );
}
