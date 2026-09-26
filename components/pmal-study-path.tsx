"use client";

import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  LoaderCircle,
  LockKeyhole,
  MonitorPlay,
  Route,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PmalEnglishDailyTask } from "@/lib/pmal-english-server";
import { createClient } from "@/lib/supabase/client";

export type PmalStudyPathItem = {
  id: string;
  lessonId?: string;
  scheduledFor: string | null;
  studyDay: number | null;
  weekNumber: number;
  position: number;
  estimatedMinutes: number | null;
  subjectName: string;
  subjectShortName: string;
  lessonTitle: string;
  questionCount: number;
  questionListEnabled?: boolean;
  theoryCompleted: boolean;
  listCompleted: boolean;
  imagePath: string | null;
  href: string;
};

const PMAL_DAY_ONE = "2026-09-16";
const LESSONS_PER_DAY = 4;
const DAY_TAB_PAGE_SIZE = 12;
const PMAL_TITAN_MASCOT_SRC = "/mascots/tita-pmal-guardian.png";

// Fase atual: estas matérias ficam guardadas no cronograma/banco,
// mas não entram na trilha até o usuário liberar depois.
const DEFERRED_SUBJECT_NAMES = new Set([
  "matematica",
  "fisica",
  "quimica",
  "biologia",
  "filosofia",
  "sociologia",
]);

function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function visualDayFromDate(value: string) {
  const diff = Math.round(
    (utcDate(value).getTime() - utcDate(PMAL_DAY_ONE).getTime()) / 86_400_000,
  );
  return diff + 1;
}

function todayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(year, month - 1, day));
}

function resolveQuestionCount(count: number, enabled = true) {
  return enabled && count > 0 ? 35 : 0;
}

function lessonDone(lesson: PmalStudyPathItem) {
  return lesson.theoryCompleted && (lesson.questionListEnabled === false || lesson.listCompleted);
}

type DayBundle = {
  dayNumber: number;
  date: string;
  lessons: PmalStudyPathItem[];
  english: PmalEnglishDailyTask[];
};

type LessonReviewState = {
  status: "none" | "scheduled" | "completed";
  date: string | null;
};

