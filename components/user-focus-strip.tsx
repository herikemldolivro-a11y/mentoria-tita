import { Flame, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { ContestLogo } from "@/components/contest-logo";
import type { FocusContest } from "@/lib/auth";

export function UserFocusStrip({
  displayName,
  focusContest,
  loginStreak,
}: {
  displayName: string;
  focusContest: FocusContest;
  loginStreak: number;
}) {
  return (
    <section className="border-b border-white/[.07] bg-[#08090b]/92">
      <div className="mx-auto grid w-full max-w-[1180px] gap-2 px-4 py-3 sm:grid-cols-[1.15fr_1.65fr_.85fr] sm:px-6">
        <div className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.018] px-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.1] bg-white/[.03] text-[var(--tita-accent)]"><UserRound size={20} /></span>
          <div className="min-w-0"><span className="block text-[9px] font-black tracking-[0.18em] text-white/30">MENTORADO</span><strong className="mt-1 block truncate font-serif text-xl text-white/88">{displayName}</strong></div>
        </div>

        <div className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-white/[.1] bg-[linear-gradient(110deg,rgba(255,255,255,.045),rgba(255,255,255,.016)_68%)] px-4">
          <ContestLogo logoPath={focusContest.logo_path} sigla={focusContest.sigla} nome={focusContest.nome} size="sm" />
          <div className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.18em] text-[var(--tita-accent)]"><ShieldCheck size={13} /> CONCURSO FOCO</span><strong className="mt-1 block truncate font-serif text-lg text-white/88">{focusContest.nome}</strong></div>
          <Link href="/concurso" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-[9px] font-black tracking-[0.1em] text-white/38 transition hover:border-white/[.15] hover:text-white/80"><RefreshCw size={14} /><span className="hidden lg:inline">TROCAR</span></Link>
        </div>

        <div className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.018] px-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.1] bg-white/[.035] text-[var(--tita-accent)]"><Flame size={21} /></span>
          <div><span className="block text-[9px] font-black tracking-[0.18em] text-white/30">SEQUÊNCIA</span><strong className="mt-1 block font-serif text-xl text-white/88">{loginStreak} {loginStreak === 1 ? "dia" : "dias"}</strong></div>
        </div>
      </div>
    </section>
  );
}
