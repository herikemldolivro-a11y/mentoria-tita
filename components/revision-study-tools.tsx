"use client";

import { ArrowRight, BookMarked, Database, FileText, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LessonMaterialReader } from "@/components/lesson-material-reader";
import {
  loadQuestionBankPage,
  loadStudyTaxonomy,
  type StudyTaxonomy,
} from "@/lib/question-bank";
import {
  loadRevisionEvent,
  updateRevisionStudyMode,
} from "@/lib/study-database";
import type { RevisionEvent } from "@/lib/revision-system";

type RevisionContext = {
  revision: RevisionEvent;
  subjectId: string;
  lessonId: string;
  savedCount: number;
  totalCount: number;
};

function resolveLessonContext(taxonomy: StudyTaxonomy, revision: RevisionEvent) {
  const subject = taxonomy.subjects.find((item) => item.slug === revision.subjectSlug);
  const lesson = subject?.lessons.find((item) => item.slug === revision.lessonSlug);
  if (!subject || !lesson) return null;
  return { subjectId: subject.id, lessonId: lesson.id };
}

export function RevisionStudyTools({ revisionId }: { revisionId: string }) {
  const [context, setContext] = useState<RevisionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    Promise.all([loadRevisionEvent(revisionId), loadStudyTaxonomy()])
      .then(async ([revision, taxonomy]) => {
        if (!revision) throw new Error("Revisão não encontrada.");
        const ids = resolveLessonContext(taxonomy, revision);
        if (!ids) throw new Error("Não foi possível localizar a aula desta revisão no plano ativo.");

        const [saved, total] = await Promise.all([
          loadQuestionBankPage({
            status: "review",
            subjectId: ids.subjectId,
            lessonId: ids.lessonId,
            page: 1,
          }),
          loadQuestionBankPage({
            status: "all",
            subjectId: ids.subjectId,
            lessonId: ids.lessonId,
            page: 1,
          }),
        ]);

        if (!alive) return;
        setContext({
          revision,
          subjectId: ids.subjectId,
          lessonId: ids.lessonId,
          savedCount: saved.total,
          totalCount: total.total,
        });
        setErrorMessage(null);
      })
      .catch((error) => {
        if (alive) setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as ferramentas da revisão.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [revisionId]);

  const savedHref = useMemo(() => {
    if (!context) return "#";
    return `/questoes/banco?status=review&subject=${encodeURIComponent(context.subjectId)}&lesson=${encodeURIComponent(context.lessonId)}&revision=${encodeURIComponent(revisionId)}`;
  }, [context, revisionId]);

  const trainingHref = useMemo(() => {
    if (!context) return "#";
    return `/questoes/banco?status=all&subject=${encodeURIComponent(context.subjectId)}&lesson=${encodeURIComponent(context.lessonId)}&revision=${encodeURIComponent(revisionId)}`;
  }, [context, revisionId]);

  async function openPdf() {
    if (!context) return;
    setPdfOpen((value) => !value);
    if (!pdfOpen) {
      await updateRevisionStudyMode(context.revision.id, "platform-pdf").catch(() => undefined);
    }
  }

  if (loading) {
    return (
      <div className="mb-6 flex min-h-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)]">
        <LoaderCircle className="mr-2 animate-spin" size={16} /> Carregando ferramentas da revisão...
      </div>
    );
  }

  if (!context) {
    return errorMessage ? (
      <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div>
    ) : null;
  }

  return (
    <section className="mb-6 rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-6">
      <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">FERRAMENTAS DA REVISÃO</span>
      <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Tudo desta aula, no mesmo lugar.</h2>
      <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
        O PDF, as questões que você marcou para revisar e o treino livre abaixo pertencem somente a esta aula.
      </p>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => void openPdf()}
          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-left transition hover:border-[var(--border-strong)]"
        >
          <FileText className="text-[var(--gold-bright)]" size={21} />
          <strong className="mt-3 block font-serif text-xl text-[var(--ink)]">{pdfOpen ? "Fechar PDF" : "Abrir PDF para reler"}</strong>
          <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">Reabra o material da própria aula sem sair da revisão.</span>
        </button>

        <Link
          href={savedHref}
          className="rounded-2xl border border-violet-400/30 bg-violet-400/[.06] p-4 text-left transition hover:border-violet-300/50"
        >
          <BookMarked className="text-violet-300" size={21} />
          <strong className="mt-3 block font-serif text-xl text-[var(--ink)]">Revisar questões salvas</strong>
          <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">{context.savedCount} questão{context.savedCount === 1 ? "" : "ões"} marcada{context.savedCount === 1 ? "" : "s"} nesta aula.</span>
          <span className="mt-3 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-violet-300">ABRIR SALVAS <ArrowRight size={14} /></span>
        </Link>

        <Link
          href={trainingHref}
          className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[.05] p-4 text-left transition hover:border-cyan-300/45"
        >
          <Database className="text-cyan-300" size={21} />
          <strong className="mt-3 block font-serif text-xl text-[var(--ink)]">Ir para treino de questões</strong>
          <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">Banco avulso já filtrado nesta aula · {context.totalCount} disponíveis.</span>
          <span className="mt-3 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-cyan-300">TREINAR ESTA AULA <ArrowRight size={14} /></span>
        </Link>
      </div>

      {pdfOpen ? (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <LessonMaterialReader
            subjectSlug={context.revision.subjectSlug}
            lessonSlug={context.revision.lessonSlug}
            lessonTitle={context.revision.lessonTitle}
          />
        </div>
      ) : null}

      {errorMessage ? <p className="mt-3 text-xs text-red-400">{errorMessage}</p> : null}
    </section>
  );
}
