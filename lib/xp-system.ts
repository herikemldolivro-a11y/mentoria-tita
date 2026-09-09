"use client";

import { createClient } from "@/lib/supabase/client";

export type RankInfo = {
  tier: number;
  slug: string;
  title: string;
  min_level: number;
  max_level: number | null;
};

export type XpAchievement = {
  code: string;
  title: string;
  tier: number;
  unlocked_at: string;
};

export type XpDashboard = {
  total_xp: number;
  level: number;
  rank: RankInfo;
  level_xp: number;
  level_required: number;
  xp_to_next: number;
  progress_percent: number;
  today_xp: number;
  answers_total: number;
  answers_correct: number;
  recent_achievements: XpAchievement[];
};

export type WeeklyRankingEntry = {
  position: number;
  display_name: string;
  weekly_xp: number;
  total_xp: number;
  level: number;
  rank: RankInfo;
  prize_weeks: number;
  is_me: boolean;
};

export type WeeklyRankingPayload = {
  week_start: string;
  week_end: string;
  participants: number;
  leaders: WeeklyRankingEntry[];
  me: WeeklyRankingEntry | null;
  prizes: Array<{ position: number; weeks: number }>;
};

export type AttemptExperienceMeta = {
  attempt_id: string;
  kind: "lesson_list" | "leveling" | "list_review";
  status: "in_progress" | "completed";
  revision_id: string | null;
  revision_number: number | null;
  required_correct: number | null;
  score: number | null;
  total: number;
  elapsed_seconds: number;
  session_questions: number;
  session_correct: number;
  session_seconds: number;
  xp: XpDashboard;
  rank: RankInfo;
  practice_list_number: number | null;
  list_review_id: string | null;
  leveling_schedule_id: string | null;
  manual_leveling_level: number | null;
};

export type SmartFinalizeResult = {
  score: number;
  total: number;
  percentage: number;
  required_correct?: number;
  passed?: boolean;
  round?: number;
};

export async function loadXpDashboard() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_xp_dashboard");
  if (error) throw error;
  return data as XpDashboard;
}

export async function loadWeeklyRanking(limit = 250) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_weekly_xp_ranking", {
    p_limit: Math.min(500, Math.max(10, limit)),
  });
  if (error) throw error;
  return data as WeeklyRankingPayload;
}

export async function loadAttemptExperienceMeta(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_attempt_experience_meta", {
    p_attempt_id: attemptId,
  });
  if (error) throw error;
  return data as AttemptExperienceMeta;
}

export async function finalizeSmartAttempt(
  attemptId: string,
  kind: "lesson_list" | "leveling" | "list_review",
) {
  const supabase = createClient();
  const functionName = kind === "leveling" ? "finalize_leveling_attempt" : "finalize_question_attempt";
  const { data, error } = await supabase.rpc(functionName, { p_attempt_id: attemptId });
  if (error) throw error;
  return data as SmartFinalizeResult;
}

export function formatStudyDuration(seconds: number) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min ${String(secs).padStart(2, "0")}s`;
  if (minutes > 0) return `${minutes}min ${String(secs).padStart(2, "0")}s`;
  return `${secs}s`;
}
