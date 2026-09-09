"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, ListChecks, LoaderCircle, Medal, Play, RotateCcw, Sparkles, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionCard } from "@/components/question-card";
import { XpRankInsignia } from "@/components/xp-rank-insignia";
import {
  loadQuestionAttempt,
  setQuestionMark,
  submitAttemptAnswer,
  type QuestionAttemptPayload,
} from "@/lib/question-bank";
import {
  finalizeSmartAttempt,
  formatStudyDuration,
  loadAttemptExperienceMeta,
  type AttemptExperienceMeta,
  type SmartFinalizeResult,
} from "@/lib/xp-system";
import { notifyStudyUpdated } from "@/lib/study-database";

type ResultState = SmartFinalizeResult;

export function QuestionAttemptRunner({ attemptId }: { attemptId: string }) {
  const router = useRouter(); // MT_LIST_AUTO_RETURN_V1
  const [payload, setPayload] = useState<QuestionAttemptPayload | null>(null);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [meta, setMeta] = useState<AttemptExperienceMeta | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoFinishingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadQuestionAttempt(attemptId),
      loadAttemptExperienceMeta(attemptId).catch(() => null),
    ]).then(([data, experience]) => {
      if (!alive) return;
      setPayload(data);
      setMeta(experience);
      if (data.attempt.status === "completed" && data.attempt.score !== null) {
        const required = experience?.required_correct ?? undefined;
        const score = data.attempt.score;
        setResult({
          score,
          total: data.attempt.total,
          percentage: Math.round((score / data.attempt.total) * 1000) / 10,
          required_correct: required,
          passed: required === undefined ? undefined : score >= required,
        });
      } else {
        const firstPending = data.items.findIndex((item) => !item.selected_answer);
        setPosition(firstPending >= 0 ? firstPending : 0);
        const introKey = `mentoria-tita:intro:${attemptId}`;
        if (typeof window !== "undefined" && !window.sessionStorage.getItem(introKey)) setIntroOpen(true);
      }
    }).catch((error) => {
      if (alive) setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir a tentativa.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [attemptId]);

  const current = payload?.items[position] ?? null;
  const answered = useMemo(() => payload?.items.filter((item) => Boolean(item.selected_answer)).length ?? 0, [payload]);
  const allAnswered = Boolean(payload && answered === payload.attempt.total);

  async function answer(answerValue: string) {
    if (!current) throw new Error("Questão indisponível.");
    const correction = await submitAttemptAnswer(attemptId, current.question_id, answerValue);
    const answeredAfter = answered + (current.selected_answer ? 0 : 1);
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
    if (payload?.attempt.kind !== "leveling" && answeredAfter >= (payload?.attempt.total ?? 0) && !autoFinishingRef.current) {
      autoFinishingRef.current = true;
      window.setTimeout(() => void finish(true), 650);
    }
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

  function closeIntro() {
    if (typeof window !== "undefined") window.sessionStorage.setItem(`mentoria-tita:intro:${attemptId}`, "1");
    setIntroOpen(false);
  }

  async function finish(force = false) {
    if (!payload || (!force && !allAnswered) || finishing) return;
    setFinishing(true);
    setErrorMessage(null);
    try {
      const summary = await finalizeSmartAttempt(attemptId, payload.attempt.kind);
      setResult(summary);
      setPayload((existing) => existing ? { ...existing, attempt: { ...existing.attempt, status: "completed", score: summary.score, completed_at: new Date().toISOString() } } : existing);
      const experience = await loadAttemptExperienceMeta(attemptId).catch(() => null);
      if (experience) setMeta(experience);
      notifyStudyUpdated();
      if (payload?.attempt.kind === "lesson_list") {
        const returnHref = window.sessionStorage.getItem("mentoria-tita:list-return");
        if (returnHref) {
          window.sessionStorage.removeItem("mentoria-tita:list-return");
          window.setTimeout(() => router.push(returnHref), 900);
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível finalizar a lista.");
    } finally {
      setFinishing(false);
      autoFinishingRef.current = false;
    }
  }

  if (loading) return <div className="flex min-h-72 items-center justify-center gap-3 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle className="animate-spin text-[var(--gold-bright)]" size={20} /> CARREGANDO SUA SESSÃO</div>;
  if (errorMessage && !payload) return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">{errorMessage}</div>;
  if (!payload || !current) return null;

  const isLeveling = payload.attempt.kind === "leveling";
  const stage = Math.min(4, Math.max(1, Number(meta?.manual_leveling_level ?? meta?.revision_number) || 1));
  const required = result?.required_correct ?? meta?.required_correct ?? Math.min(9, payload.attempt.total);
  const passed = result?.passed ?? (result ? result.score >= required : false);

  if (result) {
    return (
      <CompletionPanel
        isLeveling={isLeveling}
        stage={stage}
        result={result}
        required={required}
        passed={passed}
        meta={meta}
      />
    );
  }

  return (
    <div className="space-y-5">
      {introOpen ? <SessionIntro isLeveling={isLeveling} stage={stage} total={payload.attempt.total} required={required} subject={payload.attempt.subject_name} lesson={payload.attempt.lesson_title} onStart={closeIntro} /> : null}

      <section className="overflow-hidden rounded-[26px] border border-violet-400/18 bg-[linear-gradient(120deg,rgba(124,58,237,.085),var(--surface)_52%)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-[0_15px_35px_rgba(124,58,237,.22)]"><ListChecks size={25}/></span>
          <div className="min-w-0 flex-1">
            <span className="text-[8px] font-black tracking-[.16em] text-violet-400">{isLeveling ? `NIVELAMENTO ${stage}` : meta?.practice_list_number ? `LISTA ${meta.practice_list_number}` : meta?.list_review_id ? "REVISÃO DA LISTA" : "LISTA DE QUESTÕES"}</span>
            <h1 className="mt-1 font-serif text-2xl text-[var(--ink)] sm:text-3xl">{payload.attempt.subject_name ? `${payload.attempt.subject_name} · ` : ""}{payload.attempt.lesson_title || "Treino direcionado"}</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">Questão {position + 1} de {payload.attempt.total}</p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">{[current.exam_name,current.banca,current.ano ? String(current.ano) : null].filter(Boolean).join(" · ") || "Questões selecionadas para esta sessão"}</p>
          </div>
        </div>
        <div className="px-5 pb-4 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-[10px]"><strong className="text-[var(--ink)]">{answered}/{payload.attempt.total} respondidas</strong><span className="text-[var(--muted)]">{Math.round((answered/payload.attempt.total)*100)}% concluído</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/15"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)] transition-all duration-500" style={{ width: `${(answered / payload.attempt.total) * 100}%` }} /></div>
        </div>
      </section>

      {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      <QuestionCard key={current.question_id} question={{ ...current, subject_name: payload.attempt.subject_name, lesson_title: payload.attempt.lesson_title }} number={position + 1} onAnswer={answer} onToggleMark={toggleQuestionMark} compact />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled={position === 0} onClick={() => setPosition((value) => Math.max(0, value - 1))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 text-[10px] font-black tracking-[.1em] text-[var(--muted)] disabled:opacity-35"><ArrowLeft size={15} /> ANTERIOR</button>
        {position < payload.items.length - 1 ? (
          <button type="button" onClick={() => setPosition((value) => Math.min(payload.items.length - 1, value + 1))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] px-5 text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]">PRÓXIMA <ArrowRight size={15} /></button>
        ) : isLeveling ? (
          <button type="button" disabled={!allAnswered || finishing} onClick={() => void finish()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111] disabled:cursor-not-allowed disabled:opacity-45">{finishing ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} FINALIZAR NIVELAMENTO</button>
        ) : allAnswered ? (
          <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[.07] px-5 text-[10px] font-black tracking-[.1em] text-violet-300">{finishing ? <LoaderCircle className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} CONCLUINDO AUTOMATICAMENTE</span>
        ) : (
          <button type="button" onClick={() => { const next=payload.items.findIndex(item=>!item.selected_answer); if(next>=0)setPosition(next); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[.06] px-5 text-[10px] font-black tracking-[.1em] text-violet-300">IR PARA PENDENTE <ArrowRight size={15}/></button>
        )}
      </div>

      {!allAnswered && position === payload.items.length - 1 ? <p className="text-center text-[10px] font-bold text-[var(--muted)]">Ainda faltam {payload.attempt.total - answered} questões. Use ANTERIOR para respondê-las.</p> : null}
    </div>
  );
}

function SessionIntro({ isLeveling, stage, total, required, subject, lesson, onStart }: { isLeveling: boolean; stage: number; total: number; required: number; subject: string | null; lesson: string | null; onStart: () => void }) {
  const stars = "★".repeat(stage);
  const stageTheme = ["from-[#724424] via-[#a96435] to-[#2a1a12]", "from-[#515c6b] via-[#b9c4d3] to-[#242b34]", "from-[#7d5a16] via-[#e7bd55] to-[#332408]", "from-[#42166d] via-[#a84eff] to-[#160722]"][stage - 1];
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-md">
      <section className="mt-session-intro-pop w-full max-w-[640px] overflow-hidden rounded-[30px] border border-white/15 bg-[#0c0d11] text-white shadow-[0_30px_100px_rgba(0,0,0,.55)]">
        <div className={`relative overflow-hidden bg-gradient-to-br ${isLeveling ? stageTheme : "from-[#6b4b18] via-[#d5aa4e] to-[#2d210d]"} p-7 text-center sm:p-9`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(255,255,255,.25),transparent_48%)]" />
          <span className="relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] border border-white/25 bg-black/20 shadow-[0_15px_50px_rgba(0,0,0,.28)]">{isLeveling ? <Medal size={38} /> : <Trophy size={38} />}</span>
          {isLeveling ? <div className="relative mt-4 text-xl tracking-[.18em] text-white">{stars}</div> : null}
          <span className="relative mt-4 block text-[9px] font-black tracking-[.2em] text-white/65">{isLeveling ? `NIVELAMENTO ${stage}` : "LISTA DE QUESTÕES"}</span>
          <h2 className="relative mt-2 font-serif text-4xl sm:text-5xl">{isLeveling ? "Sessão de nivelamento" : "Sua sessão começa agora"}</h2>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-center text-sm leading-7 text-white/55">{subject ? `${subject} · ` : ""}{lesson || "Treino direcionado"}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/35">QUESTÕES DA SESSÃO</span><strong className="mt-1 block font-serif text-2xl">{total}</strong></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/35">META</span><strong className="mt-1 block font-serif text-2xl">{isLeveling ? `${required} acertos` : "Concluir a lista"}</strong></div>
          </div>
          <button type="button" onClick={onStart} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#c8963c,#f0c970)] px-6 text-[10px] font-black tracking-[.14em] text-[#151006] shadow-[0_12px_35px_rgba(210,166,78,.20)]"><Play size={16} fill="currentColor" /> INICIAR SESSÃO</button>
        </div>
      </section>
    </div>
  );
}

function CompletionPanel({ isLeveling, stage, result, required, passed, meta }: { isLeveling: boolean; stage: number; result: ResultState; required: number; passed: boolean; meta: AttemptExperienceMeta | null }) {
  const sessionQuestions = meta?.session_questions ?? result.total;
  const sessionCorrect = meta?.session_correct ?? result.score;
  const sessionSeconds = meta?.session_seconds ?? meta?.elapsed_seconds ?? 0;
  const elapsed = meta?.elapsed_seconds ?? 0;
  const rank = meta?.xp?.rank ?? meta?.rank ?? null;
  return (
    <section className={`mt-session-complete-pop overflow-hidden rounded-[30px] border bg-[#0b0d11] text-white shadow-[0_30px_100px_rgba(0,0,0,.30)] ${isLeveling ? (passed ? "border-violet-400/25" : "border-amber-400/25") : "border-[#d2a64e]/25"}`}>
      <div className="relative overflow-hidden p-7 text-center sm:p-10">
        <div className={`pointer-events-none absolute inset-0 ${isLeveling ? "bg-[radial-gradient(circle_at_50%_0%,rgba(138,67,205,.28),transparent_52%)]" : "bg-[radial-gradient(circle_at_50%_0%,rgba(210,166,78,.22),transparent_52%)]"}`} />
        <span className={`relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] border ${passed || !isLeveling ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300" : "border-amber-300/20 bg-amber-300/10 text-amber-300"}`}>{passed || !isLeveling ? <Trophy size={38} /> : <RotateCcw size={36} />}</span>
        {isLeveling ? <div className="relative mt-4 text-lg tracking-[.15em] text-violet-200">{"★".repeat(stage)}</div> : null}
        <span className="relative mt-4 block text-[9px] font-black tracking-[.2em] text-[#e6bd67]">{isLeveling ? `NIVELAMENTO ${stage} ${passed ? "CONCLUÍDO" : "FINALIZADO"}` : "LISTA CONCLUÍDA"}</span>
        <h2 className="relative mt-2 font-serif text-4xl sm:text-5xl">{isLeveling ? (passed ? "Meta alcançada." : "Mais uma rodada.") : "Missão cumprida."}</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-white/48">{isLeveling ? (passed ? `Você atingiu ${result.score}/${result.total} e concluiu este nivelamento.` : meta?.manual_leveling_level ? `Você fez ${result.score}/${result.total}. A meta é ${required}/${result.total}; volte aos nivelamentos e tente novamente este nível.` : `Você fez ${result.score}/${result.total}. A meta é ${required}/${result.total}; uma nova rodada pode ser feita pela revisão.`) : "Seu resultado foi salvo automaticamente assim que a última questão foi respondida."}</p>
      </div>

      <div className="border-t border-white/10 p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="QUESTÕES DA RODADA" value={String(result.total)} icon={Target} />
          <Metric label="ACERTOS" value={String(result.score)} icon={CheckCircle2} />
          <Metric label="APROVEITAMENTO" value={`${result.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} icon={Trophy} />
          <Metric label="TEMPO DA RODADA" value={formatStudyDuration(elapsed)} icon={Clock3} />
        </div>

        {isLeveling ? (
          <div className="mt-4 rounded-[22px] border border-violet-300/15 bg-violet-300/[.045] p-5">
            <div className="flex items-center gap-2"><Sparkles size={15} className="text-violet-200" /><span className="text-[9px] font-black tracking-[.16em] text-violet-200">TOTAL PARA CHEGAR ATÉ AQUI</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="QUESTÕES FEITAS" value={String(sessionQuestions)} />
              <MiniMetric label="ACERTOS ACUMULADOS" value={String(sessionCorrect)} />
              <MiniMetric label="TEMPO TOTAL" value={formatStudyDuration(sessionSeconds)} />
            </div>
          </div>
        ) : null}

        {rank && meta?.xp ? (
          <div className="mt-4 flex flex-col gap-4 rounded-[22px] border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center">
            <XpRankInsignia rank={rank} level={meta.xp.level} size="md" />
            <div className="flex-1"><span className="inline-flex items-center gap-1.5 text-[8px] font-black tracking-[.13em] text-[#e6bd67]"><Zap size={12} /> EVOLUÇÃO ATUAL</span><strong className="mt-1 block font-serif text-2xl">{rank.title} · Nível {meta.xp.level}</strong><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.06]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#b4832e,#e7bd64)]" style={{ width: `${Math.min(100, meta.xp.progress_percent)}%` }} /></div></div>
            <strong className="text-sm text-[#e6bd67]">{meta.xp.total_xp.toLocaleString("pt-BR")} XP</strong>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isLeveling ? <Link href="/nivelamentos" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-6 text-[10px] font-black tracking-[.11em] text-violet-100">{passed ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />} {passed ? "VOLTAR AOS NIVELAMENTOS" : "FAZER NOVA RODADA"}</Link> : null}
          {!isLeveling ? <Link href={(meta?.practice_list_number || meta?.list_review_id) ? "/questoes/listas" : "/cronograma/semana-1"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111]"><CheckCircle2 size={16} /> {(meta?.practice_list_number || meta?.list_review_id) ? "VOLTAR ÀS LISTAS" : "VOLTAR AO CRONOGRAMA"}</Link> : null}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Trophy }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="flex items-center gap-1.5 text-[8px] font-black tracking-[.12em] text-white/35"><Icon size={12} /> {label}</span><strong className="mt-1 block font-serif text-xl">{value}</strong></div>;
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div><span className="text-[8px] font-black tracking-[.12em] text-white/35">{label}</span><strong className="mt-1 block font-serif text-xl text-white">{value}</strong></div>;
}
