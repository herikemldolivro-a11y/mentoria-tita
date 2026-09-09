import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { ScheduleWeekScreen } from "@/components/schedule-week-screen";

function parseWeek(value: string) {
  const match = /^semana-(\d+)$/.exec(value);
  return match ? Number(match[1]) : null;
}

export default async function DynamicWeekPage({ params }: { params: Promise<{ semana: string }> }) {
  const { semana } = await params;
  const weekNumber = parseWeek(semana);
  if (!weekNumber) notFound();
  return <PageShell><ScheduleWeekScreen weekNumber={weekNumber} /></PageShell>;
}
