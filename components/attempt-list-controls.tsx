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
        router.push("/revisoes");
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível finalizar a lista.");
      setFinishing(false);
    }
  }

  if (kind !== "lesson_list" || status !== "in_progress") return null;

  return (
    <>
      {errorMessage ? (
        <div className="fixed bottom-24 right-4 z-[70] max-w-sm rounded-xl border border-red-500/35 bg-[#180b0d] px-4 py-3 text-xs text-red-300 shadow-2xl">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="button"
        disabled={finishing}
        onClick={() => void finishEarly()}
        className="fixed bottom-5 right-4 z-[70] inline-flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-300/35 bg-[#102419] px-5 text-left text-white shadow-[0_18px_55px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-emerald-300/60 disabled:cursor-wait disabled:opacity-60 sm:right-6"
      >
        {finishing ? <LoaderCircle className="animate-spin text-emerald-300" size={19} /> : <CheckCircle2 className="text-emerald-300" size={19} />}
        <span>
          <strong className="block text-[10px] font-black tracking-[.12em]">FINALIZAR LISTA</strong>
          <span className="mt-0.5 block text-[9px] text-white/55">
            {pending > 0 ? `${pending} pendente${pending === 1 ? "" : "s"} irá${pending === 1 ? "" : "ão"} para a revisão` : "Pode concluir agora"}
          </span>
        </span>
      </button>
    </>
  );
}
