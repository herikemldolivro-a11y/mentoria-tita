"use client";

import { createClient } from "@/lib/supabase/client";

export type PerformanceWindow = "24h" | "7d" | "30d";

export type PerformanceSubject = {
  subject_name: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
};

export type PerformanceDay = {
  day: string;
  total: number;
  correct: number;
  incorrect: number;
};

export type PerformancePayload = {
  window: PerformanceWindow;
  window_start: string | null;
  total_answered: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  subjects: PerformanceSubject[];
  daily: PerformanceDay[];
};

export async function loadPerformanceWindow(window: PerformanceWindow) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_question_performance_window", {
    p_window: window,
  });
  if (error) throw error;
  return data as PerformancePayload;
}
