import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { loadScheduleWeek } from "@/lib/schedule-server";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${WEEKDAYS[date.getDay()]} · ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export async function ScheduleSubjectScreen({
  weekNumber,
  subjectSlug,
}: {
  weekNumber: number;
  subjectSlug: string;
}) {
  const week = await loadScheduleWeek(weekNumber);
  const subject = week?.subjects.find((item) => item.slug === subjectSlug);
  if (!week || !subject) notFound();

  const allDates = Array.from(new Set(week.blocks.map((block) => block.studyDate))).sort();
  const subjectBlocks = week.blocks.filter((block) => block.lessons.some((lesson) => lesson.subjectId === subject.id));
  const completed = subject.lessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;
  const questions = subject.lessons.reduce((sum, lesson) => sum + lesson.questionCount, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
      <BackButton fallback={`/cronograma/semana-${weekNumber}`} label={`Voltar para ${week.title}`} />

      <header className="mt-5 border-b border-[var(--border)] pb-7">
        <span className="text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">
          {week.contestSigla ?? "PLANO"} · SEMANA {week.weekNumber} · {subject.shortName}
        </span>
        <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">{subject.name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          {subject.description || "Siga as aulas na ordem definida pela mentoria."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[9px] font-black text-[var(--muted)]">
            {subject.lessons.length} AULAS
          </span>
          <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[9px] font-black text-[var(--muted)]">
            {questions} QUESTÕES PRINCIPAIS
          </span>
          <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[9px] font-black text-[var(--muted)]">
            {completed}/{subject.lessons.length} CONCLUÍDAS
          </span>
        </div>
      </header>

      

      

      <section className="mt-8">
        <span className="text-[9px] font-black tracking-[.15em] text-[var(--gold-bright)]">AULAS DA MATÉRIA</span>

        <div className="mt-4 space-y-3">
          {subject.lessons.map((lesson, index) => {
            const previous = subject.lessons[index - 1];
            const unlocked = index === 0 || Boolean(previous?.theoryCompleted && previous?.listCompleted);
            const completedLesson = lesson.theoryCompleted && lesson.listCompleted;

            return (
              <article
                key={lesson.id}
                className="rounded-[22px] border p-5"
                style={{
                  borderColor: completedLesson ? "rgba(49,199,101,.35)" : unlocked ? "rgba(210,166,78,.32)" : "var(--border)",
                  background: completedLesson ? "rgba(49,199,101,.045)" : "var(--surface)",
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[9px] font-black tracking-[.14em]"
                        style={{ color: completedLesson ? "#31c765" : unlocked ? "var(--gold-bright)" : "var(--muted)" }}
                      >
                        AULA {String(lesson.position).padStart(2, "0")}
                      </span>
                      {lesson.pdfPath ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[.05] px-2 py-1 text-[8px] font-black text-emerald-400">
                          <FileText size={11} /> PDF DISPONÍVEL
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-2 font-serif text-2xl text-[var(--ink)]">{lesson.title}</h2>

                    <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">
                      Teoria + lista principal de {lesson.questionCount} questões
                      {lesson.topics.length ? ` · ${lesson.topics.length} tópicos cadastrados` : ""}
                    </p>

                    {lesson.topics.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {lesson.topics.slice(0, 5).map((topic) => (
                          <span key={topic} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[8px] text-[var(--muted)]">
                            {topic}
                          </span>
                        ))}
                        {lesson.topics.length > 5 ? (
                          <span className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[8px] text-[var(--muted)]">
                            +{lesson.topics.length - 5}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {unlocked ? (
                    <Link
                      href={`/cronograma/semana-${weekNumber}/${subject.slug}/${lesson.slug}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)]"
                    >
                      {completedLesson ? <CheckCircle2 size={15} /> : null}
                      {completedLesson ? "REABRIR AULA" : "ABRIR AULA"} <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black text-[var(--muted)]">
                      <LockKeyhole size={14} /> BLOQUEADA
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
