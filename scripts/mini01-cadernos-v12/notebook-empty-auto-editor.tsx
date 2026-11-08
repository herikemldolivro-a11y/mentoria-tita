"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { NotebookManagerModal } from "@/components/lesson-notebook-dock";
import { loadNotebookById, listenNotebookUpdated, type LessonNotebookDetail } from "@/lib/notebook-system";

export function NotebookEmptyAutoEditor({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const [notebook, setNotebook] = useState<LessonNotebookDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const detail = await loadNotebookById(notebookId);
        if (!alive) return;
        setNotebook(detail);
        if (detail && detail.card_count === 0) setOpen(true);
        setError("");
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Erro ao carregar o caderno.");
      }
    }
    void load();
    return () => { alive = false; };
  }, [notebookId]);

  useEffect(() => {
    if (!notebook) return;
    const unlisten = listenNotebookUpdated(() => {
      void loadNotebookById(notebookId).then(setNotebook).catch(() => {});
    });
    return unlisten;
  }, [notebookId,notebook]);

  if (!notebook) return error ? <p role="alert" className="mx-auto max-w-xl p-3 text-sm text-red-400">{error}</p> : null;

  return <>
    {notebook.card_count === 0 ? <div className="mx-auto mt-3 max-w-3xl rounded-xl border border-cyan-300/40 bg-cyan-400/10 p-4 text-center">
      <p className="text-xs font-bold text-cyan-300">CADERNO OBRIGATÓRIO · CRIAR FLASHCARDS</p>
      <p className="mt-1 text-sm text-white/70">Este caderno aparece um dia antes da revisão. Adicione as perguntas e respostas para prepará-lo.</p>
      <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-4 font-black text-[#05212b]" onClick={() => setOpen(true)}>
        <NotebookPen size={17}/> Criar flashcards
      </button>
      <button type="button" className="ml-3 mt-3 inline-flex min-h-11 items-center rounded-lg border border-cyan-300/40 px-4 text-sm font-bold text-cyan-200" onClick={() => router.replace("/calendario")}>Voltar ao calendário</button>
    </div> : null}
    <NotebookManagerModal
      open={open}
      onClose={() => { setOpen(false); router.replace("/calendario"); }}
      lessonId={notebook.lesson_id}
      lessonTitle={notebook.lesson_title}
      subjectName={notebook.subject_name}
      contextLabel="CADERNO ANTES DA REVISÃO"
    />
  </>;
}
