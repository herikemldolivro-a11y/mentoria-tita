"use client";

import { ArrowLeft, CalendarDays, Check, ExternalLink, LockKeyhole, Target } from "lucide-react";
import Link from "next/link";
import type { StudyPlanEditorSubject } from "@/components/study-plan-editor";

export function EnemStudyPlanEditor({ subjects }: { subjects: StudyPlanEditorSubject[] }) {
  return (
    <div className="space-y-6">
      <section className="tita-panel-strong relative overflow-hidden rounded-[30px] p-6 sm:p-8">
        <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-[.14]" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-400/[.06] blur-[105px]" />
        <div className="relative">
          <Link href="/cronograma" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/38 transition hover:text-white/70"><ArrowLeft size={13} /> VOLTAR AO PLANO</Link>
          <span className="mt-5 block text-[9px] font-black tracking-[.16em] text-emerald-300">ENEM 40D · CFO PMPB</span>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-[.96] tracking-[-.04em] text-white sm:text-5xl">Plano fixo de 40 dias.</h1>
          <p className="mt-4 max-w-3xl text-xs leading-6 text-white/44">Este perfil não usa o redistribuidor de horas/pesos. São exatamente 3 blocos por dia para preservar a sequência estratégica da matriz.</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] p-4"><CalendarDays size={17} className="text-emerald-300" /><span className="mt-3 block text-[8px] font-black tracking-[.12em] text-emerald-300">FASE 1</span><strong className="mt-1 block font-serif text-2xl text-white">40 dias</strong><span className="mt-1 block text-[9px] text-white/32">Conteúdo novo · 3 blocos/dia.</span></div>
            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><Target size={17} className="text-white/65" /><span className="mt-3 block text-[8px] font-black tracking-[.12em] text-white/35">FOCO</span><strong className="mt-1 block font-serif text-2xl text-white">Exatas + Natureza</strong><span className="mt-1 block text-[9px] text-white/32">Matemática nos 40/40 dias.</span></div>
            <div className="rounded-2xl border border-orange-300/18 bg-orange-300/[.04] p-4"><Check size={17} className="text-orange-200" /><span className="mt-3 block text-[8px] font-black tracking-[.12em] text-orange-200">FASE 2</span><strong className="mt-1 block font-serif text-2xl text-white">15 dias</strong><span className="mt-1 block text-[9px] text-white/32">Revisão espiral + simulados.</span></div>
          </div>
        </div>
      </section>

      <section className="tita-panel rounded-[28px] p-5 sm:p-7">
        <span className="text-[9px] font-black tracking-[.15em] text-[var(--tita-accent)]">ORDEM ESTRATÉGICA</span>
        <h2 className="mt-2 font-serif text-3xl text-white">A matriz não será desmontada.</h2>
        <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/36">Os pesos abaixo são informativos. Eles definem a lógica do plano, mas você não precisa ficar recalculando a grade.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => {
            const p = subject.slug === "matematica" ? "P0" : ["fisica", "quimica"].includes(subject.slug) ? "P1" : subject.slug === "biologia" ? "P2" : ["historia", "geografia"].includes(subject.slug) ? "P3" : "P4";
            const core = ["P0", "P1", "P2"].includes(p);
            return (
              <div key={subject.id} className={`rounded-[20px] border p-4 ${core ? "border-emerald-300/16 bg-emerald-300/[.035]" : "border-orange-300/14 bg-orange-300/[.025]"}`}>
                <div className="flex items-start justify-between gap-3"><div><span className={`text-[8px] font-black tracking-[.12em] ${core ? "text-emerald-300" : "text-orange-200"}`}>{p} · {subject.shortName}</span><strong className="mt-1 block text-sm text-white/82">{subject.name}</strong></div><LockKeyhole size={13} className="text-white/22" /></div>
                <span className="mt-3 block text-[9px] text-white/30">{subject.slug === "matematica" ? "Presente todos os dias." : core ? "Núcleo principal do ciclo." : "Entrada seletiva de alto retorno."}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[26px] border border-white/[.08] bg-white/[.02] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="text-[9px] font-black tracking-[.13em] text-emerald-300">EXECUÇÃO EXTERNA</span><strong className="mt-1 block font-serif text-2xl text-white">Sem PDF ou banco interno.</strong><p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/35">Você estuda e resolve fora da Titã. Aqui ficam progresso, calendário, revisões e nivelamentos.</p></div>
          <Link href="/cronograma" className="tita-primary-button shrink-0">ABRIR PLANO <ExternalLink size={15} /></Link>
        </div>
      </section>
    </div>
  );
}
