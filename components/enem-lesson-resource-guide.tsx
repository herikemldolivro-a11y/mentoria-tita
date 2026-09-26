"use client";

import { BookOpenCheck, BrainCircuit, Database, FileStack, ListChecks, Swords } from "lucide-react";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";
import { getEnemResourceGuide, type EnemResourceStatus } from "@/lib/enem-resource-guide";

type Tone = { border: string; bg: string; text: string; badge: string };
type PriorityTone = "green" | "orange" | "red" | "mixed";

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

const priorityTone: Record<PriorityTone, { border: string; bg: string; text: string; dot: string; label: string }> = {
  green: { border: "rgba(52,211,153,.34)", bg: "rgba(16,185,129,.075)", text: "#a7f3d0", dot: "#34d399", label: "🟢 PRIORIDADE TOTAL" },
  orange: { border: "rgba(251,146,60,.34)", bg: "rgba(249,115,22,.075)", text: "#fdba74", dot: "#fb923c", label: "🟠 SELETIVA" },
  red: { border: "rgba(248,113,113,.32)", bg: "rgba(239,68,68,.07)", text: "#fca5a5", dot: "#f87171", label: "🔴 RELANCE" },
  mixed: { border: "rgba(251,191,36,.32)", bg: "linear-gradient(135deg,rgba(16,185,129,.075),rgba(249,115,22,.07))", text: "#fde68a", dot: "#fbbf24", label: "🟢/🟠 MISTA" },
};

function fallbackPriority(priority: string | null | undefined): PriorityTone {
  const value = (priority ?? "").toLocaleLowerCase("pt-BR");
  if (value.includes("mista") || value.includes("/")) return "mixed";
  if (value.includes("laranja")) return "orange";
  if (value.includes("vermel")) return "red";
  return "green";
}

function theoryItem(raw: string, fallback: PriorityTone) {
  const value = raw.trim();
  const marker = value.match(/^(🟢\/🟠|🟠\/🟢|🟢|🟠|🔴)\s*/u)?.[1] ?? "";
  const tone: PriorityTone = marker.includes("/") ? "mixed" : marker === "🟠" ? "orange" : marker === "🔴" ? "red" : marker === "🟢" ? "green" : fallback;
  return {
    tone,
    text: value.replace(/^(🟢\/🟠|🟠\/🟢|🟢|🟠|🔴)\s*/u, "").trim(),
  };
}

