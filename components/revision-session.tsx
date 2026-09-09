"use client";

import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MonitorPlay,
  RefreshCcw,
  RotateCcw,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  addDaysToDateKey,
  formatDatePtBr,
  isRevisionDue,
  toDateKey,
  type RevisionEvent,
} from "@/lib/revision-system";
import {
  listenStudyUpdated,
  loadRevisionEvent,
  queueRevisionDraft,
  updateRevisionReread,
  updateRevisionStudyMode,
} from "@/lib/study-database";
import {
  loadLevelingRule,
  startLevelingAttempt,
  type LevelingRule,
} from "@/lib/question-bank";
import { createClient } from "@/lib/supabase/client";

const gold = "#d2a64e";
const green = "#31c765";

type RevisionLessonDetails = {
  slug: string;
  title: string;
  topics: string[];
};

async function loadRevisionLessonDetails(
  subjectSlug: string,
  lessonSlug: string,
): Promise<RevisionLessonDetails | null> {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_study_plan_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile?.active_study_plan_id) return null;

  const { data: lesson, error: lessonError } = await supabase
    .from("study_lesson_catalog")
    .select("lesson_id,lesson_slug,lesson_title")
    .eq("plan_id", profile.active_study_plan_id)
    .eq("subject_slug", subjectSlug)
    .eq("lesson_slug", lessonSlug)
    .limit(1)
    .maybeSingle();

  if (lessonError || !lesson?.lesson_id) return null;

  const { data: topicRows, error: topicError } = await supabase
    .from("study_lesson_topics")
    .select("topic,position")
    .eq("lesson_id", lesson.lesson_id)
    .order("position", { ascending: true });

  if (topicError) {
    return {
      slug: lesson.lesson_slug,
      title: lesson.lesson_title,
      topics: [],
    };
  }

  return {
    slug: lesson.lesson_slug,
    title: lesson.lesson_title,
    topics: (topicRows ?? [])
      .map((row) => String(row.topic ?? "").trim())
      .filter(Boolean),
  };
}

