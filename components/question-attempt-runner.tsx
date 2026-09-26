"use client";

import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, CheckCircle2, ChevronRight, CircleX, Clock3, FileText, ListChecks, LoaderCircle, Medal, Play, RotateCcw, Sparkles, Target, TimerReset, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionCard } from "@/components/question-card";
import { setQuestionStarPriority } from "@/lib/starred-questions";
import { LessonNotebookDock } from "@/components/lesson-notebook-dock";
import { XpRankInsignia } from "@/components/xp-rank-insignia";
import {
  loadQuestionAttempt,
  restartQuestionAttempt,
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
import { addDaysToDateKey, todayKey } from "@/lib/revision-system";

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
  const [returnHref, setReturnHref] = useState<string | null>(null); // MT_RETURN_FLOW_V17
  const [roundNotice, setRoundNotice] = useState<string | null>(null);
  const autoFinishingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    if (typeof window !== "undefined") {
      let storedReturn = window.sessionStorage.getItem("mentoria-tita:list-return");
      if (!storedReturn && document.referrer) {
        try {
          const ref = new URL(document.referrer);
          if (ref.origin === window.location.origin && ref.pathname.startsWith("/cronograma/")) {
            storedReturn = ref.pathname + ref.search;
            window.sessionStorage.setItem("mentoria-tita:list-return", storedReturn);
          }
        } catch {}
      }
      setReturnHref(storedReturn);
    }
    Promise.all([
      loadQuestionAttempt(attemptId),
      loadAttemptExperienceMeta(attemptId).catch(() => null),
    ]).then(([data, experience]) => {
      if (!alive) return;
      setPayload(data);
      setMeta(experience);
      if (typeof window !== "undefined") {
        const savedRoundNotice = window.sessionStorage.getItem("mentoria-tita:leveling-round-notice");
        if (savedRoundNotice) {
          setRoundNotice(savedRoundNotice);
          window.sessionStorage.removeItem("mentoria-tita:leveling-round-notice");
        }
      }
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

    const correction = await submitAttemptAnswer(
      attemptId,
      current.question_id,
      answerValue,
    );

    const answeredAfter = answered + (current.selected_answer ? 0 : 1);

    setPayload((existing) =>
      existing
        ? {
            ...existing,
            items: existing.items.map((item) =>
              item.question_id === current.question_id
                ? {
                    ...item,
                    selected_answer: answerValue,
                    is_correct: correction.is_correct,
                    correct_answer: correction.correct_answer,
                    explanation: correction.explanation,
                  }
                : item,
            ),
          }
        : existing,
    );

    if (payload?.attempt.kind === "leveling") {
      if (correction.leveling_reset && correction.next_attempt_id) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "mentoria-tita:leveling-round-notice",
            "2º erro na rodada: a tentativa foi encerrada e o contador voltou para 10.",
          );
        }

        window.setTimeout(() => {
          router.replace(`/questoes/lista/${correction.next_attempt_id}`);
        }, 500);

        return correction;
      }

      if (
        correction.block_complete &&
        correction.block_passed &&
        !autoFinishingRef.current
      ) {
        autoFinishingRef.current = true;
        window.setTimeout(() => void finish(true), 650);
      }

      return correction;
    }

    if (
      answeredAfter >= (payload?.attempt.total ?? 0) &&
      !autoFinishingRef.current
    ) {
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

  // MT_STAR_PRIORITY_ATTEMPT_V1
  async function setStarPriority(priority: 1 | 2 | 3 | null) {
    if (!current) throw new Error("Questão indisponível.");
    const next = await setQuestionStarPriority(current.question_id, priority);
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
      if (typeof window !== "undefined") {
        const savedRoundNotice = window.sessionStorage.getItem("mentoria-tita:leveling-round-notice");
        if (savedRoundNotice) {
          setRoundNotice(savedRoundNotice);
          window.sessionStorage.removeItem("mentoria-tita:leveling-round-notice");
        }
      }
      notifyStudyUpdated();
      // MT_RESULT_STAY_V47_2
      // Após concluir, a lista permanece na tela de resultado.
      // O agendamento só abre quando o aluno clicar em CONTINUAR.
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
  const levelingErrors = isLeveling
    ? payload.items.filter(
        (item) => Boolean(item.selected_answer) && item.is_correct === false,
      ).length
    : 0;
  const levelingRemaining = isLeveling
    ? Math.max(0, payload.attempt.total - answered)
    : 0;

  if (result) {
    return (
      <CompletionPanel
        attemptId={attemptId}
        payload={payload}
        isLeveling={isLeveling}
        stage={stage}
        result={result}
        required={required}
        passed={passed}
        meta={meta}
        attemptKind={payload.attempt.kind}
        returnHref={returnHref}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* MT_NOTEBOOK_ATTEMPT_DOCK_V1 */}
      {payload.attempt.lesson_id ? (
        <LessonNotebookDock
          lessonId={payload.attempt.lesson_id}
          lessonTitle={payload.attempt.lesson_title ?? "Aula"}
          subjectName={payload.attempt.subject_name}
          contextLabel={isLeveling ? "NIVELAMENTO" : "LISTA DE QUESTÕES"}
        />
      ) : null}
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

      {isLeveling ? (
        <section
          data-mt-leveling-countdown="v1"
          className="overflow-hidden rounded-[24px] border border-violet-400/25 bg-violet-400/[.055]"
        >
          <div className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-6">
            <div>
              <span className="text-[8px] font-black tracking-[.16em] text-violet-300">
                NIVELAMENTO {stage} · FILTRO AUTOMÁTICO
              </span>
              <strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">
                Questões de nível {stage} desta aula
              </strong>
              <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
                A rodada fecha com {required}/{payload.attempt.total}. O 2º erro encerra a rodada e inicia outra automaticamente.
              </p>
            </div>

            <div className="rounded-2xl border border-violet-300/20 bg-black/10 px-5 py-4 text-center">
              <span className="block text-[8px] font-black tracking-[.13em] text-[var(--muted)]">
                QUESTÕES RESTANTES
              </span>
              <strong className="mt-1 block font-serif text-4xl text-violet-200">
                {levelingRemaining}
              </strong>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-black/10 px-5 py-4 text-center">
              <span className="block text-[8px] font-black tracking-[.13em] text-[var(--muted)]">
                ERROS NA RODADA
              </span>
              <strong
                className="mt-1 block font-serif text-3xl"
                style={{ color: levelingErrors >= 1 ? "#f1c86a" : "var(--ink)" }}
              >
                {levelingErrors}/1
              </strong>
            </div>
          </div>
        </section>
      ) : null}

      {roundNotice ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs font-bold text-amber-300">
          {roundNotice}
        </div>
      ) : null}

      {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      <QuestionCard key={current.question_id} question={{ ...current, subject_name: payload.attempt.subject_name, lesson_title: payload.attempt.lesson_title }} number={position + 1} onAnswer={answer} onToggleMark={toggleQuestionMark} onSetStarPriority={setStarPriority} compact />

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

function CompletionPanel({
  attemptId,
  payload,
  isLeveling,
  stage,
  result,
  required,
  passed,
  meta,
  attemptKind,
  returnHref,
}: {
  attemptId: string;
  payload: QuestionAttemptPayload;
  isLeveling: boolean;
  stage: number;
  result: ResultState;
  required: number;
  passed: boolean;
  meta: AttemptExperienceMeta | null;
  attemptKind: QuestionAttemptPayload["attempt"]["kind"];
  returnHref: string | null;
}) {
  // MT_RESULT_DASHBOARD_V47_6_3
  const router = useRouter();
  const [showErrors, setShowErrors] = useState(false);
  const [openedErrorId, setOpenedErrorId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"restart" | "continue" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sessionQuestions = meta?.session_questions ?? result.total;
  const sessionCorrect = meta?.session_correct ?? result.score;
  const sessionSeconds = meta?.session_seconds ?? meta?.elapsed_seconds ?? 0;
  const elapsed = Math.max(0, Number(meta?.elapsed_seconds ?? 0));
  const rank = meta?.xp?.rank ?? meta?.rank ?? null;

  if (isLeveling) {
    return (
      <section className={`mt-session-complete-pop overflow-hidden rounded-[30px] border bg-[#0b0d11] text-white shadow-[0_30px_100px_rgba(0,0,0,.30)] ${passed ? "border-violet-400/25" : "border-amber-400/25"}`}>
        {passed ? (
          <CompletionCelebration
            title="NIVELAMENTO CONCLUÍDO"
            subtitle={`Parabéns! Você atingiu ${result.score}/${result.total}.`}
          />
        ) : null}

        <div className="relative overflow-hidden p-7 text-center sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(138,67,205,.28),transparent_52%)]" />
          <span className={`relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] border ${passed ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300" : "border-amber-300/20 bg-amber-300/10 text-amber-300"}`}>
            {passed ? <Trophy size={38} /> : <RotateCcw size={36} />}
          </span>
          <div className="relative mt-4 text-lg tracking-[.15em] text-violet-200">{"★".repeat(stage)}</div>
          <span className="relative mt-4 block text-[9px] font-black tracking-[.2em] text-[#e6bd67]">
            NIVELAMENTO {stage} {passed ? "CONCLUÍDO" : "FINALIZADO"}
          </span>
          <h2 className="relative mt-2 font-serif text-4xl sm:text-5xl">
            {passed ? "Meta alcançada." : "Mais uma rodada."}
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-white/48">
            {passed
              ? `Você atingiu ${result.score}/${result.total} e concluiu este nivelamento.`
              : meta?.manual_leveling_level
                ? `Você fez ${result.score}/${result.total}. A meta é ${required}/${result.total}; volte aos nivelamentos e tente novamente este nível.`
                : `Você fez ${result.score}/${result.total}. A meta é ${required}/${result.total}; uma nova rodada pode ser feita pela revisão.`}
          </p>
        </div>

        <div className="border-t border-white/10 p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="QUESTÕES DA RODADA" value={String(result.total)} icon={Target} />
            <Metric label="ACERTOS" value={String(result.score)} icon={CheckCircle2} />
            <Metric label="APROVEITAMENTO" value={`${result.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} icon={Trophy} />
            <Metric label="TEMPO DA RODADA" value={formatStudyDuration(elapsed)} icon={Clock3} />
          </div>

          <div className="mt-4 rounded-[22px] border border-violet-300/15 bg-violet-300/[.045] p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-violet-200" />
              <span className="text-[9px] font-black tracking-[.16em] text-violet-200">
                TOTAL PARA CHEGAR ATÉ AQUI
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="QUESTÕES FEITAS" value={String(sessionQuestions)} />
              <MiniMetric label="ACERTOS ACUMULADOS" value={String(sessionCorrect)} />
              <MiniMetric label="TEMPO TOTAL" value={formatStudyDuration(sessionSeconds)} />
            </div>
          </div>

          {rank && meta?.xp ? (
            <div className="mt-4 flex flex-col gap-4 rounded-[22px] border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center">
              <XpRankInsignia rank={rank} level={meta.xp.level} size="md" />
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 text-[8px] font-black tracking-[.13em] text-[#e6bd67]">
                  <Zap size={12} /> EVOLUÇÃO ATUAL
                </span>
                <strong className="mt-1 block font-serif text-2xl">
                  {rank.title} · Nível {meta.xp.level}
                </strong>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <span
                    className="block h-full rounded-full bg-[linear-gradient(90deg,#b4832e,#e7bd64)]"
                    style={{ width: `${Math.min(100, meta.xp.progress_percent)}%` }}
                  />
                </div>
              </div>
              <strong className="text-sm text-[#e6bd67]">
                {meta.xp.total_xp.toLocaleString("pt-BR")} XP
              </strong>
            </div>
          ) : null}

          <div className="mt-6 flex justify-center">
            <Link
              href="/calendario"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-6 text-[10px] font-black tracking-[.11em] text-violet-100"
            >
              <CheckCircle2 size={16} /> VOLTAR AO CALENDÁRIO
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const answeredItems = payload.items.filter((item) => Boolean(item.selected_answer));
  const wrongItems = answeredItems.filter((item) => item.is_correct === false);
  const errors = Math.max(0, result.total - result.score);
  const averageSeconds = result.total > 0 ? Math.round(elapsed / result.total) : 0;
  const percentage = Math.max(0, Math.min(100, Number(result.percentage) || 0));
  const ringDegrees = percentage * 3.6;

  const completedAt = payload.attempt.completed_at
    ? new Date(payload.attempt.completed_at)
    : new Date();

  const completedLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(completedAt);

  const difficulties = [
    resultDifficulty(answeredItems.filter((item) => item.level === 1), "Questões fáceis", "Nível 1", "#22e6dc"),
    resultDifficulty(answeredItems.filter((item) => item.level === 2), "Questões médias", "Nível 2", "#f8c44e"),
    resultDifficulty(answeredItems.filter((item) => item.level === 3 || item.level === 4), "Questões difíceis", "Níveis 3–4", "#ff668b"),
  ];

  const performanceText =
    percentage >= 85
      ? "excelente desempenho."
      : percentage >= 70
        ? "bom desempenho."
        : percentage >= 55
          ? "desempenho em evolução."
          : "pontos importantes para revisar.";

  const performanceColor =
    percentage >= 70 ? "#22e6dc" : percentage >= 55 ? "#f8c44e" : "#ff668b";

  async function restartList() {
    if (busy) return;
    setBusy("restart");
    setActionError(null);

    try {
      const next = await restartQuestionAttempt(attemptId);

      if (!next.ok || !next.attempt_id) {
        throw new Error("Não foi possível preparar uma nova tentativa.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`mentoria-tita:intro:${next.attempt_id}`, "1");
      }

      router.push(`/questoes/lista/${next.attempt_id}`);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Não foi possível refazer a lista.",
      );
      setBusy(null);
    }
  }

  function continueToRevision() {
    if (busy) return;

    if (
      attemptKind === "lesson_list" &&
      payload.attempt.subject_slug &&
      payload.attempt.lesson_slug
    ) {
      setBusy("continue");
      setActionError(null);

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("mentoria-tita:list-return");
      }

      const params = new URLSearchParams({
        subject: payload.attempt.subject_slug,
        lesson: payload.attempt.lesson_slug,
        revision: "1",
        date: addDaysToDateKey(todayKey(), 2),
        source: "resultado-lista",
      });

      router.push(`/revisoes?${params.toString()}`);
      return;
    }

    router.push(
      meta?.practice_list_number || meta?.list_review_id
        ? "/questoes/listas"
        : returnHref ?? "/cronograma",
    );
  }

  return (
    <section
      data-mt-result-v47="6.3"
      className="relative overflow-hidden rounded-[30px] border border-violet-400/25 bg-[#050611] text-white shadow-[0_34px_110px_rgba(0,0,0,.48)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(111,46,255,.24),transparent_34%),radial-gradient(circle_at_8%_88%,rgba(28,224,217,.08),transparent_30%)]" />

      <header className="relative border-b border-violet-300/10 px-5 pb-5 pt-6 sm:px-7 sm:pt-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-violet-300">
              <Trophy size={15} /> SESSÃO FINALIZADA
            </span>
            <h1 className="mt-3 bg-[linear-gradient(90deg,#c86cff_0%,#eee8ff_58%,#ffffff_100%)] bg-clip-text font-serif text-4xl font-black tracking-[-.045em] text-transparent sm:text-6xl">
              RESULTADO DA LISTA
            </h1>
            <p className="mt-2 text-sm text-white/55 sm:text-base">
              Resumo completo do seu desempenho nesta sessão.
            </p>
          </div>

          <div className="text-left text-[10px] leading-5 text-white/45 lg:text-right">
            <strong className="block text-white/75">
              {payload.attempt.subject_name
                ? `Lista: ${payload.attempt.subject_name}`
                : "Lista de questões"}
            </strong>
            <span>{payload.attempt.lesson_title || "Treino direcionado"}</span>
            <span className="mt-1 flex items-center gap-1.5 lg:justify-end">
              <CalendarDays size={12} /> Concluída em {completedLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="relative p-4 sm:p-6">
        <div className="rounded-[24px] border border-cyan-300/15 bg-[radial-gradient(circle_at_22%_38%,rgba(25,224,218,.08),transparent_34%),rgba(255,255,255,.018)] p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[180px_250px_minmax(0,1fr)] lg:items-center">
            <div className="flex items-center justify-center lg:justify-start">
              <div className="grid h-[178px] w-[178px] place-items-center rounded-full border border-violet-400/25 p-[10px] shadow-[0_0_50px_rgba(29,229,220,.08)]">
                <div
                  className="grid h-full w-full place-items-center rounded-full p-[12px]"
                  style={{
                    background: `conic-gradient(#22e6dc 0deg ${ringDegrees}deg, rgba(117,76,237,.26) ${ringDegrees}deg 360deg)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full border border-white/10 bg-[#070915] text-center shadow-[inset_0_0_34px_rgba(31,230,222,.08)]">
                    <div>
                      <strong className="font-serif text-[3.35rem] leading-none tracking-[-.06em]">
                        {Math.round(percentage)}
                        <span className="text-[1.75rem]">%</span>
                      </strong>
                      <span className="mt-2 block text-[12px] leading-4 text-white/70">
                        de<br />aproveitamento
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:pr-2">
              <h2 className="max-w-[245px] text-[1.9rem] font-black leading-[1.08]">
                Você concluiu a lista com{" "}
                <span style={{ color: performanceColor }}>{performanceText}</span>
              </h2>

              <p className="mt-4 max-w-[245px] text-[13px] leading-6 text-white/56">
                Veja os erros, refaça a lista ou siga para o agendamento da próxima revisão.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 self-stretch">
              <ResultMetric label="Acertos" value={String(result.score)} detail={`de ${result.total} questões`} icon={CheckCircle2} accent="#22e6dc" />
              <ResultMetric label="Erros" value={String(errors)} detail={`de ${result.total} questões`} icon={CircleX} accent="#ff668b" />
              <ResultMetric label="Aproveitamento" value={`${Math.round(percentage)}%`} detail={`de ${result.total} questões`} icon={Trophy} accent="#9258ff" />
              <ResultMetric label="Tempo total" value={formatStudyDuration(elapsed)} detail="a partir da 1ª resposta" icon={Clock3} accent="#9258ff" />
              <ResultMetric label="Questões respondidas" value={String(answeredItems.length)} detail={`de ${result.total} questões`} icon={FileText} accent="#9258ff" />
              <ResultMetric label="Tempo médio por questão" value={formatAverageSeconds(averageSeconds)} detail="média desta sessão" icon={TimerReset} accent="#f8c44e" />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-violet-300/15 bg-white/[.018] px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-violet-300" />
            <span className="text-[9px] font-black tracking-[.18em] text-white/75">
              DESEMPENHO POR <span className="text-violet-300">NÍVEL DE QUESTÃO</span>
            </span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3 lg:divide-x lg:divide-white/10">
            {difficulties.map((item) => (
              <ResultDifficulty key={item.level} {...item} />
            ))}
          </div>
        </div>

        {actionError ? (
          <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/[.07] px-4 py-3 text-xs text-red-200">
            {actionError}
          </div>
        ) : null}

        {showErrors ? (
          <div className="mt-4 rounded-[24px] border border-rose-400/20 bg-rose-400/[.035] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[9px] font-black tracking-[.16em] text-rose-300">
                  SEUS ERROS
                </span>
                <strong className="mt-1 block font-serif text-2xl">
                  {wrongItems.length} questão(ões) para revisar
                </strong>
                <p className="mt-1 text-xs text-white/45">
                  Agora cada erro fica compacto. Clique em <strong>Abrir questão</strong> para visualizar a questão e as alternativas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowErrors(false);
                  setOpenedErrorId(null);
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black text-white/55"
              >
                FECHAR
              </button>
            </div>

            {wrongItems.length ? (
              <div className="mt-4 space-y-3">
                {wrongItems.map((item) => {
                  const isOpen = openedErrorId === item.question_id;
                  const alternatives = getChoiceEntries(item.choices);
                  return (
                    <article
                      key={item.question_id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                    >
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-[8px] font-black tracking-[.12em]">
                            <span className="text-rose-300">QUESTÃO {item.position}</span>
                            <span className="text-white/30">•</span>
                            <span className="text-white/45">NÍVEL {item.level}</span>
                            {item.banca ? (
                              <>
                                <span className="text-white/30">•</span>
                                <span className="text-white/45">{item.banca}</span>
                              </>
                            ) : null}
                            {item.ano ? (
                              <>
                                <span className="text-white/30">•</span>
                                <span className="text-white/45">{item.ano}</span>
                              </>
                            ) : null}
                          </div>
                          <p className="mt-2 line-clamp-2 pr-2 text-sm leading-6 text-white/78">
                            {item.statement}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setOpenedErrorId((current) => (current === item.question_id ? null : item.question_id))}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/[.06] px-4 py-3 text-[10px] font-black tracking-[.1em] text-violet-100 transition hover:border-violet-300/45 hover:bg-violet-300/[.10]"
                        >
                          {isOpen ? "FECHAR QUESTÃO" : "ABRIR QUESTÃO"}
                          <ChevronRight size={15} className={`transition ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="border-t border-white/10 bg-white/[.02] px-4 py-4 sm:px-5">
                          <p className="text-sm leading-7 text-white/85">{item.statement}</p>

                          {alternatives.length ? (
                            <div className="mt-4 space-y-2">
                              {alternatives.map(([key, value]) => {
                                const isCorrect = item.correct_answer === key;
                                const isSelected = item.selected_answer === key;
                                const wrongSelected = isSelected && !isCorrect;

                                return (
                                  <div
                                    key={key}
                                    className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                                      isCorrect
                                        ? "border-emerald-400/35 bg-emerald-400/[.10] text-emerald-100"
                                        : wrongSelected
                                          ? "border-rose-400/35 bg-rose-400/[.08] text-rose-100"
                                          : "border-white/10 bg-black/15 text-white/72"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="mt-[2px] inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-current px-1 text-[11px] font-black">
                                        {key}
                                      </span>
                                      <div className="flex-1">
                                        <p>{value}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black tracking-[.08em]">
                                          {wrongSelected ? (
                                            <span className="rounded-full border border-rose-300/30 bg-rose-300/[.10] px-2 py-1 text-rose-100">
                                              SUA RESPOSTA
                                            </span>
                                          ) : null}
                                          {isCorrect ? (
                                            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[.10] px-2 py-1 text-emerald-100">
                                              GABARITO
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[.06] p-4">
                              <span className="text-[9px] font-black tracking-[.14em] text-rose-300">SUA MARCAÇÃO</span>
                              <p className="mt-2 text-sm text-rose-100">
                                {item.selected_answer ? `Alternativa ${item.selected_answer}` : "Sem resposta"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[.06] p-4">
                              <span className="text-[9px] font-black tracking-[.14em] text-emerald-300">GABARITO</span>
                              <p className="mt-2 text-sm text-emerald-100">
                                {item.correct_answer ? `Alternativa ${item.correct_answer}` : "Não informado"}
                              </p>
                            </div>
                          </div>

                          {item.explanation ? (
                            <div className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-300/[.05] p-4">
                              <span className="text-[9px] font-black tracking-[.14em] text-violet-200">COMENTÁRIO / EXPLICAÇÃO</span>
                              <p className="mt-2 text-sm leading-6 text-white/72">{item.explanation}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-emerald-300">
                Nenhum erro nesta lista.
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-4 rounded-[24px] border border-violet-300/12 bg-[#070914]/90 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_1.18fr] lg:items-center">
            <div className="flex items-center gap-3 px-2">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-violet-400/30 bg-violet-400/10 text-violet-300">
                <Target size={20} />
              </span>
              <div>
                <span className="text-[9px] font-black tracking-[.15em] text-white/80">
                  PRÓXIMOS PASSOS
                </span>
                <p className="mt-1 text-[10px] text-white/42">
                  Escolha o que deseja fazer agora.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowErrors((value) => !value);
                if (showErrors) setOpenedErrorId(null);
              }}
              className="inline-flex min-h-14 items-center justify-between rounded-2xl border border-violet-300/25 bg-white/[.025] px-5 text-sm font-black transition hover:border-violet-300/50 hover:bg-violet-400/[.06]"
            >
              <span className="inline-flex items-center gap-3">
                <FileText size={18} /> Ver erros
              </span>
              <ChevronRight size={17} className={`transition ${showErrors ? "rotate-90" : ""}`} />
            </button>

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void restartList()}
              className="inline-flex min-h-14 items-center justify-between rounded-2xl border border-violet-300/25 bg-white/[.025] px-5 text-sm font-black transition hover:border-violet-300/50 hover:bg-violet-400/[.06] disabled:opacity-45"
            >
              <span className="inline-flex items-center gap-3">
                <RotateCcw size={18} />
                {busy === "restart" ? "Preparando..." : "Refazer lista"}
              </span>
              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={continueToRevision}
              className="inline-flex min-h-14 items-center justify-between rounded-2xl border border-violet-300/60 bg-[linear-gradient(90deg,#5d21ff,#8c31ff,#7146ff)] px-5 text-sm font-black text-white shadow-[0_0_30px_rgba(112,48,255,.42)] transition hover:brightness-110 disabled:opacity-55"
            >
              <span className="inline-flex items-center gap-3">
                <Play size={18} fill="currentColor" />
                {busy === "continue" ? "Abrindo..." : "Continuar"}
              </span>
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-white/8 pt-3 text-[10px] font-bold text-violet-300">
            <button
              type="button"
              onClick={continueToRevision}
              className="inline-flex items-center gap-2 hover:text-violet-200"
            >
              <CalendarDays size={14} /> Agendar revisão
            </button>

            <Link
              href={returnHref ?? "/cronograma"}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.sessionStorage.removeItem("mentoria-tita:list-return");
                }
              }}
              className="inline-flex items-center gap-2 hover:text-violet-200"
            >
              <ArrowLeft size={14} /> Voltar para a trilha
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function getChoiceEntries(
  choices: QuestionAttemptPayload["items"][number]["choices"],
) {
  if (!choices) return [] as Array<[string, string]>;

  return Object.entries(choices)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
}

function resultDifficulty(
  items: QuestionAttemptPayload["items"],
  title: string,
  level: string,
  accent: string,
) {
  const correct = items.filter((item) => item.is_correct === true).length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { title, level, accent, correct, total, percentage };
}

function ResultDifficulty({
  title,
  level,
  accent,
  correct,
  total,
  percentage,
}: ReturnType<typeof resultDifficulty>) {
  const filled = total === 0 ? 0 : Math.max(1, Math.ceil(percentage / 34));

  return (
    <div className="px-1 lg:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="h-3 w-3 rounded-full border"
                  style={{
                    borderColor: accent,
                    background: index < filled ? accent : "transparent",
                    boxShadow: index < filled ? `0 0 12px ${accent}66` : "none",
                  }}
                />
              ))}
            </span>

            <strong className="text-xs" style={{ color: accent }}>
              {title} · {level}
            </strong>
          </div>

          <p className="mt-2 text-sm text-white/78">
            {correct} de {total} acertos
          </p>
        </div>

        <strong className="text-sm">{total ? `${percentage}%` : "—"}</strong>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-300/15">
        <span
          className="block h-full rounded-full transition-all"
          style={{
            width: `${total ? percentage : 0}%`,
            background: accent,
            boxShadow: `0 0 18px ${accent}55`,
          }}
        />
      </div>
    </div>
  );
}

function ResultMetric({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Trophy;
  accent: string;
}) {
  return (
    <div
      className="grid min-h-[108px] grid-cols-[38px_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-[18px] border bg-white/[.018] p-3.5"
      style={{
        borderColor: `${accent}30`,
        boxShadow: `inset 0 0 24px ${accent}08`,
      }}
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-xl border"
        style={{
          color: accent,
          borderColor: `${accent}55`,
          background: `${accent}10`,
          boxShadow: `0 0 16px ${accent}20`,
        }}
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0">
        <span className="block text-[11px] leading-4 text-white/72">{label}</span>
        <strong className="mt-1 block whitespace-nowrap font-serif text-[1.55rem] leading-none tracking-[-.035em] text-white sm:text-[1.65rem]">
          {value}
        </strong>
        <span className="mt-1.5 block text-[9px] leading-4 text-white/40">{detail}</span>
      </div>
    </div>
  );
}

function formatAverageSeconds(seconds: number) {
  const safe = Math.max(0, Math.round(seconds || 0));

  if (safe < 60) return `${safe} s`;

  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;

  return secs ? `${minutes}min ${secs}s` : `${minutes}min`;
}

function CompletionCelebration({ title, subtitle }: { title: string; subtitle: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-black/72 p-4 backdrop-blur-md" onClick={() => setVisible(false)}>
      <div className="mt-leveling-celebration relative w-full max-w-[560px] overflow-hidden rounded-[34px] border border-violet-300/30 bg-[#0b0712] p-8 text-center shadow-[0_35px_120px_rgba(124,58,237,.42)] sm:p-10" onClick={(event) => event.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,.42),transparent_46%),radial-gradient(circle_at_12%_90%,rgba(236,72,153,.18),transparent_35%)]" />
        <Sparkles className="absolute left-8 top-8 animate-pulse text-violet-200" size={22} />
        <Sparkles className="absolute right-8 top-12 animate-pulse text-fuchsia-200" size={18} />
        <Trophy className="relative mx-auto text-[#f6d57a]" size={54} />
        <span className="relative mt-5 block text-[10px] font-black tracking-[.22em] text-violet-200">PARABÉNS</span>
        <h2 className="relative mt-2 font-serif text-4xl text-white sm:text-5xl">{title}</h2>
        <p className="relative mx-auto mt-3 max-w-md text-sm leading-7 text-white/60">{subtitle}</p>
        <button type="button" onClick={() => setVisible(false)} className="relative mt-6 min-h-11 rounded-xl border border-violet-300/25 bg-violet-400/10 px-5 text-[10px] font-black tracking-[.1em] text-violet-100">CONTINUAR</button>
      </div>
      <style jsx global>{`
        @keyframes mtLevelingCelebration {
          0% { opacity:0; transform:translateY(18px) scale(.88); }
          55% { opacity:1; transform:translateY(-4px) scale(1.025); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        .mt-leveling-celebration { animation:mtLevelingCelebration .62s cubic-bezier(.18,.89,.32,1.28); }
      `}</style>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Trophy }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="flex items-center gap-1.5 text-[8px] font-black tracking-[.12em] text-white/35"><Icon size={12} /> {label}</span><strong className="mt-1 block font-serif text-xl">{value}</strong></div>;
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div><span className="text-[8px] font-black tracking-[.12em] text-white/35">{label}</span><strong className="mt-1 block font-serif text-xl text-white">{value}</strong></div>;
}

