"use client";

import { ArrowRight, Check, CheckCircle2, Languages, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEnemEnglishPlanDay } from "@/lib/enem-english-data";
import { createClient } from "@/lib/supabase/client";

type Props = {
  day: number;
  side: "left" | "right";
  dueNow?: boolean;
};

export function EnemDailySideQuests({ day, side, dueNow = false }: Props) {
  const readings = useMemo(() => getEnemEnglishPlanDay(day).slice(0, 2), [day]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!readings.length) {
        if (alive) setDoneIds(new Set());
        return;
      }

      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data } = await supabase
        .from("user_enem_english_progress")
        .select("reading_id,completed_at")
        .eq("user_id", auth.user.id)
        .in("reading_id", readings.map((reading) => reading.id));

      if (!alive) return;

      setDoneIds(
        new Set(
          (data ?? [])
            .filter((row) => row.completed_at)
            .map((row) => row.reading_id),
        ),
      );
    };

    void load();
    return () => {
      alive = false;
    };
  }, [readings]);

  const alignment = side === "left" ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left";
  const completed = readings.filter((reading) => doneIds.has(reading.id)).length;

  return (
    <div
      className={`relative flex w-full flex-col gap-2 ${alignment}`}
      data-enem-daily-side={side}
      data-fixed-two-english-texts="true"
    >
      <div
        className={`flex w-full items-center justify-between gap-2 px-1 ${
          side === "left" ? "sm:flex-row-reverse" : ""
        }`}
      >
        <span
          className={`text-[7px] font-black tracking-[.13em] ${
            dueNow ? "text-sky-200/85" : "text-white/30"
          }`}
        >
          INGLÊS FIXO · DIA {day}
        </span>
        <span className="text-[7px] font-black text-white/28">{completed}/2</span>
      </div>

      {[0, 1].map((slotIndex) => {
        const reading = readings[slotIndex];

        if (!reading) {
          return (
            <div
              key={`english-slot-${day}-${slotIndex}`}
              className={`flex min-h-[62px] w-full items-center gap-2 rounded-[14px] border px-3 py-2.5 ${
                dueNow
                  ? "border-sky-300/20 bg-sky-300/[.04]"
                  : "border-dashed border-white/[.08] bg-[#090b0e]/95"
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[.08] bg-white/[.025] text-white/25">
                <LockKeyhole size={11} />
              </span>
              <div className="min-w-0">
                <span className="block text-[7px] font-black tracking-[.1em] text-sky-200/55">
                  INGLÊS · TEXTO {slotIndex + 1}/2
                </span>
                <strong className="mt-0.5 block truncate text-[9px] font-bold text-white/34">
                  Texto diário ainda não carregado
                </strong>
              </div>
            </div>
          );
        }

        const done = doneIds.has(reading.id);

        return (
          <Link
            key={reading.id}
            href={`/ingles/enem/${reading.id}`}
            className={`group flex min-h-[62px] w-full items-center gap-2 rounded-[14px] border px-3 py-2.5 transition ${
              done
                ? "border-violet-300/25 bg-violet-400/[.08] shadow-[0_0_22px_rgba(139,92,246,.09)]"
                : dueNow
                  ? "border-sky-300/24 bg-sky-300/[.055] hover:border-sky-200/38"
                  : "border-white/[.09] bg-[#090b0e]/95 hover:border-white/[.16]"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                done
                  ? "border-violet-300/25 bg-violet-300/10 text-violet-200"
                  : "border-sky-300/15 bg-sky-300/[.05] text-sky-200/70"
              }`}
            >
              {done ? <Check size={12} strokeWidth={3} /> : <Languages size={12} />}
            </span>

            <div className="min-w-0 flex-1 text-left">
              <span
                className={`block text-[7px] font-black tracking-[.1em] ${
                  done ? "text-violet-200/70" : "text-sky-200/65"
                }`}
              >
                INGLÊS · TEXTO {slotIndex + 1}/2 · ENEM {reading.year}
              </span>
              <strong className="mt-0.5 block truncate text-[9px] font-bold text-white/72">
                {reading.title}
              </strong>
            </div>

            {done ? (
              <CheckCircle2 size={12} className="shrink-0 text-violet-300" />
            ) : (
              <ArrowRight
                size={11}
                className="shrink-0 text-white/25 transition group-hover:translate-x-0.5"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
