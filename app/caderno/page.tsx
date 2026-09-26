import { NotebookPen } from "lucide-react";
import { NotebookHub } from "@/components/notebook-hub";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  await requireAuthenticatedUser();
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <header className="mb-8 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><NotebookPen size={16}/> CADERNO DE ANOTAÇÕES</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Transforme o que aprendeu em memória.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Cada aula possui um único caderno, com quantos flashcards você quiser. As revisões são agendadas por bloco, sem separar cada cartão em um calendário diferente.</p>
        </header>
        <NotebookHub/>
      </div>
    </PageShell>
  );
}
