"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  listenStudyUpdated,
  loadWeekProgressSummary,
  type WeekProgressSummary,
} from "@/lib/study-database";

const initial: WeekProgressSummary = {
  started: false,
  completedLessons: 0,
  totalLessons: 5,
  completedSteps: 0,
  totalSteps: 10,
  percent: 0,
};

export function PrfWeekProgressSummary() {
  const [summary, setSummary] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      setSummary(await loadWeekProgressSummary());
    } catch {
      setSummary(initial);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unlisten = listenStudyUpdated(() => void refresh());
    return () => {
      window.clearTimeout(timer);
      unlisten();
    };
  }, [refresh]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[10px] font-bold text-white/45">
        <span>{summary.started ? `${summary.completedSteps} de ${summary.totalSteps} etapas concluídas` : "Semana ainda não iniciada"}</span>
        <span>{summary.percent}%</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, index) => {
          const done = index < summary.completedSteps;
          const current = !done && index === summary.completedSteps;
          return (
            <span
              key={index}
              className={`h-2.5 rounded-full ${done ? "bg-[#31c765]" : current ? "bg-[#d2a64e]/70" : "bg-white/10"}`}
            />
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/cronograma/semana-1" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#d7aa50] px-5 text-xs font-black tracking-[0.1em] text-[#111] transition hover:-translate-y-0.5 hover:bg-[#e5bd6d]">
          {summary.started ? "CONTINUAR SEMANA 1" : "INICIAR SEMANA 1"} <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
