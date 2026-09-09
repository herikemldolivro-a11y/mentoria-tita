"use client";

import { ListChecks, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { startLessonQuestionAttempt } from "@/lib/question-bank";

type Props = {
  subjectSlug: string;
  lessonSlug: string;
  questionCount?: number;
  className?: string;
  compact?: boolean;
};

export function PprnStartListButton({ subjectSlug, lessonSlug, questionCount = 35, className = "", compact = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startList() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      window.sessionStorage.setItem(
        "mentoria-tita:list-return",
        `/cronograma/semana-1/${subjectSlug}/${lessonSlug}?lista=concluida#revisao`,
      );
      const result = await startLessonQuestionAttempt(subjectSlug, lessonSlug) as {
        ok: boolean;
        attempt_id?: string;
        reason?: string;
        available_count?: number;
      };
      if (!result.ok || !result.attempt_id) {
        window.sessionStorage.removeItem("mentoria-tita:list-return");
        if (result.reason === "no_questions" || Number(result.available_count ?? 0) === 0) {
          setError("QUESTÕES AINDA NÃO CARREGADAS");
          return;
        }
        setError("NÃO FOI POSSÍVEL ABRIR A LISTA");
        return;
      }
      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (cause) {
      window.sessionStorage.removeItem("mentoria-tita:list-return");
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a lista.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "inline-flex flex-col items-start gap-1" : "flex flex-col items-start gap-1.5"}>
      <button
        type="button"
        disabled={loading}
        onClick={startList}
        className={`${compact ? "min-h-9 px-3 text-[9px]" : "min-h-11 px-4 text-[10px]"} inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[.08] font-black tracking-[.08em] text-emerald-300 transition hover:-translate-y-0.5 hover:bg-emerald-400/[.14] disabled:cursor-wait disabled:opacity-60 ${className}`}
      >
        {loading ? <LoaderCircle className="animate-spin" size={14} /> : <ListChecks size={14} />}
        {loading ? "ABRINDO LISTA..." : `INICIAR LISTA • ${questionCount}`}
      </button>
      {error ? <span className="max-w-[220px] text-[8px] font-black tracking-[.06em] text-red-300">{error}</span> : null}
    </div>
  );
}
