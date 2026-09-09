"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";

type Lesson = {
  id: string;
  slug: string;
  title: string;
  position: number;
  questionCount: number;
  theoryCompleted: boolean;
  listCompleted: boolean;
  subjectId: string;
  subjectSlug: string;
  subjectShortName: string;
  subjectName: string;
};

type Subject = {
  id: string;
  slug: string;
  shortName: string;
  name: string;
  lessons: Lesson[];
};

type Block = {
  id: string;
  studyDate: string;
  position: number;
  lessons: Lesson[];
};

type Week = {
  weekNumber: number;
  title: string;
  startsOn: string | null;
  endsOn: string | null;
  contestSigla: string | null;
  planName: string;
  subjects: Subject[];
  blocks: Block[];
};

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return { weekday: WEEKDAYS[date.getDay()], short: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}` };
}

function uniqueLessons(lessons: Lesson[]) {
  const seen = new Set<string>();
  return lessons.filter((lesson) => {
    if (seen.has(lesson.id)) return false;
    seen.add(lesson.id);
    return true;
  });
}

function lessonsForDate(blocks: Block[], date: string) {
  return uniqueLessons(
    blocks
      .filter((block) => block.studyDate === date)
      .sort((a, b) => a.position - b.position)
      .flatMap((block) => block.lessons),
  );
}

export function ScheduleWeekDays({ week }: { week: Week }) {
  const dates = useMemo(() => Array.from(new Set(week.blocks.map((block) => block.studyDate))).sort(), [week.blocks]);

  const recommendedDate = useMemo(() => {
    return dates.find((date) => {
      const lessons = lessonsForDate(week.blocks, date);
      return lessons.some((lesson) => !lesson.theoryCompleted || !lesson.listCompleted);
    }) ?? dates[0] ?? "";
  }, [dates, week.blocks]);

  const [selectedDate, setSelectedDate] = useState(recommendedDate);
  const selectedLessons = useMemo(() => lessonsForDate(week.blocks, selectedDate), [selectedDate, week.blocks]);
  const selectedLabel = selectedDate ? formatDate(selectedDate) : null;
  const selectedIndex = Math.max(0, dates.indexOf(selectedDate));
  const selectedQuestions = selectedLessons.reduce((sum, lesson) => sum + lesson.questionCount, 0);
  const completed = selectedLessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;

  return (
    <div className="mt-5 space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-[#795cff]/20 bg-[#0b0b12] p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.17em] text-[#a996ff]"><Sparkles size={13} /> {week.contestSigla ?? "PLANO"} · SEMANA {week.weekNumber}</span>
            <h1 className="mt-2 font-serif text-4xl tracking-[-.04em] sm:text-5xl">{week.title}</h1>
            <p className="mt-3 max-w-2xl text-[10px] leading-5 text-white/43">O dia recomendado aparece mais claro. Os demais continuam liberados para você entrar quando quiser.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3">
            <span className="text-[7px] font-black tracking-[.12em] text-white/35">DIA SELECIONADO</span>
            <strong className="mt-1 block font-serif text-2xl">{selectedIndex + 1} / {dates.length}</strong>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="mb-4">
          <span className="text-[8px] font-black tracking-[.15em] text-[#8067ff]">DIAS DA SEMANA</span>
          <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Escolha o bloco do dia</h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {dates.map((date, index) => {
            const label = formatDate(date);
            const lessons = lessonsForDate(week.blocks, date);
            const done = lessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;
            const active = date === selectedDate;
            const recommended = date === recommendedDate;

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`relative min-h-[150px] overflow-hidden rounded-[20px] border p-4 text-left transition-all duration-200 ${active ? "-translate-y-1 border-[#947cff]/60 bg-[linear-gradient(145deg,#7658ff,#5034c9)] text-white shadow-[0_18px_42px_rgba(78,52,194,.24)]" : recommended ? "border-[#8067ff]/30 bg-[#201a3c] text-white/80" : "border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,#151021)] text-[var(--ink)] opacity-75 hover:opacity-100"}`}
              >
                <span className="text-[7px] font-black tracking-[.13em] opacity-55">DIA {index + 1}</span>
                <strong className="mt-2 block font-serif text-2xl">{label.short}</strong>
                <span className="mt-1 block text-[8px] font-bold capitalize opacity-55">{label.weekday}</span>
                <span className="mt-5 flex items-center gap-1.5 text-[8px] font-black opacity-65">
                  {done === lessons.length && lessons.length ? <CheckCircle2 size={12} className="text-emerald-300" /> : <Circle size={10} />}
                  {done}/{lessons.length} AULAS
                </span>
                {recommended && !active ? <span className="absolute right-2 top-2 rounded-full bg-[#8067ff]/20 px-2 py-1 text-[6px] font-black tracking-[.08em] text-[#b9abff]">RECOMENDADO</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
        <header className="border-b border-[var(--border)] p-5 sm:p-6">
          <span className="text-[8px] font-black tracking-[.15em] text-[#8067ff]">DIA {selectedIndex + 1}</span>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-serif text-3xl text-[var(--ink)] capitalize">{selectedLabel?.weekday}</h2>
              <p className="mt-1 text-[9px] text-[var(--muted)]">{selectedLabel?.short} · {selectedLessons.length} aulas · {selectedQuestions} questões</p>
            </div>
            <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[8px] font-black text-[var(--muted)]">{completed}/{selectedLessons.length} CONCLUÍDAS</span>
          </div>
        </header>

        <div className="space-y-2 p-4 sm:p-5">
          {selectedLessons.map((lesson, index) => {
            const done = lesson.theoryCompleted && lesson.listCompleted;
            return (
              <Link
                key={lesson.id}
                href={`/cronograma/semana-${week.weekNumber}/${lesson.subjectSlug}`}
                className="group flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--background)] p-3.5 transition hover:-translate-y-0.5 hover:border-[#8067ff]/35 sm:p-4"
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-sm font-black ${done ? "border-emerald-500/25 bg-emerald-500/[.07] text-emerald-400" : "border-[#8067ff]/20 bg-[#8067ff]/[.07] text-[#8067ff]"}`}>{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[7px] font-black tracking-[.12em] text-[var(--muted)]">AULA {String(index + 1).padStart(2, "0")} · {lesson.subjectShortName}</span>
                  <strong className="mt-1 block text-[12px] leading-5 text-[var(--ink)] sm:text-[13px]">{lesson.title}</strong>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1.5 text-[8px] font-black text-[var(--muted)] sm:inline-flex"><ListChecks size={12} /> {lesson.questionCount} QUESTÕES</span>
                  <ArrowRight size={16} className="text-[#8067ff] transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
