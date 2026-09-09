"use client";

import { ArrowRight, CalendarDays, Database, Layers3, ListChecks, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";

type Accent = "gold" | "purple" | "cyan";

type HubItem = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: Accent;
  icon: "bank" | "lists" | "leveling";
};

const items: HubItem[] = [
  {
    href: "/questoes/banco",
    eyebrow: "TREINO LIVRE",
    title: "Banco de Questões",
    description: "Escolha matéria, aula e nível para resolver questões do banco no seu ritmo.",
    accent: "gold",
    icon: "bank",
  },
  {
    href: "/questoes/listas",
    eyebrow: "LISTAS GUIADAS",
    title: "Listas de Questões",
    description: "Semana por semana e dia por dia. Cada aula libera suas listas e o calendário de revisão dos erros.",
    accent: "purple",
    icon: "lists",
  },
  {
    href: "/nivelamentos",
    eyebrow: "DOMÍNIO DO CONTEÚDO",
    title: "Nivelamentos",
    description: "Calendário próprio de nivelamentos conectado às revisões. Cada nivelamento entra um dia depois da revisão correspondente.",
    accent: "cyan",
    icon: "leveling",
  },
];

export function QuestionHub() {
  return <div className="grid gap-5 xl:grid-cols-3">{items.map((item) => <HubCard key={item.href} {...item} />)}</div>;
}

function HubCard({ href, eyebrow, title, description, accent, icon }: HubItem) {
  const styles = accent === "gold"
    ? {
        border: "border-amber-300/25 hover:border-amber-200/45",
        bg: "bg-[radial-gradient(circle_at_82%_16%,rgba(245,190,64,.20),transparent_34%),linear-gradient(145deg,#17130b,#09090c_72%)]",
        text: "text-amber-300",
        icon: "border-amber-200/30 bg-[#211a0d] text-amber-200",
        glow: "bg-amber-400/10",
      }
    : accent === "cyan"
      ? {
          border: "border-cyan-300/25 hover:border-cyan-200/45",
          bg: "bg-[radial-gradient(circle_at_82%_16%,rgba(34,211,238,.18),transparent_34%),linear-gradient(145deg,#09181c,#080a0d_72%)]",
          text: "text-cyan-300",
          icon: "border-cyan-200/30 bg-[#0d2025] text-cyan-200",
          glow: "bg-cyan-400/10",
        }
      : {
          border: "border-violet-400/25 hover:border-violet-300/45",
          bg: "bg-[radial-gradient(circle_at_82%_16%,rgba(139,92,246,.22),transparent_34%),linear-gradient(145deg,#11101b,#09090d_72%)]",
          text: "text-violet-300",
          icon: "border-violet-200/30 bg-[#171126] text-violet-200",
          glow: "bg-violet-500/10",
        };

  const Icon = icon === "bank" ? Database : icon === "lists" ? Layers3 : Trophy;
  return (
    <Link href={href} className={`group relative min-h-[390px] overflow-hidden rounded-[32px] border p-7 transition duration-300 hover:-translate-y-1 ${styles.border} ${styles.bg}`}>
      <div className={`pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full blur-3xl ${styles.glow}`} />
      <div className="relative z-10 flex h-full flex-col">
        <span className={`inline-flex w-fit items-center gap-2 text-[9px] font-black tracking-[.2em] ${styles.text}`}>
          {icon === "bank" ? <Target size={14}/> : icon === "lists" ? <Sparkles size={14}/> : <Trophy size={14}/>} {eyebrow}
        </span>
        <h2 className="mt-4 max-w-md font-serif text-4xl tracking-[-.04em] text-white">{title}</h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-white/48">{description}</p>

        <div className="mt-8 flex flex-1 items-center justify-center">
          <div className="relative grid h-40 w-56 place-items-center rounded-[28px] border border-white/10 bg-white/[.025]">
            <div className={`absolute left-5 top-5 h-16 w-24 rounded-[16px] border border-white/8 ${accent === "cyan" ? "bg-cyan-300/[.045]" : accent === "purple" ? "bg-violet-300/[.045]" : "bg-amber-200/[.045]"}`} />
            <div className={`absolute bottom-5 right-5 h-20 w-28 rotate-[-5deg] rounded-[18px] border border-white/10 ${accent === "cyan" ? "bg-cyan-300/[.07]" : accent === "purple" ? "bg-violet-300/[.07]" : "bg-amber-200/[.07]"}`} />
            <span className={`relative z-10 grid h-[88px] w-[88px] place-items-center rounded-[24px] border shadow-2xl ${styles.icon}`}><Icon size={39} strokeWidth={1.45}/></span>
            {icon === "lists" ? <ListChecks className="absolute right-7 top-7 text-violet-300/70" size={20}/> : icon === "leveling" ? <CalendarDays className="absolute right-7 top-7 text-cyan-300/70" size={20}/> : <ShieldCheck className="absolute right-7 top-7 text-amber-200/70" size={20}/>} 
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
          <span className="text-[10px] font-black tracking-[.12em] text-white/58">ABRIR ÁREA</span>
          <span className={`grid h-11 w-11 place-items-center rounded-full border transition group-hover:translate-x-1 ${styles.icon}`}><ArrowRight size={18}/></span>
        </div>
      </div>
    </Link>
  );
}
