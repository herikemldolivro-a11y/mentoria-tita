import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { ScheduleLessonScreen } from "@/components/schedule-lesson-screen";

function parseWeek(value: string) {
  const match = /^semana-(\d+)$/.exec(value);
  return match ? Number(match[1]) : null;
}

export default async function DynamicLessonPage({ params }: { params: Promise<{ semana: string; materia: string; aula: string }> }) {
  const { semana, materia, aula } = await params;
  const weekNumber = parseWeek(semana);
  if (!weekNumber) notFound();
  return <PageShell><ScheduleLessonScreen weekNumber={weekNumber} subjectSlug={materia} lessonSlug={aula} /></PageShell>;
}
