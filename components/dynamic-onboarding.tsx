"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Gauge, LoaderCircle, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type OnboardingSubject = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  recommendedWeight: number;
  minimumWeight: number;
};

export type OnboardingContest = {
  slug: string;
  sigla: string;
  name: string;
  subjects: OnboardingSubject[];
};

export function DynamicOnboarding({ contests, displayName, initialContestSlug }: { contests: OnboardingContest[]; displayName: string; initialContestSlug?: string | null }) {
  const router = useRouter();
  const initialIndex = initialContestSlug ? 1 : 0;
  const [step, setStep] = useState(initialIndex);
  const [contestSlug, setContestSlug] = useState(initialContestSlug ?? contests[0]?.slug ?? "");
  const [dailyMinutes, setDailyMinutes] = useState(240);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const contest = useMemo(() => contests.find((item) => item.slug === contestSlug) ?? contests[0] ?? null, [contests, contestSlug]);
  const selectedWeights = useMemo(() => {
    if (!contest) return {};
    return Object.fromEntries(contest.subjects.map((subject) => [subject.slug, weights[subject.slug] ?? subject.recommendedWeight]));
  }, [contest, weights]);

  const projectedWeeks = dailyMinutes <= 240 ? 12 : dailyMinutes <= 360 ? 8 : 6;

  function updateWeight(subject: OnboardingSubject, value: number) {
    setWeights((current) => ({ ...current, [subject.slug]: value }));
  }

  async function finish() {
    if (!contest || saving) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("complete_dynamic_onboarding", {
        p_contest_slug: contest.slug,
        p_daily_minutes: dailyMinutes,
        p_weights: selectedWeights,
        p_name: displayName,
      });
      if (error) throw error;
      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível gerar sua trilha agora.");
    } finally {
      setSaving(false);
    }
  }

  if (!contests.length) {
    return <div className="tita-panel rounded-[26px] p-6 text-sm text-[var(--muted)]">Nenhuma matriz de concurso está ativa no momento.</div>;
  }

  return (
    <div className="tita-panel-strong overflow-hidden rounded-[30px]">
      <div className="flex border-b border-white/[.07] px-5 py-4 sm:px-7">
        {["MISSÃO", "TEMPO", "PESO DAS MATÉRIAS"].map((label, index) => (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[9px] font-black ${index <= step ? "border-white/20 bg-white/[.09] text-white" : "border-white/[.07] text-white/25"}`}>{index < step ? <CheckCircle2 size={13} /> : index + 1}</span>
            <span className={`hidden text-[8px] font-black tracking-[.1em] sm:block ${index <= step ? "text-white/70" : "text-white/25"}`}>{label}</span>
            {index < 2 ? <span className="h-px flex-1 bg-white/[.07]" /> : null}
          </div>
        ))}
      </div>

      <div className="p-5 sm:p-7 lg:p-8">
        {step === 0 ? (
          <section>
            <span className="tita-kicker">PASSO 01 · CONCURSO</span>
            <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Qual é a sua missão?</h2>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-white/43">Escolha o concurso. A plataforma usa a matriz cadastrada para montar sua trilha.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contests.map((item) => {
                const selected = item.slug === contestSlug;
                return (
                  <button key={item.slug} type="button" onClick={() => { setContestSlug(item.slug); setWeights({}); }} className={`min-h-32 rounded-2xl border p-4 text-left transition ${selected ? "border-white/[.22] bg-white/[.08] shadow-[0_18px_50px_rgba(0,0,0,.25)]" : "border-white/[.07] bg-white/[.02] hover:border-white/[.13] hover:bg-white/[.04]"}`}>
                    <span className="text-[9px] font-black tracking-[.14em] text-[var(--tita-accent)]">{item.sigla}</span>
                    <strong className="mt-2 block font-serif text-xl text-white">{item.name}</strong>
                    <span className="mt-3 block text-[9px] text-white/35">{item.subjects.length} matérias na matriz</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section>
            <span className="tita-kicker">PASSO 02 · CARGA DIÁRIA</span>
            <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Quanto tempo você consegue estudar por dia?</h2>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-white/43">A carga aceita vai de 2 a 8 horas. O sistema distribui teoria, questões e pausas dentro desse limite.</p>
            <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_270px]">
              <div className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 sm:p-6">
                <div className="flex items-end justify-between gap-4"><span className="flex items-center gap-2 text-[9px] font-black tracking-[.12em] text-white/42"><Clock3 size={15} /> TEMPO POR DIA</span><strong className="font-serif text-4xl text-white">{dailyMinutes / 60}h</strong></div>
                <input aria-label="Horas de estudo por dia" className="mt-7 w-full accent-[#d8dadd]" type="range" min={120} max={480} step={60} value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} />
                <div className="mt-2 flex justify-between text-[8px] font-bold text-white/25"><span>2H</span><span>4H</span><span>6H</span><span>8H</span></div>
              </div>
              <div className="rounded-[24px] border border-white/[.09] bg-white/[.035] p-5">
                <Gauge size={20} className="text-[var(--tita-accent)]" />
                <span className="mt-4 block text-[8px] font-black tracking-[.13em] text-white/35">PROJEÇÃO INICIAL</span>
                <strong className="mt-1 block font-serif text-3xl text-white">{projectedWeeks} semanas</strong>
                <p className="mt-2 text-[9px] leading-5 text-white/32">A duração real pode ajustar um pouco conforme a quantidade de aulas da matriz.</p>
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 && contest ? (
          <section>
            <span className="tita-kicker">PASSO 03 · PRIORIDADE</span>
            <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Ajuste o peso das matérias.</h2>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-white/43">Já deixamos o peso recomendado da matriz. Só mexa se quiser dar mais ou menos espaço para uma matéria específica.</p>
            <div className="mt-6 grid gap-2 lg:grid-cols-2">
              {contest.subjects.map((subject) => {
                const value = selectedWeights[subject.slug] ?? subject.recommendedWeight;
                return (
                  <div key={subject.id} className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div><span className="text-[8px] font-black tracking-[.11em] text-[var(--tita-accent-dim)]">{subject.shortName}</span><strong className="mt-1 block text-sm text-white/82">{subject.name}</strong></div>
                      <span className="rounded-lg border border-white/[.09] bg-white/[.04] px-2 py-1 text-[9px] font-black text-white/65">{value.toFixed(2)}×</span>
                    </div>
                    <input aria-label={`Peso de ${subject.name}`} className="mt-4 w-full accent-[#d8dadd]" type="range" min={subject.minimumWeight} max={2.5} step={0.05} value={value} onChange={(event) => updateWeight(subject, Number(event.target.value))} />
                    <div className="mt-2 flex items-center justify-between text-[8px] text-white/24"><span>MÍN. {subject.minimumWeight.toFixed(2)}×</span><button type="button" className="font-black text-white/45 hover:text-white" onClick={() => updateWeight(subject, subject.recommendedWeight)}>RECOMENDADO {subject.recommendedWeight.toFixed(2)}×</button></div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {errorMessage ? <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[.07] px-4 py-3 text-xs text-red-200" role="alert">{errorMessage}</div> : null}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/[.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(0, current - 1))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] px-4 text-[9px] font-black tracking-[.09em] text-white/55 disabled:opacity-25"><ArrowLeft size={14} /> VOLTAR</button>
          {step < 2 ? (
            <button type="button" disabled={!contestSlug} onClick={() => setStep((current) => Math.min(2, current + 1))} className="tita-primary-button">CONTINUAR <ArrowRight size={15} /></button>
          ) : (
            <button type="button" disabled={saving} onClick={finish} className="tita-primary-button">{saving ? <LoaderCircle className="animate-spin" size={15} /> : <Target size={15} />}{saving ? "GERANDO..." : "GERAR MINHA TRILHA"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
