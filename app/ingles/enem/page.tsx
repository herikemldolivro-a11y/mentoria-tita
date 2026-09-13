import { ArrowRight, BookMarked, ImageIcon, Languages } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { enemEnglishDays } from "@/lib/enem-english-data";

export const dynamic = "force-dynamic";

export default async function EnemEnglishHubPage() {
  await requireAuthenticatedUser();
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <section className="overflow-hidden rounded-[30px] border border-sky-400/15 bg-[radial-gradient(circle_at_85%_0%,rgba(56,189,248,.12),transparent_40%),#08090d] p-6 text-white sm:p-8">
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.17em] text-sky-300"><Languages size={15}/> INGLÊS · ENEM 40 DIAS</span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-none tracking-[-.04em] sm:text-5xl">20 leituras reais. Duas por dia.</h1>
          <p className="mt-4 max-w-3xl text-xs leading-6 text-white/45">Primeiro lote: 10 dias. A questão só é liberada depois da leitura. Palavras podem ser consultadas ao passar o mouse e salvas com um clique.</p>
          <Link href="/ingles/enem/vocabulario" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 text-[9px] font-black tracking-[.09em] text-emerald-200 transition hover:bg-emerald-300/[.10]"><BookMarked size={15}/> ABRIR PALAVRAS SALVAS</Link>
        </section>

        <div className="mt-6 space-y-4">
          {enemEnglishDays.map((day)=><section key={day.day} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><span className="text-[8px] font-black tracking-[.14em] text-sky-500">DIA {String(day.day).padStart(2,"0")}</span><h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Duas leituras do dia</h2></div><span className="text-[8px] font-black text-[var(--muted)]">2 TEXTOS</span></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {day.readings.map((reading)=><Link key={reading.id} href={`/ingles/enem/${reading.id}`} className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-sky-400/25 hover:bg-sky-400/[.025]">
                <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black tracking-[.1em] text-sky-500">LEITURA {reading.slot}/2 · {reading.year}</span>{reading.kind === "visual" ? <ImageIcon size={13} className="text-[var(--muted)]"/> : null}</div>
                <strong className="mt-2 block text-sm leading-5 text-[var(--ink)]">{reading.title}</strong>
                <span className="mt-3 inline-flex items-center gap-2 text-[8px] font-black text-[var(--muted)]">ABRIR LEITURA <ArrowRight size={12} className="transition group-hover:translate-x-1"/></span>
              </Link>)}
            </div>
          </section>)}
        </div>
      </div>
    </PageShell>
  );
}
