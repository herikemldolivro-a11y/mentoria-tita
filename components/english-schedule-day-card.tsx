"use client";

import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Languages,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EnglishWeekData, EnglishWeekText } from "@/lib/english-types";
import { createClient } from "@/lib/supabase/client";

export function EnglishScheduleDayCard({
  weekNumber,
  dayNumber,
}: {
  weekNumber: number;
  dayNumber: number;
}) {
  const [data, setData] = useState<EnglishWeekData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_my_english_week", {
          p_week: weekNumber,
        });

        if (error) throw error;
        if (!cancelled) setData(data as EnglishWeekData);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [weekNumber]);

  const texts = useMemo(
    () =>
      (data?.texts ?? [])
        .filter((text) => text.day_number === dayNumber)
        .sort((a, b) => a.position - b.position),
    [data, dayNumber],
  );

  if (loading || !texts.length) return null;

  const completed = texts.filter((text) => text.status === "completed").length;

  return (
    <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--gold)_4%,var(--surface))] p-4 sm:p-6">
      <div className="rounded-[24px] border border-[rgba(210,166,78,.3)] bg-[var(--background)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[rgba(210,166,78,.3)] bg-[rgba(210,166,78,.06)] text-[var(--gold-bright)]">
              <Languages size={18} />
            </span>

            <div>
              <span className="text-[8px] font-black tracking-[.14em] text-[var(--gold-bright)]">
                INGLÊS · META DO DIA {dayNumber}
              </span>
              <h3 className="mt-1 font-serif text-2xl text-[var(--ink)]">
                {texts.length} {texts.length === 1 ? "texto" : "textos"} de leitura
              </h3>
              <p className="mt-1 text-[9px] leading-5 text-[var(--muted)]">
                Hover traduz. Clique salva no vocabulário. Os textos de prova
                liberam 6 itens C/E depois da revisão.
              </p>
            </div>
          </div>

          <Link
            href={`/ingles/semana/${weekNumber}`}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-[8px] font-black tracking-[.08em] text-[var(--gold-bright)]"
          >
            VER SEMANA DE INGLÊS
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {texts.map((text) => (
            <EnglishTextRow key={text.id} text={text} weekNumber={weekNumber} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <span className="inline-flex items-center gap-1.5 text-[8px] font-black text-[var(--muted)]">
            <Star size={12} />
            Palavras clicadas vão para o Vocabulário.
          </span>
          <span
            className="text-[8px] font-black tracking-[.08em]"
            style={{
              color:
                completed === texts.length
                  ? "#31c765"
                  : "var(--gold-bright)",
            }}
          >
            {completed}/{texts.length} CONCLUÍDOS
          </span>
        </div>
      </div>
    </div>
  );
}

function EnglishTextRow({
  text,
  weekNumber,
}: {
  text: EnglishWeekText;
  weekNumber: number;
}) {
  const completed = text.status === "completed";

  return (
    <Link
      href={`/ingles/texto/${text.id}`}
      className="group flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition hover:border-[var(--border-strong)]"
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
        style={{
          borderColor: completed
            ? "rgba(49,199,101,.3)"
            : "var(--border)",
          color: completed ? "#31c765" : "var(--gold-bright)",
        }}
      >
        {completed ? (
          <CheckCircle2 size={15} />
        ) : text.mode === "exam" ? (
          <ClipboardCheck size={15} />
        ) : (
          <BookOpenText size={15} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[6px] font-black tracking-[.08em] text-[var(--muted)]">
            LEVEL {text.level}
          </span>
          <span className="rounded-full border border-[rgba(210,166,78,.25)] px-2 py-0.5 text-[6px] font-black tracking-[.08em] text-[var(--gold-bright)]">
            {text.mode === "exam" ? "6 ITENS C/E" : "LEITURA"}
          </span>
        </div>

        <strong className="mt-1.5 block text-[11px] leading-5 text-[var(--ink)]">
          {text.title}
        </strong>

        <span className="mt-1 block text-[7px] font-bold text-[var(--muted)]">
          {text.vocab_count} palavras salvas
          {text.mode === "exam"
            ? ` · ${text.correct_answers}/${text.question_count || 6} acertos`
            : ""}
        </span>
      </div>

      <ArrowRight
        size={14}
        className="mt-1 shrink-0 text-[var(--gold-bright)] transition group-hover:translate-x-0.5"
      />
    </Link>
  );
}
