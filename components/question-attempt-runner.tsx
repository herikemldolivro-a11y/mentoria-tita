"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/question-card";
import {
  finalizeQuestionAttempt,
  loadQuestionAttempt,
  setQuestionMark,
  submitAttemptAnswer,
  type QuestionAttemptPayload,
} from "@/lib/question-bank";
import { notifyStudyUpdated } from "@/lib/study-database";

export function QuestionAttemptRunner({ attemptId }: { attemptId: string }) {
  const [payload, setPayload] = useState<QuestionAttemptPayload | null>(null);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadQuestionAttempt(attemptId).then((data) => {
      setPayload(data);
      if (data.attempt.status === "completed" && data.attempt.score !== null) {
        setResult({ score: data.attempt.score, total: data.attempt.total, percentage: Math.round((data.attempt.score / data.attempt.total) * 1000) / 10 });
      } else {
        const firstPending = data.items.findIndex((item) => !item.selected_answer);
        setPosition(firstPending >= 0 ? firstPending : 0);
      }
    }).catch((error) => setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir a tentativa.")).finally(() => setLoading(false));
  }, [attemptId]);

  const current = payload?.items[position] ?? null;
  const answered = useMemo(() => payload?.items.filter((item) => Boolean(item.selected_answer)).length ?? 0, [payload]);
  const allAnswered = Boolean(payload && answered === payload.attempt.total);

  async function answer(answerValue: string) {
    if (!current) throw new Error("Questão indisponível.");
    const correction = await submitAttemptAnswer(attemptId, current.question_id, answerValue);
    setPayload((existing) => existing ? {
      ...existing,
      items: existing.items.map((item) => item.question_id === current.question_id ? {
        ...item,
        selected_answer: answerValue,
        is_correct: correction.is_correct,
        correct_answer: correction.correct_answer,
        explanation: correction.explanation,
      } : item),
    } : existing);
    return correction;
  }

  async function toggleQuestionMark(mark: "starred" | "review", value: boolean) {
    if (!current) throw new Error("Questão indisponível.");
    const next = await setQuestionMark(current.question_id, mark, value);
    setPayload((existing) => existing ? {
      ...existing,
      items: existing.items.map((item) => item.question_id === current.question_id ? { ...item, ...next } : item),
    } : existing);
    return next;
  }

  async function finish() {
    if (!allAnswered || finishing) return;
    setFinishing(true);
    setErrorMessage(null);
    try {
      const summary = await finalizeQuestionAttempt(attemptId);
      setResult(summary);
      setPayload((existing) => existing ? { ...existing, attempt: { ...existing.attempt, status: "completed", score: summary.score, completed_at: new Date().toISOString() } } : existing);
      notifyStudyUpdated();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível finalizar a lista.");
    } finally { setFinishing(false); }
  }

  if (loading) return <div className="flex min-h-72 items-center justify-center gap-3 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle className="animate-spin text-[var(--gold-bright)]" size={20} /> CARREGANDO SUA LISTA</div>;
  if (errorMessage && !payload) return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">{errorMessage}</div>;
  if (!payload || !current) return null;

  if (result) {
    return (
      <section className="rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] p-7 text-center shadow-[var(--shadow)] sm:p-12">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_9%,transparent)] text-[var(--gold-bright)]"><Trophy size={30} /></span>
        <span className="mt-6 block text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">LISTA CONCLUÍDA</span>
        <h2 className="mt-3 font-serif text-4xl text-[var(--ink)] sm:text-6xl">{result.score} / {result.total}</h2>
        <strong className="mt-3 block text-xl text-emerald-400">{result.percentage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">Seu resultado foi salvo. A lista da aula está concluída e a próxima etapa da trilha foi liberada.</p>
        <Link href="/cronograma/semana-1" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111]"><CheckCircle2 size={16} /> VOLTAR AO CRONOGRAMA</Link>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4 text-[10px] font-black tracking-[.11em]"><span className="text-[var(--gold-bright)]">QUESTÃO {position + 1} DE {payload.attempt.total}</span><span className="text-[var(--muted)]">{answered} RESPONDIDAS</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_9%,transparent)]"><span className="block h-full bg-[linear-gradient(90deg,var(--gold),var(--gold-bright))] transition-all" style={{ width: `${(answered / payload.attempt.total) * 100}%` }} /></div>
      </section>

      {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      <QuestionCard key={current.question_id} question={{ ...current, subject_name: payload.attempt.subject_name, lesson_title: payload.attempt.lesson_title }} number={position + 1} onAnswer={answer} onToggleMark={toggleQuestionMark} compact />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled={position === 0} onClick={() => setPosition((value) => Math.max(0, value - 1))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 text-[10px] font-black tracking-[.1em] text-[var(--muted)] disabled:opacity-35"><ArrowLeft size={15} /> ANTERIOR</button>
        {position < payload.items.length - 1 ? (
          <button type="button" onClick={() => setPosition((value) => Math.min(payload.items.length - 1, value + 1))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] px-5 text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]">PRÓXIMA <ArrowRight size={15} /></button>
        ) : (
          <button type="button" disabled={!allAnswered || finishing} onClick={finish} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111] disabled:cursor-not-allowed disabled:opacity-45">{finishing ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} FINALIZAR LISTA</button>
        )}
      </div>

      {!allAnswered && position === payload.items.length - 1 ? <p className="text-center text-[10px] font-bold text-[var(--muted)]">Ainda faltam {payload.attempt.total - answered} questões. Use ANTERIOR para respondê-las.</p> : null}
    </div>
  );
}
