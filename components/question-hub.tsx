"use client";

import { ArrowRight, BarChart3, BookOpenCheck, CalendarDays, Database, Layers3, ListChecks, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";

type Accent = "gold" | "purple" | "cyan";

type HubItem = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: Accent;
  buttonLabel: string;
  icon: "bank" | "lists" | "leveling";
  bullets: Array<{ icon: "filter" | "calendar" | "performance"; title: string; description: string }>;
};

type BottomStat = {
  value: string;
  label: string;
  accent: Accent;
};

const items: HubItem[] = [
  {
    href: "/questoes/banco",
    eyebrow: "TREINO LIVRE",
    title: "Banco de Questões",
    description: "Escolha a matéria, a aula e o nível para resolver questões no seu ritmo e focar exatamente no conteúdo que quiser treinar.",
    accent: "gold",
    buttonLabel: "Acessar Banco de Questões",
    icon: "bank",
    bullets: [
      {
        icon: "filter",
        title: "Filtre por matéria e aula",
        description: "Encontre com rapidez exatamente o que deseja estudar.",
      },
      {
        icon: "performance",
        title: "Escolha o nível de dificuldade",
        description: "Treino do básico ao avançado com mais controle.",
      },
      {
        icon: "performance",
        title: "Acompanhe seu desempenho",
        description: "Veja acertos, erros e evolução em tempo real.",
      },
    ],
  },
  {
    href: "/questoes/listas",
    eyebrow: "LISTAS GUIADAS",
    title: "Listas de Questões",
    description: "Siga listas organizadas por semana ou por aula, com progresso conectado ao calendário e ao plano de estudos.",
    accent: "purple",
    buttonLabel: "Acessar Listas de Questões",
    icon: "lists",
    bullets: [
      {
        icon: "calendar",
        title: "Listas por semana",
        description: "Organização alinhada ao seu plano de estudos.",
      },
      {
        icon: "filter",
        title: "Listas por aula",
        description: "Foque direto no conteúdo que acabou de estudar.",
      },
      {
        icon: "performance",
        title: "Progresso conectado",
        description: "Sua evolução acompanha a trilha e o calendário.",
      },
    ],
  },
  {
    href: "/nivelamentos",
    eyebrow: "DOMÍNIO DO CONTEÚDO",
    title: "Nivelamentos",
    description: "Identifique pontos fracos, reforce o que precisa e evolua com revisões e desempenho integrados por matéria.",
    accent: "cyan",
    buttonLabel: "Acessar Nivelamentos",
    icon: "leveling",
    bullets: [
      {
        icon: "performance",
        title: "Diagnóstico preciso",
        description: "Descubra com clareza seus pontos de melhoria.",
      },
      {
        icon: "filter",
        title: "Questões de reforço",
        description: "Treine somente o que realmente precisa consolidar.",
      },
      {
        icon: "performance",
        title: "Acompanhe sua evolução",
        description: "Veja seu progresso após cada nivelamento.",
      },
    ],
  },
];

const bottomStats: BottomStat[] = [
  { value: "30.000+", label: "questões disponíveis", accent: "gold" },
  { value: "500+", label: "listas organizadas", accent: "purple" },
  { value: "Estudo", label: "direcionado por desempenho", accent: "cyan" },
];