export function RevisionSession({ revisionId }: { revisionId: string }) {
  const router = useRouter();
  const [revision, setRevision] = useState<RevisionEvent | null>(null);
  const [lessonDetails, setLessonDetails] = useState<RevisionLessonDetails | null>(null);
  const [rule, setRule] = useState<LevelingRule | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextRevision = await loadRevisionEvent(revisionId);
      setRevision(nextRevision);

      if (nextRevision) {
        const [nextRule, nextLessonDetails] = await Promise.all([
          loadLevelingRule(revisionId).catch(() => null),
          loadRevisionLessonDetails(
            nextRevision.subjectSlug,
            nextRevision.lessonSlug,
          ).catch(() => null),
        ]);

        setRule(nextRule);
        setLessonDetails(nextLessonDetails);
      } else {
        setRule(null);
        setLessonDetails(null);
      }

      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a revisão.",
      );
    } finally {
      setHydrated(true);
    }
  }, [revisionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unlisten = listenStudyUpdated(() => void refresh());

    return () => {
      window.clearTimeout(timer);
      unlisten();
    };
  }, [refresh]);

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        Carregando revisão...
      </div>
    );
  }

  if (!revision) {
    return (
      <section className="rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-7">
        <h1 className="font-serif text-4xl text-[var(--ink)]">
          Revisão não encontrada.
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Esta mensagem agora aparece apenas quando a revisão realmente não existe
          ou ainda está como rascunho.
        </p>
        <Link
          href="/revisoes"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-xs font-black text-[#111]"
        >
          VOLTAR AO CALENDÁRIO <ArrowRight size={16} />
        </Link>
      </section>
    );
  }

  const lesson = lessonDetails ?? {
    slug: revision.lessonSlug,
    title: revision.lessonTitle,
    topics: [] as string[],
  };

  const approved = revision.status === "completed";
  const scheduledAhead = !approved && !isRevisionDue(revision);
  const levelingReady = Boolean(revision.rereadConfirmed) && !approved;

  const questionCount = rule?.question_count ?? 10;
  const requiredCorrect = rule?.required_correct ?? Math.min(9, questionCount);
  const availableQuestions = rule?.available_questions ?? 0;
  const bankReady = availableQuestions >= questionCount;

  async function setStudyMode(mode: "platform-pdf" | "external-course") {
    if (!revision || approved) return;
    setRevision({ ...revision, studyMode: mode });
    await updateRevisionStudyMode(revision.id, mode);
  }

  async function toggleReread() {
    if (!revision || approved) return;
    const confirmed = !revision.rereadConfirmed;
    setRevision({ ...revision, rereadConfirmed: confirmed });
    await updateRevisionReread(revision.id, confirmed);
  }

  async function startLeveling() {
    if (!revision || !levelingReady || starting) return;

    setStarting(true);
    setErrorMessage(null);

    try {
      const attempt = await startLevelingAttempt(revision.id);

      if (!attempt.ok || !attempt.attempt_id) {
        setErrorMessage(
          `Banco insuficiente: ${attempt.available_count ?? 0}/${attempt.required_count ?? questionCount} questões disponíveis.`,
        );
        return;
      }

      router.push(`/questoes/lista/${attempt.attempt_id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o nivelamento.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function scheduleNextRevision() {
    if (!revision || revision.revisionNumber !== 1 || !revision.completedAt) {
      return;
    }

    const completedDate = toDateKey(new Date(revision.completedAt));
    const draft = await queueRevisionDraft({
      subjectSlug: revision.subjectSlug,
      subjectName: revision.subjectName,
      lessonSlug: revision.lessonSlug,
      lessonTitle: revision.lessonTitle,
      revisionNumber: 2,
      recommendedDate: addDaysToDateKey(completedDate, 4),
    });

    router.push(`/revisoes?agendar=${draft.id}`);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[#090a0c] text-white shadow-[0_24px_70px_rgba(0,0,0,.24)]">
        <div className="grid lg:grid-cols-[1fr_300px]">
          <div className="p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[#e4b960]">
              <RefreshCcw size={15} />
              {revision.subjectName} · REVISÃO {revision.revisionNumber}
            </span>

            <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.035em] sm:text-5xl">
              {revision.lessonTitle}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
              1. Releia o conteúdo. 2. Confirme a releitura. 3. Faça o
              nivelamento. A meta desta aula é {requiredCorrect}/{questionCount}.
            </p>
          </div>

          <aside className="border-t border-white/10 bg-white/[0.025] p-5 lg:border-l lg:border-t-0 lg:p-6">
            <span className="text-[9px] font-black tracking-[.15em] text-white/40">
              DATA PROGRAMADA
            </span>
            <strong className="mt-1 block font-serif text-2xl">
              {formatDatePtBr(revision.date)}
            </strong>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-[9px] font-black tracking-[.12em] text-white/42">
                STATUS
              </span>
              <strong
                className="mt-1 flex items-center gap-2 text-sm"
                style={{
                  color: approved
                    ? green
                    : scheduledAhead
                      ? "#e4b960"
                      : gold,
                }}
              >
                {approved ? (
                  <CheckCircle2 size={16} />
                ) : scheduledAhead ? (
                  <CalendarClock size={16} />
                ) : (
                  <Target size={16} />
                )}
                {approved
                  ? "Concluída"
                  : scheduledAhead
                    ? "Disponível antecipadamente"
                    : "Disponível agora"}
              </strong>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-[9px] font-black tracking-[.12em] text-white/42">
                REGRA
              </span>
              <strong className="mt-1 flex items-center gap-2 text-sm text-[#e4b960]">
                <Target size={16} /> {requiredCorrect}/{questionCount}
              </strong>
            </div>
          </aside>
        </div>
      </section>

      {scheduledAhead && !approved ? (
        <section className="rounded-[20px] border border-[rgba(210,166,78,.28)] bg-[rgba(210,166,78,.05)] p-4">
          <div className="flex gap-3">
            <CalendarClock
              className="mt-0.5 shrink-0 text-[var(--gold-bright)]"
              size={18}
            />
            <div>
              <strong className="text-sm text-[var(--ink)]">
                Revisão antecipada liberada.
              </strong>
              <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
                Ela está programada para {formatDatePtBr(revision.date)}, mas
                pode ser feita e concluída agora normalmente.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {errorMessage}
        </div>
      ) : null}

      <section
        className="rounded-[26px] border p-5 sm:p-7"
        style={{
          borderColor: revision.rereadConfirmed
            ? "rgba(49,199,101,.38)"
            : "rgba(210,166,78,.36)",
          background: "var(--surface)",
        }}
      >
        <span
          className="text-[10px] font-black tracking-[.2em]"
          style={{
            color: revision.rereadConfirmed ? green : gold,
          }}
        >
          ETAPA 01 · RELEITURA
        </span>

        <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">
          Releia o conteúdo antes das questões.
        </h2>

        <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">
          Revise os tópicos pelo PDF da Mentoria Titã ou pelo seu cursinho.
          Depois confirme a releitura.
        </p>

        {lesson.topics.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {lesson.topics.map((topic, index) => (
              <span
                key={`${lesson.slug}-review-${index}-${topic}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[10px] text-[var(--muted)]"
              >
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-[10px] leading-5 text-[var(--muted)]">
            Os tópicos desta aula ainda não estão detalhados no cadastro. A
            revisão continua liberada normalmente.
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={approved}
            onClick={() => setStudyMode("platform-pdf")}
            className="rounded-2xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              borderColor:
                revision.studyMode === "platform-pdf"
                  ? "rgba(210,166,78,.5)"
                  : "var(--border)",
              background:
                revision.studyMode === "platform-pdf"
                  ? "rgba(210,166,78,.06)"
                  : "var(--background)",
            }}
          >
            <FileText className="text-[var(--gold-bright)]" size={21} />
            <strong className="mt-3 block font-serif text-lg text-[var(--ink)]">
              Reabrir PDF da plataforma
            </strong>
          </button>

          <button
            type="button"
            disabled={approved}
            onClick={() => setStudyMode("external-course")}
            className="rounded-2xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              borderColor:
                revision.studyMode === "external-course"
                  ? "rgba(210,166,78,.5)"
                  : "var(--border)",
              background:
                revision.studyMode === "external-course"
                  ? "rgba(210,166,78,.06)"
                  : "var(--background)",
            }}
          >
            <MonitorPlay className="text-[var(--gold-bright)]" size={21} />
            <strong className="mt-3 block font-serif text-lg text-[var(--ink)]">
              Vou revisar no meu cursinho
            </strong>
          </button>
        </div>

        <button
          type="button"
          disabled={approved || !revision.studyMode}
          onClick={toggleReread}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[10px] font-black tracking-[.11em] disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            borderColor: revision.rereadConfirmed
              ? "rgba(49,199,101,.4)"
              : "rgba(210,166,78,.35)",
            color: revision.rereadConfirmed ? green : gold,
          }}
        >
          {revision.rereadConfirmed ? (
            <RotateCcw size={15} />
          ) : (
            <Check size={15} />
          )}
          {revision.rereadConfirmed
            ? "DESMARCAR RELEITURA"
            : "CONFIRMO QUE RELI O MATERIAL"}
        </button>
      </section>

      <section
        className="rounded-[26px] border p-5 sm:p-7"
        style={{
          borderColor: approved
            ? "rgba(49,199,101,.4)"
            : levelingReady
              ? "rgba(210,166,78,.4)"
              : "var(--border)",
          background: approved
            ? "rgba(49,199,101,.045)"
            : "var(--surface)",
          opacity: revision.rereadConfirmed || approved ? 1 : 0.55,
        }}
      >
        <span
          className="text-[10px] font-black tracking-[.2em]"
          style={{
            color: approved ? green : levelingReady ? gold : "var(--muted)",
          }}
        >
          ETAPA 02 · NIVELAMENTO
        </span>

        <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">
          Meta obrigatória: {requiredCorrect} de {questionCount}.
        </h2>

        <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">
          Se não atingir a meta, a revisão continua aberta e um novo bloco
          poderá ser gerado. O banco prioriza questões erradas anteriormente,
          questões ainda não resolvidas e níveis mais altos.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <span className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">
              QUESTÕES DO BLOCO
            </span>
            <strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">
              {questionCount}
            </strong>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <span className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">
              META
            </span>
            <strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">
              {requiredCorrect}/{questionCount}
            </strong>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <span className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">
              BANCO DISPONÍVEL
            </span>
            <strong
              className="mt-1 block font-serif text-2xl"
              style={{ color: bankReady ? green : "#d56b6b" }}
            >
              {availableQuestions}
            </strong>
          </div>
        </div>

        {!approved ? (
          <button
            type="button"
            disabled={!levelingReady || !bankReady || starting}
            onClick={startLeveling}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111] disabled:opacity-40"
          >
            {starting ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : (
              <Target size={15} />
            )}
            INICIAR NIVELAMENTO
          </button>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[.07] p-5">
            <CheckCircle2 size={22} style={{ color: green }} />
            <strong className="mt-3 block font-serif text-2xl text-[var(--ink)]">
              Revisão {revision.revisionNumber} concluída.
            </strong>

            {revision.revisionNumber === 1 ? (
              <button
                type="button"
                onClick={scheduleNextRevision}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-[10px] font-black"
                style={{ color: green }}
              >
                <CalendarClock size={15} />
                ABRIR CALENDÁRIO PARA AGENDAR REVISÃO 2
              </button>
            ) : (
              <Link
                href="/revisoes"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black text-[var(--muted)]"
              >
                VOLTAR AO CALENDÁRIO <ArrowRight size={15} />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
