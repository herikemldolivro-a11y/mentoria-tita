"use client";

import { Award, LoaderCircle, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { XpRankInsignia } from "@/components/xp-rank-insignia";
import { loadXpDashboard, type RankInfo, type XpDashboard } from "@/lib/xp-system";
import { listenStudyUpdated } from "@/lib/study-database";

const allRanks: RankInfo[] = [
  { tier: 1, slug: "recruta", title: "Recruta", min_level: 1, max_level: 5 },
  { tier: 2, slug: "iniciante", title: "Iniciante", min_level: 6, max_level: 10 },
  { tier: 3, slug: "operacional", title: "Operacional", min_level: 11, max_level: 15 },
  { tier: 4, slug: "especialista", title: "Especialista", min_level: 16, max_level: 20 },
  { tier: 5, slug: "elite", title: "Elite", min_level: 21, max_level: 25 },
  { tier: 6, slug: "diamante", title: "Diamante", min_level: 26, max_level: 30 },
  { tier: 7, slug: "rubi", title: "Rubi", min_level: 31, max_level: 35 },
  { tier: 8, slug: "tita-violeta", title: "Titã", min_level: 36, max_level: null },
];

export function XpCommandCenter() {
  const [data, setData] = useState<XpDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      loadXpDashboard().then((next) => {
        if (alive) setData(next);
      }).catch(() => undefined).finally(() => {
        if (alive) setLoading(false);
      });
    };
    refresh();
    const unlisten = listenStudyUpdated(refresh);
    return () => { alive = false; unlisten(); };
  }, []);

  const accuracy = useMemo(() => {
    if (!data?.answers_total) return 0;
    return Math.round((data.answers_correct / data.answers_total) * 1000) / 10;
  }, [data]);

  const nextRanks = useMemo(
    () => data ? allRanks.filter((rank) => rank.tier > data.rank.tier) : [],
    [data],
  );

  if (loading && !data) {
    return <section className="mb-7 grid min-h-28 place-items-center rounded-[24px] border border-[var(--border)] bg-[var(--surface)]"><LoaderCircle className="animate-spin text-[var(--gold-bright)]" size={20} /></section>;
  }
  if (!data) return null;

  return (
    <section className="mb-7 overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[#0a0b0d] text-white shadow-[0_24px_70px_rgba(0,0,0,.22)]">
      <div className="grid xl:grid-cols-[1.32fr_.68fr]">
        <div className="relative p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-4 -top-8 text-[9rem] font-black leading-none text-white/[.025]">XP</div>

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <XpRankInsignia rank={data.rank} level={data.level} size="lg" />
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#e6bd67]"><Zap size={14} /> EVOLUÇÃO TITÃ</span>
              <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                <h2 className={`font-serif text-3xl sm:text-4xl ${data.rank.tier === 8 ? "text-violet-200" : ""}`}>{data.rank.title}</h2>
                <strong className="pb-1 text-sm text-white/55">Nível {data.level}</strong>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full border border-white/10 bg-white/[.05]">
                <span className="block h-full rounded-full bg-[linear-gradient(90deg,#b4832e,#e7bd64,#fff0b0)] transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, data.progress_percent))}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-[9px] font-bold tracking-[.08em] text-white/45">
                <span>{data.level_xp.toLocaleString("pt-BR")} / {data.level_required.toLocaleString("pt-BR")} XP neste nível</span>
                <span>Faltam {data.xp_to_next.toLocaleString("pt-BR")} XP</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5 border-t border-white/8 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[8px] font-black tracking-[.16em] text-white/35">PRÓXIMOS NÍVEIS</span>
                <p className="mt-1 text-[9px] text-white/38">{nextRanks.length ? "Insígnias que ainda faltam conquistar." : "Você chegou ao rank máximo da jornada."}</p>
              </div>
              <Link href="/ranking" className="shrink-0 text-[8px] font-black tracking-[.1em] text-[#e6bd67] transition hover:text-[#ffe19a]">VER RANKING →</Link>
            </div>
            {nextRanks.length ? (
              <div className="mt-3 flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {nextRanks.map((rank) => (
                  <div key={rank.slug} className="flex min-w-[108px] items-center gap-2 bg-transparent">
                    <XpRankInsignia rank={rank} level={rank.min_level} size="sm" />
                    <div className="min-w-0">
                      <strong className={`block truncate text-[9px] ${rank.tier === 8 ? "text-violet-200" : rank.tier === 7 ? "text-rose-300" : rank.tier === 6 ? "text-sky-200" : "text-white/72"}`}>{rank.title}</strong>
                      <span className="mt-1 block text-[7px] font-bold tracking-[.06em] text-white/30">{rank.max_level ? `NÍVEIS ${rank.min_level}–${rank.max_level}` : `NÍVEL ${rank.min_level}+`}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative z-10 mt-5 grid gap-2 sm:grid-cols-3">
            <Stat icon={Zap} label="XP TOTAL" value={data.total_xp.toLocaleString("pt-BR")} />
            <Stat icon={Target} label="XP HOJE" value={`+${data.today_xp.toLocaleString("pt-BR")}`} />
            <Stat icon={Trophy} label="ACERTO GLOBAL" value={`${accuracy.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} />
          </div>
        </div>

        <aside className="border-t border-white/10 bg-white/[.018] p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div className="flex items-center gap-2"><Award size={16} className="text-[#e6bd67]" /><h3 className="text-xs font-black tracking-[.08em]">CONQUISTAS RECENTES</h3></div>
          <div className="mt-5 flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.recent_achievements.length ? data.recent_achievements.map((item) => {
              const achievementRank = rankForTier(item.tier, item.title);
              return (
                <div key={item.code} className="min-w-[92px] bg-transparent text-center">
                  <div className="flex justify-center bg-transparent"><XpRankInsignia rank={achievementRank} level={achievementRank.min_level} size="md" /></div>
                  <strong className={`mt-2 block text-[10px] leading-4 ${achievementRank.tier === 8 ? "text-violet-200" : ""}`}>{item.title}</strong>
                  <span className="mt-1 block text-[7px] font-black tracking-[.1em] text-white/28">RANK CONQUISTADO</span>
                </div>
              );
            }) : (
              <div className="text-[10px] leading-5 text-white/40">Sua primeira insígnia aparece assim que o sistema registrar o rank atual.</div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><span className="flex items-center gap-1.5 text-[8px] font-black tracking-[.12em] text-white/35"><Icon size={12} /> {label}</span><strong className="mt-1 block font-serif text-xl">{value}</strong></div>;
}

function rankForTier(tier: number, title: string) {
  const safeTier = Math.min(8, Math.max(1, tier));
  const min = [1, 1, 6, 11, 16, 21, 26, 31, 36][safeTier];
  const max = safeTier >= 8 ? null : min + 4;
  const slugs = ["", "recruta", "iniciante", "operacional", "especialista", "elite", "diamante", "rubi", "tita-violeta"];
  return { tier: safeTier, slug: slugs[safeTier] || "recruta", title: safeTier === 8 ? "Titã" : title, min_level: min, max_level: max };
}
