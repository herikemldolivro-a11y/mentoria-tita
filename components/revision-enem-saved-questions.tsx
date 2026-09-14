"use client";

import { ArrowRight, BookmarkCheck, Images, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EnemQuestionSnapshotViewer } from "@/components/enem-question-snapshot-viewer";
import { getEnemSnapshotCount } from "@/lib/enem-question-snapshots";
import { loadRevisionEvent } from "@/lib/study-database";
import { createClient } from "@/lib/supabase/client";

type RevisionQuestionListState = {
  savedCount: number;
  snapshotCount: number;
  subjectSlug: string;
  lessonSlug: string;
  lessonTitle: string;
};

export function RevisionEnemSavedQuestions({ revisionId }: { revisionId: string }) {
  const [state, setState] = useState<RevisionQuestionListState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const revision = await loadRevisionEvent(revisionId);
        if (!revision) return;

        const snapshotCount = getEnemSnapshotCount(revision.subjectSlug, revision.lessonTitle);
        let savedCount = 0;

        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const { count, error } = await supabase
            .from("user_enem_saved_questions")
            .select("question_id", { count: "exact", head: true })
            .eq("user_id", auth.user.id)
            .eq("subject_slug", revision.subjectSlug)
            .eq("lesson_slug", revision.lessonSlug);
          if (error) throw error;
          savedCount = count ?? 0;
        }

        if (alive) {
          setState({
            savedCount,
            snapshotCount,
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
    return (
      <div className="mb-6 flex min-h-16 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-400/[.025]">
        <LoaderCircle size={15} className="animate-spin text-violet-300" />
      </div>
    );
  }

  if (!state) return null;

  const savedHref = `/questoes/enem?subject=${encodeURIComponent(state.subjectSlug)}&lesson=${encodeURIComponent(state.lessonSlug)}&title=${encodeURIComponent(state.lessonTitle)}&saved=1`;

  return (
    <section className="mb-6 space-y-4">
      <div className="rounded-[24px] border border-violet-400/25 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.13),transparent_38%),rgba(139,92,246,.035)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-300/20 bg-violet-300/[.08] text-violet-200">
              <Images size={19} />
            </span>
            <div>
              <span className="text-[8px] font-black tracking-[.14em] text-violet-300">REVISÃO · LISTA DE QUESTÕES DA AULA</span>
              <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">A lista da aula também fica disponível na revisão.</h2>
              <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[var(--muted)]">
                {state.snapshotCount > 0
                  ? `Esta aula possui ${state.snapshotCount} questões visuais classificadas. Você pode navegar por todas aqui embaixo e usar Selecionar questão para ir direto ao número desejado.`
                  : "Esta revisão já está preparada para receber a lista visual desta aula. Quando o pacote de questões do assunto for instalado, ele aparece aqui automaticamente, sem precisar alterar a tela de revisão."}
              </p>
            </div>
          </div>

          {state.savedCount > 0 ? (
            <Link href={savedHref} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-400/10 px-4 text-[9px] font-black tracking-[.08em] text-violet-200 transition hover:bg-violet-400/15">
              <BookmarkCheck size={14} /> REVER {state.savedCount} SALVA{state.savedCount === 1 ? "" : "S"} <ArrowRight size={14} />
            </Link>
          ) : null}
        </div>
      </div>

      {state.snapshotCount > 0 ? (
        <EnemQuestionSnapshotViewer
          subjectSlug={state.subjectSlug}
          lessonSlug={state.lessonSlug}
          lessonTitle={state.lessonTitle}
          embedded
          context="revision"
        />
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[.02] p-6 text-center">
          <Images className="mx-auto text-white/20" size={28} />
          <strong className="mt-3 block font-serif text-xl text-[var(--ink)]">Lista visual deste assunto ainda não instalada.</strong>
          <p className="mx-auto mt-2 max-w-2xl text-[10px] leading-5 text-[var(--muted)]">
            A integração da revisão é global para todas as matérias e assuntos. Assim que as imagens da lista desta aula entrarem no banco visual, elas serão exibidas aqui automaticamente.
          </p>
        </div>
      )}
    </section>
  );
}
