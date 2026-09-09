import { ArrowLeft, Layers3 } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ListLearningCenter } from "@/components/list-learning-center";
import { SupremeListTeaser } from "@/components/supreme-list-teaser";

export const dynamic = "force-dynamic";

export default function ListsPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <Link href="/questoes" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> CENTRAL DE QUESTÕES</Link>
        <header className="mb-7 mt-5 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-violet-400"><Layers3 size={16}/> LISTAS DE QUESTÕES</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Treino guiado por semana e dia.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Escolha Semana → Dia → Matéria. As listas são independentes da conclusão da teoria e liberam em sequência dentro de cada aula.</p>
        </header>
        <ListLearningCenter />
        <div className="mt-7"><SupremeListTeaser/></div>
      </div>
    </PageShell>
  );
}
