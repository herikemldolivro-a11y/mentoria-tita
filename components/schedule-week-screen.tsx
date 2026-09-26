import { EnglishWeekGoalStrip } from "@/components/english-week-goal-strip";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PrfWeekBackground } from "@/components/prf-week-background";
import { ScheduleWeekDays } from "@/components/schedule-week-days";
import { PmalStudyPath } from "@/components/pmal-study-path";
import { loadScheduleWeek } from "@/lib/schedule-server";

export async function ScheduleWeekScreen({ weekNumber }: { weekNumber: number }) {
  const week = await loadScheduleWeek(weekNumber);
  if (!week) notFound();
  if (week.contestSlug === "cfo-pmal") redirect("/cronograma"); // MT_PMAL_WEEK_REDIRECT_V7
  if (week.contestSlug === "cfo-pmal") redirect("/cronograma"); // MT_PMAL_WEEK_REDIRECT_V6



  // MT_PMAL_COMPACT_DIRECT_WEEK_V3
  if (week.contestSlug === "cfo-pmal") {
    const seen = new Set<string>();
    const ordered: Array<{
      lesson: (typeof week.subjects)[number]["lessons"][number];
      date: string | null;
      position: number;
    }> = [];

    const blocks = [...week.blocks].sort((a, b) => {
      const byDate = a.studyDate.localeCompare(b.studyDate);
      return byDate !== 0 ? byDate : a.position - b.position;
    });

    for (const blockItem of blocks) {
      for (const lesson of blockItem.lessons) {
        if (seen.has(lesson.id)) continue;
        seen.add(lesson.id);
        ordered.push({ lesson, date: blockItem.studyDate, position: ordered.length + 1 });
      }
    }

    if (!ordered.length) {
      for (const subject of week.subjects) {
        for (const lesson of subject.lessons) {
          if (seen.has(lesson.id)) continue;
          seen.add(lesson.id);
          ordered.push({ lesson, date: null, position: ordered.length + 1 });
        }
      }
    }

    const dates = Array.from(new Set(blocks.map((item) => item.studyDate)));
    const pmalItems = ordered.map(({ lesson, date, position }) => ({
      id: lesson.id,
      scheduledFor: date,
      studyDay: date ? dates.indexOf(date) + 1 : null,
      weekNumber: week.weekNumber,
      position,
      estimatedMinutes: null,
      subjectName: lesson.subjectName,
      subjectShortName: lesson.subjectShortName,
      lessonTitle: lesson.title,
      questionCount: lesson.questionCount,
      theoryCompleted: lesson.theoryCompleted,
      listCompleted: lesson.listCompleted,
      imagePath: null,
      href: `/cronograma/pmal/aula/${lesson.id}`,
    }));

    return (
      <div className="relative z-10 mx-auto w-full max-w-[1120px] px-4 pb-24 pt-5 sm:px-6 sm:pt-7">
        <BackButton fallback="/cronograma" label="Voltar ao Plano de Estudos" />
        <div className="mt-4">
          <PmalStudyPath
            items={pmalItems}
            contestSigla={week.contestSigla ?? "CFO PMAL"}
            initialWeek={week.weekNumber}
          />
        </div>
      </div>
    );
  }
  // MT_PMAL_DUOLINGO_LEGACY_V2
  if (week.contestSlug === "cfo-pmal") {
    const seen = new Set<string>();
    const ordered: Array<{
      lesson: (typeof week.subjects)[number]["lessons"][number];
      date: string | null;
      position: number;
    }> = [];

    const sortedBlocks = [...week.blocks].sort((a, b) => {
      const byDate = a.studyDate.localeCompare(b.studyDate);
      return byDate !== 0 ? byDate : a.position - b.position;
    });

    for (const blockItem of sortedBlocks) {
      for (const lesson of blockItem.lessons) {
        if (seen.has(lesson.id)) continue;
        seen.add(lesson.id);
        ordered.push({ lesson, date: blockItem.studyDate, position: ordered.length + 1 });
      }
    }

    if (!ordered.length) {
      for (const subject of week.subjects) {
        for (const lesson of subject.lessons) {
          if (seen.has(lesson.id)) continue;
          seen.add(lesson.id);
          ordered.push({ lesson, date: null, position: ordered.length + 1 });
        }
      }
    }

    const uniqueDates = Array.from(new Set(sortedBlocks.map((blockItem) => blockItem.studyDate)));

    const pmalItems = ordered.map(({ lesson, date, position }) => ({
      id: lesson.id,
      scheduledFor: date,
      studyDay: date ? uniqueDates.indexOf(date) + 1 : null,
      weekNumber: week.weekNumber,
      position,
      estimatedMinutes: null,
      subjectName: lesson.subjectName,
      subjectShortName: lesson.subjectShortName,
      lessonTitle: lesson.title,
      questionCount: lesson.questionCount,
      theoryCompleted: lesson.theoryCompleted,
      listCompleted: lesson.listCompleted,
      imagePath: null,
      href: `/cronograma/semana-${week.weekNumber}/${lesson.subjectSlug}/${lesson.slug}`,
    }));

    return (
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/cronograma" label="Voltar ao Plano de Estudos" />
        <div className="mt-5">
          <PmalStudyPath
            items={pmalItems}
            contestSigla={week.contestSigla ?? "CFO PMAL"}
            initialWeek={week.weekNumber}
          />
        </div>
      </div>
    );
  }
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
