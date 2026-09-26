import { PmalStudyPath } from "@/components/pmal-study-path";
import { loadPmalEnglishDailyTasks } from "@/lib/pmal-english-server";
import { loadPersonalSchedule } from "@/lib/personal-schedule-server";

export async function PmalScheduleExperience({
  contestSigla = "CFO PMAL",
}: {
  contestSigla?: string | null;
}) {
  const personal = await loadPersonalSchedule();

  const scheduleEnd =
    personal.items
      .map((item) => item.scheduledFor)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => a.localeCompare(b))
      .at(-1) ?? null;

  let englishTasks: Awaited<ReturnType<typeof loadPmalEnglishDailyTasks>> = [];
  try {
    englishTasks = await loadPmalEnglishDailyTasks(scheduleEnd);
  } catch {
    englishTasks = [];
  }

  const items = personal.items.map((item) => ({
    id: item.id,
    lessonId: item.lesson.id,
    scheduledFor: item.scheduledFor,
    studyDay: item.studyDay,
    weekNumber: item.weekNumber,
    position: item.position,
    estimatedMinutes: item.estimatedMinutes,
    subjectName: item.subject.name,
    subjectShortName: item.subject.shortName,
    lessonTitle: item.lesson.title,
    questionCount: item.lesson.questionCount,
    questionListEnabled: item.lesson.questionListEnabled,
    theoryCompleted: item.theoryCompleted,
    listCompleted: item.listCompleted,
    imagePath: item.visual.imagePath,
    href: `/cronograma/pmal/aula/${item.lesson.id}`,
  }));

  return (
    <PmalStudyPath
      items={items}
      englishTasks={englishTasks}
      contestSigla={contestSigla}
      dailyStudyMinutes={personal.dailyStudyMinutes}
    />
  );
}
