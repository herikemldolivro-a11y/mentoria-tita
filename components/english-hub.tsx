"use client";

import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Languages,
  LockKeyhole,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EnglishWeekOverview } from "@/lib/english-types";
import { createClient } from "@/lib/supabase/client";

export function EnglishHub() {
  const [weeks, setWeeks] = useState<EnglishWeekOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_my_english_overview");
        if (error) throw error;
        setWeeks((data ?? []) as EnglishWeekOverview[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o módulo de inglês.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[#d2a64e]/25 bg-[#08090b] p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,.28)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d2a64e]/10 blur-3xl" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-[#e4b960]">
              <Languages size={16} /> ENGLISH READING LAB
            </span>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">
              12 textos por semana. Leitura que vira prova.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52">
              Hover mostra a tradução. Clique salva a palavra. Ao finalizar, você revisa apenas o vocabulário que marcou.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="META SEMANAL" value="12" />
            <Stat label="COM QUESTÕES" value="3" />
            <Stat label="SEM. 1–3" value="LEVEL 1" />
            <Stat label="SEM. 7–8" value="LEVEL 3" />
          </div>
        </div>
      </section>

      <div className="mt-5">
        <Link
          href="/ingles/vocabulario"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]"
        >
          <Star size={15} /> MEU VOCABULÁRIO
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-7">
        <span className="text-[9px] font-black tracking-[.17em] text-[var(--gold-bright)]">
          PROGRESSÃO DE 8 SEMANAS
        </span>
        <h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">
          Meta fixa de 12 textos em cada semana.
        </h2>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">
            Carregando trilha...
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {weeks.map((week) => {
              const progress = Math.min(100, (week.completed_texts / Math.max(1, week.target_texts)) * 100);
              const available = week.available_texts > 0;

              return (
                <article key={week.week_number} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[8px] font-black tracking-[.14em] text-[var(--muted)]">
                        SEMANA {week.week_number}
                      </span>
                      <h3 className="mt-1 font-serif text-2xl text-[var(--ink)]">{week.level_label}</h3>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--gold-bright)]">
                      {week.completed_texts >= week.target_texts ? <CheckCircle2 size={18} /> : available ? <BookOpenText size={18} /> : <LockKeyhole size={17} />}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Mini label="META" value={`${week.target_texts}`} />
                    <Mini label="LEITURA" value={`${week.reading_texts}`} />
                    <Mini label="PROVA" value={`${week.exam_texts}`} />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[8px] font-black tracking-[.1em] text-[var(--muted)]">
                    <span>PROGRESSO</span><span>{week.completed_texts}/{week.target_texts}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                    <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${progress}%` }} />
                  </div>

                  {available ? (
                    <Link
                      href={`/ingles/semana/${week.week_number}`}
                      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-[9px] font-black tracking-[.09em] text-[#111]"
                    >
                      ABRIR SEMANA <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <div className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black tracking-[.09em] text-[var(--muted)]">
                      <Sparkles size={14} /> META FIXA · CONTEÚDO A LIBERAR
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <span className="text-[7px] font-black tracking-[.12em] text-white/40">{label}</span>
      <strong className="mt-1 block font-serif text-xl">{value}</strong>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
      <span className="text-[7px] font-black tracking-[.1em] text-[var(--muted)]">{label}</span>
      <strong className="mt-1 block font-serif text-xl text-[var(--ink)]">{value}</strong>
    </div>
  );
}
