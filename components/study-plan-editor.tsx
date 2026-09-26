"use client";

import { ArrowLeft, Check, Clock3, Gauge, LoaderCircle, RefreshCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type StudyPlanEditorSubject = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  recommendedWeight: number;
  minimumWeight: number;
  currentWeight: number;
};

export function StudyPlanEditor({
  contestSlug,
  contestName,
  contestSigla,
  displayName,
  initialDailyMinutes,
  currentWeeks,
  subjects,
}: {
  contestSlug: string;
  contestName: string;
  contestSigla: string;
  displayName: string;
  initialDailyMinutes: number;
  currentWeeks: number | null;
  subjects: StudyPlanEditorSubject[];
}) {
  const router = useRouter();
  const [dailyMinutes, setDailyMinutes] = useState(initialDailyMinutes || 240);
  const [weights, setWeights] = useState<Record<string, number>>(() => Object.fromEntries(subjects.map((subject) => [subject.slug, subject.currentWeight])));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedWeeks, setSavedWeeks] = useState<number | null>(null);

  const baseProjection = dailyMinutes <= 240 ? 12 : dailyMinutes <= 360 ? 8 : 6;
  const hoursLabel = `${Math.round((dailyMinutes / 60) * 10) / 10}h`;
  const hasCustomWeight = useMemo(() => subjects.some((subject) => Math.abs((weights[subject.slug] ?? subject.currentWeight) - subject.recommendedWeight) > 0.01), [subjects, weights]);

  async function saveAndRecalculate() {
    if (saving) return;
    setSaving(true);
    setErrorMessage(null);
    setSavedWeeks(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("complete_dynamic_onboarding", {
        p_contest_slug: contestSlug,
        p_daily_minutes: dailyMinutes,
        p_weights: weights,
        p_name: displayName,
      });
      if (error) throw error;
      const payload = data as { schedule_weeks?: number } | null;
      setSavedWeeks(Number(payload?.schedule_weeks ?? baseProjection));
      window.setTimeout(() => {
        router.replace("/cronograma");
        router.refresh();
      }, 650);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível recalcular o Plano de Estudos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="tita-panel-strong relative overflow-hidden rounded-[30px] p-6 sm:p-8">
        <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-[.16]" />
        <div className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full bg-blue-500/[.05] blur-[105px]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/cronograma" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/38 transition hover:text-white/70"><ArrowLeft size={13} /> VOLTAR AO PLANO</Link>
            <span className="tita-kicker mt-5 block">{contestSigla} · AJUSTE INDIVIDUAL</span>
            <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-[.96] tracking-[-.04em] text-white sm:text-5xl">Editar Plano de Estudos</h1>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-white/44">Altere sua carga diária ou o peso das matérias. A Titã recalcula as semanas automaticamente para encaixar toda a matriz ativa até a última semana do novo plano.</p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.11em] text-white/32">PLANO ATUAL</span><strong className="mt-1 block font-serif text-2xl text-white">{currentWeeks ?? "—"} semanas</strong></div>
            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.11em] text-white/32">BASE NOVA</span><strong className="mt-1 block font-serif text-2xl text-white">{baseProjection} semanas</strong></div>
          </div>
        </div>
      </section>

      <section className="tita-panel rounded-[28px] p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-stretch">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-[var(--tita-accent)]"><Clock3 size={15} /> CARGA DIÁRIA</span>
            <h2 className="mt-2 font-serif text-3xl text-white">Quanto tempo cabe no seu dia?</h2>
            <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/36">O cálculo considera teoria, prática de questões e o descanso previsto pela matriz. A duração final é recalculada pelo volume real de aulas.</p>
            <div className="mt-6 rounded-[22px] border border-white/[.08] bg-black/20 p-5">
              <div className="flex items-end justify-between gap-4"><span className="text-[8px] font-black tracking-[.12em] text-white/30">2H A 8H POR DIA</span><strong className="font-serif text-4xl text-white">{hoursLabel}</strong></div>
              <input aria-label="Horas por dia" className="mt-6 w-full accent-[#7367ff]" type="range" min={120} max={480} step={60} value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} />
              <div className="mt-2 flex justify-between text-[8px] font-bold text-white/22"><span>2H</span><span>4H</span><span>6H</span><span>8H</span></div>
            </div>
          </div>
          <div className="rounded-[24px] border border-blue-300/[.10] bg-[linear-gradient(145deg,rgba(54,114,255,.07),rgba(115,65,255,.055))] p-5">
            <Gauge size={20} className="text-blue-200/75" />
            <span className="mt-5 block text-[8px] font-black tracking-[.12em] text-white/30">COM ESSA CARGA</span>
            <strong className="mt-1 block font-serif text-3xl text-white">~{baseProjection} semanas</strong>
            <p className="mt-3 text-[9px] leading-5 text-white/34">Essa é a referência inicial. O motor usa todas as aulas ativas e pode ajustar a duração para não deixar matéria de fora.</p>
          </div>
        </div>
      </section>

      <section className="tita-panel rounded-[28px] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-[var(--tita-accent)]"><SlidersHorizontal size={15} /> PESO DAS MATÉRIAS</span>
            <h2 className="mt-2 font-serif text-3xl text-white">Ajuste sem destruir a matriz.</h2>
            <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/36">O marcador recomendado vem da matriz da Mentoria. Você pode mudar a ênfase, mas o mínimo de cobertura de cada matéria continua protegido.</p>
          </div>
          {hasCustomWeight ? <span className="rounded-full border border-violet-300/15 bg-violet-300/[.05] px-3 py-1.5 text-[8px] font-black tracking-[.1em] text-violet-100/60">AJUSTES PERSONALIZADOS</span> : <span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[8px] font-black tracking-[.1em] text-white/35">PESOS RECOMENDADOS</span>}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {subjects.map((subject) => {
            const value = weights[subject.slug] ?? subject.currentWeight;
            const marker = Math.max(0, Math.min(100, ((subject.recommendedWeight - subject.minimumWeight) / (2.5 - subject.minimumWeight)) * 100));
            return (
              <div key={subject.id} className="rounded-[22px] border border-white/[.07] bg-white/[.018] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div><span className="text-[8px] font-black tracking-[.12em] text-white/30">{subject.shortName}</span><strong className="mt-1 block text-sm text-white/84">{subject.name}</strong></div>
                  <span className="rounded-xl border border-white/[.09] bg-white/[.04] px-2.5 py-1.5 text-[9px] font-black text-white/64">{value.toFixed(2)}×</span>
                </div>
                <div className="relative mt-5 pt-4">
                  <span className="absolute top-0 -translate-x-1/2 text-[7px] font-black tracking-[.08em] text-emerald-200/60" style={{ left: `${marker}%` }}>RECOM.</span>
                  <span className="pointer-events-none absolute top-[27px] h-3 w-px -translate-x-1/2 bg-emerald-300/70 shadow-[0_0_10px_rgba(110,231,183,.3)]" style={{ left: `${marker}%` }} />
                  <input aria-label={`Peso de ${subject.name}`} className="w-full accent-[#7066ff]" type="range" min={subject.minimumWeight} max={2.5} step={0.05} value={value} onChange={(event) => setWeights((current) => ({ ...current, [subject.slug]: Number(event.target.value) }))} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[8px] text-white/22"><span>MÍN. {subject.minimumWeight.toFixed(2)}×</span><button type="button" className="font-black text-white/40 transition hover:text-emerald-200/75" onClick={() => setWeights((current) => ({ ...current, [subject.slug]: subject.recommendedWeight }))}>USAR RECOMENDADO {subject.recommendedWeight.toFixed(2)}×</button></div>
              </div>
            );
          })}
        </div>
      </section>

      {errorMessage ? <div className="rounded-2xl border border-red-400/20 bg-red-400/[.07] px-4 py-3 text-xs text-red-200">{errorMessage}</div> : null}
      {savedWeeks ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-3 text-xs text-emerald-100"><Check size={17} /> Plano recalculado em {savedWeeks} semanas. Abrindo o novo Plano de Estudos…</div> : null}

      <div className="flex flex-col gap-3 border-t border-white/[.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[9px] leading-5 text-white/28">Seu histórico de questões, respostas, revisões e aulas concluídas não é apagado. Apenas a distribuição do Plano de Estudos é recalculada.</p>
        <button type="button" disabled={saving} onClick={saveAndRecalculate} className="tita-primary-button min-w-[240px] disabled:cursor-wait disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCcw size={15} />}{saving ? "RECALCULANDO..." : "SALVAR E RECALCULAR PLANO"}</button>
      </div>
    </div>
  );
}
