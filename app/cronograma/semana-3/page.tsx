import { PageShell } from "@/components/page-shell";
import { ScheduleWeekScreen } from "@/components/schedule-week-screen";

export const dynamic = "force-dynamic";

export default function Semana3Page() {
  return <PageShell><ScheduleWeekScreen weekNumber={3} /></PageShell>;
}
