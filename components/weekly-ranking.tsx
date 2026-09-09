"use client";

import { Crown, Gift, LoaderCircle, Medal, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { XpRankInsignia } from "@/components/xp-rank-insignia";
import { loadWeeklyRanking, type WeeklyRankingEntry, type WeeklyRankingPayload } from "@/lib/xp-system";
import { listenStudyUpdated } from "@/lib/study-database";

export function WeeklyRanking() {
  const [data, setData] = useState<WeeklyRankingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      loadWeeklyRanking(250).then((next) => {
        if (!alive) return;
        setData(next);
        setErrorMessage(null);
      }).catch((error) => {
        if (alive) setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o ranking.");
      }).finally(() => {
        if (alive) setLoading(false);
      });
    };
    refresh();
    const unlisten = listenStudyUpdated(refresh);
    return () => { alive = false; unlisten(); };
  }, []);

  const podium = useMemo(() => {
    const leaders = data?.leaders ?? [];
    return [leaders[1] ?? null, leaders[0] ?? null, leaders[2] ?? null] as Array<WeeklyRankingEntry | null>;
  }, [data]);

  if (loading && !data) {
    return <div className="grid min-h-[320px] place-items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)]"><LoaderCircle className="animate-spin text-[var(--gold-bright)]" size={24} /></div>;
  }

  if (!data) {
    return <div className="rounded-[24px] border border-red-500/25 bg-red-500/[.06] p-6 text-sm text-red-300">{errorMessage || "Ranking indisponível."}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#d2a64e]/28 bg-[#08090b] p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,.28)] sm:p-8">
        <div className="pointer-events-none absolute -right-2 -top-14 text-[9rem] font-black leading-none text-white/[.025] sm:text-[14rem]">TOP</div>
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-[#e6bd67]"><Trophy size={15} /> RANKING SEMANAL TITÃ</span>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.035em] sm:text-6xl">Quem mais se dedicou esta semana.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/48">O ranking usa o XP conquistado dentro da plataforma durante a semana atual. Acertos, aulas, listas e nivelamentos entram na disputa.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[330px]">
            <Metric icon={Users} label="PARTICIPANTES" value={String(data.participants)} />
            <Metric icon={Zap} label="SEU XP SEMANAL" value={`+${(data.me?.weekly_xp ?? 0).toLocaleString("pt-BR")}`} />
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap gap-2 text-[9px] font-bold tracking-[.06em] text-white/38">
          <span className="rounded-full border border-white/10 px-3 py-1.5">SEMANA {formatDate(data.week_start)} → {formatDate(data.week_end)}</span>
          {data.me ? <span className="rounded-full border border-[#d2a64e]/25 bg-[#d2a64e]/[.07] px-3 py-1.5 text-[#e6bd67]">SUA POSIÇÃO: #{data.me.position}</span> : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">PÓDIO DA SEMANA</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Top 3 da dedicação.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrizeMini place="1º" weeks={3} />
            <PrizeMini place="2º" weeks={2} />
            <PrizeMini place="3º" weeks={1} />
          </div>
        </div>

        <div className="mt-8 grid items-end gap-4 lg:grid-cols-3">
          <PodiumCard entry={podium[0]} place={2} />
          <PodiumCard entry={podium[1]} place={1} />
          <PodiumCard entry={podium[2]} place={3} />
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5 sm:p-6">
          <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">CLASSIFICAÇÃO GLOBAL</span>
          <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Todos os alunos.</h2>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">A posição é recalculada pelo XP da semana. Em empate, o XP total e a progressão geral servem como desempate.</p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {data.leaders.map((entry) => (
            <div key={`${entry.position}-${entry.display_name}`} className={`grid gap-3 px-4 py-4 sm:grid-cols-[64px_minmax(0,1fr)_120px_110px] sm:items-center sm:px-6 ${entry.is_me ? "bg-[color-mix(in_srgb,var(--gold)_7%,transparent)]" : ""}`}>
              <div className="flex items-center gap-2">
                <strong className={`font-serif text-2xl ${entry.position <= 3 ? "text-[var(--gold-bright)]" : "text-[var(--muted)]"}`}>#{entry.position}</strong>
                {entry.position === 1 ? <Crown size={15} className="text-amber-400" /> : entry.position <= 3 ? <Medal size={15} className="text-[var(--gold-bright)]" /> : null}
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <XpRankInsignia rank={entry.rank} level={entry.level} size="sm" />
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-[var(--ink)]">{entry.display_name}{entry.is_me ? " · VOCÊ" : ""}</strong>
                  <span className="mt-1 block text-[9px] font-bold tracking-[.06em] text-[var(--muted)]">{entry.rank.title.toUpperCase()} · NÍVEL {entry.level}</span>
                </div>
              </div>
              <div>
                <span className="block text-[8px] font-black tracking-[.1em] text-[var(--muted)]">XP DA SEMANA</span>
                <strong className="mt-1 block text-sm text-[var(--gold-bright)]">+{entry.weekly_xp.toLocaleString("pt-BR")} XP</strong>
              </div>
              <div className="sm:text-right">
                {entry.prize_weeks > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[.07] px-3 py-1.5 text-[8px] font-black tracking-[.08em] text-emerald-400"><Gift size={12} /> {entry.prize_weeks} {entry.prize_weeks === 1 ? "SEMANA" : "SEMANAS"}</span>
                ) : <span className="text-[8px] font-bold text-[var(--muted)]">—</span>}
              </div>
            </div>
          ))}
        </div>

        {data.me && !data.leaders.some((entry) => entry.is_me) ? (
          <div className="border-t border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_6%,var(--surface))] p-4 text-xs text-[var(--muted)]">Sua posição atual é <strong className="text-[var(--gold-bright)]">#{data.me.position}</strong>, com <strong className="text-[var(--ink)]">{data.me.weekly_xp.toLocaleString("pt-BR")} XP</strong> nesta semana.</div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-[#d2a64e]/25 bg-[color-mix(in_srgb,var(--gold)_5%,var(--surface))] p-5">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 shrink-0 text-[var(--gold-bright)]" size={18} />
          <div>
            <strong className="text-sm text-[var(--ink)]">Premiação semanal</strong>
            <p className="mt-1 text-xs leading-6 text-[var(--muted)]">1º lugar: 3 semanas grátis de Mentoria Titã · 2º lugar: 2 semanas · 3º lugar: 1 semana. A classificação exibida aqui é a base oficial do ranking semanal.</p>
          </div>
        </div>
      </section>

      {errorMessage ? <p className="text-center text-xs text-red-400">{errorMessage}</p> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><span className="flex items-center gap-1.5 text-[8px] font-black tracking-[.11em] text-white/35"><Icon size={12} /> {label}</span><strong className="mt-1 block font-serif text-xl">{value}</strong></div>;
}

function PrizeMini({ place, weeks }: { place: string; weeks: number }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[8px] font-black tracking-[.06em] text-[var(--muted)]"><Gift size={11} className="text-[var(--gold-bright)]" /> {place}: {weeks} {weeks === 1 ? "SEMANA" : "SEMANAS"}</span>;
}

function PodiumCard({ entry, place }: { entry: WeeklyRankingEntry | null; place: 1 | 2 | 3 }) {
  const height = place === 1 ? "min-h-[300px]" : place === 2 ? "min-h-[248px]" : "min-h-[222px]";
  const accent = place === 1 ? "border-amber-400/30 bg-amber-400/[.045]" : place === 2 ? "border-slate-300/20 bg-slate-200/[.03]" : "border-orange-400/20 bg-orange-400/[.025]";
  const Icon = place === 1 ? Crown : Medal;

  if (!entry) {
    return <div className={`grid ${height} place-items-center rounded-[26px] border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-center text-[10px] text-[var(--muted)]`}>Aguardando competidor para o {place}º lugar.</div>;
  }

  return (
    <div className={`relative flex ${height} flex-col items-center justify-end overflow-hidden rounded-[26px] border p-5 text-center ${accent} ${place === 1 ? "lg:-translate-y-4" : ""}`}>
      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-current/15 px-2.5 py-1 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]"><Icon size={12} /> {place}º LUGAR</span>
      <div className="mb-4"><XpRankInsignia rank={entry.rank} level={entry.level} size={place === 1 ? "lg" : "md"} /></div>
      <strong className="max-w-full truncate font-serif text-2xl text-[var(--ink)]">{entry.display_name}</strong>
      <span className="mt-1 text-[9px] font-bold tracking-[.06em] text-[var(--muted)]">{entry.rank.title.toUpperCase()} · NÍVEL {entry.level}</span>
      <strong className="mt-3 text-lg text-[var(--gold-bright)]">+{entry.weekly_xp.toLocaleString("pt-BR")} XP</strong>
      {entry.prize_weeks > 0 ? (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[.07] px-3 py-1.5 text-[8px] font-black tracking-[.08em] text-emerald-400"><Gift size={12} /> {entry.prize_weeks} {entry.prize_weeks === 1 ? "SEMANA GRÁTIS" : "SEMANAS GRÁTIS"}</span>
      ) : (
        <span className="mt-3 text-[8px] font-black tracking-[.08em] text-[var(--muted)]">SEM XP SUFICIENTE PARA PREMIAÇÃO</span>
      )}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}
