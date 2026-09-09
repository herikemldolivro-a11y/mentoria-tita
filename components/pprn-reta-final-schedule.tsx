import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ScheduleBlock = {
  id: string;
  study_date: string;
  daypart: "morning" | "afternoon" | "evening";
  start_time: string | null;
  end_time: string | null;
  title: string;
  notes: string | null;
  position: number;
};

type BlockLessonLink = { block_id: string; lesson_id: string; position: number };
type LessonRow = {
  id: string;
  subject_id: string;
  slug: string;
  title: string;
  priority: string | null;
  question_count: number;
};
type SubjectRow = { id: string; slug: string; short_name: string; name: string };

const dayNames = ["TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"] as const;
const daypartNames = { morning: "MANHÃ", afternoon: "TARDE", evening: "NOITE" } as const;

function fortalezaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeText(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function isOptional(priority: string | null) {
  return priority?.toUpperCase().startsWith("OPCIONAL") ?? false;
}

export async function PprnRetaFinalSchedule() {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("study_plans")
    .select("id,name")
    .eq("slug", "pprn-reta-final-2026")
    .eq("active", true)
    .maybeSingle();

  if (!plan) {
    return (
      <section className="mx-auto mt-8 w-full max-w-[1180px] rounded-[28px] border border-red-400/25 bg-red-500/5 p-7">
        <strong className="text-lg text-[var(--ink)]">Plano PPRN não encontrado.</strong>
      </section>
    );
  }

  const { data: week } = await supabase
    .from("study_weeks")
    .select("id,title")
    .eq("plan_id", plan.id)
    .eq("week_number", 1)
    .eq("active", true)
    .maybeSingle();

  if (!week) return null;

  const { data: blockData } = await supabase
    .from("study_schedule_blocks")
    .select("id,study_date,daypart,start_time,end_time,title,notes,position")
    .eq("week_id", week.id)
    .order("study_date", { ascending: true })
    .order("position", { ascending: true });

  const blocks = (blockData ?? []) as ScheduleBlock[];
  const blockIds = blocks.map((block) => block.id);

  const { data: linkData } = blockIds.length
    ? await supabase
        .from("study_schedule_block_lessons")
        .select("block_id,lesson_id,position")
        .in("block_id", blockIds)
        .order("position", { ascending: true })
    : { data: [] };
  const links = (linkData ?? []) as BlockLessonLink[];
  const lessonIds = Array.from(new Set(links.map((item) => item.lesson_id)));

  const { data: lessonData } = lessonIds.length
    ? await supabase
        .from("study_lessons")
        .select("id,subject_id,slug,title,priority,question_count")
        .in("id", lessonIds)
        .eq("active", true)
    : { data: [] };
  const lessons = (lessonData ?? []) as LessonRow[];
  const subjectIds = Array.from(new Set(lessons.map((lesson) => lesson.subject_id)));

  const { data: subjectData } = subjectIds.length
    ? await supabase
        .from("study_subjects")
        .select("id,slug,short_name,name")
        .in("id", subjectIds)
        .eq("active", true)
    : { data: [] };
  const subjects = (subjectData ?? []) as SubjectRow[];

  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  const linksByBlock = new Map<string, BlockLessonLink[]>();
  for (const item of links) {
    const list = linksByBlock.get(item.block_id) ?? [];
    list.push(item);
    linksByBlock.set(item.block_id, list);
  }

  const dateOrder = Array.from(new Set(blocks.map((block) => block.study_date))).sort();
  const today = fortalezaToday();
  let globalLessonNumber = 0;

  return (
    <div data-mt-pprn-native="1" className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
      <section className="rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
        <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">
          <Flame size={16} /> RETA FINAL • POLÍCIA PENAL RN 2026
        </span>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-5xl">
          Semana 1 — todas as aulas liberadas.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Clique em qualquer aula abaixo e vá direto para ela. Não existe bloqueio por aula anterior no plano PPRN.
        </p>
      </section>

      <section className="mt-7 space-y-7">
        {dateOrder.map((date, dayIndex) => {
          const dayBlocks = blocks.filter((block) => block.study_date === date);
          const isToday = date === today;
          return (
            <article key={date} className={`overflow-hidden rounded-[28px] border bg-[var(--surface)] ${isToday ? "border-[var(--gold-bright)]" : "border-[var(--border)]"}`}>
              <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[var(--background)] text-[var(--gold-bright)]">
                    <CalendarDays size={20} />
                  </span>
                  <div>
                    <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">DIA {dayIndex + 1}</span>
                    <h2 className="font-serif text-3xl text-[var(--ink)]">{dayNames[dayIndex] ?? `DIA ${dayIndex + 1}`}</h2>
                  </div>
                </div>
                {isToday ? <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black tracking-[.12em] text-emerald-300">DIA RECOMENDADO</span> : null}
              </header>

              <div className="divide-y divide-[var(--border)]">
                {dayBlocks.map((block) => {
                  const blockLinks = [...(linksByBlock.get(block.id) ?? [])].sort((a, b) => a.position - b.position);
                  return (
                    <section key={block.id} className="p-5 sm:p-6">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">{daypartNames[block.daypart]}</span>
                          <h3 className="mt-1 text-base font-black text-[var(--ink)]">{block.title.replace(/^Dia \d+\s*•\s*(Manhã|Tarde|Noite)\s*—\s*/i, "")}</h3>
                        </div>
                        <span className="w-fit rounded-full border border-[var(--border)] px-2.5 py-1 text-[9px] font-bold text-[var(--muted)]">
                          {timeText(block.start_time)}–{timeText(block.end_time)}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {blockLinks.map((link) => {
                          const lesson = lessonsById.get(link.lesson_id);
                          if (!lesson) return null;
                          globalLessonNumber += 1;
                          const lessonNumber = globalLessonNumber;
                          const subject = subjectsById.get(lesson.subject_id);
                          const optional = isOptional(lesson.priority);
                          return (
                            <Link
                              key={lesson.id}
                              href={`/cronograma/pprn/${lesson.id}`}
                              className="group flex min-h-[86px] items-center gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--background)] px-4 py-4 transition hover:border-[var(--gold)]/45 hover:bg-[color-mix(in_srgb,var(--gold)_4%,var(--background))] sm:px-5"
                            >
                              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border font-serif text-lg ${optional ? "border-sky-400/25 bg-sky-400/[.06] text-sky-300" : "border-violet-400/25 bg-violet-400/[.06] text-violet-300"}`}>
                                {lessonNumber}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[8px] font-black tracking-[.15em] text-[var(--muted)]">AULA {String(lessonNumber).padStart(2, "0")} • {subject?.short_name ?? subject?.name ?? "AULA"}</span>
                                  {optional ? <span className="rounded-full border border-sky-400/25 bg-sky-400/[.06] px-2 py-0.5 text-[7px] font-black tracking-[.08em] text-sky-300">OPCIONAL • RELEITURA</span> : null}
                                </div>
                                <strong className="mt-1.5 block text-sm leading-5 text-[var(--ink)] sm:text-base">{lesson.title}</strong>
                              </div>
                              <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.08em] text-[var(--muted)] sm:inline-flex">
                                <CheckCircle2 size={12} /> {lesson.question_count} QUESTÕES
                              </span>
                              <ArrowRight size={18} className="shrink-0 text-violet-400 transition group-hover:translate-x-1" />
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-7 rounded-[24px] border border-emerald-400/20 bg-emerald-400/[.035] p-5">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-emerald-300"><Target size={13} /> ACESSO LIVRE PPRN</span>
        <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Todas as aulas do cronograma podem ser abertas diretamente, em qualquer ordem. Concluir uma aula registra progresso, mas não libera nem bloqueia outra.</p>
      </section>
    </div>
  );
}
