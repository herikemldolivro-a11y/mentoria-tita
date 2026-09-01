"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Circle,
  FileQuestion,
  LockKeyhole,
  Route,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PrfSubject } from "@/lib/prf-week-one";
import {
  listenStudyUpdated,
  loadSubjectLessonStates,
  startSubject,
  type LessonProgressState,
} from "@/lib/study-database";

const green = "#31c765";
const gold = "#d2a64e";

export function PrfSubjectRoadmap({ subject }: { subject: PrfSubject }) {
  const lessons = useMemo(() => subject.lessons.filter((lesson) => lesson.weekOne), [subject]);
  const [states, setStates] = useState<Record<string, LessonProgressState>>({});
  const [hydrated, setHydrated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await startSubject(subject.slug);
      setStates(await loadSubjectLessonStates(subject.slug));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar a trilha.");
    } finally {
      setHydrated(true);
    }
  }, [subject.slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unlisten = listenStudyUpdated(() => void refresh());
    return () => {
      window.clearTimeout(timer);
      unlisten();
    };
  }, [refresh]);

  const completedCount = lessons.filter((lesson) => {
    const state = states[lesson.slug];
    return Boolean(state?.theoryCompleted && state?.listCompleted);
  }).length;

  return (
    <div>
      <section className="rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-[var(--gold-bright)]"><Route size={15} /> PRF · SEMANA 1</span>
        <h1 className="mt-3 font-serif text-4xl tracking-[-.035em] text-[var(--ink)] sm:text-5xl">{subject.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{subject.description}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><span className="text-[9px] font-black tracking-[.15em] text-[var(--muted)]">AULAS NA SEMANA</span><strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">{lessons.length}</strong></div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><span className="text-[9px] font-black tracking-[.15em] text-[var(--muted)]">QUESTÕES</span><strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">{lessons.length * 35}</strong></div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><span className="text-[9px] font-black tracking-[.15em] text-[var(--muted)]">CONCLUÍDAS</span><strong className="mt-1 block font-serif text-2xl" style={{ color: completedCount > 0 ? green : "var(--ink)" }}>{completedCount}/{lessons.length}</strong></div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-5">
          <span className="text-[10px] font-black tracking-[0.2em] text-[var(--gold-bright)]">TRILHA DA MATÉRIA</span>
          <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Siga uma aula por vez.</h2>
        </div>

        <div className="relative pl-8 sm:pl-10">
          <div className="absolute bottom-7 left-[14px] top-7 w-[2px] bg-[var(--border)] sm:left-[18px]" />

          <div className="space-y-4">
            {lessons.map((lesson, index) => {
              const previous = lessons[index - 1];
              const lessonState = states[lesson.slug];
              const previousState = previous ? states[previous.slug] : null;
              const isCompleted = Boolean(lessonState?.theoryCompleted && lessonState?.listCompleted);
              const previousCompleted = Boolean(previousState?.theoryCompleted && previousState?.listCompleted);
              const unlocked = index === 0 || previousCompleted;
              const current = unlocked && !isCompleted;

              return (
                <article
                  key={lesson.slug}
                  className="relative rounded-[22px] border p-5 transition sm:p-6"
                  style={{
                    borderColor: isCompleted ? "rgba(49,199,101,.44)" : current ? "rgba(210,166,78,.42)" : "var(--border)",
                    background: isCompleted
                      ? "linear-gradient(110deg, rgba(49,199,101,.07), var(--surface) 65%)"
                      : current
                        ? "linear-gradient(110deg, rgba(210,166,78,.07), var(--surface) 65%)"
                        : "var(--surface)",
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  <span
                    className="absolute -left-[27px] top-7 grid h-7 w-7 place-items-center rounded-full border-[5px] border-[var(--background)] sm:-left-[31px]"
                    style={{ background: isCompleted ? green : current ? gold : "#31343a" }}
                  >
                    {isCompleted ? <Check size={12} color="#07130b" strokeWidth={3} /> : unlocked ? <Circle size={9} color="#111" fill="#111" /> : <LockKeyhole size={10} color="#90939a" />}
                  </span>

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black tracking-[0.18em]" style={{ color: isCompleted ? green : current ? gold : "var(--muted)" }}>AULA {String(lesson.id).padStart(2, "0")}</span>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[8px] font-black tracking-[.1em] text-[var(--muted)]">{lesson.priority}</span>
                        <span className="rounded-full border px-2 py-0.5 text-[8px] font-black tracking-[.1em]" style={{ color: isCompleted ? green : current ? gold : "var(--muted)", borderColor: isCompleted ? "rgba(49,199,101,.3)" : current ? "rgba(210,166,78,.3)" : "var(--border)" }}>
                          {isCompleted ? "CONCLUÍDA" : current ? "DISPONÍVEL" : "BLOQUEADA"}
                        </span>
                      </div>

                      <h3 className="mt-2 font-serif text-2xl text-[var(--ink)]">{lesson.title}</h3>

                      {unlocked ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {lesson.topics.map((topic, topicIndex) => (
                            <span key={`${lesson.slug}-${topicIndex}-${topic}`} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[10px] leading-relaxed text-[var(--muted)]">{topic}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-[var(--muted)]">{lesson.topics.length} tópicos serão exibidos quando esta aula for liberada.</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 lg:w-[210px]">
                      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[10px] text-[var(--muted)]"><span className="inline-flex items-center gap-2"><BookOpenCheck size={14} /> Teoria</span><span>1 etapa</span></div>
                      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[10px] text-[var(--muted)]"><span className="inline-flex items-center gap-2"><FileQuestion size={14} /> Lista</span><span>35 questões</span></div>
                      {unlocked ? (
                        <Link href={`/cronograma/semana-1/${subject.slug}/${lesson.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[10px] font-black tracking-[.12em] transition hover:-translate-y-0.5" style={{ background: isCompleted ? "rgba(49,199,101,.13)" : "rgba(210,166,78,.12)", border: `1px solid ${isCompleted ? "rgba(49,199,101,.36)" : "rgba(210,166,78,.34)"}`, color: isCompleted ? green : gold }}>
                          {isCompleted ? "REVISITAR AULA" : "INICIAR AULA"} <ArrowRight size={15} />
                        </Link>
                      ) : (
                        <button type="button" disabled className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-[10px] font-black tracking-[.12em] text-[var(--muted)]"><LockKeyhole size={14} /> CONCLUA A ANTERIOR</button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {errorMessage ? <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{errorMessage}</p> : null}
      {hydrated ? <p className="mt-5 text-[9px] leading-5 text-[var(--muted)]">Trilha sincronizada com sua conta. A próxima aula é liberada com base no progresso salvo no Supabase.</p> : null}
    </div>
  );
}
