import { EnglishWeekScreen } from "@/components/english-week-screen";
import { PageShell } from "@/components/page-shell";

export default async function EnglishWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const weekNumber = Number(week);
  return <PageShell><EnglishWeekScreen weekNumber={Number.isFinite(weekNumber) ? weekNumber : 1} /></PageShell>;
}
