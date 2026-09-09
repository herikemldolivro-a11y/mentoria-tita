"use client";

import { ArrowRight, LoaderCircle, ListTodo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PendingSummary = {
  revision_id: string;
  pending_count: number;
  source_attempt_id: string | null;
  attempt_id: string | null;
};

type StartPendingResult = {
  ok: boolean;
  attempt_id?: string;
  continued?: boolean;
  no_pending?: boolean;
  pending_count?: number;
};

export function RevisionPendingQuestions({ revisionId }: { revisionId: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<PendingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_revision_pending_questions", {
      p_revision_id: revisionId,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSummary(data as PendingSummary);
    setErrorMessage(null);
    setLoading(false);
  }, [revisionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startPending() {
    if (starting) return;
    setStarting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("start_revision_pending_questions", {
        p_revision_id: revisionId,
      });
      if (error) throw error;

      const result = data as StartPendingResult;
      if (result.no_pending || !result.attempt_id) {
        await refresh();
        return;
      }

      window.sessionStorage.setItem("mentoria-tita:list-return", `/revisoes/${revisionId}`);
      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir as questões pendentes.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="mb-6 flex min-h-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)]">
        <LoaderCircle className="mr-2 animate-spin" size={16} /> Conferindo questões pendentes...
      </div>
    );
  }

  if (!summary || summary.pending_count <= 0) return null;

  return (
    <section className="mb-6 rounded-[24px] border border-amber-400/30 bg-amber-400/[.06] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-300">
            <ListTodo size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black tracking-[.16em] text-amber-300">QUESTÕES QUE FICARAM PENDENTES</span>
            <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">
              {summary.pending_count} questão{summary.pending_count === 1 ? "" : "ões"} para resolver na revisão
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-[var(--muted)]">
              Você finalizou a lista antes de responder tudo. Essas questões não contam como erro; ficaram guardadas para você resolver agora na revisão.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={starting}
          onClick={() => void startPending()}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-[10px] font-black tracking-[.1em] text-[#17120a] disabled:cursor-wait disabled:opacity-60"
        >
          {starting ? <LoaderCircle className="animate-spin" size={16} /> : null}
          {summary.attempt_id ? "CONTINUAR PENDENTES" : "RESOLVER PENDENTES"}
          <ArrowRight size={16} />
        </button>
      </div>

      {errorMessage ? <p className="mt-3 text-xs text-red-400">{errorMessage}</p> : null}
    </section>
  );
}