export function PmalStudyPath({
  items,
  englishTasks = [],
  contestSigla = "CFO PMAL",
  dailyStudyMinutes = null,
  preserveScheduleDays = false,
}: {
  items: PmalStudyPathItem[];
  englishTasks?: PmalEnglishDailyTask[];
  contestSigla?: string | null;
  dailyStudyMinutes?: number | null;
  initialWeek?: number;
  preserveScheduleDays?: boolean;
}) {
  // V12.5: sem fetch no navegador. Os textos chegam prontos do Server Component.
  // Isso elimina o Runtime TypeError: network error causado pelo refetch da API local.
  const loadedEnglish = englishTasks;
  const today = todayInBrazil();

  const days = useMemo<DayBundle[]>(() => {
    if (preserveScheduleDays) {
      const grouped = new Map<number, PmalStudyPathItem[]>();
      for (const item of [...items].sort((a, b) => (a.studyDay ?? 9999) - (b.studyDay ?? 9999) || a.position - b.position)) {
        const day = item.studyDay ?? 1;
        const list = grouped.get(day) ?? [];
        list.push(item);
        grouped.set(day, list);
      }

      return Array.from(grouped.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([dayNumber, lessons]) => {
          const date = lessons[0]?.scheduledFor ?? addDays(today, dayNumber - 1);
          return {
            dayNumber,
            date,
            lessons,
            english: loadedEnglish.filter((task) => task.assignedDate === date).sort((a, b) => a.slot - b.slot).slice(0, 2),
          };
        });
    }

    const activeLessons = items
      .filter((item) => {
        const subjectKey = item.subjectName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const shortKey = item.subjectShortName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return !DEFERRED_SUBJECT_NAMES.has(subjectKey) && !DEFERRED_SUBJECT_NAMES.has(shortKey);
      })
      .sort((a, b) => {
        const byDate = (a.scheduledFor ?? "9999-12-31").localeCompare(b.scheduledFor ?? "9999-12-31");
        return byDate !== 0 ? byDate : a.position - b.position;
      });

    const totalDays = Math.max(1, Math.ceil(activeLessons.length / LESSONS_PER_DAY));
    return Array.from({ length: totalDays }, (_, index) => {
      const date = addDays(PMAL_DAY_ONE, index);
      const start = index * LESSONS_PER_DAY;
      return {
        dayNumber: index + 1,
        date,
        lessons: activeLessons.slice(start, start + LESSONS_PER_DAY),
        english: loadedEnglish.filter((task) => task.assignedDate === date).sort((a, b) => a.slot - b.slot).slice(0, 2),
      };
    });
  }, [items, loadedEnglish, preserveScheduleDays, today]);

  const initialDay = useMemo(() => {
    const todayBundle = days.find((day) => day.date === today);
    if (todayBundle) return todayBundle.dayNumber;

    const firstPending = days.find((day) =>
      day.lessons.some((lesson) => !lessonDone(lesson)),
    );

    return firstPending?.dayNumber ?? 1;
  }, [days, today]);

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [dayPage, setDayPage] = useState(
    Math.max(0, Math.floor((initialDay - 1) / DAY_TAB_PAGE_SIZE)),
  );

  useEffect(() => {
    if (!days.length) return;
    if (!days.some((day) => day.dayNumber === selectedDay)) {
      setSelectedDay(initialDay);
      setDayPage(Math.max(0, Math.floor((initialDay - 1) / DAY_TAB_PAGE_SIZE)));
      return;
    }

    setDayPage(Math.max(0, Math.floor((selectedDay - 1) / DAY_TAB_PAGE_SIZE)));
  }, [days, initialDay, selectedDay]);

  const current = days.find((day) => day.dayNumber === selectedDay) ?? days[0] ?? null;
  const totalDayPages = Math.max(1, Math.ceil(days.length / DAY_TAB_PAGE_SIZE));
  const visibleDays = days.slice(
    dayPage * DAY_TAB_PAGE_SIZE,
    dayPage * DAY_TAB_PAGE_SIZE + DAY_TAB_PAGE_SIZE,
  );

  const allLessons = days.flatMap((day) => day.lessons);
  const allDone = allLessons.filter(
    (lesson) => lessonDone(lesson),
  ).length;
  const progress = allLessons.length ? Math.round((allDone / allLessons.length) * 100) : 0;

  if (!current) return null;

  return (
    <div data-mt-pmal-study-v50="1" className="overflow-hidden rounded-[26px] border border-white/[.08] bg-[#04060b] text-white shadow-[0_30px_90px_rgba(0,0,0,.34)]">
      <section className="relative min-h-[190px] overflow-hidden border-b border-white/[.08]">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/cfo-pmal-hero.png')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,.98)_0%,rgba(4,6,12,.86)_44%,rgba(5,7,14,.34)_72%,rgba(5,7,14,.12)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_30%,rgba(245,158,11,.15),transparent_28%),radial-gradient(circle_at_45%_10%,rgba(124,58,237,.16),transparent_30%)]" />

        <div className="relative z-10 grid min-h-[190px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:px-8">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.19em] text-fuchsia-300">
              <Route size={15} /> {contestSigla} · TRILHA
            </span>
            <h1 className="mt-2 font-serif text-[3.5rem] font-black leading-[.9] tracking-[-.055em] text-white sm:text-[4.4rem]">
              Dia <span className="text-amber-300">{selectedDay}</span>
            </h1>
            <p className="mt-3 text-sm text-white/74 sm:text-base">
              {current.lessons.length} aula{current.lessons.length === 1 ? "" : "s"}{current.english.length ? ` · ${current.english.length} texto${current.english.length === 1 ? "" : "s"} de Inglês` : ""} · distribuição automática pela sua carga diária.
            </p>
          </div>

          <div className="rounded-[22px] border border-violet-300/30 bg-[#090817]/80 p-5 shadow-[0_18px_55px_rgba(0,0,0,.34),inset_0_1px_rgba(255,255,255,.04)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-[13px] font-black tracking-[.04em] text-white/90">
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-200">
                  <Sparkles size={16} />
                </span>
                {allDone}/{allLessons.length} AULAS
              </span>
              <strong className="text-lg text-violet-200">{progress}%</strong>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/[.09]">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#d36cff,#f1b6ff)] shadow-[0_0_18px_rgba(168,85,247,.55)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[9px] font-black tracking-[.12em] text-white/44">
              <span>SUA EVOLUÇÃO NO CURSO</span>
              {dailyStudyMinutes ? <span>{Math.round((dailyStudyMinutes / 60) * 10) / 10}H/DIA</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/[.08] bg-[#080a10]/95 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-[11px] font-black tracking-[.20em] text-violet-200/75">DIAS</span>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {visibleDays.map((day) => {
              const lessonsDone = day.lessons.length > 0 && day.lessons.every((lesson) => lessonDone(lesson));
              const englishDone = day.english.length === 0 || day.english.every((task) => task.completed);
              const dayDone = lessonsDone && englishDone;
              const active = day.dayNumber === current.dayNumber;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDay(day.dayNumber)}
                  title={`Dia ${day.dayNumber}`}
                  className={`grid h-11 min-w-[50px] flex-1 place-items-center rounded-xl border px-3 text-sm font-black transition ${
                    active
                      ? "border-violet-300/80 bg-[linear-gradient(180deg,rgba(124,58,237,.42),rgba(76,29,149,.32))] text-white shadow-[0_0_0_2px_rgba(139,92,246,.18),0_0_22px_rgba(139,92,246,.55)]"
                      : dayDone
                        ? "border-cyan-300/25 bg-cyan-300/[.065] text-cyan-100"
                        : "border-white/[.10] bg-white/[.025] text-white/72 hover:border-violet-300/35 hover:bg-violet-300/[.06] hover:text-white"
                  }`}
                >
                  {day.dayNumber}
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={dayPage <= 0}
              onClick={() => setDayPage((page) => Math.max(0, page - 1))}
              className="grid h-11 w-11 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/[.06] text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-400/[.12] disabled:opacity-25"
              title="Dias anteriores"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={dayPage >= totalDayPages - 1}
              onClick={() => setDayPage((page) => Math.min(totalDayPages - 1, page + 1))}
              className="grid h-11 w-11 place-items-center rounded-xl border border-violet-300/30 bg-violet-500/[.08] text-violet-200 transition hover:border-violet-300/55 hover:bg-violet-400/[.14] disabled:opacity-25"
              title="Próximos dias"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="relative bg-[radial-gradient(circle_at_90%_15%,rgba(76,29,149,.10),transparent_28%),radial-gradient(circle_at_12%_58%,rgba(6,182,212,.055),transparent_30%),#04060b] px-4 pb-6 pt-5 sm:px-6 lg:px-7">
        <div className="mb-5 px-1">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.19em] text-fuchsia-300">
            <Sparkles size={14} /> TRILHA GAMIFICADA · DIA {selectedDay}
          </span>
          <h2 className="mt-1 font-serif text-3xl font-black tracking-[-.035em] text-white sm:text-4xl">
            Aulas, listas e revisões em um único caminho.
          </h2>
          <p className="mt-1.5 text-[12px] leading-5 text-white/58 sm:text-sm">
            Siga a trilha na ordem, conclua cada etapa e avance. A revisão dourada só é liberada após concluir a lista de questões.
          </p>
        </div>

        <PmalGamifiedTrail
          lessons={current.lessons}
          english={current.english}
          date={current.date}
          dayNumber={selectedDay}
        />
      </section>
    </div>
  );
}

