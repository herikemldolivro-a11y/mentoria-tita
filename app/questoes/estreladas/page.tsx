import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { StarredQuestionReview } from "@/components/starred-question-review";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StarredQuestionsPage() {
  await requireAuthenticatedUser();

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1000px] px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <Link href="/questoes" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]">
          <ArrowLeft size={14} /> CENTRAL DE QUESTÕES
        </Link>
        <header className="mt-5 border-b border-[var(--border)] pb-6">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-amber-300"><Star size={16} fill="currentColor" /> QUESTÕES ESTRELADAS</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-5xl">Seu caderno de questões prioritárias.</h1>
        </header>
        <div className="mt-6"><StarredQuestionReview /></div>
      </div>
    </PageShell>
  );
}
