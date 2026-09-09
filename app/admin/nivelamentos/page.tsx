import { ArrowLeft, Target } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLevelingManager } from "@/components/admin-leveling-manager";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLevelingPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-8 sm:px-6">
        <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--gold-bright)]"><ArrowLeft size={15} /> VOLTAR AO ADMIN</Link>
        <header className="mt-5 border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><Target size={16} /> ADMIN · NIVELAMENTOS</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Nivelamentos 1, 2, 3 e 4.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">Cada aula possui quatro nivelamentos configuráveis separadamente. No CFO PMAL, Português inicia em 4/5; as demais matérias, em 9/10.</p>
        </header>
        <div className="mt-7"><AdminLevelingManager /></div>
      </div>
    </PageShell>
  );
}