type TrailStep =
  | { kind: "lesson"; lesson: PmalStudyPathItem; key: string }
  | { kind: "list"; lesson: PmalStudyPathItem; key: string }
  | { kind: "review"; lesson: PmalStudyPathItem; key: string };

function lessonIdOf(lesson: PmalStudyPathItem) {
  return lesson.lessonId || lesson.href.match(/\/cronograma\/pmal\/aula\/([^/?#]+)/)?.[1] || null;
}

function trailPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middleY = (previous.y + current.y) / 2;
    path += ` C ${previous.x} ${middleY}, ${current.x} ${middleY}, ${current.x} ${current.y}`;
  }

  return path;
}

function PmalGamifiedTrail({
  lessons,
  english,
  date,
  dayNumber,
}: {
  lessons: PmalStudyPathItem[];
  english: PmalEnglishDailyTask[];
  date: string;
  dayNumber: number;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewStates, setReviewStates] = useState<Record<string, LessonReviewState>>({});

  useEffect(() => {
    let alive = true;

    async function loadReviewStates() {
      try {
        const lessonIds = lessons
          .map((lesson) => lessonIdOf(lesson))
          .filter((value): value is string => Boolean(value));

        if (!lessonIds.length) {
          if (alive) setReviewStates({});
          return;
        }

        const supabase = createClient() as any;
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data: lessonRows, error: lessonError } = await supabase
          .from("study_lessons")
          .select("id,slug")
          .in("id", lessonIds);

        if (lessonError) throw lessonError;

        const rows = (lessonRows ?? []) as Array<{ id: string; slug: string | null }>;
        const lessonSlugMap = new Map(rows.filter((row) => row.slug).map((row) => [row.id, row.slug as string]));
        const lessonSlugs = Array.from(new Set(rows.map((row) => row.slug).filter((value): value is string => Boolean(value))));

        if (!lessonSlugs.length) {
          if (alive) setReviewStates({});
          return;
        }

        const { data: revisionRows, error: revisionError } = await supabase
          .from("user_revisions")
          .select("lesson_slug,scheduled_for,recommended_for,status,revision_number")
          .eq("revision_number", 1)
          .in("lesson_slug", lessonSlugs);

        if (revisionError) throw revisionError;

        const bySlug = new Map<string, LessonReviewState>();

        for (const row of (revisionRows ?? []) as Array<{ lesson_slug: string; scheduled_for: string | null; recommended_for: string | null; status: string | null; revision_number: number }> ) {
          const nextStatus: LessonReviewState = {
            status: row.status === "completed" ? "completed" : "scheduled",
            date: row.scheduled_for ?? row.recommended_for ?? null,
          };

          const current = bySlug.get(row.lesson_slug);
          if (!current || (current.status !== "completed" && nextStatus.status === "completed")) {
            bySlug.set(row.lesson_slug, nextStatus);
          }
        }

        const mapped = Object.fromEntries(
          lessons.map((lesson) => {
            const lessonId = lessonIdOf(lesson) ?? lesson.id;
            const lessonSlug = lessonSlugMap.get(lessonId);
            return [lesson.id, lessonSlug ? (bySlug.get(lessonSlug) ?? { status: "none", date: null }) : { status: "none", date: null }];
          }),
        ) as Record<string, LessonReviewState>;

        if (alive) setReviewStates(mapped);
      } catch {
        if (alive) setReviewStates({});
      }
    }

    void loadReviewStates();

    return () => {
      alive = false;
    };
  }, [lessons]);

  const steps = useMemo<TrailStep[]>(() => {
    return lessons.flatMap((lesson) => {
      const row: TrailStep[] = [
        { kind: "lesson", lesson, key: `lesson-${lesson.id}` },
      ];

      // Nem toda aula precisa ter lista. Quando questionCount = 0,
      // a trilha segue direto para a próxima aula.
      if (resolveQuestionCount(lesson.questionCount, lesson.questionListEnabled !== false) > 0) {
        row.push(
          { kind: "list", lesson, key: `list-${lesson.id}` },
          { kind: "review", lesson, key: `review-${lesson.id}` },
        );
      }

      return row;
    });
  }, [lessons]);

  const points = useMemo(
    () =>
      steps.map((_, index) => ({
        x: index % 2 === 0 ? 38 : 62,
        y: 86 + index * 148,
      })),
    [steps],
  );

  const canvasHeight = Math.max(640, 170 + Math.max(0, steps.length - 1) * 148);
  const path = trailPath(points);

  const mascotSpots = useMemo(() => {
    const spots: Array<{ key: string; x: number; y: number; scale: number; rotate: number }> = [];
    let cursor = 0;

    lessons.forEach((lesson, lessonIndex) => {
      const clusterSize = resolveQuestionCount(lesson.questionCount, lesson.questionListEnabled !== false) > 0 ? 3 : 1;
      const startIndex = cursor;
      const endIndex = cursor + clusterSize - 1;
      const first = points[startIndex];
      const last = points[endIndex];
      const openRight = lessonIndex % 2 === 0;
      const meanY = Math.round((first.y + last.y) / 2 - (clusterSize > 1 ? 132 : 96));

      spots.push({
        key: `mascot-${lesson.id}`,
        x: openRight ? 75 : 25,
        y: meanY,
        scale: clusterSize > 1 ? 0.84 : 0.76,
        rotate: openRight ? -3 : 3,
      });

      cursor += clusterSize;
    });

    return spots;
  }, [lessons, points]);

  async function revisionHref(lesson: PmalStudyPathItem) {
    const lessonId = lessonIdOf(lesson);
    if (!lessonId) {
      throw new Error("Não foi possível identificar esta aula.");
    }

    const supabase = createClient() as any;

    const { data: lessonRow, error: lessonError } = await supabase
      .from("study_lessons")
      .select("slug,subject_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lessonRow?.slug || !lessonRow?.subject_id) {
      throw lessonError ?? new Error("Não foi possível localizar a aula.");
    }

    const { data: subjectRow, error: subjectError } = await supabase
      .from("study_subjects")
      .select("slug")
      .eq("id", lessonRow.subject_id)
      .single();

    if (subjectError || !subjectRow?.slug) {
      throw subjectError ?? new Error("Não foi possível localizar a matéria.");
    }

    const recommendedDate = addDays(todayInBrazil(), 2);

    return `/revisoes?subject=${encodeURIComponent(subjectRow.slug)}&lesson=${encodeURIComponent(lessonRow.slug)}&revision=1&date=${recommendedDate}`;
  }

  async function openList(lesson: PmalStudyPathItem) {
    if (!lesson.theoryCompleted || resolveQuestionCount(lesson.questionCount, lesson.questionListEnabled !== false) <= 0 || busyKey) return;

    const lessonId = lessonIdOf(lesson);
    if (!lessonId) {
      setMessage("Não foi possível identificar esta aula.");
      return;
    }

    const key = `list-${lesson.id}`;
    setBusyKey(key);
    setMessage(null);

    try {
      const returnHref = await revisionHref(lesson).catch(() => lesson.href);
      window.sessionStorage.setItem("mentoria-tita:list-return", returnHref);

      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc(
        "start_lesson_question_attempt",
        { p_lesson_id: lessonId },
      );

      if (error) throw error;

      const result = (data ?? {}) as {
        ok?: boolean;
        attempt_id?: string | null;
        available_count?: number;
        required_count?: number;
        reason?: string;
      };

      if (!result.ok || !result.attempt_id) {
        window.sessionStorage.removeItem("mentoria-tita:list-return");

        if (
          result.reason === "no_questions" ||
          Number(result.available_count ?? 0) === 0
        ) {
          throw new Error("Ainda não há questões disponíveis para esta lista.");
        }

        if (result.available_count !== undefined) {
          throw new Error(
            `Lista indisponível: ${result.available_count}/${result.required_count ?? resolveQuestionCount(lesson.questionCount, lesson.questionListEnabled !== false)} questões disponíveis.`,
          );
        }

        throw new Error("Não foi possível iniciar esta lista agora.");
      }

      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (error) {
      window.sessionStorage.removeItem("mentoria-tita:list-return");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a lista.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function openRevision(lesson: PmalStudyPathItem) {
    if (!lesson.listCompleted || busyKey) return;

    const key = `review-${lesson.id}`;
    setBusyKey(key);
    setMessage(null);

    try {
      router.push(await revisionHref(lesson));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o agendamento da revisão.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  function NodeIcon({
    step,
    busy,
    locked,
  }: {
    step: TrailStep;
    busy: boolean;
    locked: boolean;
  }) {
    if (busy) return <LoaderCircle size={31} className="animate-spin" />;

    if (step.kind === "lesson") {
      return step.lesson.theoryCompleted ? (
        <Check size={31} strokeWidth={3} />
      ) : (
        <MonitorPlay size={33} strokeWidth={1.8} />
      );
    }

    if (step.kind === "list") {
      return locked ? (
        <LockKeyhole size={27} />
      ) : step.lesson.listCompleted ? (
        <Check size={31} strokeWidth={3} />
      ) : (
        <BookOpenText size={31} strokeWidth={1.8} />
      );
    }

    return locked ? (
      <LockKeyhole size={27} />
    ) : (
      <CalendarDays size={31} strokeWidth={1.8} />
    );
  }

  return (
    <section data-mt-pmal-gamified-path="1" data-mt-pmal-gamified-path-version="50.1" className="relative">
      {message ? (
        <div className="mb-4 rounded-2xl border border-amber-300/25 bg-amber-300/[.07] px-4 py-3 text-[11px] leading-5 text-amber-100/90">
          {message}
        </div>
      ) : null}

      <div className="relative">
        <div className="pointer-events-none absolute bottom-[54px] left-[29px] top-[54px] hidden w-[3px] rounded-full bg-[linear-gradient(180deg,#21e6dc_0%,#21e6dc_28%,#f6b82f_48%,#8b5cf6_66%,rgba(139,92,246,.18)_100%)] shadow-[0_0_16px_rgba(45,212,191,.38)] sm:block" />

        <div className="space-y-3">
          {steps.map((step, index) => {
            const locked =
              step.kind === "list"
                ? !step.lesson.theoryCompleted
                : step.kind === "review"
                  ? !step.lesson.listCompleted
                  : false;
            const busy = busyKey === step.key;
            const lessonOrdinal = Math.max(1, lessons.findIndex((item) => item.id === step.lesson.id) + 1);
            const reviewState = reviewStates[step.lesson.id] ?? { status: "none", date: null };
            const reviewScheduled = step.kind === "review" && reviewState.status === "scheduled";
            const reviewCompleted = step.kind === "review" && reviewState.status === "completed";
            const reviewResolved = reviewScheduled || reviewCompleted;
            const complete =
              step.kind === "lesson"
                ? step.lesson.theoryCompleted
                : step.kind === "list"
                  ? step.lesson.listCompleted
                  : reviewCompleted;

            const tone =
              step.kind === "review"
                ? locked
                  ? "border-amber-300/18 bg-[linear-gradient(90deg,rgba(245,158,11,.04),rgba(255,255,255,.018))]"
                  : reviewResolved
                    ? "border-emerald-300/26 bg-[linear-gradient(90deg,rgba(16,185,129,.08),rgba(255,255,255,.015))] opacity-[.88]"
                    : "border-amber-300/60 bg-[linear-gradient(90deg,rgba(245,158,11,.10),rgba(255,255,255,.02))] shadow-[0_0_28px_rgba(245,158,11,.09)]"
                : complete
                  ? "border-emerald-300/24 bg-[linear-gradient(90deg,rgba(16,185,129,.07),rgba(255,255,255,.014))] opacity-[.84]"
                  : "border-violet-300/22 bg-[linear-gradient(90deg,rgba(91,33,182,.08),rgba(255,255,255,.018))]";

            const nodeTone =
              step.kind === "review"
                ? locked
                  ? "border-amber-300/25 bg-[#241803] text-amber-200/55"
                  : reviewResolved
                    ? "border-emerald-100/80 bg-[radial-gradient(circle_at_35%_25%,#b9ffe0,#34d399_48%,#065f46)] text-[#042f24] shadow-[0_0_0_7px_rgba(16,185,129,.08),0_0_28px_rgba(16,185,129,.42)]"
                    : "border-amber-200/90 bg-[radial-gradient(circle_at_35%_25%,#ffe58a,#f5a30c_50%,#8a4806)] text-[#291603] shadow-[0_0_0_7px_rgba(245,158,11,.08),0_0_28px_rgba(245,158,11,.55)]"
                : complete
                  ? "border-emerald-100/90 bg-[radial-gradient(circle_at_35%_25%,#a7f3d0,#10b981_48%,#065f46)] text-[#03241c] shadow-[0_0_0_7px_rgba(16,185,129,.07),0_0_28px_rgba(16,185,129,.38)]"
                  : "border-violet-200/90 bg-[radial-gradient(circle_at_35%_25%,#bd9cff,#7c3aed_48%,#36106c)] text-white shadow-[0_0_0_7px_rgba(124,58,237,.07),0_0_26px_rgba(139,92,246,.45)]";

            const statusText =
              step.kind === "lesson"
                ? complete ? "CONCLUÍDA" : "PENDENTE"
                : step.kind === "list"
                  ? locked ? "BLOQUEADA" : complete ? "CONCLUÍDA" : "DISPONÍVEL"
                  : locked ? "BLOQUEADA" : reviewCompleted ? "CONCLUÍDA" : reviewScheduled ? "AGENDADA" : "DISPONÍVEL";

            const statusClass =
              complete || reviewScheduled
                ? "border-emerald-300/20 bg-emerald-300/[.10] text-emerald-200"
                : step.kind === "review" && !locked
                  ? "border-amber-300/25 bg-amber-300/[.10] text-amber-200"
                  : locked
                    ? "border-white/[.08] bg-white/[.025] text-white/35"
                    : "border-violet-300/18 bg-violet-300/[.08] text-violet-200";

            const title =
              step.kind === "lesson"
                ? step.lesson.lessonTitle
                : step.kind === "list"
                  ? `${resolveQuestionCount(step.lesson.questionCount, step.lesson.questionListEnabled !== false)} questões`
                  : reviewResolved
                    ? `Revisão 1 · ${reviewState.date ? formatDate(reviewState.date) : "Agendada"}`
                    : "Escolher o dia da revisão";

            const eyebrow =
              step.kind === "lesson"
                ? `AULA ${String(lessonOrdinal).padStart(2, "0")}`
                : step.kind === "list"
                  ? "LISTA DE QUESTÕES"
                  : "AGENDAR REVISÃO";

            return (
              <div key={step.key} className="relative sm:pl-[76px]">
                <span className={`absolute left-0 top-1/2 z-20 hidden h-[60px] w-[60px] -translate-y-1/2 place-items-center rounded-full border-2 sm:grid ${nodeTone}`}>
                  <NodeIcon step={step} busy={busy} locked={locked} />
                  {step.kind === "review" && locked ? (
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[#04060b] bg-amber-400/70 text-[#2b1901]">
                      <LockKeyhole size={11} />
                    </span>
                  ) : null}
                </span>

                <article className={`grid min-h-[108px] items-center gap-4 rounded-[20px] border p-3.5 transition hover:border-white/[.18] lg:grid-cols-[190px_minmax(0,1fr)_230px] ${tone}`}>
                  <div className="relative hidden h-[82px] overflow-hidden rounded-xl border border-white/[.10] bg-[#11131a] md:block">
                    {step.kind === "lesson" ? (
                      step.lesson.imagePath ? (
                        <img src={step.lesson.imagePath} alt="" className="h-full w-full object-cover opacity-95" draggable={false} />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,.26),transparent_44%),linear-gradient(145deg,#1a1632,#0d0f18)] text-violet-200">
                          <span className="text-[12px] font-black tracking-[.16em]">PDF</span>
                        </div>
                      )
                    ) : step.kind === "list" ? (
                      <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,.38),transparent_44%),linear-gradient(145deg,#25104d,#120d28)] text-violet-300">
                        <BookOpenText size={42} strokeWidth={1.6} />
                      </div>
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,.30),transparent_45%),linear-gradient(145deg,#3a2505,#171006)] text-amber-300">
                        <CalendarDays size={42} strokeWidth={1.7} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-8 min-w-11 place-items-center rounded-lg border border-violet-300/15 bg-violet-500/[.10] px-2 text-[11px] font-black tracking-[.08em] text-violet-200">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-black tracking-[.08em] text-white/88">{eyebrow}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[8px] font-black tracking-[.08em] ${statusClass}`}>
                        {complete ? <Check size={10} strokeWidth={3} /> : locked ? <LockKeyhole size={9} /> : null}
                        {statusText}
                      </span>
                    </div>

                    <h3 className="mt-2 truncate font-serif text-[20px] font-black leading-tight text-white sm:text-[22px]">
                      {title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/50">
                      <span className="inline-flex items-center gap-1.5"><BookOpenText size={12} /> {step.lesson.subjectShortName}</span>
                      {step.kind === "lesson" && step.lesson.estimatedMinutes ? (
                        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-white/45" /> {step.lesson.estimatedMinutes} min</span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        {complete ? <Check size={12} className="text-cyan-300" /> : locked ? <LockKeyhole size={11} /> : <span className="h-3 w-3 rounded-full border border-white/45" />}
                        {step.kind === "lesson"
                          ? complete ? "Aula concluída" : "Aula não iniciada"
                          : step.kind === "list"
                            ? locked ? "Conclua a aula para liberar" : complete ? "Lista concluída" : "Lista disponível"
                            : locked
                              ? "Libera após a lista"
                              : reviewCompleted
                                ? "Revisão concluída"
                                : reviewScheduled
                                  ? `Agendada para ${reviewState.date ? formatDate(reviewState.date) : "data definida"}`
                                  : "Revisão disponível para agendar"}
                      </span>
                    </div>
                  </div>

                  <div className="lg:justify-self-end">
                    {step.kind === "lesson" ? (
                      <Link
                        href={step.lesson.href}
                        prefetch={false}
                        className={`inline-flex min-h-12 w-full min-w-[205px] items-center justify-between gap-3 rounded-xl border px-5 text-[12px] font-black transition lg:w-auto ${complete ? "border-emerald-300/35 bg-emerald-300/[.08] text-emerald-100 hover:bg-emerald-300/[.12]" : "border-violet-400/55 bg-violet-500/[.10] text-violet-200 hover:bg-violet-500/[.18]"}` }
                      >
                        <span className="inline-flex items-center gap-2"><BookOpenText size={17} /> {complete ? "Rever aula" : "Iniciar aula"}</span>
                        <ChevronRight size={17} />
                      </Link>
                    ) : step.kind === "list" ? (
                      <button
                        type="button"
                        disabled={locked || Boolean(busyKey)}
                        onClick={() => void openList(step.lesson)}
                        className={`inline-flex min-h-12 w-full min-w-[205px] items-center justify-between gap-3 rounded-xl border px-5 text-[12px] font-black transition disabled:cursor-not-allowed disabled:opacity-35 lg:w-auto ${complete ? "border-emerald-300/24 bg-emerald-300/[.06] text-emerald-100 hover:border-emerald-300/45 hover:bg-emerald-300/[.10]" : "border-violet-300/20 bg-[#0f1020] text-violet-200 hover:border-violet-300/45 hover:bg-violet-500/[.10]"}` }
                      >
                        <span className="inline-flex items-center gap-2"><BookOpenText size={17} /> {busy ? "Abrindo..." : complete ? "Resolver novamente" : locked ? "Bloqueada" : "Resolver lista"}</span>
                        <ChevronRight size={17} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={locked || Boolean(busyKey)}
                        onClick={() => void openRevision(step.lesson)}
                        className={`inline-flex min-h-12 w-full min-w-[205px] items-center justify-between gap-3 rounded-xl px-5 text-[12px] font-black transition disabled:cursor-not-allowed disabled:opacity-35 lg:w-auto ${
                          locked
                            ? "border border-white/[.10] bg-white/[.025] text-white/40"
                            : reviewResolved
                              ? "border border-emerald-200/55 bg-[linear-gradient(180deg,rgba(52,211,153,.22),rgba(6,95,70,.24))] text-emerald-50 shadow-[0_0_22px_rgba(16,185,129,.18)] hover:brightness-110"
                              : "border border-amber-200/75 bg-[linear-gradient(180deg,#ffc83d,#f6a90d)] text-[#271600] shadow-[0_0_25px_rgba(245,158,11,.23)] hover:brightness-110"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2"><CalendarDays size={17} /> {busy ? "Abrindo..." : locked ? "Bloqueada" : reviewCompleted ? "Concluída" : reviewScheduled ? "Agendado" : "Agendar revisão"}</span>
                        <ChevronRight size={17} />
                      </button>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {english.length ? <EnglishHooks dayNumber={dayNumber} date={date} tasks={english} side="right" /> : null}

      <div className="relative mt-4 overflow-hidden rounded-[20px] border border-amber-300/25 bg-[linear-gradient(90deg,rgba(72,37,8,.62),rgba(18,10,24,.94)_40%,rgba(9,10,16,.98))] px-5 py-4 sm:pl-[210px]">
        <img
          src={PMAL_TITAN_MASCOT_SRC}
          alt=""
          draggable={false}
          className="pointer-events-none absolute -bottom-12 left-2 hidden h-[150px] w-[170px] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,.55)] sm:block"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-[15px] font-black text-fuchsia-300">Vamos em frente, Titã!</strong>
            <p className="mt-1 text-[11px] text-white/62">Conclua cada etapa para liberar a próxima e continuar sua evolução.</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="font-serif text-[16px] italic text-white/70">“Disciplina hoje, liberdade amanhã.”</span>
            <span className="mt-1 block text-[8px] font-black tracking-[.14em] text-white/40">— MENTORIA TITÃ</span>
          </div>
        </div>
      </div>
    </section>
  );

}

function EnglishHooks({
  dayNumber,
  date,
  tasks,
  side,
}: {
  dayNumber: number;
  date: string;
  tasks: PmalEnglishDailyTask[];
  side: "left" | "right";
}) {
  const slots = [1, 2] as const;

  return (
    <div className="mt-4 rounded-[20px] border border-sky-300/14 bg-sky-300/[.025] p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.14em] text-sky-300">
            <Languages size={12} /> INGLÊS DO DIA {dayNumber}
          </span>
          <h3 className="mt-1 font-serif text-xl font-black text-white">2 textos diários</h3>
        </div>
        <span className="text-[8px] font-black tracking-[.08em] text-white/30">{formatDate(date)}</span>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {slots.map((slot) => {
          const task = tasks.find((item) => item.slot === slot);

          if (!task) {
            return (
              <div key={`missing-${date}-${slot}`} className="flex min-h-[74px] items-center gap-3 rounded-[16px] border border-dashed border-sky-300/14 bg-black/15 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/[.04] text-sky-300/55">
                  <BookOpenText size={16} />
                </span>
                <div>
                  <span className="text-[8px] font-black tracking-[.1em] text-sky-300/55">TEXTO {slot}/2</span>
                  <strong className="mt-1 block text-[11px] text-white/38">Aguardando o texto diário carregar</strong>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={task.id}
              href={task.href}
              className={`group flex min-h-[74px] items-center gap-3 rounded-[16px] border p-3.5 transition hover:-translate-y-0.5 ${
                task.completed
                  ? "border-cyan-300/18 bg-cyan-300/[.045]"
                  : "border-sky-300/16 bg-sky-300/[.035] hover:border-sky-200/30"
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${task.completed ? "border-cyan-300/20 bg-cyan-300/[.07] text-cyan-300" : "border-sky-300/20 bg-sky-300/[.05] text-sky-300"}`}>
                {task.completed ? <Check size={16} /> : <BookOpenText size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`text-[8px] font-black tracking-[.1em] ${task.completed ? "text-cyan-300" : "text-sky-300"}`}>
                  TEXTO {slot}/2 · {task.completed ? "CONCLUÍDO" : task.isRepeat ? `RELEITURA · CICLO ${task.cycle}` : "LER"}
                </span>
                <strong className="mt-1 block truncate text-[12px] text-white/78">{task.title}</strong>
              </div>
              <ChevronRight size={16} className="text-white/30 transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}


