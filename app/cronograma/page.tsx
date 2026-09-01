import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function CronogramaPage() {
  const { focusContest } = await requireAuthenticatedUser();

  if (focusContest?.slug === "prf") {
    redirect("/cronograma/semana-1");
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <BackButton fallback="/" label="Voltar ao painel" />
        <section className="mt-5 rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] sm:p-12">
          <span className="text-[10px] font-black tracking-[0.2em] text-[var(--gold-bright)]">CRONOGRAMA</span>
          <h1 className="mt-3 font-serif text-4xl text-[var(--ink)]">Cronograma em preparação.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">O piloto completo está ativo para a PRF. Os demais concursos recebem suas próprias matérias e semanas depois da validação desta estrutura.</p>
          <Link href="/concurso" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-xs font-black tracking-[0.1em] text-[#111]">TROCAR CONCURSO FOCO <ArrowRight size={16} /></Link>
        </section>
      </div>
    </PageShell>
  );
}
