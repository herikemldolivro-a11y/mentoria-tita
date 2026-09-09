"use client";

import { createClient } from "@/lib/supabase/client";

export type PracticeListState = {
  list_number: 1 | 2 | 3;
  size: number;
  target_size: number;
  actual_size: number;
  unlocked: boolean;
  locked_reason: string | null;
  attempt_id: string | null;
  status: "in_progress" | "completed" | null;
  score: number | null;
};

export type ListCatalogRow = {
  week_number: number;
  day_number: number;
  study_date: string;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  subject_name: string;
  subject_slug: string;
  question_count: number;
  available_count: number;
  theory_completed: boolean;
  list_completed: boolean;
  topics: string[];
  practice_lists: PracticeListState[];
};

export type ListReviewRow = {
  id: string;
  review_number: number;
  recommended_for: string;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "in_progress" | "completed";
  wrong_count: number;
  new_count: number;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  subject_name: string;
  subject_slug: string;
  attempt_id: string | null;
};

export type ListLevelingRow = {
  id: string;
  list_review_id: string;
  leveling_number: number;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  subject_name: string;
  subject_slug: string;
  recommended_for: string;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "in_progress" | "completed";
  completed_at: string | null;
  source_completed: boolean;
  attempt_id: string | null;
  available_count: number;
};

export type ListLearningHub = {
  catalog: ListCatalogRow[];
  reviews: ListReviewRow[];
  levelings: ListLevelingRow[];
};

export async function loadListLearningHub() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_list_learning_hub");
  if (error) throw error;
  const result = data as Partial<ListLearningHub> | null;
  return {
    catalog: result?.catalog ?? [],
    reviews: result?.reviews ?? [],
    levelings: result?.levelings ?? [],
  } satisfies ListLearningHub;
}

export async function startPracticeList(lessonId: string, listNumber: 1 | 2 | 3) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_practice_list_attempt", {
    p_lesson_id: lessonId,
    p_list_number: listNumber,
  });
  if (error) throw error;
  return data as {
    ok: boolean;
    reason?: "previous_list" | "no_questions" | "not_enough_new" | "compose_failed";
    attempt_id?: string;
    continued?: boolean;
    completed?: boolean;
    available_count?: number;
    required_count?: number;
    required_previous?: number;
    list_size?: number;
    target_size?: number;
    reused_fallback?: boolean;
  };
}

export async function scheduleListReview(reviewId: string, date: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_list_review_schedule", { p_review_id: reviewId, p_date: date });
  if (error) throw error;
  return data as { id: string; scheduled_for: string; status: string };
}

export async function startListReview(reviewId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_list_review_attempt", { p_review_id: reviewId });
  if (error) throw error;
  return data as { ok: boolean; attempt_id: string; continued: boolean; wrong_count: number; new_count: number; total?: number };
}

export async function startScheduledLeveling(levelingId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_leveling_calendar_attempt", { p_leveling_id: levelingId });
  if (error) throw error;
  return data as {
    ok: boolean;
    reason?: "revision_required" | "no_questions" | "not_scheduled";
    required_revision?: number;
    attempt_id?: string | null;
    continued?: boolean;
    completed?: boolean;
    level?: number;
    available_count?: number;
  };
}
