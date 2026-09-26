"use client";

import {
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionCard } from "@/components/question-card";
import {
  finalizeLevelingAttempt,
  loadQuestionAttempt,
  setQuestionMark,
  submitAttemptAnswer,
  type QuestionAttemptPayload,
} from "@/lib/question-bank";
import { notifyStudyUpdated } from "@/lib/study-database";
import { createClient } from "@/lib/supabase/client";

type LevelingAvailability = {
  level: number;
  level_1: number;
  level_2: number;
  level_3: number;
  level_4: number;
  current_available: number;
};

async function loadLevelingAvailability(
  attemptId: string,
): Promise<LevelingAvailability> {
  const supabase = createClient() as any;

  const { data, error } = await supabase.rpc(
    "get_leveling_question_availability",
    {
      p_attempt_id: attemptId,
    },
  );

  if (error) throw error;

  return data as LevelingAvailability;
}

export function LevelingQuestionBank({
  attemptId,
}: {
  attemptId: string;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<QuestionAttemptPayload | null>(null);
  const [availability, setAvailability] =
    useState<LevelingAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const finalizingRef = useRef(false);

  useEffect(() => {
    let alive = true;

    Promise.all([
      loadQuestionAttempt(attemptId),
      loadLevelingAvailability(attemptId),
    ])
      .then(([data, available]) => {
        if (!alive) return;

        if (data.attempt.kind !== "leveling") {
          throw new Error("Esta tentativa não é um nivelamento.");
        }

        setPayload(data);
        setAvailability(available);
        setCompleted(data.attempt.status === "completed");

        if (typeof window !== "undefined") {
          const savedNotice = window.sessionStorage.getItem(
            "mentoria-tita:leveling-bank-notice",
          );

          if (savedNotice) {
            setNotice(savedNotice);
            window.sessionStorage.removeItem(
              "mentoria-tita:leveling-bank-notice",
            );
          }
        }
      })
      .catch((error) => {
        if (alive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível abrir o nivelamento.",
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [attemptId]);

  const answered = useMemo(
    () =>
      payload?.items.filter((item) => Boolean(item.selected_answer)).length ?? 0,
    [payload],
  );

  const errors = useMemo(
    () =>
      payload?.items.filter(
        (item) => Boolean(item.selected_answer) && item.is_correct === false,
      ).length ?? 0,
    [payload],
  );

  const correct = useMemo(
    () =>
      payload?.items.filter(
        (item) => Boolean(item.selected_answer) && item.is_correct === true,
      ).length ?? 0,
    [payload],
  );

  const total = payload?.attempt.total ?? 10;
  const required = payload?.attempt.required_correct ?? 9;
  const remaining = Math.max(0, total - answered);
  const level = availability?.level ?? payload?.items[0]?.level ?? 1;
  const currentAvailable =
    availability?.current_available ??
    payload?.items.filter((item) => item.level === level).length ??
    0;

  async function finishAttempt() {
    if (!payload || finalizingRef.current || finishing) return;

    finalizingRef.current = true;
    setFinishing(true);
    setErrorMessage(null);

    try {
      const result = await finalizeLevelingAttempt(attemptId);

      if (result.passed) {
        setCompleted(true);
        notifyStudyUpdated();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o nivelamento.",
      );
    } finally {
      setFinishing(false);
      finalizingRef.current = false;
    }
  }

  useEffect(() => {
    if (
      payload &&
      payload.attempt.status === "in_progress" &&
      answered === total &&
      correct >= required &&
      errors <= 1 &&
      !completed
    ) {
      void finishAttempt();
    }
  }, [answered, completed, correct, errors, payload, required, total]);

  async function answer(questionId: string, answerValue: string) {
    const correction = await submitAttemptAnswer(
      attemptId,
      questionId,
      answerValue,
    );

    setPayload((existing) =>
      existing
        ? {
            ...existing,
            items: existing.items.map((item) =>
              item.question_id === questionId
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

    if (correction.leveling_reset && correction.next_attempt_id) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "mentoria-tita:leveling-bank-notice",
          `2º erro: nova rodada sorteada automaticamente entre ${currentAvailable} questões disponíveis do Nível ${level}. O contador voltou para 10.`,
        );
      }

      window.setTimeout(() => {
        router.replace(
          `/questoes/banco/nivelamento/${correction.next_attempt_id}`,
        );
      }, 350);

      return correction;
    }

    if (correction.block_complete && correction.block_passed) {
      window.setTimeout(() => void finishAttempt(), 350);
    }

    return correction;
  }

  async function toggleQuestionMark(
    questionId: string,
    mark: "starred" | "review",
    value: boolean,
  ) {
    const next = await setQuestionMark(questionId, mark, value);

    setPayload((existing) =>
      existing
        ? {
            ...existing,
            items: existing.items.map((item) =>
              item.question_id === questionId
                ? { ...item, ...next }
                : item,
            ),
          }
        : existing,
    );

    return next;
  }

  if (loading) {
    return (
      <div className="grid min-h-60 place-items-center rounded-[26px] border border-[var(--border)] bg-[var(--surface)]">
        <span className="inline-flex items-center gap-2 text-xs font-black tracking-[.1em] text-[var(--muted)]">
          <LoaderCircle className="animate-spin" size={17} />
          CARREGANDO BANCO DO NIVELAMENTO
        </span>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
        {errorMessage ?? "Nivelamento não encontrado."}
      </div>
    );
  }

  return (
    <div className="space-y-5" data-mt-leveling-bank="v6">
      <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] bg-[#0a0b0d] px-5 py-4 text-white">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.18em]">
            <SlidersHorizontal size={16} className="text-[#d2a64e]" />
            FILTROS DO BANCO
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <FilterInfo
            label="MATÉRIA"
            value={payload.attempt.subject_name ?? "—"}
          />
          <FilterInfo
            label="ASSUNTO"
            value={payload.attempt.lesson_title ?? "—"}
          />
          <FilterInfo label="NÍVEL" value={`Nível ${level}`} />
        </div>
      </section>

      {availability ? (
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div>
            <span className="text-[8px] font-black tracking-[.16em] text-[var(--gold-bright)]">
              QUESTÕES DISPONÍVEIS NESTA AULA
            </span>
            <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
              A rodada atual sorteia 10 questões entre {currentAvailable} disponíveis
              do Nível {level}.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((itemLevel) => {
              const count =
                itemLevel === 1
                  ? availability.level_1
                  : itemLevel === 2
                    ? availability.level_2
                    : itemLevel === 3
                      ? availability.level_3
                      : availability.level_4;

              const active = itemLevel === level;

              return (
                <div
                  key={itemLevel}
                  className={`rounded-2xl border px-4 py-4 text-center ${
                    active
                      ? "border-violet-400/40 bg-violet-400/[.09]"
                      : "border-[var(--border)] bg-[var(--background)]"
                  }`}
                >
                  <span className="block text-[8px] font-black tracking-[.13em] text-[var(--muted)]">
                    NÍVEL {itemLevel}
                  </span>
                  <strong className="mt-1 block font-serif text-3xl text-[var(--ink)]">
                    {count}
                  </strong>
                  <span className="mt-1 block text-[8px] font-bold text-[var(--muted)]">
                    disponíveis
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[24px] border border-violet-400/25 bg-violet-400/[.055]">
        <div className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:p-6">
          <div>
            <span className="text-[8px] font-black tracking-[.16em] text-violet-300">
              NIVELAMENTO {level}
            </span>
            <strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">
              {payload.attempt.subject_name} · {payload.attempt.lesson_title}
            </strong>
            <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
              Meta {required}/{total}. No 2º erro, a rodada é encerrada e
              outras 10 questões são sorteadas automaticamente no mesmo assunto
              e nível. Quando houver banco suficiente, o sistema prioriza
              questões diferentes da rodada anterior.
            </p>
          </div>

          <Metric label="RESTANTES" value={String(remaining)} />
          <Metric label="ACERTOS" value={String(correct)} />
          <Metric label="ERROS" value={`${errors}/1`} warning={errors >= 1} />
        </div>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs font-bold text-amber-300">
          <RotateCcw className="mr-2 inline" size={15} />
          {notice}
        </div>
      ) : null}

      {completed ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <CheckCircle2 className="text-emerald-400" size={22} />
          <strong className="mt-2 block font-serif text-2xl text-[var(--ink)]">
            Nivelamento concluído.
          </strong>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Meta atingida: {required}/{total}.
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        {payload.items.map((question, index) => (
          <QuestionCard
            key={question.question_id}
            question={{
              ...question,
              subject_name: payload.attempt.subject_name,
              lesson_title: payload.attempt.lesson_title,
            }}
            number={index + 1}
            onAnswer={(answerValue) =>
              answer(question.question_id, answerValue)
            }
            onToggleMark={(mark, value) =>
              toggleQuestionMark(question.question_id, mark, value)
            }
            hidePreviousResolution
          />
        ))}
      </div>

      {!completed && finishing ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-black tracking-[.1em] text-emerald-400">
          <LoaderCircle className="animate-spin" size={16} />
          CONCLUINDO NIVELAMENTO
        </div>
      ) : null}
    </div>
  );
}

function FilterInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
      <span className="block text-[8px] font-black tracking-[.13em] text-[var(--muted)]">
        {label}
      </span>
      <strong className="mt-1 block text-sm text-[var(--ink)]">
        {value}
      </strong>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="min-w-[105px] rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-center">
      <span className="block text-[8px] font-black tracking-[.12em] text-[var(--muted)]">
        {label}
      </span>
      <strong
        className="mt-1 block font-serif text-3xl"
        style={{ color: warning ? "#f1c86a" : "var(--ink)" }}
      >
        {value}
      </strong>
    </div>
  );
}