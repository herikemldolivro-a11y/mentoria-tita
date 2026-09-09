"use client";

import { Activity, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Clock3, LoaderCircle, Target, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadPerformanceWindow, type PerformancePayload, type PerformanceWindow } from "@/lib/performance-system";

const WINDOWS: Array<{ key: PerformanceWindow; label: string; short: string }> = [
  { key: "24h", label: "Últimas 24 horas", short: "24H" },
  { key: "7d", label: "Últimos 7 dias", short: "7 DIAS" },
  { key: "30d", label: "Últimos 30 dias", short: "30 DIAS" },
];

function accuracyTone(value: number) {
  if (value >= 80) return "text-emerald-400";
  if (value >= 60) return "text-violet-300";
  return "text-rose-400";
}

function progressTone(value: number) {
  if (value >= 80) return "bg-emerald-400";
  if (value >= 60) return "bg-violet-400";
  return "bg-rose-400";
}

export function PerformanceDashboard() {
  const [window, setWindow] = useState<PerformanceWindow>("7d");
  const [data, setData] = useState<PerformancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubjects, setShowSubjects] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loadPerformanceWindow(window)
      .then((next) => alive && setData(next))
      .catch((reason) => alive && setError(reason instanceof Error ? reason.message : "Não foi possível carregar seu desempenho."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [window]);

  const selectedLabel = WINDOWS.find((item) => item.key === window)?.label ?? "Últimos 7 dias";
  const best = useMemo(() => [...(data?.subjects ?? [])].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0] ?? null, [data]);

  return (
    <div data-mt-performance-v19="1" className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-violet-400/20 bg-[linear-gradient(145deg,rgba(124,58,237,.09),rgba(10,10,14,.96)_42%)] shadow-[0_30px_80px_rgba(0,0,0,.22)]">
        <div className="flex flex-col gap-5 border-b border-white/5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-violet-300"><BarChart3 size={16}/> DESEMPENHO</span>
            <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Seu desempenho, no período certo.</h1>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-[var(--muted)]">Alterne entre 24 horas, 7 dias e 30 dias. O relatório respeita o reinício do seu histórico feito em 07 de setembro.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-violet-400/15 bg-black/20 p-2">
            {WINDOWS.map((item) => {
              const active = item.key === window;
              return <button key={item.key} type="button" onClick={() => setWindow(item.key)} className={`min-h-10 rounded-xl px-4 text-[9px] font-black tracking-[.12em] transition ${active ? "bg-violet-500 text-white shadow-[0_10px_30px_rgba(124,58,237,.28)]" : "text-[var(--muted)] hover:bg-violet-400/10 hover:text-violet-200"}`}>{item.short}</button>;
            })}
          </div>
        </div>

        {loading ? <div className="flex min-h-52 items-center justify-center gap-3 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle className="animate-spin text-violet-400" size={20}/> CARREGANDO {selectedLabel.toUpperCase()}</div> : null}
        {error ? <div className="m-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}
        {!loading && data ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={<Activity size={18}/>} label="QUESTÕES" value={String(data.total_answered)} detail={selectedLabel}/>
            <Stat icon={<CheckCircle2 size={18}/>} label="ACERTOS" value={String(data.correct_count)} detail={data.total_answered ? `${Math.round(data.correct_count * 100 / data.total_answered)}% das respostas` : "Sem respostas no período"} tone="emerald"/>
            <Stat icon={<XCircle size={18}/>} label="ERROS" value={String(data.incorrect_count)} detail={data.total_answered ? `${Math.round(data.incorrect_count * 100 / data.total_answered)}% das respostas` : "Sem respostas no período"} tone="rose"/>
            <Stat icon={<Target size={18}/>} label="ACERTO" value={`${Number(data.accuracy || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} detail={best ? `Melhor: ${best.subject_name}` : "Comece uma lista para gerar dados"} tone="violet"/>
          </div>
        ) : null}
      </section>

      {!loading && data ? (
        <section className="rounded-[28px] border border-violet-400/18 bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[9px] font-black tracking-[.18em] text-violet-400">DESEMPENHO POR MATÉRIA</span>
              <h2 className="mt-2 font-serif text-2xl text-[var(--ink)] sm:text-3xl">Onde você está forte e onde precisa reagir.</h2>
            </div>
            <button type="button" onClick={() => setShowSubjects((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[.08] px-4 text-[9px] font-black tracking-[.12em] text-violet-300 transition hover:bg-violet-400/[.13]">{showSubjects ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {showSubjects ? "OCULTAR MATÉRIAS" : "VER MATÉRIAS"}</button>
          </div>
          {showSubjects ? (
            data.subjects.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{data.subjects.map((subject) => <div key={subject.subject_name} className="rounded-2xl border border-white/5 bg-black/20 p-4"><div className="flex items-start justify-between gap-4"><div><strong className="text-sm text-[var(--ink)]">{subject.subject_name}</strong><span className="mt-1 block text-[9px] text-[var(--muted)]">{subject.total} feitas · {subject.correct} acertos · {subject.incorrect} erros</span></div><strong className={`font-serif text-2xl ${accuracyTone(subject.accuracy)}`}>{Number(subject.accuracy).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.06]"><span className={`block h-full rounded-full ${progressTone(subject.accuracy)}`} style={{ width: `${Math.max(0, Math.min(100, subject.accuracy))}%` }}/></div></div>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-violet-400/20 p-7 text-center text-xs text-[var(--muted)]">Nenhuma questão respondida neste período.</div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Stat({ icon, label, value, detail, tone = "default" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "default" | "emerald" | "rose" | "violet" }) {
  const toneClass = tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : tone === "violet" ? "text-violet-300" : "text-[var(--ink)]";
  return <div className="border-t border-white/5 p-5 sm:p-6 xl:border-r xl:last:border-r-0"><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-[var(--muted)]">{icon} {label}</span><strong className={`mt-3 block font-serif text-4xl ${toneClass}`}>{value}</strong><span className="mt-2 block text-[9px] text-[var(--muted)]"><Clock3 className="mr-1 inline" size={11}/>{detail}</span></div>;
}
