import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, FileText } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { PprnStartListButton } from "@/components/pprn-start-list-button";
import { createClient } from "@/lib/supabase/server";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  position: number;
  priority: string | null;
  question_count: number;
  pdf_path: string | null;
};
type TopicRow = { lesson_id: string; topic: string; position: number };

export async function PprnSubjectOpen({ subjectSlug }: { subjectSlug: string }) {
  const supabase = await createClient();
  const { data: plan } = await supabase.from("study_plans").select("id").eq("slug", "pprn-reta-final-2026").eq("active", true).maybeSingle();
  if (!plan) return <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5 text-sm text-red-300">Plano PPRN não encontrado.</div>;

  const { data: subject } = await supabase
    .from("study_subjects")
    .select("id,slug,short_name,name,description")
    .eq("plan_id", plan.id)
    .eq("slug", subjectSlug)
    .eq("active", true)
    .maybeSingle();
  if (!subject) return <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5 text-sm text-red-300">Matéria não encontrada no plano PPRN.</div>;

  const { data: lessonData } = await supabase
    .from("study_lessons")
    .select("id,slug,title,position,priority,question_count,pdf_path")
    .eq("subject_id", subject.id)
    .eq("active", true)
    .order("position", { ascending: true });
  const lessons = (lessonData ?? []) as LessonRow[];
  const ids = lessons.map((lesson) => lesson.id);
  const { data: topicData } = ids.length
    ? await supabase.from("study_lesson_topics").select("lesson_id,topic,position").in("lesson_id", ids).order("position", { ascending: true })
    : { data: [] };
  const topics = (topicData ?? []) as TopicRow[];
  const topicsByLesson = new Map<string, TopicRow[]>();
  for (const row of topics) {
    const list = topicsByLesson.get(row.lesson_id) ?? [];
    list.push(row);
    topicsByLesson.set(row.lesson_id, list);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
      <BackButton fallback="/cronograma" label="Voltar para o cronograma PPRN" />
      <section className="mt-5 rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8">
        <span className="text-[9px] font-black tracking-[.2em] text-[var(--gold-bright)]">PPRN • TODAS AS AULAS LIBERADAS</span>
        <h1 className="mt-3 font-serif text-4xl tracking-[-.035em] text-[var(--ink)] sm:text-5xl">{subject.name}</h1>
        {subject.description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{subject.description}</p> : null}
        <p className="mt-4 text-xs leading-6 text-emerald-300">Nenhuma aula desta matéria depende da conclusão da anterior. Você pode abrir qualquer aula ou iniciar a Lista 1 diretamente.</p>
      </section>

      <section className="mt-7 space-y-3">
        <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">AULAS DA MATÉRIA</span>
        {lessons.map((lesson) => {
          const optional = lesson.priority?.toUpperCase().startsWith("OPCIONAL") ?? false;
          const lessonTopics = topicsByLesson.get(lesson.id) ?? [];
          return (
            <article key={lesson.id} className={`rounded-[22px] border p-5 sm:p-6 ${optional ? "border-sky-400/25 bg-sky-400/[.035]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">AULA {String(lesson.position).padStart(2, "0")}</span>
                    {lesson.pdf_path ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-2 py-1 text-[8px] font-black text-emerald-300"><FileText size={10} /> PDF DISPONÍVEL</span> : null}
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-2 py-1 text-[8px] font-black text-emerald-300"><CheckCircle2 size={10} /> LIBERADA</span>
                    {optional ? <span className="rounded-full border border-sky-400/25 bg-sky-400/[.06] px-2 py-1 text-[8px] font-black text-sky-300">OPCIONAL • RELEITURA</span> : null}
                  </div>
                  <h2 className="mt-2 font-serif text-2xl text-[var(--ink)]">{lesson.title}</h2>
                  <p className="mt-2 text-[10px] text-[var(--muted)]">Teoria + lista principal de {lesson.question_count} questões • {lessonTopics.length} tópicos cadastrados</p>
                  {lessonTopics.length ? <div className="mt-3 flex flex-wrap gap-1.5">{lessonTopics.map((row) => <span key={`${lesson.id}-${row.position}`} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[9px] text-[var(--muted)]">{row.topic}</span>)}</div> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:w-[340px] lg:justify-end">
                  <Link href={`/cronograma/semana-1/${subject.slug}/${lesson.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/35 px-4 text-[10px] font-black tracking-[.08em] text-[var(--gold-bright)] transition hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--gold)_9%,transparent)]">
                    <BookOpenCheck size={14} /> ABRIR AULA <ArrowRight size={14} />
                  </Link>
                  <PprnStartListButton subjectSlug={subject.slug} lessonSlug={lesson.slug} questionCount={lesson.question_count} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
