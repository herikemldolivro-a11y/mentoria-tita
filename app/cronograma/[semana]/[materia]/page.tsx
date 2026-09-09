import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { ScheduleSubjectScreen } from "@/components/schedule-subject-screen";

function parseWeek(value: string) {
  const match = /^semana-(\d+)$/.exec(value);
  return match ? Number(match[1]) : null;
}

export default async function DynamicSubjectPage({ params }: { params: Promise<{ semana: string; materia: string }> }) {
  const { semana, materia } = await params;
  const weekNumber = parseWeek(semana);
  if (!weekNumber) notFound();
  return <PageShell><ScheduleSubjectScreen weekNumber={weekNumber} subjectSlug={materia} /></PageShell>;
}
