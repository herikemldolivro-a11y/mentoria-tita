import { PageShell } from "@/components/page-shell";
import { ScheduleWeekScreen } from "@/components/schedule-week-screen";

export const dynamic = "force-dynamic";

export default function Semana1Page() {
  return <PageShell><ScheduleWeekScreen weekNumber={1} /></PageShell>;
}
