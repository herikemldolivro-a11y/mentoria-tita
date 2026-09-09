import { PageShell } from "@/components/page-shell";
import { ScheduleWeekScreen } from "@/components/schedule-week-screen";

export const dynamic = "force-dynamic";

export default function Semana6Page() {
  return <PageShell><ScheduleWeekScreen weekNumber={6} /></PageShell>;
}
