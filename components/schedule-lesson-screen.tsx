import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { LessonJourney } from "@/components/lesson-journey";
import { PrfLessonWorkflow } from "@/components/prf-lesson-workflow";
import { loadScheduleWeek } from "@/lib/schedule-server";

export async function ScheduleLessonScreen({ weekNumber, subjectSlug, lessonSlug }: { weekNumber: number; subjectSlug: string; lessonSlug: string }) {
  const week = await loadScheduleWeek(weekNumber);
  const subject = week?.subjects.find((item) => item.slug === subjectSlug);
  const lesson = subject?.lessons.find((item) => item.slug === lessonSlug);
  if (!week || !subject || !lesson) notFound();

  const index = subject.lessons.findIndex((item) => item.id === lesson.id);
  const previous = subject.lessons[index - 1];
  if (index > 0 && !(previous?.theoryCompleted && previous?.listCompleted)) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
      <BackButton fallback={`/cronograma/semana-${weekNumber}/${subject.slug}`} label={`Voltar para ${subject.shortName}`} />
      <header className="mt-5 border-b border-[var(--border)] pb-7">
        <span className="text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">{week.contestSigla ?? "PLANO"} · {week.title.toUpperCase()} · {subject.shortName}</span>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[.98] tracking-[-.035em] text-[var(--ink)] sm:text-6xl">Aula {String(lesson.position).padStart(2,"0")} — {lesson.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Siga a trilha: teoria, lista, agendamento da revisão, revisão e nivelamento. Cada ponto libera o próximo sem perder seu progresso.</p>
      </header>

      <div className="mt-7">
        <LessonJourney subjectSlug={subject.slug} lessonSlug={lesson.slug} questionCount={lesson.questionCount ?? 35} />
      </div>

      <div className="v3-lesson-workflow-host mt-7 [&>div>aside]:hidden [&>div]:!grid-cols-1">
        <PrfLessonWorkflow
          subject={{
            slug: subject.slug,
            shortName: subject.shortName,
            name: subject.name,
            description: subject.description || "",
            lessons: [],
          }}
          lesson={{
            id: lesson.position,
            slug: lesson.slug,
            title: lesson.title,
            topics: lesson.topics,
            priority: (lesson.priority || "Alta") as never,
            weekOne: weekNumber === 1,
            questionCount: lesson.questionCount,
          }}
        />
      </div>
    </div>
  );
}
