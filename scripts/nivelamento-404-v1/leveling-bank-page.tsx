import { ArrowLeft, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { LevelingQuestionBank } from "@/components/leveling-question-bank";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LevelingBankPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  await requireAuthenticatedUser();
  const { attemptId } = await params;

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"
        >
          <ArrowLeft size={14} />
          VOLTAR AO CALENDÁRIO
        </Link>

        <header className="mt-5 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">
            <BookOpenCheck size={16} />
            BANCO DE QUESTÕES · NIVELAMENTO
          </span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">
            Banco de Questões.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Matéria, assunto e nível já estão pré-filtrados para este nivelamento.
          </p>
        </header>

        <div className="mt-7">
          <LevelingQuestionBank attemptId={attemptId} />
        </div>
      </div>
    </PageShell>
  );
}