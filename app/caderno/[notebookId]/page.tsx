import { ArrowLeft, NotebookPen } from "lucide-react";
import Link from "next/link";
import { NotebookReviewRunner } from "@/components/notebook-review-runner";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotebookReviewPage({ params }: { params: Promise<{ notebookId: string }> }) {
  await requireAuthenticatedUser();
  const { notebookId } = await params;
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[900px] px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <Link href="/caderno" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> VOLTAR AOS CADERNOS</Link>
        <header className="mt-5 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><NotebookPen size={16}/> REVISÃO DO CADERNO</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Lembre antes de revelar.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Os flashcards que você errou antes vêm primeiro. Depois, o sistema segue dos mais antigos para os mais recentes.</p>
        </header>
        <div className="mt-7"><NotebookReviewRunner notebookId={notebookId}/></div>
      </div>
    </PageShell>
  );
}
