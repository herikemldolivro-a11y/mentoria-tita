"use client";

import { useEffect, useRef, useState } from "react";
import { LessonJourney, type LessonStageId } from "@/components/lesson-journey";
import { PrfLessonWorkflow } from "@/components/prf-lesson-workflow";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";

export function LessonStageExperience({
  subject,
  lesson,
  questionCount,
}: {
  subject: PrfSubject;
  lesson: MatrixLesson;
  questionCount: number;
}) {
  const [activeStage, setActiveStage] = useState<LessonStageId | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#revisao") {
      setActiveStage("schedule");
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, []);

  function selectStage(stage: LessonStageId) {
    if (stage === "review" || stage === "leveling") return;
    setActiveStage(stage);
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <>
      <LessonJourney
        subjectSlug={subject.slug}
        lessonSlug={lesson.slug}
        questionCount={questionCount}
        selectedStage={activeStage}
        onStageSelect={selectStage}
      />

      <div ref={detailRef} className="scroll-mt-24">
        <div className="tita-stage-workflow mt-6" data-stage={activeStage ?? "closed"}>
          <PrfLessonWorkflow subject={subject} lesson={lesson} />
        </div>
      </div>
    </>
  );
}
