import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { PrfLessonWorkflow } from "@/components/prf-lesson-workflow";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PmalDirectLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  // MT_PMAL_DIRECT_LESSON_V12_8
  // A trilha PMAL usa /cronograma/pmal/aula/[lessonId].
  // O rollback da integração removeu a pasta /cronograma/pmal inteira,
  // mas os links da trilha continuaram corretos apontando para esta rota.
  const { data: row, error } = await supabase
    .from("study_lesson_catalog")
    .select(
      "plan_slug,subject_slug,subject_short_name,subject_name,subject_description,lesson_id,lesson_slug,lesson_title,priority,lesson_position,question_count",
    )
    .eq("plan_slug", "cfo-pmal-2026")
    .eq("lesson_id", lessonId)
    .limit(1)
    .maybeSingle();

  if (error || !row) notFound();

  const { data: topicRows } = await supabase
    .from("study_lesson_topics")
    .select("topic,position")
    .eq("lesson_id", row.lesson_id)
    .order("position", { ascending: true });

  const { data: lessonFlags } = await supabase
    .from("study_lessons")
    .select("question_list_enabled")
    .eq("id", row.lesson_id)
    .maybeSingle();

  const subject = {
    slug: row.subject_slug,
    shortName: row.subject_short_name,
    name: row.subject_name,
    description: row.subject_description || "",
    lessons: [],
  } as unknown as PrfSubject;

  const lesson = {
    id: Number(row.lesson_position || 1),
    slug: row.lesson_slug,
    title: row.lesson_title,
    topics: (topicRows ?? []).map((item) => item.topic),
    priority: row.priority || "Alta",
    weekOne: false,
    questionCount: Number(row.question_count || 0),
  } as unknown as MatrixLesson;

  return (
    <PageShell compactViewport>
      <div data-mt-pmal-direct-lesson-v57="1" className="mx-auto flex h-auto w-full max-w-[1500px] flex-col px-3 pb-3 pt-3 sm:px-4 lg:h-screen lg:overflow-hidden">
        <div className="shrink-0">
          <BackButton fallback="/cronograma" label="Voltar para a trilha" />
        </div>
        <div className="mt-2 min-h-0 flex-1 lg:overflow-hidden">
          <PrfLessonWorkflow
            subject={subject}
            lesson={lesson}
            contestLabel="CFO PMAL"
            questionListEnabled={lessonFlags?.question_list_enabled !== false}
          />
        </div>
      </div>
    </PageShell>
  );

}
