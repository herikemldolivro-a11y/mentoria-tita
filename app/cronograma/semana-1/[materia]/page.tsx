import { PageShell } from "@/components/page-shell";
import { ScheduleSubjectScreen } from "@/components/schedule-subject-screen";

export default async function WeekOneSubjectPage({ params }: { params: Promise<{ materia: string }> }) {
  const { materia } = await params;
  return <PageShell><ScheduleSubjectScreen weekNumber={1} subjectSlug={materia} /></PageShell>;
}
