"use client";

import { BookOpen, CalendarClock, Check, ClipboardCheck, FileQuestion, LockKeyhole, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadLessonQuestionStatus, type LessonQuestionStatus } from "@/lib/question-bank";
import { formatDatePtBr, isRevisionDue, type RevisionEvent } from "@/lib/revision-system";
import { listenStudyUpdated, loadLessonProgress, loadLessonRevision, type LessonProgressState } from "@/lib/study-database";

export type LessonStageId = "theory" | "list" | "schedule" | "review" | "leveling";
type JourneyStatus = "completed" | "available" | "scheduled" | "locked";

type JourneyStep = {
  id: LessonStageId;
  label: string;
  subtitle: string;
  status: JourneyStatus;
  icon: typeof BookOpen;
};

export function LessonJourney({
  subjectSlug,
  lessonSlug,
  questionCount,
  selectedStage,
  onStageSelect,
}: {
  subjectSlug: string;
  lessonSlug: string;
  questionCount: number;
  selectedStage?: LessonStageId | null;
  onStageSelect?: (stage: LessonStageId) => void;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<LessonProgressState | null>(null);
  const [review, setReview] = useState<RevisionEvent | null>(null);
  const [questionStatus, setQuestionStatus] = useState<LessonQuestionStatus | null>(null);

  const refresh = useCallback(async () => {
    const [nextProgress, nextReview, nextQuestion] = await Promise.all([
      loadLessonProgress(subjectSlug, lessonSlug).catch(() => null),
      loadLessonRevision(subjectSlug, lessonSlug, 1).catch(() => null),
      loadLessonQuestionStatus(subjectSlug, lessonSlug).catch(() => null),
    ]);
    setProgress(nextProgress);
    setReview(nextReview);
    setQuestionStatus(nextQuestion);
  }, [lessonSlug, subjectSlug]);

  useEffect(() => {
    void refresh();
    const unlisten = listenStudyUpdated(() => void refresh());
    return unlisten;
  }, [refresh]);

  const theoryCompleted = Boolean(progress?.theoryCompleted);
  const listCompleted = Boolean(progress?.listCompleted);
  const lessonCompleted = theoryCompleted && listCompleted;
  const reviewCompleted = review?.status === "completed";
  const reviewDue = review ? isRevisionDue(review) : false;
  const rereadConfirmed = Boolean(review?.rereadConfirmed);

  const currentStage = useMemo<LessonStageId | null>(() => {
    if (!theoryCompleted) return "theory";
    if (!listCompleted) return "list";
    if (!review) return "schedule";
    if (reviewCompleted) return null;
    if (rereadConfirmed) return "leveling";
    if (reviewDue) return "review";
    return null;
  }, [listCompleted, rereadConfirmed, review, reviewCompleted, reviewDue, theoryCompleted]);

  const steps = useMemo<JourneyStep[]>(() => {
    const listAvailable = theoryCompleted || Boolean(questionStatus?.attempt_id);
    const reviewStatus: JourneyStatus = reviewCompleted ? "completed" : reviewDue ? "available" : review ? "scheduled" : "locked";
    const levelingStatus: JourneyStatus = reviewCompleted ? "completed" : rereadConfirmed ? "available" : "locked";

    return [
      {
        id: "theory",
        label: "Teoria",
        subtitle: theoryCompleted ? "Concluída · pode reabrir" : "PDF ou videoaula",
        status: theoryCompleted ? "completed" : "available",
        icon: BookOpen,
      },
      {
        id: "list",
        label: `Lista · ${questionCount} questões`,
        subtitle: listCompleted ? "Concluída" : listAvailable ? "Pronta para fazer" : "Depois da teoria",
        status: listCompleted ? "completed" : listAvailable ? "available" : "locked",
        icon: FileQuestion,
      },
      {
        id: "schedule",
        label: "Agendar revisão",
        subtitle: review ? `Agendada · ${formatDatePtBr(review.date)}` : lessonCompleted ? "Escolha a data da revisão" : "Depois da teoria + lista",
        status: review ? "completed" : lessonCompleted ? "available" : "locked",
        icon: CalendarClock,
      },
      {
        id: "review",
        label: "Revisão",
        subtitle: reviewCompleted ? "Concluída" : review ? (reviewDue ? "Faça agora" : `Marcada · ${formatDatePtBr(review.date)}`) : "Aguardando agendamento",
        status: reviewStatus,
        icon: RefreshCcw,
      },
      {
        id: "leveling",
        label: "Nivelamento",
        subtitle: reviewCompleted ? "Concluído" : rereadConfirmed ? "Bloco disponível agora" : "Depois da releitura da revisão",
        status: levelingStatus,
        icon: ClipboardCheck,
      },
    ];
  }, [lessonCompleted, listCompleted, questionCount, questionStatus?.attempt_id, rereadConfirmed, review, reviewCompleted, reviewDue, theoryCompleted]);

  function openStep(step: JourneyStep) {
    if (step.status === "locked") return;
    if ((step.id === "review" || step.id === "leveling") && review?.id) {
      router.push(`/revisoes/${review.id}`);
      return;
    }
    onStageSelect?.(step.id);
  }

  return (
    <section className="relative isolate overflow-hidden rounded-[30px] border border-white/[.10] bg-[#08090c] px-4 py-6 shadow-[0_26px_90px_rgba(0,0,0,.34)] sm:px-7 sm:py-8">
      <div className="tita-soft-grid pointer-events-none absolute inset-0 -z-20 opacity-[.08]" />
      <div className="pointer-events-none absolute -left-20 top-20 -z-20 h-64 w-64 rounded-full bg-emerald-400/[.025] blur-[95px]" />
      <div className="pointer-events-none absolute -right-24 bottom-12 -z-20 h-72 w-72 rounded-full bg-violet-500/[.035] blur-[105px]" />

      <header className="relative z-30 rounded-[22px] bg-[#08090c] pb-7">
        <span className="tita-kicker">FLUXO COMPLETO DA AULA</span>
        <h2 className="mt-2 font-serif text-3xl tracking-[-.035em] text-white sm:text-4xl">Sua trilha</h2>
        <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/38">Verde = o que você precisa fazer agora. Roxo = etapa já concluída. Cinza = futuro, agendado ou ainda bloqueado.</p>
        <div className="mt-6 h-px w-full bg-white/[.07]" />
      </header>

      <div className="relative z-0 mx-auto max-w-5xl pb-2" style={{ marginTop: "7rem" }}>
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M 230 56 C 230 112, 770 112, 770 190 C 770 260, 230 260, 230 330 C 230 400, 770 400, 770 470 C 770 540, 230 540, 230 624"
            fill="none"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 230 56 C 230 112, 770 112, 770 190 C 770 260, 230 260, 230 330 C 230 400, 770 400, 770 470 C 770 540, 230 540, 230 624"
            fill="none"
            stroke="rgba(255,255,255,.035)"
            strokeWidth="13"
            strokeLinecap="round"
          />
        </svg>

        <svg className="pointer-events-none absolute inset-0 h-full w-full sm:hidden" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M 380 56 C 380 112, 620 112, 620 190 C 620 260, 380 260, 380 330 C 380 400, 620 400, 620 470 C 620 540, 380 540, 380 624"
            fill="none"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative space-y-2 sm:space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCurrent = currentStage === step.id;
            const isSelected = selectedStage === step.id;
            const isCompleted = step.status === "completed";
            const isLocked = step.status === "locked";
            const leftSide = index % 2 === 0;

            return (
              <div key={step.id} className={`relative flex min-h-[132px] items-start pt-7 sm:min-h-[138px] ${leftSide ? "justify-start" : "justify-end"}`}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => openStep(step)}
                  className={`group relative w-[76%] rounded-[22px] border px-4 pb-4 pt-9 text-left transition sm:w-[46%] sm:px-5 sm:pb-5 sm:pt-10 ${
                    isCurrent
                      ? "border-emerald-300/35 bg-[linear-gradient(145deg,rgba(20,76,57,.32),rgba(12,18,16,.94))] shadow-[0_16px_50px_rgba(16,185,129,.10)]"
                      : isCompleted
                        ? "border-violet-300/30 bg-[linear-gradient(145deg,rgba(76,29,149,.26),rgba(22,14,35,.94))] shadow-[0_16px_52px_rgba(139,92,246,.14),0_0_26px_rgba(168,85,247,.07)]"
                        : isSelected
                          ? "border-white/[.16] bg-white/[.045]"
                          : "border-white/[.075] bg-[#0d0f12]/95 hover:border-white/[.14] hover:bg-[#111317]"
                  } ${isLocked ? "cursor-not-allowed opacity-48 hover:border-white/[.075] hover:bg-[#0d0f12]/95" : "cursor-pointer"}`}
                >
                  <span className={`absolute -top-[23px] left-1/2 z-20 grid h-[46px] w-[46px] -translate-x-1/2 place-items-center rounded-full border shadow-[0_0_0_7px_#08090c] ${
                    isCurrent
                      ? "border-emerald-200/55 bg-[#123c2e] text-emerald-100 shadow-[0_0_0_7px_#08090c,0_0_30px_rgba(52,211,153,.26)]"
                      : isCompleted
                        ? "border-violet-200/50 bg-[#35215f] text-violet-100 shadow-[0_0_0_7px_#08090c,0_0_32px_rgba(139,92,246,.32),0_0_52px_rgba(168,85,247,.12)]"
                        : "border-white/[.12] bg-[#121418] text-white/35"
                  }`}>
                    {isCompleted ? <Check size={16} strokeWidth={3} /> : isLocked ? <LockKeyhole size={13} /> : <Icon size={16} />}
                  </span>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`block text-[8px] font-black tracking-[.13em] ${isCurrent ? "text-emerald-200/80" : isCompleted ? "text-violet-200/80" : "text-white/24"}`}>ETAPA {String(index + 1).padStart(2, "0")}</span>
                      <strong className={`mt-1.5 block text-sm sm:text-base ${isCurrent || isCompleted ? "text-white" : "text-white/72"}`}>{step.label}</strong>
                      <span className={`mt-1.5 block text-[9px] leading-4 ${isCurrent ? "text-emerald-100/62" : isCompleted ? "text-violet-100/60" : "text-white/30"}`}>{step.subtitle}</span>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.1em] ${
                      isCurrent
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                        : isCompleted
                          ? "border-violet-300/28 bg-violet-300/10 text-violet-200"
                          : isLocked
                            ? "border-white/[.06] bg-black/15 text-white/20"
                            : "border-white/[.09] bg-white/[.025] text-white/38"
                    }`}>
                      {isCurrent ? "FAZER AGORA" : isCompleted ? "CONCLUÍDA" : step.status === "scheduled" ? "AGENDADA" : isLocked ? "BLOQUEADA" : "ABRIR"}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
