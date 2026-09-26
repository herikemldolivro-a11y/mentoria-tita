import { ArrowLeft, Flag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminQuestionReports } from "@/components/admin-question-reports";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminQuestionProblemsPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <Link
          href="/admin/questoes"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[10px] font-black tracking-[.08em] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"
        >
          <ArrowLeft size={15}/> VOLTAR AO BANCO DE QUESTÕES
        </Link>

        <header className="py-7 sm:py-9">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-amber-400">
            <Flag size={16}/> ADMINISTRAÇÃO
          </span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">
            Questões com problemas.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Aqui entram automaticamente as questões reportadas e também todas as questões excluídas pelos usuários.
            Copie o formato atual, corrija, cole a versão final e salve.
          </p>
        </header>

        <AdminQuestionReports/>
      </div>
    </PageShell>
  );
}
