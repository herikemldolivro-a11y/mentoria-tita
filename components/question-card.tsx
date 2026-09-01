"use client";

import { Bookmark, CheckCircle2, LoaderCircle, MessageSquareText, Star, XCircle } from "lucide-react";
import { useState } from "react";
import type { QuestionChoiceMap, QuestionResult, QuestionType } from "@/lib/question-bank";

type QuestionCardData = {
  statement: string;
  question_type: QuestionType;
  choices: QuestionChoiceMap | null;
  level: number;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  subject_name?: string | null;
  lesson_title?: string | null;
  selected_answer?: string | null;
  is_correct?: boolean | null;
  correct_answer?: string | null;
  explanation?: string | null;
  starred?: boolean;
  saved_for_review?: boolean;
};

export function QuestionCard({
  question,
  number,
  onAnswer,
  onToggleMark,
  compact = false,
}: {
  question: QuestionCardData;
  number: number;
  onAnswer: (answer: string) => Promise<QuestionResult>;
  onToggleMark?: (mark: "starred" | "review", value: boolean) => Promise<{ starred: boolean; saved_for_review: boolean }>;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(question.selected_answer ?? "");
  const [result, setResult] = useState<QuestionResult | null>(
    question.selected_answer && question.is_correct !== null && question.is_correct !== undefined
      ? {
          is_correct: question.is_correct,
          correct_answer: question.correct_answer ?? "",
          explanation: question.explanation ?? null,
        }
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState<"starred" | "review" | null>(null);
  const [starred, setStarred] = useState(Boolean(question.starred));
  const [savedForReview, setSavedForReview] = useState(Boolean(question.saved_for_review));
  const [showExplanation, setShowExplanation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const options = question.question_type === "true_false"
    ? [["TRUE", "Certo"], ["FALSE", "Errado"]]
    : Object.entries(question.choices ?? {}).sort(([a], [b]) => a.localeCompare(b));

  async function answer() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      setResult(await onAnswer(selected));
      setShowExplanation(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível corrigir a resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleMark(mark: "starred" | "review") {
    if (!onToggleMark || marking) return;
    const nextValue = mark === "starred" ? !starred : !savedForReview;
    setMarking(mark);
    setErrorMessage(null);
    try {
      const next = await onToggleMark(mark, nextValue);
      setStarred(next.starred);
      setSavedForReview(next.saved_for_review);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a marcação.");
    } finally {
      setMarking(null);
    }
  }

  return (
    <article className={`border border-[var(--border)] bg-[var(--surface)] ${compact ? "rounded-[24px] p-5 sm:p-7" : "rounded-[26px] p-5 sm:p-7"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[.11em] text-[var(--muted)]">
          <span className="rounded-full border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] px-3 py-1.5 text-[var(--gold-bright)]">QUESTÃO {String(number).padStart(2, "0")}</span>
          {question.banca ? <span>{question.banca}</span> : null}
          {question.ano ? <span>· {question.ano}</span> : null}
          {question.exam_name ? <span>· {question.exam_name}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onToggleMark ? <button type="button" onClick={() => toggleMark("review")} disabled={Boolean(marking)} title={savedForReview ? "Remover da revisão" : "Salvar para revisão"} className="inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-[9px] font-black tracking-[.08em] transition" style={{ borderColor: savedForReview ? "rgba(210,166,78,.5)" : "var(--border)", color: savedForReview ? "var(--gold-bright)" : "var(--muted)", background: savedForReview ? "rgba(210,166,78,.08)" : "transparent" }}><Bookmark size={14} fill={savedForReview ? "currentColor" : "none"} /> {marking === "review" ? "SALVANDO" : savedForReview ? "NA REVISÃO" : "SALVAR NA REVISÃO"}</button> : null}
          {onToggleMark ? <button type="button" onClick={() => toggleMark("starred")} disabled={Boolean(marking)} title={starred ? "Remover destaque" : "Destacar questão"} aria-label={starred ? "Remover destaque" : "Destacar questão"} className="grid h-9 w-9 place-items-center rounded-xl border transition" style={{ borderColor: starred ? "rgba(210,166,78,.5)" : "var(--border)", color: starred ? "var(--gold-bright)" : "var(--muted)", background: starred ? "rgba(210,166,78,.08)" : "transparent" }}><Star size={16} fill={starred ? "currentColor" : "none"} /></button> : null}
          <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)]">NÍVEL {question.level}</span>
        </div>
      </div>

      {question.subject_name || question.lesson_title ? (
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-[var(--muted)]">
          {question.subject_name ? <span>{question.subject_name}</span> : null}
          {question.lesson_title ? <span>→ {question.lesson_title}</span> : null}
        </div>
      ) : null}

      <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)] sm:text-base">{question.statement}</p>

      <fieldset className="mt-6 space-y-2" disabled={submitting}>
        <legend className="sr-only">Selecione uma resposta</legend>
        {options.map(([value, label]) => {
          const checked = selected === value;
          const isCorrectOption = Boolean(result?.correct_answer) && result?.correct_answer === value;
          const isWrongOption = Boolean(result && !result.is_correct && checked);
          return (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition"
              style={{
                borderColor: isCorrectOption ? "rgba(49,199,101,.45)" : isWrongOption ? "rgba(224,74,74,.45)" : checked ? "rgba(210,166,78,.48)" : "var(--border)",
                background: isCorrectOption ? "rgba(49,199,101,.07)" : isWrongOption ? "rgba(224,74,74,.07)" : checked ? "rgba(210,166,78,.06)" : "var(--background)",
              }}
            >
              <input className="mt-1 accent-[var(--gold)]" type="radio" name={`question-${number}`} value={value} checked={checked} onChange={() => { setSelected(value); setResult(null); setShowExplanation(false); }} />
              <span className="text-sm leading-6 text-[var(--ink)]"><strong className="mr-2 text-[var(--gold-bright)]">{question.question_type === "true_false" ? "" : `${value}.`}</strong>{label}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={answer} disabled={!selected || submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.12em] text-[#111] transition hover:bg-[var(--gold-bright)] disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <LoaderCircle className="animate-spin" size={15} /> : null} RESPONDER
        </button>
        {result ? (
          <span className={`inline-flex items-center gap-2 text-[10px] font-black tracking-[.12em] ${result.is_correct ? "text-emerald-400" : "text-red-400"}`}>
            {result.is_correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{result.is_correct ? "ACERTOU" : "ERROU"}
          </span>
        ) : null}
      </div>

      {errorMessage ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">{errorMessage}</p> : null}

      {result ? (
        <div className="mt-5 rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_5%,var(--background))] p-4 sm:p-5">
          <span className="text-[9px] font-black tracking-[.14em] text-[var(--gold-bright)]">GABARITO · {formatAnswer(result.correct_answer, question.question_type)}</span>
          <button type="button" onClick={() => setShowExplanation((value) => !value)} className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[9px] font-black tracking-[.1em] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"><MessageSquareText size={14} /> {showExplanation ? "FECHAR COMENTÁRIO" : "ABRIR COMENTÁRIO"}</button>
          {showExplanation ? <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-6 text-[var(--muted)]">{result.explanation || "Questão corrigida. Comentário ainda não cadastrado pelo professor."}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function formatAnswer(answer: string, type: QuestionType) {
  if (type === "true_false") return answer === "TRUE" ? "CERTO" : "ERRADO";
  return answer || "—";
}
