"use client";

import { BrainCircuit, Database, FileStack, ListChecks, Swords } from "lucide-react";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";
import { getEnemResourceGuide, type EnemResourceStatus } from "@/lib/enem-resource-guide";

type Tone = { border: string; bg: string; text: string; badge: string };

const statusTone: Record<EnemResourceStatus, Tone> = {
  confirmed: {
    border: "rgba(52,211,153,.24)",
    bg: "rgba(16,185,129,.055)",
    text: "#a7f3d0",
    badge: "CONFIRMADO",
  },
  "not-confirmed": {
    border: "rgba(255,255,255,.09)",
    bg: "rgba(255,255,255,.025)",
    text: "rgba(255,255,255,.58)",
    badge: "NC",
  },
  create: {
    border: "rgba(251,191,36,.24)",
    bg: "rgba(245,158,11,.055)",
    text: "#fde68a",
    badge: "CRIAR/COMPLETAR",
  },
};

function ResourceCard({
  icon: Icon,
  title,
  subtitle,
  items,
  status,
}: {
  icon: typeof Database;
  title: string;
  subtitle: string;
  items: string[];
  status: EnemResourceStatus;
}) {
  const tone = statusTone[status];
  return (
    <section className="rounded-[22px] border p-4 sm:p-5" style={{ borderColor: tone.border, background: tone.bg }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-black/20" style={{ color: tone.text }}>
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black tracking-[-.01em] text-white/88">{title}</h3>
            <p className="mt-1 text-[9px] leading-4 text-white/32">{subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border px-2 py-1 text-[7px] font-black tracking-[.1em]" style={{ borderColor: tone.border, color: tone.text }}>
          {tone.badge}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}-${item}`} className="rounded-xl border border-white/[.055] bg-black/15 px-3 py-2.5 text-[10px] leading-5 text-white/62">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export function EnemLessonResourceGuide({ subject, lesson }: { subject: PrfSubject; lesson: MatrixLesson }) {
  const guide = getEnemResourceGuide(subject.slug, lesson.title);

  return (
    <section className="mb-7 overflow-hidden rounded-[28px] border border-white/[.09] bg-[#0a0b0e] shadow-[0_20px_70px_rgba(0,0,0,.24)]">
      <header className="border-b border-white/[.07] p-5 sm:p-6">
        <span className="tita-kicker">MAPA COMPLETO DO BLOCO</span>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl tracking-[-.035em] text-white">Tudo que acompanha esta aula.</h2>
            <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/38">
              A teoria acontece fora da Titã. Aqui ficam o roteiro do que assistir, as listas da Assaad, materiais, flashcards/desafios e lista externa quando houver. NC significa apenas que o item não foi confirmado no inventário recuperado — não significa que ele não exista.
            </p>
          </div>
          <span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[8px] font-black tracking-[.11em] text-white/45">{subject.shortName} · {lesson.title}</span>
        </div>
      </header>

      <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2 xl:grid-cols-3">
        <ResourceCard
          icon={Database}
          title="LISTA ASSAAD"
          subtitle="Banco oficial da Assaad ligado ao tema. Quantidades vêm da matriz/inventário confirmado."
          items={guide.assaadLists}
          status={guide.assaadListStatus}
        />
        <ResourceCard
          icon={FileStack}
          title="MATERIAL DA AULA"
          subtitle="Lista de exercícios/material anexado ao capítulo. Não é a mesma coisa da Lista Assaad."
          items={guide.classMaterial}
          status={guide.classMaterialStatus}
        />
        <ResourceCard
          icon={BrainCircuit}
          title="FLASHCARDS"
          subtitle="Decks de memorização/raciocínio confirmados no capítulo quando houver."
          items={guide.flashcards}
          status={guide.flashcardStatus}
        />
        <ResourceCard
          icon={Swords}
          title="DESAFIOS"
          subtitle="Decks do tipo Desafio. Aparecem separados para você não confundir com teoria ou lista."
          items={guide.challenges}
          status={guide.challengeStatus}
        />
        <ResourceCard
          icon={ListChecks}
          title="LISTA EXTERNA"
          subtitle="Banco/PDF separado da Assaad. Só aparece como confirmado quando existe fonte concreta."
          items={guide.externalList}
          status={guide.externalListStatus}
        />
        <section className="rounded-[22px] border border-white/[.08] bg-white/[.018] p-4 sm:p-5">
          <span className="text-[8px] font-black tracking-[.13em] text-white/32">ORDEM DE EXECUÇÃO</span>
          <strong className="mt-2 block font-serif text-xl text-white">Teoria → Lista Assaad → Externa → Flashcards/Desafio → D+2</strong>
          <p className="mt-2 text-[10px] leading-5 text-white/36">Esses recursos não viram quarto bloco do dia. O bloco continua sendo uma única aula/tópico da matriz.</p>
          {guide.note ? <p className="mt-3 rounded-xl border border-white/[.06] bg-black/15 px-3 py-2.5 text-[9px] leading-4 text-white/45">{guide.note}</p> : null}
        </section>
      </div>
    </section>
  );
}
