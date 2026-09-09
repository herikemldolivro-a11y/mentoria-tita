import { ArrowLeft, Medal } from "lucide-react";
import Link from "next/link";
import { LevelingLearningCenter } from "@/components/leveling-learning-center";
import { PageShell } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default function LevelingPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <Link href="/questoes" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> CENTRAL DE QUESTÕES</Link>
        <header className="mb-7 mt-5 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-violet-400"><Medal size={16}/> NIVELAMENTOS</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Domínio por aula e por nível.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Escolha a semana, o dia, a matéria e a aula. O Nível 1 libera após a Revisão 1 da aula; o Nível 2 após a Revisão 2; e assim por diante. O calendário usado depende da origem da revisão.</p>
        </header>
        <LevelingLearningCenter />
      </div>
    </PageShell>
  );
}
