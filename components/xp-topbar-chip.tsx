"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

export function XpTopbarChip() {
  const [data, setData] = useState<XpDashboard | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let alive = true;
    const refresh = () => loadXpDashboard().then((next) => { if (alive) setData(next); }).catch(() => undefined);
    refresh();
    const unlisten = listenStudyUpdated(refresh);
    return () => { alive = false; unlisten(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!data) return null;

  const modal = open && mounted ? createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-7" aria-labelledby="mt-rank-dialog-title">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-label="Fechar rankings"
        tabIndex={-1}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Todos os rankings"
        className="relative z-10 max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-[28px] border border-white/15 bg-[#0b0c0f] text-white shadow-[0_36px_120px_rgba(0,0,0,.72)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-white/10 bg-[#0b0c0f]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
          <div>
            <span className="text-[9px] font-black tracking-[.2em] text-[#d9ab50]">JORNADA TITÃ</span>
            <h3 id="mt-rank-dialog-title" className="mt-1 font-serif text-2xl sm:text-3xl">Todos os rankings</h3>
            <p className="mt-2 max-w-xl text-[10px] leading-5 text-white/48">A cada 5 níveis, uma nova insígnia. Diamante, Rubi e Titã fecham a progressão.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar rankings" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.025] text-white/55 transition hover:border-white/20 hover:text-white"><X size={17} /></button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
          {allRanks.map((rank) => {
            const current = rank.tier === data.rank.tier;
            const levelForBadge = current ? data.level : rank.min_level;
            const range = rank.max_level ? `Níveis ${rank.min_level}–${rank.max_level}` : `Nível ${rank.min_level}+`;
            return (
              <div key={rank.slug} className={`flex min-h-[92px] items-center gap-4 rounded-[20px] border p-4 ${current ? "border-[#d2a64e]/55 bg-[#d2a64e]/[.085] shadow-[inset_0_0_32px_rgba(210,166,78,.05)]" : "border-white/8 bg-white/[.018]"}`}>
                <XpRankInsignia rank={rank} level={levelForBadge} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className={`text-[12px] ${rank.tier === 8 ? "text-violet-300" : rank.tier === 7 ? "text-rose-300" : rank.tier === 6 ? "text-sky-200" : "text-white/90"}`}>{rank.title}</strong>
                    {current ? <span className="rounded-full bg-[#d2a64e]/15 px-2 py-1 text-[7px] font-black tracking-[.1em] text-[#e6bd67]">ATUAL</span> : null}
                  </div>
                  <span className="mt-1.5 block text-[9px] font-bold tracking-[.04em] text-white/38">{range}</span>
                  {current ? <span className="mt-2 block text-[8px] font-black tracking-[.08em] text-[#e6bd67]">VOCÊ ESTÁ NO NÍVEL {data.level}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div className="mt-xp-topbar-chip hidden lg:block">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex h-12 min-w-[118px] items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-2 py-1.5 text-left transition hover:border-[#d2a64e]/35 hover:bg-white/[.045]"
          title="Ver todos os rankings"
        >
          <XpRankInsignia rank={data.rank} level={data.level} size="sm" />
          <div className="min-w-0 flex-1 leading-none">
            <span className="block text-[7px] font-black tracking-[.08em] text-white/35">NÍVEL {data.level}</span>
            <strong className={`mt-1 block max-w-[68px] truncate text-[9px] ${data.rank.tier === 8 ? "text-violet-200" : "text-[#e6bd67]"}`}>{data.rank.title}</strong>
          </div>
          <ChevronDown size={12} className="shrink-0 text-white/35" />
        </button>
      </div>
      {modal}
    </>
  );
}
