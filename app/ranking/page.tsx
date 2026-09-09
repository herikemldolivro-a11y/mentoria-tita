import { Trophy } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { WeeklyRanking } from "@/components/weekly-ranking";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  await requireAuthenticatedUser();

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <header className="mb-7 border-b border-[var(--border)] pb-6">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><Trophy size={16} /> RANKING</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Liga semanal Titã.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Dedicação vira XP, XP vira posição. O pódio é recalculado com todos os usuários ativos da plataforma.</p>
        </header>
        <WeeklyRanking />
      </div>
    </PageShell>
  );
}
