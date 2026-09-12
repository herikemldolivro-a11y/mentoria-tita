"use client";

import { useEffect, useRef, useState } from "react";
import { EnemLessonJourney } from "@/components/enem-lesson-journey";
import { EnemLessonResourceGuide } from "@/components/enem-lesson-resource-guide";
import { EnemLessonWorkflow } from "@/components/enem-lesson-workflow";
import { LessonJourney, type LessonStageId } from "@/components/lesson-journey";
import { PrfLessonWorkflow } from "@/components/prf-lesson-workflow";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";

export function LessonStageExperience({
  subject,
  lesson,
  questionCount,
  trackingOnly = false,
}: {
  subject: PrfSubject;
  lesson: MatrixLesson;
  questionCount: number;
  trackingOnly?: boolean;
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
      {trackingOnly ? <EnemLessonResourceGuide subject={subject} lesson={lesson} /> : null}

      {trackingOnly ? (
        <EnemLessonJourney
          subjectSlug={subject.slug}
          lessonSlug={lesson.slug}
          selectedStage={activeStage}
          onStageSelect={selectStage}
        />
      ) : (
        <LessonJourney
          subjectSlug={subject.slug}
          lessonSlug={lesson.slug}
          questionCount={questionCount}
          selectedStage={activeStage}
          onStageSelect={selectStage}
        />
      )}

      <div ref={detailRef} className="scroll-mt-24">
        <div className="tita-stage-workflow mt-6" data-stage={activeStage ?? "closed"}>
          {trackingOnly ? <EnemLessonWorkflow subject={subject} lesson={lesson} /> : <PrfLessonWorkflow subject={subject} lesson={lesson} />}
        </div>
      </div>
    </>
  );
}