export function QuestionHub() {
  return (
    <section data-mt-question-hub-v51-1="1" className="space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_82%_14%,rgba(245,158,11,.12),transparent_22%),radial-gradient(circle_at_90%_10%,rgba(124,58,237,.24),transparent_30%),linear-gradient(135deg,#06070b_0%,#090914_42%,#0a0d17_100%)] px-5 pb-5 pt-5 shadow-[0_24px_70px_rgba(0,0,0,.30)] sm:px-7 sm:pb-6 sm:pt-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-black tracking-[.22em] text-violet-300">
              <BookOpenCheck size={15} /> ESTUDO E PRÁTICA
            </span>
            <h1 className="mt-3 max-w-[10ch] font-serif text-4xl leading-[.92] tracking-[-.06em] text-white sm:text-5xl lg:text-[64px]">
              Banco de Questões
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/74 sm:text-[15px]">
              Escolha como estudar e resolva questões de forma estratégica para evoluir no seu desempenho.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,11,20,.95),rgba(15,17,32,.78))] p-5">
            <div className="absolute inset-0 bg-[url('/mascots/tita-pmal-guardian.png')] bg-contain bg-right-bottom bg-no-repeat opacity-95" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,.97),rgba(5,7,12,.65),rgba(5,7,12,.18))]" />
            <div className="relative z-10 max-w-[280px]">
              <span className="text-[10px] font-black tracking-[.24em] text-amber-300">MENTORIA TITÃ</span>
              <p className="mt-3 font-serif text-[28px] leading-[1.05] text-white sm:text-[34px]">Questões, listas e nivelamentos no mesmo ecossistema.</p>
              <div className="mt-4 w-fit border-b-2 border-amber-300/80 pb-1 text-[11px] font-black tracking-[.16em] text-amber-200">FOCO 95+ EM CADA ETAPA</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        {items.map((item) => (
          <HubCard key={item.href} item={item} />
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {bottomStats.map((item) => (
          <BottomStatCard key={item.label} item={item} />
        ))}
      </div>
    </section>
  );
}

function HubCard({ item }: { item: HubItem }) {
  const styles =
    item.accent === "gold"
      ? {
          border: "border-amber-300/30",
          bg: "bg-[radial-gradient(circle_at_78%_16%,rgba(251,191,36,.16),transparent_28%),linear-gradient(145deg,#161109_0%,#0a0a0f_62%,#0a0b10_100%)]",
          badge: "border-amber-300/22 bg-amber-300/[.08] text-amber-200",
          icon: "border-amber-300/28 bg-[#22190a] text-amber-200",
          button: "border-amber-200/50 bg-[linear-gradient(180deg,#ffd34c,#f4b316)] text-[#231400] shadow-[0_12px_30px_rgba(251,191,36,.28)] hover:brightness-110",
          featureBorder: "border-amber-300/12",
          accentText: "text-amber-200",
        }
      : item.accent === "purple"
        ? {
            border: "border-violet-300/30",
            bg: "bg-[radial-gradient(circle_at_78%_16%,rgba(167,139,250,.18),transparent_28%),linear-gradient(145deg,#120d1d_0%,#09090f_62%,#0a0a10_100%)]",
            badge: "border-violet-300/22 bg-violet-300/[.10] text-violet-200",
            icon: "border-violet-300/28 bg-[#1b1430] text-violet-200",
            button: "border-violet-200/40 bg-[linear-gradient(180deg,#bb67ff,#8836ff)] text-white shadow-[0_12px_30px_rgba(139,92,246,.28)] hover:brightness-110",
            featureBorder: "border-violet-300/12",
            accentText: "text-violet-200",
          }
        : {
            border: "border-cyan-300/30",
            bg: "bg-[radial-gradient(circle_at_78%_16%,rgba(34,211,238,.15),transparent_28%),linear-gradient(145deg,#07171a_0%,#09090f_62%,#090d11_100%)]",
            badge: "border-cyan-300/22 bg-cyan-300/[.10] text-cyan-200",
            icon: "border-cyan-300/28 bg-[#0d2025] text-cyan-200",
            button: "border-cyan-200/40 bg-[linear-gradient(180deg,#4ff3ff,#22d3ee)] text-[#032028] shadow-[0_12px_30px_rgba(34,211,238,.28)] hover:brightness-110",
            featureBorder: "border-cyan-300/12",
            accentText: "text-cyan-200",
          };

  const Icon = item.icon === "bank" ? Database : item.icon === "lists" ? Layers3 : Trophy;

  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-[28px] border ${styles.border} ${styles.bg} p-5 shadow-[0_18px_48px_rgba(0,0,0,.26)]`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border ${styles.icon}`}>
          <Icon size={26} />
        </span>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black tracking-[.18em] ${styles.badge}`}>
          {item.eyebrow}
        </span>
      </div>

      <h2 className="mt-5 font-serif text-[50px] leading-[.9] tracking-[-.055em] text-white sm:text-[56px] xl:text-[52px]">
        {item.title}
      </h2>
      <p className="mt-4 min-h-[96px] text-[15px] leading-8 text-white/74">{item.description}</p>

      <div className="mt-4 space-y-3">
        {item.bullets.map((bullet) => (
          <FeatureRow key={bullet.title} bullet={bullet} accentClass={styles.accentText} borderClass={styles.featureBorder} />
        ))}
      </div>

      <Link
        href={item.href}
        className={`mt-5 inline-flex min-h-14 w-full items-center justify-between gap-4 rounded-[18px] border px-5 text-sm font-black transition ${styles.button}`}
      >
        <span>{item.buttonLabel}</span>
        <ArrowRight size={20} />
      </Link>
    </article>
  );
}

function FeatureRow({
  bullet,
  accentClass,
  borderClass,
}: {
  bullet: HubItem["bullets"][number];
  accentClass: string;
  borderClass: string;
}) {
  const Icon = bullet.icon === "calendar" ? CalendarDays : bullet.icon === "performance" ? BarChart3 : ListChecks;

  return (
    <div className={`flex items-start gap-3 rounded-[18px] border ${borderClass} bg-white/[.02] px-4 py-3`}>
      <span className={`mt-0.5 shrink-0 ${accentClass}`}>
        <Icon size={18} />
      </span>
      <div>
        <strong className="block text-sm font-semibold text-white">{bullet.title}</strong>
        <p className="mt-0.5 text-[12px] leading-5 text-white/62">{bullet.description}</p>
      </div>
    </div>
  );
}

function BottomStatCard({ item }: { item: BottomStat }) {
  const styles =
    item.accent === "gold"
      ? { border: "border-amber-300/20", bg: "bg-amber-300/[.05]", text: "text-amber-200" }
      : item.accent === "purple"
        ? { border: "border-violet-300/20", bg: "bg-violet-300/[.06]", text: "text-violet-200" }
        : { border: "border-cyan-300/20", bg: "bg-cyan-300/[.06]", text: "text-cyan-200" };

  return (
    <div className={`rounded-[20px] border ${styles.border} ${styles.bg} px-4 py-4 text-center shadow-[0_14px_40px_rgba(0,0,0,.16)]`}>
      <strong className={`block text-[28px] font-black ${styles.text}`}>{item.value}</strong>
      <span className="mt-1 block text-sm text-white/72">{item.label}</span>
    </div>
  );
}

