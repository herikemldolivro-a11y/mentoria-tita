import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { ScheduleLessonScreen } from "@/components/schedule-lesson-screen";

function parseDay(value: string) {
  const match = /^dia-(\d+)$/u.exec(value);
  const day = match ? Number(match[1]) : null;
  return day && day >= 1 && day <= 40 ? day : null;
}

export default async function EnemLessonPage({
  params,
}: {
  params: Promise<{ dia: string; materia: string; aula: string }>;
}) {
  const { dia, materia, aula } = await params;
  const day = parseDay(dia);
  if (!day) notFound();

  return (
    <PageShell>
      <ScheduleLessonScreen weekNumber={day} subjectSlug={materia} lessonSlug={aula} />
    </PageShell>
  );
}
