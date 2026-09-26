"use client";

import { BookOpen, CalendarClock, Check, ClipboardCheck, ExternalLink, LockKeyhole, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LessonStageId } from "@/components/lesson-journey";
import { formatDatePtBr, isRevisionDue, type RevisionEvent } from "@/lib/revision-system";
import { listenStudyUpdated, loadLessonProgress, loadLessonRevision, type LessonProgressState } from "@/lib/study-database";

type Status = "completed" | "available" | "scheduled" | "locked";
type Step = { id: LessonStageId; label: string; subtitle: string; status: Status; icon: typeof BookOpen };

export function EnemLessonJourney({
  subjectSlug,
  lessonSlug,
  selectedStage,
  onStageSelect,
}: {
  subjectSlug: string;
  lessonSlug: string;
  selectedStage?: LessonStageId | null;
  onStageSelect?: (stage: LessonStageId) => void;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<LessonProgressState | null>(null);
  const [review, setReview] = useState<RevisionEvent | null>(null);

  const refresh = useCallback(async () => {
    const [nextProgress, nextReview] = await Promise.all([
      loadLessonProgress(subjectSlug, lessonSlug).catch(() => null),
      loadLessonRevision(subjectSlug, lessonSlug, 1).catch(() => null),
    ]);
    setProgress(nextProgress);
    setReview(nextReview);
  }, [lessonSlug, subjectSlug]);

  useEffect(() => {
    void refresh();
    return listenStudyUpdated(() => void refresh());
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

  const steps = useMemo<Step[]>(() => [
    {
      id: "theory",
      label: "Teoria externa",
      subtitle: theoryCompleted ? "Concluída · registrada aqui" : "Assista no seu cursinho seguindo as cores",
      status: theoryCompleted ? "completed" : "available",
      icon: BookOpen,
    },
    {
      id: "list",
      label: "Lista externa",
      subtitle: listCompleted ? "Concluída" : theoryCompleted ? "Faça no banco externo e confirme" : "Depois da teoria",
      status: listCompleted ? "completed" : theoryCompleted ? "available" : "locked",
      icon: ExternalLink,
    },
    {
      id: "schedule",
      label: "Agendar revisão",
      subtitle: review ? `Agendada · ${formatDatePtBr(review.date)}` : lessonCompleted ? "A aula já vai preenchida" : "Depois da teoria + lista",
      status: review ? "completed" : lessonCompleted ? "available" : "locked",
      icon: CalendarClock,
    },
    {
      id: "review",
      label: "Revisão",
      subtitle: reviewCompleted ? "Concluída" : review ? (reviewDue ? "Faça agora" : `Marcada · ${formatDatePtBr(review.date)}`) : "Aguardando agendamento",
      status: reviewCompleted ? "completed" : reviewDue ? "available" : review ? "scheduled" : "locked",
      icon: RefreshCcw,
    },
    {
      id: "leveling",
      label: "Nivelamento",
      subtitle: reviewCompleted ? "Concluído" : rereadConfirmed ? "Disponível agora" : "Depois da releitura da revisão",
      status: reviewCompleted ? "completed" : rereadConfirmed ? "available" : "locked",
      icon: ClipboardCheck,
    },
  ], [lessonCompleted, listCompleted, rereadConfirmed, review, reviewCompleted, reviewDue, theoryCompleted]);

  function open(step: Step) {
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

      <header className="relative z-30 rounded-[22px] bg-[#08090c] pb-7">
        <span className="tita-kicker">ENEM · PLANO 40 DIAS</span>
        <h2 className="mt-2 font-serif text-3xl tracking-[-.035em] text-white sm:text-4xl">Sua trilha de acompanhamento</h2>
        <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/38">A teoria e as questões acontecem fora daqui. A plataforma registra conclusão, revisão e nivelamento sem duplicar seu trabalho.</p>
        <div className="mt-6 h-px w-full bg-white/[.07]" />
      </header>

      <div className="relative z-0 mx-auto max-w-5xl pb-2" style={{ marginTop: "7rem" }}>
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 230 56 C 230 112, 770 112, 770 190 C 770 260, 230 260, 230 330 C 230 400, 770 400, 770 470 C 770 540, 230 540, 230 624" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" strokeLinecap="round" />
          <path d="M 230 56 C 230 112, 770 112, 770 190 C 770 260, 230 260, 230 330 C 230 400, 770 400, 770 470 C 770 540, 230 540, 230 624" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="13" strokeLinecap="round" />
        </svg>

        <svg className="pointer-events-none absolute inset-0 h-full w-full sm:hidden" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 380 56 C 380 112, 620 112, 620 190 C 620 260, 380 260, 380 330 C 380 400, 620 400, 620 470 C 620 540, 380 540, 380 624" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" strokeLinecap="round" />
        </svg>

        <div className="relative space-y-2 sm:space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const current = currentStage === step.id;
            const selected = selectedStage === step.id;
            const completed = step.status === "completed";
            const locked = step.status === "locked";
            const left = index % 2 === 0;

            return (
              <div key={step.id} className={`relative flex min-h-[132px] items-start pt-7 sm:min-h-[138px] ${left ? "justify-start" : "justify-end"}`}>
                <button type="button" disabled={locked} onClick={() => open(step)} className={`group relative w-[76%] rounded-[22px] border px-4 pb-4 pt-9 text-left transition sm:w-[46%] sm:px-5 sm:pb-5 sm:pt-10 ${
                  current
                    ? "border-emerald-300/35 bg-[linear-gradient(145deg,rgba(20,76,57,.32),rgba(12,18,16,.94))] shadow-[0_16px_50px_rgba(16,185,129,.10)]"
                    : selected
                      ? "border-white/[.16] bg-white/[.045]"
                      : "border-white/[.075] bg-[#0d0f12]/95 hover:border-white/[.14] hover:bg-[#111317]"
                } ${locked ? "cursor-not-allowed opacity-48" : "cursor-pointer"}`}>
                  <span className={`absolute -top-[23px] left-1/2 z-20 grid h-[46px] w-[46px] -translate-x-1/2 place-items-center rounded-full border shadow-[0_0_0_7px_#08090c] ${
                    current
                      ? "border-emerald-200/55 bg-[#123c2e] text-emerald-100 shadow-[0_0_0_7px_#08090c,0_0_30px_rgba(52,211,153,.26)]"
                      : "border-white/[.12] bg-[#121418] text-white/35"
                  }`}>
                    {completed ? <Check size={16} strokeWidth={3} /> : locked ? <LockKeyhole size={13} /> : <Icon size={16} />}
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`block text-[8px] font-black tracking-[.13em] ${current ? "text-emerald-200/80" : "text-white/24"}`}>ETAPA {String(index + 1).padStart(2, "0")}</span>
                      <strong className={`mt-1.5 block text-sm sm:text-base ${current ? "text-white" : "text-white/72"}`}>{step.label}</strong>
                      <span className={`mt-1.5 block text-[9px] leading-4 ${current ? "text-emerald-100/62" : "text-white/30"}`}>{step.subtitle}</span>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.1em] ${
                      current ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : completed ? "border-white/[.09] bg-white/[.025] text-white/34" : locked ? "border-white/[.06] bg-black/15 text-white/20" : "border-white/[.09] bg-white/[.025] text-white/38"
                    }`}>
                      {current ? "FAZER AGORA" : completed ? "CONCLUÍDA" : step.status === "scheduled" ? "AGENDADA" : locked ? "BLOQUEADA" : "ABRIR"}
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
