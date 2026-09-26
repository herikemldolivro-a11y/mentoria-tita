import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PrfLessonWorkflow } from "@/components/prf-lesson-workflow";
import { PageShell } from "@/components/page-shell";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PprnDirectLessonPage({ params }: { params: Promise<{ aula: string }> }) {
  const { focusContest } = await requireAuthenticatedUser();
  if (focusContest?.slug !== "pprn") redirect("/cronograma");

  const { aula } = await params;
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("study_plans")
    .select("id")
    .eq("slug", "pprn-reta-final-2026")
    .eq("active", true)
    .maybeSingle();
  if (!plan) notFound();

  const { data: row } = await supabase
    .from("study_lesson_catalog")
    .select("lesson_id,lesson_slug,lesson_title,lesson_position,subject_slug,subject_short_name,subject_name")
    .eq("plan_id", plan.id)
    .eq("lesson_id", aula)
    .maybeSingle();
  if (!row) notFound();

  const { data: topicRows } = await supabase
    .from("study_lesson_topics")
    .select("topic,position")
    .eq("lesson_id", row.lesson_id)
    .order("position", { ascending: true });

  const lesson = {
    id: Number(row.lesson_position ?? 1),
    slug: row.lesson_slug,
    title: row.lesson_title,
    topics: (topicRows ?? []).map((item) => item.topic).filter(Boolean),
    priority: "Muito alta",
    weekOne: true,
    questionCount: 35,
  } as MatrixLesson;

  const subject = {
    slug: row.subject_slug,
    shortName: row.subject_short_name,
    name: row.subject_name,
    description: "Reta Final Polícia Penal RN 2026 — acesso livre entre aulas.",
    lessons: [lesson],
  } as unknown as PrfSubject;

  return (
    <PageShell compactViewport>
      <div data-mt-pprn-lesson-v57="1" className="mx-auto flex h-auto w-full max-w-[1500px] flex-col px-3 pb-3 pt-3 sm:px-4 lg:h-screen lg:overflow-hidden">
        <div className="shrink-0">
          <BackButton fallback="/cronograma" label="Voltar para o Plano de Estudos" />
        </div>
        <div className="mt-2 min-h-0 flex-1 lg:overflow-hidden">
          <PrfLessonWorkflow subject={subject} lesson={lesson} contestLabel="PPRN" />
        </div>
      </div>
    </PageShell>
  );

}
