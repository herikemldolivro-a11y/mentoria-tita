"use client";

import { ArrowRight, BookmarkCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEnemSnapshotCount } from "@/lib/enem-question-snapshots";
import { loadRevisionEvent } from "@/lib/study-database";
import { createClient } from "@/lib/supabase/client";

export function RevisionEnemSavedQuestions({ revisionId }: { revisionId: string }) {
  const [state, setState] = useState<{
    count: number;
    subjectSlug: string;
    lessonSlug: string;
    lessonTitle: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const revision = await loadRevisionEvent(revisionId);
        if (!revision) return;
        if (getEnemSnapshotCount(revision.subjectSlug, revision.lessonTitle) <= 0) return;

        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { count, error } = await supabase
          .from("user_enem_saved_questions")
          .select("question_id", { count: "exact", head: true })
          .eq("user_id", auth.user.id)
          .eq("subject_slug", revision.subjectSlug)
          .eq("lesson_slug", revision.lessonSlug);
        if (error) throw error;
        if (alive) {
          setState({
            count: count ?? 0,
            subjectSlug: revision.subjectSlug,
            lessonSlug: revision.lessonSlug,
            lessonTitle: revision.lessonTitle,
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [revisionId]);

  if (loading) {
    return <div className="mb-6 flex min-h-16 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-400/[.025]"><LoaderCircle size={15} className="animate-spin text-violet-300" /></div>;
  }

  if (!state) return null;

  const href = `/questoes/enem?subject=${encodeURIComponent(state.subjectSlug)}&lesson=${encodeURIComponent(state.lessonSlug)}&title=${encodeURIComponent(state.lessonTitle)}&saved=1`;

  return (
    <section className="mb-6 rounded-[24px] border border-violet-400/25 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.13),transparent_38%),rgba(139,92,246,.035)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-300/20 bg-violet-300/[.08] text-violet-200"><BookmarkCheck size={19} /></span>
          <div>
            <span className="text-[8px] font-black tracking-[.14em] text-violet-300">OBRIGATÓRIO NA REVISÃO · QUESTÕES SALVAS</span>
            <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Reveja o que você marcou durante a lista.</h2>
            <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
              {state.count > 0
                ? `Você salvou ${state.count} questão${state.count === 1 ? "" : "ões"} desta aula. Passe por elas antes de encerrar a revisão.`
                : "Você não salvou nenhuma questão desta aula. Se algo travar na próxima lista, marque para aparecer aqui."}
            </p>
          </div>
        </div>
        {state.count > 0 ? (
          <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 text-[9px] font-black tracking-[.08em] text-white transition hover:bg-violet-300">
            REVER {state.count} SALVA{state.count === 1 ? "" : "S"} <ArrowRight size={14} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
