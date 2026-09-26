"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { QuestionCard } from "@/components/question-card";

type Props = ComponentProps<typeof QuestionCard> & {
  reviewMode?: boolean;
};

type ReviewFields = {
  review_last_reviewed_at?: string | null;
  review_last_result?: boolean | null;
};

export function ReviewQuestionCard({ question, reviewMode = false, ...props }: Props) {
  const reviewQuestion = question as typeof question & ReviewFields;
  const reviewedBefore = reviewMode && Boolean(reviewQuestion.review_last_reviewed_at);
  const lastCorrect = reviewQuestion.review_last_result === true;

  return (
    <div className="space-y-2">
      {reviewedBefore ? (
        <div className={`flex flex-wrap items-center gap-2 rounded-[15px] border px-3.5 py-2.5 ${lastCorrect ? "border-emerald-400/25 bg-emerald-400/[.055]" : "border-red-400/30 bg-red-400/[.065]"}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-[8px] font-black tracking-[.12em] text-violet-200">
            <CheckCircle2 size={12} /> RESOLVIDA
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[9px] font-black tracking-[.08em] ${lastCorrect ? "text-emerald-400" : "text-red-400"}`}>
            {lastCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            ÚLTIMA VEZ: {lastCorrect ? "ACERTOU" : "ERROU"}
          </span>
          {!lastCorrect ? (
            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[7px] font-black tracking-[.12em] text-red-300">
              PRIORIDADE
            </span>
          ) : null}
        </div>
      ) : null}

      <QuestionCard question={question} {...props} />
    </div>
  );
}
