"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getEnemQuestionSourceInfo,
  loadEnemQuestionSnapshotManifest,
  resolveEnemSnapshotLessonKey,
  sortEnemQuestionSnapshots,
  type EnemQuestionSnapshot,
} from "@/lib/enem-question-snapshots";

type Props = {
  subjectSlug: string;
  lessonTitle: string;
};

type PartRoute = {
  subject: string;
  lesson: string;
  title: string;
};

const partRoutes: Record<string, PartRoute> = {
  "quimica:separacao-misturas-p1": {
    subject: "quimica",
    lesson: "dia-3-bloco-3-quimica",
    title: "Separação de Misturas P1",
  },
  "quimica:separacao-misturas-p2": {
    subject: "quimica",
    lesson: "dia-4-bloco-2-quimica",
    title: "Separação de Misturas P2",
  },
};

function partLabel(lessonKey: string) {
  if (lessonKey.endsWith("-p1")) return "P1";
  if (lessonKey.endsWith("-p2")) return "P2";
  if (lessonKey.endsWith("-p3")) return "P3";
  return "OUTRA AULA";
}

function groupBySection(items: EnemQuestionSnapshot[]) {
  const map = new Map<string, EnemQuestionSnapshot[]>();
  for (const item of items) {
    const section = String(item.section || "Questões").trim() || "Questões";
    map.set(section, [...(map.get(section) ?? []), item]);
  }
  return [...map.entries()].map(([section, questions]) => ({ section, questions }));
}

export function EnemQuestionSourceIndex({ subjectSlug, lessonTitle }: Props) {
  const currentLessonKey = useMemo(
    () => resolveEnemSnapshotLessonKey(subjectSlug, lessonTitle),
    [subjectSlug, lessonTitle],
  );
  const [items, setItems] = useState<EnemQuestionSnapshot[]>([]);
  const [sourceLabel, setSourceLabel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        if (!currentLessonKey) return;
        const manifest = await loadEnemQuestionSnapshotManifest();
        const current = manifest.find((item) => item.lessonKey === currentLessonKey);
        if (!current) return;
        const source = getEnemQuestionSourceInfo(current);
        const sourceItems = sortEnemQuestionSnapshots(
          manifest.filter(
            (item) => getEnemQuestionSourceInfo(item).source === source.source,
          ),
        );
        if (!alive) return;
        setItems(sourceItems);
        setSourceLabel(source.label);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [currentLessonKey]);

  if (loading) {
    return (
      <div className="mx-auto mt-4 flex min-h-16 w-full max-w-5xl items-center justify-center rounded-2xl border border-white/10 bg-white/[.02]">
        <LoaderCircle className="animate-spin text-emerald-300" size={16} />
      </div>
    );
  }

  if (!items.length || !currentLessonKey) return null;

  const groups = groupBySection(items);

  return (
    <section className="mx-auto mt-4 w-full max-w-5xl px-4 sm:px-6">
      <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/[.035] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18} />
          <div>
            <span className="text-[8px] font-black tracking-[.14em] text-emerald-300">
              ÍNDICE COMPLETO DA LISTA ORIGINAL
            </span>
            <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">
              Nenhuma questão da {sourceLabel} fica escondida.
            </h2>
            <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
              Aqui aparecem TODAS as questões da lista, com o mesmo número impresso na imagem. Verde = questão desta parte. Cinza = questão que foi classificada em outra parte/aula. Assim você consegue conferir imediatamente onde estão 1, 2, 3, 4 e todas as demais.
            </p>
          </div>
        </div>

        <div className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.section}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <strong className="text-[9px] font-black tracking-[.1em] text-white/55">
                  {group.section.toUpperCase()}
                </strong>
                <span className="text-[8px] font-bold text-white/30">
                  {group.questions.length} QUESTÕES
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 md:grid-cols-12">
                {group.questions.map((question) => {
                  const belongsHere = question.lessonKey === currentLessonKey;
                  const route = partRoutes[question.lessonKey];
                  const label = partLabel(question.lessonKey);
                  const className = `relative min-h-11 rounded-lg border px-1 text-[10px] font-black transition ${
                    belongsHere
                      ? "border-emerald-300/45 bg-emerald-400/10 text-emerald-100"
                      : "border-white/[.08] bg-white/[.02] text-white/40"
                  }`;
                  const body = (
                    <>
                      <span className="block text-[11px]">{question.number}</span>
                      <span className="mt-0.5 block text-[6px] tracking-[.06em] opacity-60">{label}</span>
                    </>
                  );

                  if (belongsHere) {
                    return (
                      <span key={question.id} className={className} title={`Questão ${question.number} · ${label}`}>
                        {body}
                      </span>
                    );
                  }

                  if (route) {
                    const href = `/questoes/enem?subject=${encodeURIComponent(route.subject)}&lesson=${encodeURIComponent(route.lesson)}&title=${encodeURIComponent(route.title)}`;
                    return (
                      <Link key={question.id} href={href} className={className} title={`Questão ${question.number} está na ${label}. Clique para abrir essa parte.`}>
                        {body}
                      </Link>
                    );
                  }

                  return (
                    <span key={question.id} className={className} title={`Questão ${question.number} pertence a ${label}`}>
                      {body}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
