import { ArrowLeft, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminStudentDirectory } from "@/components/admin-student-directory";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-8 sm:px-6">
        <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--gold-bright)]"><ArrowLeft size={15} /> VOLTAR AO ADMIN</Link>
        <header className="mt-5 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><UsersRound size={16} /> ADMIN · ALUNOS</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Seus mentorados.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">Veja o nome definido no primeiro acesso, concurso foco, cronograma atribuído e progresso básico de cada aluno.</p>
        </header>
        <div className="mt-7"><AdminStudentDirectory /></div>
      </div>
    </PageShell>
  );
}
