import {
  ArrowRight,
  ClipboardList,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";
import { PageShell } from "@/components/page-shell";
import { UpcomingRevisions } from "@/components/upcoming-revisions";
import { PrfWeekProgressSummary } from "@/components/prf-week-progress-summary";
import { dashboardNavigationItems } from "@/lib/navigation";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function Home() {
  const { focusContest, isAdmin } = await requireAuthenticatedUser();
  const isPrf = focusContest?.slug === "prf";

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[9px] font-black tracking-[0.22em] text-[var(--gold-bright)]">CENTRAL DO ALUNO</span>
            <h1 className="mt-1 font-serif text-3xl tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">Sua missão de hoje.</h1>
          </div>
          <p className="max-w-md text-xs leading-6 text-[var(--muted)] sm:text-right">Um painel direto: veja o foco, abra a semana e siga uma matéria por vez.</p>
        </div>

        <section className="overflow-hidden rounded-[26px] border border-[#d2a64e]/25 bg-[#090a0c] text-white shadow-[0_24px_70px_rgba(0,0,0,.24)]">
          <div className="grid lg:grid-cols-[1fr_310px]">
            <div className="relative min-h-[320px] overflow-hidden p-6 sm:p-8 lg:p-9">
              <div className="pointer-events-none absolute -right-12 -top-16 text-[13rem] font-black leading-none text-white/[0.025] sm:text-[18rem]">95+</div>
              <div className="relative z-10 flex h-full flex-col justify-between gap-10">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d2a64e]/25 bg-[#d2a64e]/10 px-3 py-1.5 text-[9px] font-black tracking-[0.16em] text-[#e5bd6d]"><ShieldCheck size={14} /> MISSÃO ATUAL</span>
                  <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{isPrf ? "Semana 1 · PRF" : "Seu ciclo de preparação"}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52">{isPrf ? "Escolha Contabilidade ou Raciocínio Lógico e avance uma aula por vez, seguindo a sequência da Semana 1." : "O cronograma específico deste concurso será publicado depois da validação completa do piloto PRF."}</p>
                </div>

                {isPrf ? (
<PrfWeekProgressSummary />
                ) : (
                  <Link href="/concurso" className="inline-flex w-fit min-h-12 items-center gap-2 rounded-xl bg-[#d7aa50] px-5 text-xs font-black tracking-[0.1em] text-[#111]">TROCAR PARA PRF <ArrowRight size={17} /></Link>
                )}
              </div>
            </div>

            <aside className="border-t border-white/10 bg-white/[0.025] p-5 lg:border-l lg:border-t-0 lg:p-6">
              <span className="text-[9px] font-black tracking-[0.18em] text-[#d9ab50]">RESUMO DA SEMANA</span>
              <h3 className="mt-2 font-serif text-3xl">Semana 1</h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="text-[9px] font-black tracking-[.13em] text-white/40">AULAS-MÃE</span><strong className="mt-1 block font-serif text-2xl">5</strong></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="text-[9px] font-black tracking-[.13em] text-white/40">ETAPAS ATIVAS</span><strong className="mt-1 block font-serif text-2xl">10</strong></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="text-[9px] font-black tracking-[.13em] text-white/40">QUESTÕES PREVISTAS</span><strong className="mt-1 block font-serif text-2xl">175</strong></div>
              </div>
            </aside>
          </div>
        </section>

        {isPrf ? (
          <div className="mt-7">
            <UpcomingRevisions />
          </div>
        ) : null}

        {isAdmin ? (
          <section className="mt-8 rounded-[24px] border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_5%,var(--surface))] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--gold-bright)]"><Settings2 size={19} /></span>
                <div>
                  <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">ÁREA ADMINISTRATIVA</span>
                  <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Conteúdos das aulas</h2>
                  <p className="mt-1 text-xs leading-6 text-[var(--muted)]">Envie, substitua ou remova PDFs sem alterar o código da plataforma.</p>
                </div>
              </div>
              <Link href="/admin/conteudos" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-[10px] font-black tracking-[.1em] text-[#111] transition hover:bg-[var(--gold-bright)]">GERENCIAR CONTEÚDOS <ArrowRight size={15} /></Link>
            </div>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="quick-links-title">
          <div className="mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-[var(--gold-bright)]" /><h2 id="quick-links-title" className="font-serif text-2xl text-[var(--ink)]">Atalhos da plataforma</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{dashboardNavigationItems.map((item, index) => <DashboardCard key={item.href} item={item} index={index} />)}</div>
        </section>
      </div>
    </PageShell>
  );
}
