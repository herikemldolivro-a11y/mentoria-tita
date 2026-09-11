"use client";

import { Activity, ArrowRight, BookOpenCheck, Gauge, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const previewRows = [
  { label: "Língua Portuguesa", value: 78, state: "FORTE" },
  { label: "Direito Penal", value: 64, state: "EM EVOLUÇÃO" },
  { label: "Processo Penal", value: 49, state: "ATACAR AGORA" },
  { label: "Direito Constitucional", value: 57, state: "PRIORIDADE" },
];

export function LuisDiagnosticPreview({ displayName, contestSigla }: { displayName: string; contestSigla?: string | null }) {
  const pathname = usePathname();
  const isLuis = /^lu[ií]s$/i.test(displayName.trim());

  if (!isLuis || pathname !== "/") return null;

  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 pt-6 sm:px-6" aria-label="Prévia do diagnóstico do aluno">
      <div className="overflow-hidden rounded-[30px] border border-white/[.11] bg-[#0a0b0d] shadow-[0_26px_90px_rgba(0,0,0,.34)]">
        <div className="grid xl:grid-cols-[1.12fr_.88fr]">
          <div className="relative overflow-hidden p-5 sm:p-7 lg:p-8">
            <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-20" />
            <div className="pointer-events-none absolute -left-16 top-12 h-52 w-52 rounded-full bg-white/[.035] blur-[70px]" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[.1] bg-white/[.04] px-3 py-1.5 text-[8px] font-black tracking-[.14em] text-white/65">
                  <Activity size={13} /> DIAGNÓSTICO TITÃ
                </span>
                <span className="rounded-full border border-[#93a0ad]/20 bg-[#93a0ad]/[.07] px-3 py-1.5 text-[8px] font-black tracking-[.12em] text-[#cfd4d9]">PRÉVIA PARA O LUIS</span>
              </div>

              <h2 className="mt-5 max-w-2xl font-serif text-4xl leading-[.96] tracking-[-.04em] text-white sm:text-5xl">Seu mapa de preparação.</h2>
              <p className="mt-4 max-w-xl text-xs leading-6 text-white/42">Esta tela está liberada no seu usuário para você avaliar o desenho antes do diagnóstico real ser ligado ao onboarding. Os números abaixo são apenas uma prévia visual.</p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
                  <Gauge size={16} className="text-white/55" />
                  <span className="mt-3 block text-[8px] font-black tracking-[.12em] text-white/30">NÍVEL GERAL</span>
                  <strong className="mt-1 block font-serif text-2xl text-white">62%</strong>
                </div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
                  <Target size={16} className="text-white/55" />
                  <span className="mt-3 block text-[8px] font-black tracking-[.12em] text-white/30">FOCO</span>
                  <strong className="mt-1 block font-serif text-2xl text-white">{contestSigla || "PPRN"}</strong>
                </div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
                  <BookOpenCheck size={16} className="text-white/55" />
                  <span className="mt-3 block text-[8px] font-black tracking-[.12em] text-white/30">ROTA</span>
                  <strong className="mt-1 block font-serif text-2xl text-white">95+</strong>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {previewRows.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <span className="text-[8px] font-black tracking-[.12em] text-white/28">{row.state}</span>
                        <strong className="mt-1 block text-[12px] text-white/78">{row.label}</strong>
                      </div>
                      <span className="font-serif text-lg text-white/75">{row.value}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                      <span className="block h-full rounded-full bg-[linear-gradient(90deg,#777d84,#e3e6e9)]" style={{ width: `${row.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="border-t border-white/[.08] bg-[#0d0f12] p-5 sm:p-7 xl:border-l xl:border-t-0">
            <span className="text-[8px] font-black tracking-[.16em] text-white/32">IDENTIDADE DAS MATÉRIAS</span>
            <h3 className="mt-2 font-serif text-3xl text-white">As artes já estão ligadas.</h3>
            <p className="mt-3 text-[10px] leading-5 text-white/34">Português e Direito Penal aparecem aqui mesmo que o seu cronograma atual ainda esteja no fluxo antigo.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Link href="/cronograma" className="group relative min-h-[190px] overflow-hidden rounded-[22px] border border-white/[.09] bg-[#101216]">
                <img src="/subjects/lingua-portuguesa.webp" alt="Língua Portuguesa" className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.035]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,7,.02),rgba(5,6,7,.34)_48%,rgba(5,6,7,.97))]" />
                <div className="absolute inset-x-0 bottom-0 p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/50">PORTUGUÊS</span><strong className="mt-1 block font-serif text-2xl text-white">Língua Portuguesa</strong></div>
              </Link>

              <Link href="/cronograma" className="group relative min-h-[190px] overflow-hidden rounded-[22px] border border-white/[.09] bg-[#101216]">
                <img src="/subjects/direito-penal.webp" alt="Direito Penal" className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.035]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,7,.02),rgba(5,6,7,.34)_48%,rgba(5,6,7,.97))]" />
                <div className="absolute inset-x-0 bottom-0 p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/50">DIREITO</span><strong className="mt-1 block font-serif text-2xl text-white">Direito Penal</strong></div>
              </Link>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
              <div className="flex items-start gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-white/55" /><div><span className="text-[8px] font-black tracking-[.12em] text-white/30">FLUXO FINAL</span><p className="mt-1 text-[10px] leading-5 text-white/42">Diagnóstico → cronograma personalizado → aula → questões → revisão → nivelamento.</p></div></div>
              <Link href="/onboarding" className="mt-4 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/70 hover:text-white">VER CONFIGURAÇÃO <ArrowRight size={13} /></Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
