import { ArrowLeft, Layers3 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCurriculumManager } from "@/components/admin-curriculum-manager";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-8 sm:px-6">
        <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--gold-bright)]"><ArrowLeft size={15} /> VOLTAR AO ADMIN</Link>
        <header className="mt-5 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><Layers3 size={16} /> ADMIN · CRONOGRAMA</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Semanas, matérias e matrizes.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">Monte o cronograma sem programar: crie semanas, adicione matérias novas, escolha as aulas, defina tópicos, quantidade de questões e depois envie o PDF da aula.</p>
        </header>
        <div className="mt-7"><AdminCurriculumManager /></div>
      </div>
    </PageShell>
  );
}
