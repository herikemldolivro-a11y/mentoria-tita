import { PageShell } from "@/components/page-shell";
import { ScheduleWeekScreen } from "@/components/schedule-week-screen";

export const dynamic = "force-dynamic";

export default function Semana5Page() {
  return <PageShell><ScheduleWeekScreen weekNumber={5} /></PageShell>;
}
