"use client";

import { Activity, ArrowRight, BookOpenCheck, Gauge, ShieldCheck, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const previewRows = [
  { label: "Língua Portuguesa", value: 78, state: "FORTE" },
  { label: "Direito Penal", value: 64, state: "EM EVOLUÇÃO" },
  { label: "Direito Constitucional", value: 57, state: "REVISAR" },
  { label: "Processo Penal", value: 49, state: "ATACAR AGORA" },
];

export function LuisDiagnosticPreview({ displayName, contestSigla }: { displayName: string; contestSigla?: string | null }) {
  const pathname = usePathname();
  const isLuis = /^lu[ií]s$/i.test(displayName.trim());

  if (!isLuis || pathname !== "/") return null;

  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 pt-6 sm:px-6" aria-label="Prévia do diagnóstico do aluno">
      <div className="overflow-hidden rounded-[30px] border border-white/[.11] bg-[#0a0b0d] shadow-[0_26px_90px_rgba(0,0,0,.34)]">
        <div className="grid xl:grid-cols-[1.15fr_.85fr]">
          <div className="relative overflow-hidden p-5 sm:p-7 lg:p-8">
            <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-20" />
            <div className="pointer-events-none absolute -left-16 top-12 h-52 w-52 rounded-full bg-white/[.035] blur-[70px]" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[.1] bg-white/[.04] px-3 py-1.5 text-[8px] font-black tracking-[.14em] text-white/65"><Activity size={13} /> DIAGNÓSTICO TITÃ</span>
                <span className="rounded-full border border-[#93a0ad]/20 bg-[#93a0ad]/[.07] px-3 py-1.5 text-[8px] font-black tracking-[.12em] text-[#cfd4d9]">PRÉVIA PARA O LUIS</span>
              </div>

              <h2 className="mt-5 max-w-2xl font-serif text-4xl leading-[.96] tracking-[-.04em] text-white sm:text-5xl">Seu mapa de preparação.</h2>
              <p className="mt-4 max-w-xl text-xs leading-6 text-white/42">Esta prévia existe só para você avaliar o desenho. Quando o diagnóstico real entrar no onboarding, os números serão calculados pelo seu desempenho e pela matriz do concurso.</p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><Gauge size={16} className="text-white/55" /><span className="mt-3 block text-[8px] font-black tracking-[.12em] text-white/30">GERAL</span><strong className="mt-1 block font-serif text-2xl text-white">62%</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><TrendingUp size={16} className="text-white/55" /><span className="mt-3 block text-[8px] font-black tracking-[.12em] text-white/30">MELHOR PONTO</span><strong className="mt-1 block font-serif text-xl text-white">Português</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><Target size={16} className="text-white/55" /><span className="mt-3 block text-[8px] font-black tracking-[.12em] text-white/30">PRIORIDADE</span><strong className="mt-1 block font-serif text-xl text-white">Proc. Penal</strong></div>
              </div>

              <div className="mt-7">
                <span className="text-[8px] font-black tracking-[.16em] text-white/28">FORÇAS</span>
                <div className="mt-4 space-y-4">
                  {previewRows.map((row) => (
                    <div key={row.label}>
                      <div className="flex items-end justify-between gap-4">
                        <div><span className="text-[8px] font-black tracking-[.12em] text-white/28">{row.state}</span><strong className="mt-1 block text-[12px] text-white/78">{row.label}</strong></div>
                        <span className="font-serif text-lg text-white/75">{row.value}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#777d84,#e3e6e9)]" style={{ width: `${row.value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="border-t border-white/[.08] bg-[#0d0f12] p-5 sm:p-7 xl:border-l xl:border-t-0">
            <span className="text-[8px] font-black tracking-[.16em] text-white/32">ONDE ATACAR</span>
            <h3 className="mt-2 font-serif text-3xl text-white">Próximos focos.</h3>
            <p className="mt-3 text-[10px] leading-5 text-white/34">A prioridade final será calculada pela incidência no edital, seu desempenho e o tempo disponível por dia.</p>

            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-white/[.09] bg-white/[.025] p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.09] bg-white/[.035] font-serif text-lg text-white/65">1</span><div><span className="text-[8px] font-black tracking-[.12em] text-white/30">PRIORIDADE ALTA</span><strong className="mt-1 block text-sm text-white/82">Processo Penal</strong><p className="mt-1 text-[9px] leading-5 text-white/34">Aumentar carga de questões e revisão.</p></div></div></div>
              <div className="rounded-[20px] border border-white/[.09] bg-white/[.025] p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.09] bg-white/[.035] font-serif text-lg text-white/65">2</span><div><span className="text-[8px] font-black tracking-[.12em] text-white/30">CONSOLIDAR</span><strong className="mt-1 block text-sm text-white/82">Direito Constitucional</strong><p className="mt-1 text-[9px] leading-5 text-white/34">Manter teoria curta e elevar repetição.</p></div></div></div>
              <div className="rounded-[20px] border border-white/[.09] bg-white/[.025] p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.09] bg-white/[.035] font-serif text-lg text-white/65">3</span><div><span className="text-[8px] font-black tracking-[.12em] text-white/30">MANUTENÇÃO</span><strong className="mt-1 block text-sm text-white/82">Língua Portuguesa</strong><p className="mt-1 text-[9px] leading-5 text-white/34">Menos teoria, mais revisão de erro.</p></div></div></div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
              <div className="flex items-start gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-white/55" /><div><span className="text-[8px] font-black tracking-[.12em] text-white/30">FOCO ATUAL</span><p className="mt-1 text-[10px] leading-5 text-white/42">{contestSigla || "PPRN"} · Diagnóstico → cronograma → trilha semanal → revisões e nivelamentos.</p></div></div>
              <Link href="#trilha-semana" className="mt-4 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/70 hover:text-white">VER TRILHA DA SEMANA <ArrowRight size={13} /></Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
