import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { LessonStageExperience } from "@/components/lesson-stage-experience";
import { loadScheduleWeek } from "@/lib/schedule-server";

function priorityPresentation(priority: string | null) {
  const value = (priority ?? "").toLowerCase();
  if (value.includes("mista")) return { label: "🟢/🟠 PRIORIDADE MISTA", border: "rgba(251,191,36,.30)", bg: "linear-gradient(135deg,rgba(16,185,129,.08),rgba(249,115,22,.08))", text: "#fde68a" };
  if (value.includes("laranja")) return { label: "🟠 SELETIVA", border: "rgba(251,146,60,.32)", bg: "rgba(249,115,22,.07)", text: "#fdba74" };
  if (value.includes("vermel")) return { label: "🔴 RELANCE", border: "rgba(248,113,113,.30)", bg: "rgba(239,68,68,.07)", text: "#fca5a5" };
  return { label: "🟢 PRIORIDADE TOTAL", border: "rgba(52,211,153,.30)", bg: "rgba(16,185,129,.07)", text: "#86efac" };
}

export async function ScheduleLessonScreen({ weekNumber, subjectSlug, lessonSlug }: { weekNumber: number; subjectSlug: string; lessonSlug: string }) {
  const week = await loadScheduleWeek(weekNumber);
  const subject = week?.subjects.find((item) => item.slug === subjectSlug);
  const lesson = subject?.lessons.find((item) => item.slug === lessonSlug);
  if (!week || !subject || !lesson) notFound();

  const index = subject.lessons.findIndex((item) => item.id === lesson.id);
  const previous = subject.lessons[index - 1];
  if (index > 0 && !(previous?.theoryCompleted && previous?.listCompleted)) notFound();

  const trackingOnly = week.contestSlug === "enem-40-dias";
  const priority = priorityPresentation(lesson.priority);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
      <BackButton fallback={`/cronograma/semana-${weekNumber}/${subject.slug}`} label={trackingOnly ? `Voltar para o Dia ${weekNumber}` : `Voltar para ${subject.shortName}`} />
      <header className="mt-5 border-b border-[var(--border)] pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">
            {week.contestSigla ?? "PLANO"} · {trackingOnly ? `DIA ${weekNumber}` : week.title.toUpperCase()} · {subject.shortName}
          </span>
          {trackingOnly ? (
            <span className="rounded-full border px-2.5 py-1 text-[8px] font-black tracking-[.1em]" style={{ borderColor: priority.border, background: priority.bg, color: priority.text }}>
              {priority.label}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[.98] tracking-[-.035em] text-[var(--ink)] sm:text-6xl">
          {trackingOnly ? `Dia ${weekNumber} — ${lesson.title}` : `Aula ${String(lesson.position).padStart(2,"0")} — ${lesson.title}`}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          {trackingOnly
            ? "Este plano serve como painel de execução: estude na sua plataforma externa, marque teoria e lista como concluídas aqui e use o calendário para revisão e nivelamento."
            : "Siga a trilha: apenas o passo que precisa ser feito agora fica verde. Clique nele para abrir o conteúdo da etapa."}
        </p>
      </header>

      <div className="mt-7">
        <LessonStageExperience
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
          questionCount={lesson.questionCount ?? 35}
          trackingOnly={trackingOnly}
        />
      </div>
    </div>
  );
}
