import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { PrfLessonWorkflow } from "@/components/prf-lesson-workflow";
import { getPrfLesson } from "@/lib/prf-week-one";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function LessonPage({ params }: { params: Promise<{ materia: string; aula: string }> }) {
  const { focusContest } = await requireAuthenticatedUser();
  const { materia, aula } = await params;

  if (focusContest?.slug === "pprn") {
    const supabase = await createClient();
    const { data: plan } = await supabase
      .from("study_plans")
      .select("id")
      .eq("slug", "pprn-reta-final-2026")
      .eq("active", true)
      .maybeSingle();

    if (!plan) redirect("/cronograma");

    const { data: lesson } = await supabase
      .from("study_lesson_catalog")
      .select("lesson_id")
      .eq("plan_id", plan.id)
      .eq("subject_slug", materia)
      .eq("lesson_slug", aula)
      .maybeSingle();

    if (lesson?.lesson_id) redirect(`/cronograma/pprn/${lesson.lesson_id}`);
    redirect("/cronograma");
  }

  if (focusContest?.slug !== "prf") redirect("/cronograma");

  const result = getPrfLesson(materia, aula);
  if (!result || !result.lesson.weekOne) notFound();
  const { subject, lesson } = result;

  return (
    <PageShell compactViewport>
      <div data-mt-prf-lesson-v57="1" className="mx-auto flex h-auto w-full max-w-[1500px] flex-col px-3 pb-3 pt-3 sm:px-4 lg:h-screen lg:overflow-hidden">
        <div className="shrink-0">
          <BackButton fallback={`/cronograma/semana-1/${subject.slug}`} label={`Voltar para ${subject.shortName}`} />
        </div>
        <div className="mt-2 min-h-0 flex-1 lg:overflow-hidden">
          <PrfLessonWorkflow subject={subject} lesson={lesson} contestLabel="PRF" />
        </div>
      </div>
    </PageShell>
  );

}
