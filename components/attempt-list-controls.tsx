"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AttemptSnapshot = {
  attempt: {
    kind: "lesson_list" | "leveling" | "list_review";
    status: "in_progress" | "completed";
  };
  items: Array<{ selected_answer: string | null }>;
};

export function AttemptListControls({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<AttemptSnapshot["attempt"]["kind"] | null>(null);
  const [status, setStatus] = useState<AttemptSnapshot["attempt"]["status"] | null>(null);
  const [pending, setPending] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_question_attempt", { p_attempt_id: attemptId });
    if (error || !data) return;

    const snapshot = data as AttemptSnapshot;
    const pendingCount = snapshot.items.filter((item) => !item.selected_answer).length;
    setKind(snapshot.attempt.kind);
    setStatus(snapshot.attempt.status);
    setPending(pendingCount);

    if (snapshot.attempt.status === "completed" && typeof window !== "undefined") {
      const returnHref = window.sessionStorage.getItem("mentoria-tita:list-return");
      if (returnHref?.startsWith("/revisoes/")) {
        window.sessionStorage.removeItem("mentoria-tita:list-return");
        router.replace(returnHref);
      }
    }
  }, [attemptId, router]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 1200);
    return () => window.clearInterval(interval);
  }, [refresh]);

  async function finishEarly() {
    if (finishing) return;

    const supabase = createClient();
    const { data: latest, error: latestError } = await supabase.rpc("get_question_attempt", { p_attempt_id: attemptId });
    if (latestError || !latest) {
      setErrorMessage(latestError?.message ?? "Não foi possível conferir a lista.");
      return;
    }

    const snapshot = latest as AttemptSnapshot;
    const pendingCount = snapshot.items.filter((item) => !item.selected_answer).length;
    const message = pendingCount > 0
      ? `Finalizar a lista agora? As ${pendingCount} questão${pendingCount === 1 ? "" : "ões"} não respondida${pendingCount === 1 ? "" : "s"} ficarão pendentes e aparecerão na revisão desta aula.`
      : "Finalizar esta lista agora?";

    if (!window.confirm(message)) return;

    setFinishing(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.rpc("complete_lesson_list_early", { p_attempt_id: attemptId });
      if (error) throw error;

      const returnHref = window.sessionStorage.getItem("mentoria-tita:list-return");
      if (returnHref) {
        window.sessionStorage.removeItem("mentoria-tita:list-return");
        router.push(returnHref);
      } else {
        router.push("/cronograma");
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível finalizar a lista.");
      setFinishing(false);
    }
  }

  if (kind !== "lesson_list" || status !== "in_progress") return null;

  return (
    <div className="sticky top-[68px] z-40 mb-4 flex justify-end lg:top-3">
      <div className="flex max-w-full flex-col items-end gap-2">
        {errorMessage ? (
          <div className="max-w-sm rounded-xl border border-red-500/35 bg-[#180b0d]/95 px-4 py-2.5 text-[10px] text-red-300 shadow-xl backdrop-blur-xl">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="button"
          disabled={finishing}
          onClick={() => void finishEarly()}
          className="inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-xl border border-emerald-300/30 bg-[#102419]/95 px-4 text-left text-white shadow-[0_10px_34px_rgba(0,0,0,.32)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-300/55 disabled:cursor-wait disabled:opacity-60"
        >
          {finishing ? (
            <LoaderCircle className="shrink-0 animate-spin text-emerald-300" size={17} />
          ) : (
            <CheckCircle2 className="shrink-0 text-emerald-300" size={17} />
          )}

          <span className="min-w-0">
            <strong className="block text-[9px] font-black tracking-[.11em]">FINALIZAR LISTA</strong>
            <span className="mt-0.5 block truncate text-[8px] text-white/50">
              {pending > 0
                ? `${pending} pendente${pending === 1 ? "" : "s"} irá${pending === 1 ? "" : "ão"} para a revisão`
                : "Pode concluir agora"}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
