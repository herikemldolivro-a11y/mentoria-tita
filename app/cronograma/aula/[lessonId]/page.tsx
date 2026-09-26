import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { PrfLessonWorkflow } from "@/components/prf-lesson-workflow";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DirectLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_study_plan_id,focus_contest_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile?.active_study_plan_id) notFound();

  const { data: lessonRow, error: lessonError } = await supabase
    .from("study_lessons")
    .select("id,subject_id,slug,title,priority,position,question_count,question_list_enabled,pdf_path")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lessonRow) notFound();

  const { data: subjectRow, error: subjectError } = await supabase
    .from("study_subjects")
    .select("id,plan_id,slug,short_name,name,description")
    .eq("id", lessonRow.subject_id)
    .maybeSingle();

  if (subjectError || !subjectRow || subjectRow.plan_id !== profile.active_study_plan_id) notFound();

  const [{ data: topicRows }, { data: planRow }] = await Promise.all([
    supabase
      .from("study_lesson_topics")
      .select("topic,position")
      .eq("lesson_id", lessonRow.id)
      .order("position", { ascending: true }),
    supabase
      .from("study_plans")
      .select("id,name,contest_id")
      .eq("id", profile.active_study_plan_id)
      .maybeSingle(),
  ]);

  let contestSigla = "MENTORIA TITÃ";
  if (planRow?.contest_id) {
    const { data: contestRow } = await supabase
      .from("contests")
      .select("sigla,nome")
      .eq("id", planRow.contest_id)
      .maybeSingle();
    contestSigla = contestRow?.sigla || contestRow?.nome || contestSigla;
  }

  const subject = {
    slug: subjectRow.slug,
    shortName: subjectRow.short_name,
    name: subjectRow.name,
    description: subjectRow.description || "",
    lessons: [],
  } as unknown as PrfSubject;

  const lesson = {
    id: Number(lessonRow.position || 1),
    slug: lessonRow.slug,
    title: lessonRow.title,
    topics: (topicRows ?? []).map((item) => item.topic),
    priority: lessonRow.priority || "Alta",
    weekOne: false,
    questionCount: Number(lessonRow.question_count || 0),
  } as unknown as MatrixLesson;

  return (
    <PageShell compactViewport>
      <div data-mt-direct-lesson-v57="1" className="mx-auto flex h-auto w-full max-w-[1500px] flex-col px-3 pb-3 pt-3 sm:px-4 lg:h-screen lg:overflow-hidden">
        <div className="shrink-0">
          <BackButton fallback="/cronograma" label="Voltar para a trilha" />
        </div>
        <div className="mt-2 min-h-0 flex-1 lg:overflow-hidden">
          <PrfLessonWorkflow
            subject={subject}
            lesson={lesson}
            contestLabel={contestSigla}
            questionListEnabled={lessonRow.question_list_enabled !== false}
          />
        </div>
      </div>
    </PageShell>
  );
}
