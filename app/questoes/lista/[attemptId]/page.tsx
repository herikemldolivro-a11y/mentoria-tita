import { ClipboardCheck } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { QuestionAttemptRunner } from "@/components/question-attempt-runner";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function QuestionAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  await requireAuthenticatedUser();
  const { attemptId } = await params;
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[900px] px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/cronograma/semana-1" label="Voltar ao cronograma" />
        <header className="mt-5 border-b border-[var(--border)] pb-7"><span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><ClipboardCheck size={16} /> LISTA DE FIXAÇÃO</span><h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">35 questões congeladas.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Suas respostas são salvas imediatamente. Você pode sair e continuar esta mesma lista depois.</p></header>
        <div className="mt-7"><QuestionAttemptRunner attemptId={attemptId} /></div>
      </div>
    </PageShell>
  );
}