function ResourceCard({
  icon: Icon,
  title,
  subtitle,
  items,
  status,
  confirmedBadge,
}: {
  icon: typeof Database;
  title: string;
  subtitle: string;
  items: string[];
  status: EnemResourceStatus;
  confirmedBadge?: string;
}) {
  const tone = statusTone[status];
  const badge = status === "confirmed" && confirmedBadge ? confirmedBadge : tone.badge;

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
          {badge}
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
  const defaultTone = fallbackPriority(lesson.priority);
  const theoryItems = (lesson.topics.length ? lesson.topics : [lesson.title]).map((item) => theoryItem(item, defaultTone));
  const normalizedTitle = lesson.title.toLocaleLowerCase("pt-BR");
  const isMathBasicDayOne = subject.slug === "matematica" && normalizedTitle.includes("matemática básica");

  // Dia 1 foi conferido diretamente no inventário da Assaad.
  // O módulo Matemática Básica possui 10 listas no total, mas o Dia 1 usa somente as 5 aderentes
  // ao conteúdo definido na matriz. As demais ficam para os blocos seguintes.
  const assaadLists = isMathBasicDayOne
    ? [
        "Lista de Sistema de Numeração Decimal · 30 questões",
        "Lista de Operações Fundamentais · 15 questões",
        "Lista de Números Decimais e Operações · 20 questões",
        "Lista de Números Negativos e Operações com Inteiros · 10 questões",
        "Lista de Conjuntos Numéricos · 30 questões",
      ]
    : guide.assaadLists;
  const assaadListStatus: EnemResourceStatus = isMathBasicDayOne ? "confirmed" : guide.assaadListStatus;

  return (
    <section className="mb-7 overflow-hidden rounded-[28px] border border-white/[.09] bg-[#0a0b0e] shadow-[0_20px_70px_rgba(0,0,0,.24)]">
      <header className="border-b border-white/[.07] p-5 sm:p-6">
        <span className="tita-kicker">MAPA COMPLETO DO BLOCO</span>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl tracking-[-.035em] text-white">Tudo que você precisa fazer nesta aula.</h2>
            <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/38">
              A Titã não hospeda o curso do ENEM: ela mostra exatamente o que assistir na Assaad/curso externo e registra seu progresso. Abaixo também ficam Lista Assaad, material, flashcards, desafios e lista externa quando realmente confirmados. NC quer dizer “não confirmado”, nunca “não existe”.
            </p>
          </div>
          <span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[8px] font-black tracking-[.11em] text-white/45">{subject.shortName} · {lesson.title}</span>
        </div>
      </header>

      <div className="p-4 sm:p-5">
        <section className="rounded-[24px] border border-white/[.09] bg-white/[.018] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.09] bg-black/20 text-white/65"><BookOpenCheck size={19} /></span>
            <div>
              <span className="text-[8px] font-black tracking-[.14em] text-white/35">AULA / TEORIA A ASSISTIR</span>
              <h3 className="mt-1 font-serif text-2xl text-white">{lesson.title}</h3>
              <p className="mt-1 text-[9px] leading-4 text-white/32">Cada trecho mantém a prioridade definida na matriz. A cor de fundo é a regra de tempo: verde completo, laranja seletivo e vermelho só relance.</p>
            </div>
          </div>

          <div className="relative mt-5 space-y-2.5 pl-6">
            <span className="pointer-events-none absolute bottom-4 left-[8px] top-4 w-px bg-white/[.10]" aria-hidden="true" />
            {theoryItems.map((item, index) => {
              const tone = priorityTone[item.tone];
              return (
                <div key={`${lesson.slug}-theory-${index}`} className="relative rounded-2xl border p-3.5 sm:p-4" style={{ borderColor: tone.border, background: tone.bg }}>
                  <span className="absolute -left-[22px] top-5 h-4 w-4 rounded-full border-[3px] border-[#0a0b0e]" style={{ background: tone.dot, boxShadow: `0 0 14px ${tone.dot}44` }} />
                  <span className="text-[8px] font-black tracking-[.12em]" style={{ color: tone.text }}>{tone.label}</span>
                  <p className="mt-1.5 text-[10px] leading-5 text-white/76">{item.text || lesson.title}</p>
                </div>
              );
            })}
          </div>
        </section>

        {isMathBasicDayOne ? (
          <div className="mt-3 rounded-[20px] border border-emerald-400/25 bg-emerald-400/[.055] px-4 py-3.5 text-[10px] leading-5 text-emerald-100/75">
            <strong className="text-emerald-200">Tem lista, sim.</strong> O banco <strong className="text-white">Matemática Básica</strong> possui <strong className="text-white">10 listas</strong> no total. Para o Dia 1 entram as <strong className="text-white">5 listas aderentes</strong> ao conteúdo da matriz; as demais continuam distribuídas nos blocos seguintes.
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <ResourceCard
            icon={Database}
            title="LISTAS ASSAAD DESTA AULA"
            subtitle={isMathBasicDayOne ? "Confirmadas diretamente no inventário da Assaad. Aqui aparecem somente as listas que pertencem ao conteúdo deste Dia 1." : "Banco oficial da Assaad ligado ao tema. Quando confirmado, a aula mostra as listas/quantidades que pertencem a este bloco."}
            items={assaadLists}
            status={assaadListStatus}
            confirmedBadge={isMathBasicDayOne ? "SIM · 5 LISTAS" : assaadListStatus === "confirmed" ? "SIM" : undefined}
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
            subtitle="Decks do tipo Desafio. Ficam separados para não confundir com teoria ou lista."
            items={guide.challenges}
            status={guide.challengeStatus}
          />
          <ResourceCard
            icon={ListChecks}
            title="LISTA EXTERNA"
            subtitle="Banco/PDF separado da Assaad. Isto NÃO é a Lista Assaad acima. Só aparece como confirmado quando existe fonte concreta."
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
      </div>
    </section>
  );
}
