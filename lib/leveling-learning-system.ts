"use client";

import { createClient } from "@/lib/supabase/client";

export type ManualLevelState = {
  level: 1 | 2 | 3 | 4;
  available_count: number;
  revision_completed?: boolean;
  unlocked: boolean;
  no_questions: boolean;
  attempt_id: string | null;
  status: "in_progress" | "completed" | null;
  score: number | null;
  total: number | null;
  passed: boolean;
  locked_reason: string | null;
};

export type LevelingCatalogRow = {
  week_number: number;
  day_number: number;
  study_date: string;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  subject_name: string;
  subject_slug: string;
  topics: string[];
  levels: ManualLevelState[];
};

export type LevelingLearningHub = {
  catalog: LevelingCatalogRow[];
  events: Array<{
    id: string;
    leveling_number: number;
    lesson_id: string;
    lesson_title: string;
    subject_name: string;
    recommended_for: string;
    scheduled_for: string | null;
    status: "draft" | "scheduled" | "in_progress" | "completed";
    calendar_scope?: "principal" | "list";
    source_completed?: boolean;
  }>;
};

export async function loadLevelingLearningHub() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_leveling_learning_hub");
  if (error) throw error;
  return data as LevelingLearningHub;
}

export async function startManualLeveling(lessonId: string, level: 1 | 2 | 3 | 4) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_manual_leveling_attempt", {
    p_lesson_id: lessonId,
    p_level: level,
  });
  if (error) throw error;
  return data as {
    ok: boolean;
    reason?: "revision_required" | "no_questions";
    required_revision?: number;
    attempt_id?: string;
    continued?: boolean;
    level: number;
    available_count?: number;
    required_count?: number;
    required_correct?: number;
  };
}
