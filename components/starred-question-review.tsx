"use client";

import { ArrowLeft, ArrowRight, EyeOff, LoaderCircle, RotateCcw, Shuffle, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { QuestionCard } from "@/components/question-card";
import {
  loadStarredQuestionQueue,
  loadStarredQuestionSummary,
  setQuestionStarPriority,
  submitStarredQuestionAnswer,
  unhideAllStarredQuestions,
  unhideStarredQuestion,
  type StarPriority,
  type StarredAnswerResult,
  type StarredQuestion,
  type StarredSummary,
} from "@/lib/starred-questions";

type Mode =
  | { type: "menu" }
  | { type: "queue"; priority: StarPriority | null; random: boolean }
  | { type: "hidden" };

const emptySummary: StarredSummary = { visible: 0, one: 0, two: 0, three: 0, with_error: 0, hidden: 0 };

export function StarredQuestionReview() {
  const [summary, setSummary] = useState<StarredSummary>(emptySummary);
  const [mode, setMode] = useState<Mode>({ type: "menu" });
  const [items, setItems] = useState<StarredQuestion[]>([]);
  const [position, setPosition] = useState(0);
  const [lastResult, setLastResult] = useState<StarredAnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    const next = await loadStarredQuestionSummary();
    setSummary(next);
  }, []);

  useEffect(() => {
    refreshSummary()
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar suas questões estreladas."))
      .finally(() => setLoading(false));
  }, [refreshSummary]);

  async function openQueue(priority: StarPriority | null, random = false) {
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const queue = await loadStarredQuestionQueue({ priority, random, includeHidden: false, limit: 1000 });
      setItems(queue.items);
      setPosition(0);
      setMode({ type: "queue", priority, random });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir as questões estreladas.");
    } finally {
      setLoading(false);
    }
  }

  async function openHidden() {
    setLoading(true);
    setError(null);
    try {
      const queue = await loadStarredQuestionQueue({ includeHidden: true, limit: 1000 });
      setItems(queue.items);
      setPosition(0);
      setMode({ type: "hidden" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir as questões ocultas.");
    } finally {
      setLoading(false);
    }
  }

  async function answer(questionId: string, answerValue: string) {
    const result = await submitStarredQuestionAnswer(questionId, answerValue);
    setLastResult(result);
    await refreshSummary().catch(() => undefined);
    return result;
  }

  async function changePriority(questionId: string, priority: StarPriority | null) {
    const next = await setQuestionStarPriority(questionId, priority);
    if (priority === null) {
      setItems((current) => current.filter((item) => item.id !== questionId));
      setPosition((current) => Math.max(0, Math.min(current, items.length - 2)));
    } else {
      setItems((current) => current.map((item) => item.id === questionId ? { ...item, star_priority: priority } : item));
    }
    await refreshSummary().catch(() => undefined);
    return next;
  }

  async function unhideOne(questionId: string) {
    await unhideStarredQuestion(questionId);
    setItems((current) => current.filter((item) => item.id !== questionId));
    await refreshSummary();
  }

  async function unhideAll() {
    await unhideAllStarredQuestions();
    setItems([]);
    await refreshSummary();
  }

  function backToMenu() {
    setMode({ type: "menu" });
    setItems([]);
    setPosition(0);
    setLastResult(null);
    setError(null);
  }

  if (loading && mode.type === "menu") {
    return <div className="flex min-h-72 items-center justify-center gap-3 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle size={19} className="animate-spin text-amber-300" /> CARREGANDO ESTRELAS</div>;
  }

  if (mode.type === "menu") {
    return (
      <div className="space-y-5">
        {error ? <ErrorBox message={error} /> : null}

        <section className="overflow-hidden rounded-[28px] border border-amber-300/20 bg-[radial-gradient(circle_at_85%_10%,rgba(245,190,64,.12),transparent_32%),linear-gradient(145deg,#17130b,#09090c_70%)] p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-amber-300"><Star size={15} fill="currentColor" /> SEU BANCO PESSOAL</span>
          <h2 className="mt-3 font-serif text-3xl tracking-[-.035em] text-white sm:text-5xl">Questões Estreladas.</h2>
          <p className="mt-3 max-w-3xl text-xs leading-6 text-white/43">
            Você escolhe a prioridade. Dentro de cada nível, questões que você errou vêm primeiro; depois, das mais antigas para as mais recentes.
            Três acertos consecutivos escondem automaticamente a questão sem apagá-la do banco.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-6">
            <Metric label="VISÍVEIS" value={summary.visible} />
            <Metric label="★" value={summary.one} />
            <Metric label="★★" value={summary.two} />
            <Metric label="★★★" value={summary.three} />
            <Metric label="ERRO PRIORITÁRIO" value={summary.with_error} />
            <Metric label="OCULTAS" value={summary.hidden} />
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <ModeCard
            title="Aleatório"
            description="Mistura todas as prioridades visíveis. Questões já erradas continuam entrando primeiro."
            icon={<Shuffle size={22} />}
            accent="violet"
            count={summary.visible}
            onClick={() => void openQueue(null, true)}
          />
          <ModeCard
            title="★★★ · Prioridade máxima"
            description="Somente questões que você marcou com três estrelas."
            icon={<Star size={22} fill="currentColor" />}
            accent="amber"
            count={summary.three}
            onClick={() => void openQueue(3)}
          />
          <ModeCard
            title="★★ · Prioridade média"
            description="Somente questões marcadas com duas estrelas."
            icon={<Star size={22} fill="currentColor" />}
            accent="amber"
            count={summary.two}
            onClick={() => void openQueue(2)}
          />
          <ModeCard
            title="★ · Prioridade normal"
            description="Somente questões marcadas com uma estrela."
            icon={<Star size={22} fill="currentColor" />}
            accent="amber"
            count={summary.one}
            onClick={() => void openQueue(1)}
          />
        </div>

        <button
          type="button"
          onClick={() => void openHidden()}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-white/[.025] p-5 text-left transition hover:border-white/[.16]"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[.1] bg-black/20 text-white/55"><EyeOff size={18} /></span>
            <span>
              <strong className="block text-sm text-[var(--ink)]">Estreladas ocultas</strong>
              <span className="mt-1 block text-[10px] text-[var(--muted)]">Questões que chegaram a 3 acertos consecutivos. Você pode desocultar quando quiser.</span>
            </span>
          </span>
          <span className="font-serif text-2xl text-white/75">{summary.hidden}</span>
        </button>
      </div>
    );
  }

  if (mode.type === "hidden") {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={backToMenu} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black text-[var(--muted)]"><ArrowLeft size={14} /> VOLTAR</button>
          {items.length ? (
            <button type="button" onClick={() => void unhideAll()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-4 text-[9px] font-black text-amber-300">
              <RotateCcw size={14} /> DESOCULTAR TODAS
            </button>
          ) : null}
        </div>

        <section className="rounded-[24px] border border-white/[.08] bg-[var(--surface)] p-5">
          <span className="text-[8px] font-black tracking-[.15em] text-white/35">ARQUIVO DE DOMÍNIO</span>
          <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Estreladas ocultas · {items.length}</h2>
        </section>

        {!items.length ? <Empty title="Nenhuma questão oculta." /> : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/[.08] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className="text-[8px] font-black tracking-[.12em] text-amber-300">{"★".repeat(item.star_priority)} · {item.subject_name}</span>
                    <strong className="mt-1 block text-sm text-[var(--ink)]">{item.lesson_title}</strong>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-[var(--muted)]">{item.statement}</p>
                  </div>
                  <button type="button" onClick={() => void unhideOne(item.id)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/20 px-4 text-[8px] font-black text-amber-300">
                    <RotateCcw size={13} /> DESOCULTAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const current = items[position] ?? null;
  if (!current) {
    return (
      <div className="space-y-5">
        <button type="button" onClick={backToMenu} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black text-[var(--muted)]"><ArrowLeft size={14} /> VOLTAR</button>
        <Empty title="Nenhuma questão disponível neste filtro." />
      </div>
    );
  }

  const queueLabel = mode.random ? "ALEATÓRIO" : `${"★".repeat(mode.priority ?? 1)} · PRIORIDADE ${mode.priority ?? 1}`;

  return (
    <div className="space-y-5">
      <section className="sticky top-2 z-30 flex flex-col gap-3 rounded-2xl border border-white/[.09] bg-[#090a0d]/95 p-4 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button type="button" onClick={backToMenu} className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.1em] text-white/42"><ArrowLeft size={12} /> TROCAR FILTRO</button>
          <span className="mt-1 block text-[9px] font-black tracking-[.13em] text-amber-300">{queueLabel}</span>
        </div>
        <div className="text-right">
          <strong className="block font-serif text-xl text-white">{position + 1}/{items.length}</strong>
          <span className="text-[8px] text-white/34">erros anteriores têm prioridade</span>
        </div>
      </section>

      {error ? <ErrorBox message={error} /> : null}

      {current.star_has_error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/[.055] px-4 py-3 text-[9px] font-black tracking-[.08em] text-red-300">
          PRIORIDADE DE ERRO · você já errou esta questão nas estreladas.
        </div>
      ) : null}

      <QuestionCard
        key={`${current.id}-${position}`}
        question={{
          ...current,
          starred: true,
          saved_for_review: false,
          star_priority: current.star_priority,
        }}
        number={position + 1}
        onAnswer={(answerValue) => answer(current.id, answerValue)}
        onSetStarPriority={(priority) => changePriority(current.id, priority)}
        hidePreviousResolution
      />

      {lastResult ? (
        <div className={`rounded-2xl border p-4 ${lastResult.star_hidden ? "border-violet-300/25 bg-violet-300/[.07]" : lastResult.is_correct ? "border-emerald-300/20 bg-emerald-300/[.055]" : "border-red-300/20 bg-red-300/[.055]"}`}>
          {lastResult.star_hidden ? (
            <>
              <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-violet-300"><Trophy size={15} /> DOMINADA · 3 ACERTOS SEGUIDOS</span>
              <p className="mt-1 text-[10px] text-white/45">Ela foi movida para Estreladas ocultas. Não foi apagada.</p>
            </>
          ) : lastResult.is_correct ? (
            <p className="text-[10px] font-bold text-emerald-300">Sequência atual: {lastResult.star_correct_streak}/3 acertos consecutivos.</p>
          ) : (
            <p className="text-[10px] font-bold text-red-300">Sequência zerada. Esta questão terá prioridade quando você voltar às estreladas.</p>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={position === 0} onClick={() => { setPosition((value) => Math.max(0, value - 1)); setLastResult(null); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black text-[var(--muted)] disabled:opacity-30"><ArrowLeft size={14} /> ANTERIOR</button>
        <button type="button" disabled={!lastResult && position < items.length} onClick={() => { if (position < items.length - 1) { setPosition((value) => value + 1); setLastResult(null); } else { backToMenu(); } }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[.07] px-5 text-[9px] font-black text-amber-300 disabled:opacity-35">
          {position < items.length - 1 ? <>PRÓXIMA ESTRELADA <ArrowRight size={14} /></> : <>FINALIZAR SESSÃO <CheckCircleIcon /></>}
        </button>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return <Trophy size={14} />;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/[.075] bg-black/15 p-3 text-center"><span className="block text-[6px] font-black tracking-[.11em] text-white/28">{label}</span><strong className="mt-1 block font-serif text-xl text-white">{value}</strong></div>;
}

function ModeCard({ title, description, icon, count, accent, onClick }: { title: string; description: string; icon: ReactNode; count: number; accent: "amber" | "violet"; onClick: () => void }) {
  return (
    <button type="button" disabled={count === 0} onClick={onClick} className={`group min-h-[160px] rounded-[22px] border p-5 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 ${accent === "amber" ? "border-amber-300/15 bg-amber-300/[.035] hover:border-amber-300/35" : "border-violet-300/15 bg-violet-300/[.035] hover:border-violet-300/35"}`}>
      <span className={accent === "amber" ? "text-amber-300" : "text-violet-300"}>{icon}</span>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div><strong className="block font-serif text-xl text-[var(--ink)]">{title}</strong><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{description}</p></div>
        <span className="font-serif text-2xl text-white/65">{count}</span>
      </div>
    </button>
  );
}

function Empty({ title }: { title: string }) {
  return <section className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-16 text-center"><Star className="mx-auto text-amber-300/45" size={28} /><strong className="mt-4 block font-serif text-2xl text-[var(--ink)]">{title}</strong></section>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-2xl border border-red-400/25 bg-red-400/[.06] p-4 text-xs text-red-300">{message}</div>;
}
