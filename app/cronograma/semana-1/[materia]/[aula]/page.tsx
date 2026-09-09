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
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback={`/cronograma/semana-1/${subject.slug}`} label={`Voltar para ${subject.shortName}`} />
        <header className="mt-5 border-b border-[var(--border)] pb-7">
          <span className="text-[10px] font-black tracking-[0.2em] text-[var(--gold-bright)]">PRF · SEMANA 1 · {subject.shortName}</span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[.98] tracking-[-.035em] text-[var(--ink)] sm:text-6xl">Aula {String(lesson.id).padStart(2, "0")} — {lesson.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Escolha PDF da plataforma ou videoaula do seu cursinho. Depois conclua a teoria e a lista de 35 questões para liberar a próxima aula.</p>
        </header>
        <div className="mt-7"><PrfLessonWorkflow subject={subject} lesson={lesson} /></div>
      </div>
    </PageShell>
  );
}
