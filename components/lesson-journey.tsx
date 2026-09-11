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
    <section className="relative overflow-hidden rounded-[30px] border border-white/[.10] bg-[#08090c] px-4 py-6 shadow-[0_26px_90px_rgba(0,0,0,.34)] sm:px-7 sm:py-8">
      <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-[.10]" />
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-emerald-400/[.035] blur-[95px]" />

      <div className="relative border-b border-white/[.07] pb-5">
        <span className="tita-kicker">FLUXO COMPLETO DA AULA</span>
        <h2 className="mt-2 font-serif text-3xl tracking-[-.035em] text-white sm:text-4xl">Sua trilha</h2>
        <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/38">Verde significa o que você precisa fazer agora. Clique na etapa para abrir somente o conteúdo dela; o restante fica em cinza.</p>
      </div>

      <div className="relative mx-auto mt-6 max-w-4xl">
        <div className="absolute bottom-7 left-[21px] top-7 w-px bg-white/[.10] sm:left-[23px]" />
        <div className="relative space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCurrent = currentStage === step.id;
            const isSelected = selectedStage === step.id;
            const isCompleted = step.status === "completed";
            const isLocked = step.status === "locked";

            return (
              <button
                key={step.id}
                type="button"
                disabled={isLocked}
                onClick={() => openStep(step)}
                className={`group relative grid w-full grid-cols-[46px_1fr] items-center gap-3 rounded-[20px] border p-3 text-left transition sm:grid-cols-[50px_1fr_auto] sm:p-4 ${
                  isCurrent
                    ? "border-emerald-300/35 bg-emerald-300/[.075] shadow-[0_14px_44px_rgba(16,185,129,.10)]"
                    : isSelected
                      ? "border-white/[.16] bg-white/[.045]"
                      : "border-white/[.07] bg-white/[.018] hover:border-white/[.13] hover:bg-white/[.035]"
                } ${isLocked ? "cursor-not-allowed opacity-48 hover:border-white/[.07] hover:bg-white/[.018]" : "cursor-pointer"}`}
              >
                <span className={`relative z-10 grid h-11 w-11 place-items-center rounded-full border shadow-[0_0_0_6px_#08090c] ${
                  isCurrent
                    ? "border-emerald-200/45 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_6px_#08090c,0_0_28px_rgba(52,211,153,.24)]"
                    : "border-white/[.10] bg-[#111317] text-white/34"
                }`}>
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : isLocked ? <LockKeyhole size={13} /> : <Icon size={16} />}
                </span>

                <span className="min-w-0">
                  <span className={`block text-[8px] font-black tracking-[.13em] ${isCurrent ? "text-emerald-200/80" : "text-white/25"}`}>ETAPA {String(index + 1).padStart(2, "0")}</span>
                  <strong className={`mt-1 block text-sm ${isCurrent ? "text-white" : "text-white/72"}`}>{step.label}</strong>
                  <span className={`mt-1 block text-[9px] ${isCurrent ? "text-emerald-100/65" : "text-white/30"}`}>{step.subtitle}</span>
                </span>

                <span className={`col-start-2 row-start-2 justify-self-start rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.1em] sm:col-start-3 sm:row-start-1 sm:justify-self-end ${
                  isCurrent
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                    : isCompleted
                      ? "border-white/[.09] bg-white/[.025] text-white/34"
                      : isLocked
                        ? "border-white/[.06] bg-black/15 text-white/20"
                        : "border-white/[.09] bg-white/[.025] text-white/38"
                }`}>
                  {isCurrent ? "FAZER AGORA" : isCompleted ? "CONCLUÍDA" : step.status === "scheduled" ? "AGENDADA" : isLocked ? "BLOQUEADA" : "ABRIR"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
