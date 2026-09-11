"use client";

import { BookOpen, CalendarClock, Check, ClipboardCheck, FileQuestion, LockKeyhole, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadLessonQuestionStatus, type LessonQuestionStatus } from "@/lib/question-bank";
import { formatDatePtBr, isRevisionDue, type RevisionEvent } from "@/lib/revision-system";
import { listenStudyUpdated, loadLessonProgress, loadLessonRevision, type LessonProgressState } from "@/lib/study-database";

type JourneyStatus = "completed" | "available" | "scheduled" | "locked";

type JourneyStep = {
  label: string;
  subtitle: string;
  status: JourneyStatus;
  icon: typeof BookOpen;
};

export function LessonJourney({
  subjectSlug,
  lessonSlug,
  questionCount,
}: {
  subjectSlug: string;
  lessonSlug: string;
  questionCount: number;
}) {
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

  const steps = useMemo<JourneyStep[]>(() => {
    const theoryCompleted = Boolean(progress?.theoryCompleted);
    const listCompleted = Boolean(progress?.listCompleted);
    const listAvailable = theoryCompleted || Boolean(questionStatus?.attempt_id);
    const lessonCompleted = theoryCompleted && listCompleted;
    const reviewCompleted = review?.status === "completed";
    const reviewDue = review ? isRevisionDue(review) : false;
    const reviewStatus: JourneyStatus = reviewCompleted ? "completed" : reviewDue ? "available" : review ? "scheduled" : "locked";
    const levelingStatus: JourneyStatus = reviewCompleted ? "completed" : review?.rereadConfirmed ? "available" : "locked";

    return [
      {
        label: "Teoria",
        subtitle: theoryCompleted ? "Concluída" : "Disponível agora",
        status: theoryCompleted ? "completed" : "available",
        icon: BookOpen,
      },
      {
        label: `Lista · ${questionCount} questões`,
        subtitle: listCompleted ? "Concluída" : listAvailable ? "Disponível" : "Conclua a teoria",
        status: listCompleted ? "completed" : listAvailable ? "available" : "locked",
        icon: FileQuestion,
      },
      {
        label: "Agendar revisão",
        subtitle: review ? `Revisão 1 · ${formatDatePtBr(review.date)}` : lessonCompleted ? "Recomendado: +2 dias" : "Após teoria + lista",
        status: review ? "completed" : lessonCompleted ? "available" : "locked",
        icon: CalendarClock,
      },
      {
        label: "Revisão",
        subtitle: reviewCompleted ? "Revisão 1 concluída" : review ? (reviewDue ? "Disponível agora" : `Agendada · ${formatDatePtBr(review.date)}`) : "Aguardando agendamento",
        status: reviewStatus,
        icon: RefreshCcw,
      },
      {
        label: "Nivelamento",
        subtitle: reviewCompleted ? "Meta atingida" : review?.rereadConfirmed ? "Bloco disponível" : "Após a revisão",
        status: levelingStatus,
        icon: ClipboardCheck,
      },
    ];
  }, [progress, questionCount, questionStatus?.attempt_id, review]);

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/[.10] bg-[#08090c] px-4 py-6 shadow-[0_26px_90px_rgba(0,0,0,.34)] sm:px-7 sm:py-8">
      <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-[.12]" />
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-blue-500/[.055] blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-violet-500/[.05] blur-[105px]" />

      <div className="relative border-b border-white/[.07] pb-5">
        <span className="tita-kicker">FLUXO COMPLETO DA AULA</span>
        <h2 className="mt-2 font-serif text-3xl tracking-[-.035em] text-white sm:text-4xl">Sua trilha</h2>
        <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/38">Avance pelos pontos conectados. A próxima etapa acende automaticamente conforme você conclui a anterior.</p>
      </div>

      <div className="relative mx-auto mt-7 max-w-4xl pb-3">
        <div className="absolute bottom-7 left-[22px] top-4 w-[2px] bg-[linear-gradient(180deg,rgba(85,150,255,.22),rgba(126,90,255,.42)_40%,rgba(181,83,255,.30)_76%,rgba(255,255,255,.05))] md:left-1/2 md:-translate-x-1/2" />

        <div className="relative space-y-5 md:space-y-7">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const completed = step.status === "completed";
            const available = step.status === "available";
            const scheduled = step.status === "scheduled";
            const leftSide = index % 2 === 0;

            return (
              <div key={step.label} className="relative grid grid-cols-[46px_1fr] items-center gap-3 md:grid-cols-[1fr_72px_1fr] md:gap-5">
                <div className={`col-start-2 ${leftSide ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"}`}>
                  <div className={`rounded-[22px] border p-4 transition sm:p-5 ${completed ? "border-emerald-300/20 bg-emerald-300/[.045]" : available ? "border-blue-300/20 bg-[linear-gradient(135deg,rgba(63,132,255,.08),rgba(123,74,255,.055))] shadow-[0_14px_45px_rgba(30,70,180,.08)]" : scheduled ? "border-violet-300/14 bg-violet-300/[.035]" : "border-white/[.07] bg-white/[.018] opacity-55"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${completed ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : available ? "border-blue-300/25 bg-blue-300/[.08] text-blue-100" : scheduled ? "border-violet-300/20 bg-violet-300/[.06] text-violet-100/70" : "border-white/[.08] bg-black/20 text-white/25"}`}>
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-sm text-white/88">{step.label}</strong>
                        <span className={`mt-1 block text-[9px] ${completed ? "text-emerald-200/65" : available ? "text-blue-100/62" : scheduled ? "text-violet-100/50" : "text-white/28"}`}>{step.subtitle}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-start-1 row-start-1 grid place-items-center md:col-start-2">
                  <span className={`relative z-10 grid h-11 w-11 place-items-center rounded-full border shadow-[0_0_0_7px_#08090c] ${completed ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-200" : available ? "border-blue-200/38 bg-[linear-gradient(145deg,#315da8,#633cb0)] text-white shadow-[0_0_0_7px_#08090c,0_0_30px_rgba(82,106,255,.28)]" : scheduled ? "border-violet-300/22 bg-[#251b36] text-violet-100/70" : "border-white/[.1] bg-[#101216] text-white/25"}`}>
                    {completed ? <Check size={16} strokeWidth={3} /> : available ? <Icon size={15} /> : <LockKeyhole size={13} />}
                  </span>
                </div>

                <div className={`hidden md:block ${leftSide ? "col-start-3" : "col-start-1"}`}>
                  <div className={`flex items-center gap-2 text-[8px] font-black tracking-[.11em] text-white/20 ${leftSide ? "justify-start" : "justify-end"}`}>
                    <span className="h-px w-10 bg-white/[.08]" />
                    <span>ETAPA {String(index + 1).padStart(2, "0")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
