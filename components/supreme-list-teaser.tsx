"use client";

import { Crown, LockKeyhole, Sparkles } from "lucide-react";

export function SupremeListTeaser() {
  return (
    <section className="mb-6 overflow-hidden rounded-[24px] border border-violet-400/25 bg-[linear-gradient(135deg,rgba(58,24,94,.55),rgba(16,11,24,.95))] p-5 text-white shadow-[0_16px_50px_rgba(95,40,160,.12)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-violet-300/25 bg-violet-300/10 text-violet-200"><Crown size={22} /></span>
          <div>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[.17em] text-violet-200"><Sparkles size={13} /> ETAPA FINAL DA AULA</span>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl">Lista de Questões Suprema</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/50">Reservada para a seleção final das questões mais valiosas do assunto, misturando todos os níveis. Quantidade e regra de liberação continuam em aberto para você definir depois.</p>
          </div>
        </div>
        <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 text-[9px] font-black tracking-[.1em] text-violet-100"><LockKeyhole size={14} /> EM PREPARAÇÃO</span>
      </div>
    </section>
  );
}
