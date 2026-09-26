"use client";

import { ArrowRight, NotebookPen, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NotebookManagerModal } from "@/components/lesson-notebook-dock";
import { formatNotebookDate, isNotebookDue, listenNotebookUpdated, loadNotebookByLesson, type LessonNotebookDetail } from "@/lib/notebook-system";

export function RevisionNotebookTool({ lessonId, lessonTitle, subjectName }: { lessonId: string; lessonTitle: string; subjectName?: string | null }) {
  const [notebook, setNotebook] = useState<LessonNotebookDetail | null>(null);
  const [open, setOpen] = useState(false);

  async function refresh() {
    const data = await loadNotebookByLesson(lessonId).catch(() => null);
    setNotebook(data);
  }

  useEffect(() => {
    void refresh();
    const unlisten = listenNotebookUpdated(() => void refresh());
    return unlisten;
  }, [lessonId]);

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-2xl border border-amber-300/22 bg-[radial-gradient(circle_at_90%_0%,rgba(245,190,64,.12),transparent_42%),var(--background)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.16em] text-[var(--gold-bright)]"><NotebookPen size={14}/> CADERNO DE ANOTAÇÕES DA AULA</span><strong className="mt-2 block font-serif text-xl text-[var(--ink)]">{notebook?.card_count ?? 0} flashcard{(notebook?.card_count ?? 0) === 1 ? "" : "s"} para revisar</strong><span className="mt-1 block text-[9px] text-[var(--muted)]">{notebook?.status === "active" ? (isNotebookDue(notebook) ? "Revisão do caderno disponível hoje." : `Próxima revisão programada: ${formatNotebookDate(notebook.next_review_on)}.`) : "Você pode criar ou continuar as anotações desta aula."}</span></div>
          <div className="flex flex-wrap gap-2">
            {notebook?.card_count ? <Link href={`/caderno/${notebook.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[.06] px-4 text-[8px] font-black tracking-[.1em] text-violet-400">REVISAR AGORA <ArrowRight size={13}/></Link> : null}
            <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300/22 bg-amber-300/[.05] px-4 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]"><Plus size={13}/> {notebook ? "EDITAR / ADICIONAR" : "CRIAR CADERNO"}</button>
          </div>
        </div>
      </div>
      <NotebookManagerModal open={open} onClose={() => setOpen(false)} lessonId={lessonId} lessonTitle={lessonTitle} subjectName={subjectName ?? null} contextLabel="REVISÃO DA AULA"/>
    </>
  );
}
