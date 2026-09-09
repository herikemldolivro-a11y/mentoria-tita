"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Languages,
  Star,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EnglishWeekData } from "@/lib/english-types";
import { createClient } from "@/lib/supabase/client";

export function EnglishWeekScreen({ weekNumber }: { weekNumber: number }) {
  const [data, setData] = useState<EnglishWeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_my_english_week", { p_week: weekNumber });
        if (error) throw error;
        setData(data as EnglishWeekData);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar a semana.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [weekNumber]);

  const grouped = useMemo(() => {
    const map = new Map<number, EnglishWeekData["texts"]>();
    for (const text of data?.texts ?? []) {
      map.set(text.day_number, [...(map.get(text.day_number) ?? []), text]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [data]);

  const completed = data?.texts.filter((text) => text.status === "completed").length ?? 0;
  const target = data?.goal.target_texts ?? 12;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/ingles" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-black tracking-[.09em] text-[var(--muted)]">
          <ArrowLeft size={15} /> TODAS AS SEMANAS
        </Link>
        <Link href="/ingles/vocabulario" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[9px] font-black text-[var(--gold-bright)]">
          <Star size={14} /> VOCABULÁRIO
        </Link>
      </div>

      <section className="mt-3 overflow-hidden rounded-[28px] border border-[#d2a64e]/25 bg-[#090a0c] text-white">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_280px]">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#e4b960]">
              <Languages size={15} /> SEMANA {weekNumber} · {data?.goal.level_label ?? "ENGLISH"}
            </span>
            <h1 className="mt-3 font-serif text-4xl tracking-[-.04em]">12 textos distribuídos pelos dias.</h1>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-white/50">
              Meta: 9 leituras puras + 3 leituras com 6 itens CERTO/ERRADO.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
            <span className="text-[8px] font-black tracking-[.13em] text-white/40">META</span>
            <strong className="mt-2 block font-serif text-4xl">{completed}/{target}</strong>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#d2a64e]" style={{ width: `${Math.min(100, completed / Math.max(1, target) * 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">Carregando textos...</div>
      ) : grouped.length ? (
        <div className="mt-6 space-y-4">
          {grouped.map(([day, items]) => (
            <section key={day} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-4">
                <span className="text-[8px] font-black tracking-[.15em] text-[var(--gold-bright)]">DIA {day}</span>
                <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">{items.length} {items.length === 1 ? "texto" : "textos"}</h2>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((text) => (
                  <article key={text.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--gold-bright)]">
                        {text.status === "completed" ? <CheckCircle2 size={17} /> : text.mode === "exam" ? <ClipboardCheck size={17} /> : <BookOpenText size={17} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px] font-black text-[var(--muted)]">LEVEL {text.level}</span>
                          <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px] font-black text-[var(--gold-bright)]">
                            {text.mode === "exam" ? "6 ITENS C/E" : "LEITURA"}
                          </span>
                        </div>
                        <h3 className="mt-2 font-serif text-xl leading-tight text-[var(--ink)]">{text.title}</h3>
                        <div className="mt-2 flex gap-3 text-[8px] font-bold text-[var(--muted)]">
                          <span>{text.vocab_count} palavras salvas</span>
                          {text.mode === "exam" ? <span>{text.correct_answers}/{text.question_count || 6} acertos</span> : null}
                        </div>
                        <Link href={`/ingles/texto/${text.id}`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-[8px] font-black text-[var(--gold-bright)]">
                          {text.status === "completed" ? "RELER" : "INICIAR"} <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center">
          <Target className="mx-auto text-[var(--gold-bright)]" size={22} />
          <strong className="mt-3 block font-serif text-2xl text-[var(--ink)]">Meta fixa: 12 textos.</strong>
          <p className="mt-2 text-xs text-[var(--muted)]">A meta já está configurada; o conteúdo desta semana será liberado depois.</p>
        </div>
      )}
    </div>
  );
}
