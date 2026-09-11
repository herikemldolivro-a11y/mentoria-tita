import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { LessonStageExperience } from "@/components/lesson-stage-experience";
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
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/cronograma" label="Voltar para o Plano de Estudos" />
        <header className="mt-5 border-b border-[var(--border)] pb-7">
          <span className="text-[10px] font-black tracking-[0.2em] text-[var(--gold-bright)]">PPRN • RETA FINAL • {row.subject_short_name}</span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[.98] tracking-[-.035em] text-[var(--ink)] sm:text-6xl">{row.lesson_title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">A etapa que precisa ser feita agora aparece em verde. Clique nela para abrir apenas o conteúdo correspondente.</p>
        </header>
        <div className="mt-7">
          <LessonStageExperience subject={subject} lesson={lesson} questionCount={35} />
        </div>
      </div>
    </PageShell>
  );
}
