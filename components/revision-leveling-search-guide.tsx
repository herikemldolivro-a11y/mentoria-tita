"use client";

import { ArrowRight, Database, Images, ListChecks, LoaderCircle, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEnemSnapshotCount } from "@/lib/enem-question-snapshots";
import {
  loadLevelingRule,
  loadStudyTaxonomy,
  type LevelingRule,
} from "@/lib/question-bank";
import { loadRevisionEvent } from "@/lib/study-database";
import { createClient } from "@/lib/supabase/client";
import type { RevisionEvent } from "@/lib/revision-system";

type GuideState = {
  revision: RevisionEvent;
  subjectId: string | null;
  lessonId: string | null;
  topics: string[];
  rule: LevelingRule | null;
  visualCount: number;
};

export function RevisionLevelingSearchGuide({
  revisionId,
}: {
  revisionId: string;
}) {
  const [state, setState] = useState<GuideState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [revision, taxonomy, rule] = await Promise.all([
          loadRevisionEvent(revisionId),
          loadStudyTaxonomy().catch(() => null),
          loadLevelingRule(revisionId).catch(() => null),
        ]);

        if (!revision) return;

        const subject = taxonomy?.subjects.find(
          (item) => item.slug === revision.subjectSlug,
        );
        const lesson = subject?.lessons.find(
          (item) => item.slug === revision.lessonSlug,
        );

        let topics: string[] = [];
        if (lesson?.id) {
          const supabase = createClient();
          const { data } = await supabase
            .from("study_lesson_topics")
            .select("topic,position")
            .eq("lesson_id", lesson.id)
            .order("position", { ascending: true });

          topics = (data ?? [])
            .map((row) => String(row.topic ?? "").trim())
            .filter(Boolean);
        }

        const visualCount = getEnemSnapshotCount(
          revision.subjectSlug,
          revision.lessonTitle,
        );

        if (!alive) return;

        setState({
          revision,
          subjectId: subject?.id ?? null,
          lessonId: lesson?.id ?? null,
          topics,
          rule,
          visualCount,
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [revisionId]);

  if (loading) {
    return (
      <div
        id="nivelamento-acesso"
        className="mt-5 flex min-h-20 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[.035]"
      >
        <LoaderCircle className="animate-spin text-violet-300" size={17} />
      </div>
    );
  }

  if (!state) return null;

  const questionCount = state.rule?.question_count ?? 10;
  const requiredCorrect =
    state.rule?.required_correct ?? Math.max(1, Math.ceil(questionCount * 0.9));
  const available = state.rule?.available_questions ?? 0;

  const bankHref =
    state.subjectId && state.lessonId
      ? `/questoes/banco?status=all&subject=${encodeURIComponent(
          state.subjectId,
        )}&lesson=${encodeURIComponent(
          state.lessonId,
        )}&revision=${encodeURIComponent(revisionId)}`
      : "/questoes/banco";

  const visualHref = `/questoes/enem?subject=${encodeURIComponent(
    state.revision.subjectSlug,
  )}&lesson=${encodeURIComponent(
    state.revision.lessonSlug,
  )}&title=${encodeURIComponent(state.revision.lessonTitle)}`;

  return (
    <section
      id="nivelamento-acesso"
      className="mt-5 rounded-[22px] border border-violet-400/25 bg-[linear-gradient(120deg,rgba(124,58,237,.09),var(--background)_62%)] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-200">
          <Search size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <span className="text-[8px] font-black tracking-[.15em] text-violet-300">
            ONDE ACESSAR AS QUESTÕES DO NIVELAMENTO
          </span>
          <h3 className="mt-1 font-serif text-2xl text-[var(--ink)]">
            {questionCount} questões desta aula · meta {requiredCorrect}/{questionCount}
          </h3>
          <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">
            Na Plataforma Titã, procure em <strong>Central de Questões → Banco de Questões → {state.revision.subjectName} → {state.revision.lessonTitle}</strong>.
            O nivelamento deve usar questões desta própria aula.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <span className="text-[7px] font-black tracking-[.12em] text-[var(--muted)]">
            FAZER
          </span>
          <strong className="mt-1 block font-serif text-xl text-[var(--ink)]">
            {questionCount} questões
          </strong>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <span className="text-[7px] font-black tracking-[.12em] text-[var(--muted)]">
            META
          </span>
          <strong className="mt-1 block font-serif text-xl text-[var(--ink)]">
            {requiredCorrect}/{questionCount}
          </strong>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <span className="text-[7px] font-black tracking-[.12em] text-[var(--muted)]">
            BANCO AUTOMÁTICO
          </span>
          <strong
            className="mt-1 block font-serif text-xl"
            style={{
              color:
                available >= questionCount
                  ? "#31c765"
                  : "var(--gold-bright)",
            }}
          >
            {available} disponíveis
          </strong>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <span className="inline-flex items-center gap-1.5 text-[8px] font-black tracking-[.12em] text-[var(--gold-bright)]">
          <ListChecks size={13} /> PESQUISAR / FILTRAR POR
        </span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(state.topics.length ? state.topics : [state.revision.lessonTitle]).map(
            (topic) => (
              <span
                key={topic}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[9px] text-[var(--muted)]"
              >
                {topic}
              </span>
            ),
          )}
        </div>
      </div>

      {available < questionCount ? (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[.07] p-3 text-[10px] leading-5 text-amber-300">
          O banco automático ainda não possui as {questionCount} questões necessárias nesta aula.
          Use o acesso ao banco abaixo e, quando existir lista visual instalada, ela também aparece como opção.
          O nivelamento continua aparecendo automaticamente no calendário.
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={bankHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[.06] px-4 text-[9px] font-black tracking-[.09em] text-cyan-300"
        >
          <Database size={14} /> ABRIR BANCO DESTA AULA <ArrowRight size={13} />
        </Link>

        {state.visualCount > 0 ? (
          <Link
            href={visualHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[.07] px-4 text-[9px] font-black tracking-[.09em] text-violet-200"
          >
            <Images size={14} /> ABRIR LISTA VISUAL ({state.visualCount}) <ArrowRight size={13} />
          </Link>
        ) : null}

        <Link
          href="/nivelamentos"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black tracking-[.09em] text-[var(--muted)]"
        >
          CENTRAL DE NIVELAMENTOS <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
