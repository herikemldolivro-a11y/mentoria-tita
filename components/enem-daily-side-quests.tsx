"use client";

import { ArrowRight, Check, CheckCircle2, FileText, Languages, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEnemEnglishDay } from "@/lib/enem-english-data";
import { getEnemEssayForDay } from "@/lib/enem-essay-data";
import { createClient } from "@/lib/supabase/client";

type Props = {
  day: number;
  side: "left" | "right";
  dueNow?: boolean;
};

export function EnemDailySideQuests({ day, side, dueNow = false }: Props) {
  const englishDay = day - 1;
  const readings = useMemo(
    () => (day >= 2 && englishDay >= 1 ? getEnemEnglishDay(englishDay).slice(0, 2) : []),
    [day, englishDay],
  );
  const essay = useMemo(() => getEnemEssayForDay(day), [day]);
  const [readingDone, setReadingDone] = useState<Set<string>>(new Set());
  const [essayDone, setEssayDone] = useState(false);

  useEffect(() => {
    if (day < 2) return;
    let alive = true;
    const load = async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const [englishResult, essayResult] = await Promise.all([
        readings.length
          ? supabase
              .from("user_enem_english_progress")
              .select("reading_id,completed_at")
              .eq("user_id", auth.user.id)
              .in("reading_id", readings.map((reading) => reading.id))
          : Promise.resolve({ data: [] as Array<{ reading_id: string; completed_at: string | null }> }),
        supabase
          .from("user_enem_daily_checkpoints")
          .select("completed_at")
          .eq("user_id", auth.user.id)
          .eq("study_day", day)
          .eq("checkpoint", "essay_note_mil")
          .maybeSingle(),
      ]);

      if (!alive) return;
      setReadingDone(new Set((englishResult.data ?? []).filter((row) => row.completed_at).map((row) => row.reading_id)));
      setEssayDone(Boolean(essayResult.data?.completed_at));
    };

    void load();
    return () => { alive = false; };
  }, [day, readings]);

  if (day < 2) return null;

  const completedCount = readings.filter((reading) => readingDone.has(reading.id)).length + (essayDone ? 1 : 0);
  const totalCount = 3;
  const alignment = side === "left" ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left";

  return (
    <div className={`relative flex w-full flex-col gap-2 ${alignment}`} data-enem-daily-side={side}>
      <div className={`flex w-full items-center justify-between gap-2 px-1 ${side === "left" ? "sm:flex-row-reverse" : ""}`}>
        <span className={`text-[7px] font-black tracking-[.13em] ${dueNow ? "text-sky-200/80" : "text-white/28"}`}>OBRIGATÓRIO · DIA {day}</span>
        <span className="text-[7px] font-black text-white/28">{completedCount}/{totalCount}</span>
      </div>

      {[0, 1].map((slotIndex) => {
        const reading = readings[slotIndex];
        if (!reading) {
          return (
            <div key={`pending-${slotIndex}`} className="flex min-h-[54px] w-full items-center gap-2 rounded-[14px] border border-dashed border-white/[.08] bg-[#0b0c0f]/95 px-3 py-2.5 text-white/25">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[.08] bg-white/[.025]"><LockKeyhole size={11} /></span>
              <div className="min-w-0"><span className="block text-[7px] font-black tracking-[.1em]">INGLÊS {slotIndex + 1}/2</span><span className="mt-0.5 block truncate text-[9px]">Aguardando próximo lote</span></div>
            </div>
          );
        }

        const done = readingDone.has(reading.id);
        return (
          <Link key={reading.id} href={`/ingles/enem/${reading.id}`} className={`group flex min-h-[54px] w-full items-center gap-2 rounded-[14px] border px-3 py-2.5 transition ${done ? "border-violet-300/25 bg-violet-400/[.08] shadow-[0_0_22px_rgba(139,92,246,.09)]" : dueNow ? "border-sky-300/22 bg-sky-300/[.055] hover:border-sky-200/35" : "border-white/[.09] bg-[#0b0c0f]/95 hover:border-white/[.16]"}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${done ? "border-violet-300/25 bg-violet-300/10 text-violet-200" : "border-sky-300/15 bg-sky-300/[.05] text-sky-200/70"}`}>{done ? <Check size={12} strokeWidth={3} /> : <Languages size={12} />}</span>
            <div className="min-w-0 flex-1">
              <span className={`block text-[7px] font-black tracking-[.1em] ${done ? "text-violet-200/70" : "text-sky-200/65"}`}>INGLÊS {slotIndex + 1}/2 · ENEM {reading.year}</span>
              <strong className="mt-0.5 block truncate text-[9px] font-bold text-white/72">{reading.title}</strong>
            </div>
            {done ? <CheckCircle2 size={12} className="shrink-0 text-violet-300" /> : <ArrowRight size={11} className="shrink-0 text-white/25 transition group-hover:translate-x-0.5" />}
          </Link>
        );
      })}

      {essay ? (
        <Link href={`/redacao/enem/dia-${day}`} className={`group flex min-h-[54px] w-full items-center gap-2 rounded-[14px] border px-3 py-2.5 text-left transition ${essayDone ? "border-violet-300/25 bg-violet-400/[.08] shadow-[0_0_22px_rgba(139,92,246,.09)]" : dueNow ? "border-amber-300/20 bg-amber-300/[.045] hover:border-amber-200/30" : "border-white/[.09] bg-[#0b0c0f]/95 hover:border-white/[.16]"}`}>
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${essayDone ? "border-violet-300/25 bg-violet-300/10 text-violet-200" : "border-amber-300/15 bg-amber-300/[.05] text-amber-100/70"}`}>{essayDone ? <Check size={12} strokeWidth={3} /> : <FileText size={12} />}</span>
          <div className="min-w-0 flex-1">
            <span className={`block text-[7px] font-black tracking-[.1em] ${essayDone ? "text-violet-200/70" : "text-amber-100/60"}`}>REDAÇÃO NOTA MIL · ENEM {essay.year}</span>
            <strong className="mt-0.5 block truncate text-[9px] font-bold text-white/72">{essay.title}</strong>
            {!essayDone ? <span className="mt-0.5 block truncate text-[7px] text-white/32">Abra, leia inteira e só depois marque como concluída</span> : null}
          </div>
          {essayDone ? <CheckCircle2 size={12} className="shrink-0 text-violet-300" /> : <ArrowRight size={11} className="shrink-0 text-white/25 transition group-hover:translate-x-0.5" />}
        </Link>
      ) : (
        <div className="flex min-h-[54px] w-full items-center gap-2 rounded-[14px] border border-dashed border-white/[.08] bg-[#0b0c0f]/95 px-3 py-2.5 text-white/25">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[.08] bg-white/[.025]"><LockKeyhole size={11} /></span>
          <div className="min-w-0"><span className="block text-[7px] font-black tracking-[.1em]">REDAÇÃO NOTA MIL</span><span className="mt-0.5 block truncate text-[9px]">Aguardando próxima redação</span></div>
        </div>
      )}
    </div>
  );
}
