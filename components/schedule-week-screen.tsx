import { EnglishWeekGoalStrip } from "@/components/english-week-goal-strip";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PrfWeekBackground } from "@/components/prf-week-background";
import { ScheduleWeekDays } from "@/components/schedule-week-days";
import { loadScheduleWeek } from "@/lib/schedule-server";

export async function ScheduleWeekScreen({ weekNumber }: { weekNumber: number }) {
  const week = await loadScheduleWeek(weekNumber);
  if (!week) notFound();

  const usePrfPhoto = week.contestSlug === "prf" && weekNumber === 1;

  return (
    <>
      {usePrfPhoto ? <PrfWeekBackground /> : null}
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/cronograma" label="Voltar às semanas" />
        <div className="mt-4"><EnglishWeekGoalStrip weekNumber={week.weekNumber} /></div>
        <ScheduleWeekDays week={week} />
      </div>
    </>
  );
}
