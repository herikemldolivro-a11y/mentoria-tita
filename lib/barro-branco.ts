"use client";

import { createClient } from "@/lib/supabase/client";

export type BbWeek = {
  id: string;
  user_id: string;
  week_number: number;
  title: string;
  starts_on: string;
  ends_on: string;
};

export type BbLesson = {
  id: string;
  user_id: string;
  week_id: string;
  subject_name: string;
  title: string;
  topic: string | null;
  planned_date: string | null;
  position: number;
  source: "fenix" | "manual";
  notes: string | null;
};

export type BbActivity = {
  id: string;
  user_id: string;
  lesson_id: string | null;
  activity_type: "lesson" | "revision" | "leveling" | "task";
  leveling_number: number | null;
  subject_name: string | null;
  title: string;
  scheduled_for: string;
  original_scheduled_for: string;
  status: "scheduled" | "completed";
  source: "fenix" | "manual" | "suggested";
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

export type BbHub = {
  weeks: BbWeek[];
  lessons: BbLesson[];
  activities: BbActivity[];
};

export async function loadBarroBrancoHub(): Promise<BbHub> {
  const supabase = createClient();
  const { error: bootstrapError } = await supabase.rpc("bb_bootstrap");
  if (bootstrapError) throw bootstrapError;

  const [weeksResult, lessonsResult, activitiesResult] = await Promise.all([
    supabase.from("bb_weeks").select("*").order("week_number", { ascending: true }),
    supabase.from("bb_lessons").select("*").order("planned_date", { ascending: true }).order("position", { ascending: true }),
    supabase.from("bb_activities").select("*").order("scheduled_for", { ascending: true }).order("created_at", { ascending: true }),
  ]);

  if (weeksResult.error) throw weeksResult.error;
  if (lessonsResult.error) throw lessonsResult.error;
  if (activitiesResult.error) throw activitiesResult.error;

  return {
    weeks: (weeksResult.data ?? []) as BbWeek[],
    lessons: (lessonsResult.data ?? []) as BbLesson[],
    activities: (activitiesResult.data ?? []) as BbActivity[],
  };
}

export async function createBbActivity(input: {
  type: BbActivity["activity_type"];
  date: string;
  lessonId?: string | null;
  level?: number | null;
  subject?: string;
  title?: string;
  notes?: string;
  weekNumber?: number | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("bb_create_activity", {
    p_type: input.type,
    p_date: input.date,
    p_lesson_id: input.lessonId ?? null,
    p_level: input.level ?? null,
    p_subject: input.subject ?? null,
    p_title: input.title ?? null,
    p_notes: input.notes ?? null,
    p_week_number: input.weekNumber ?? null,
  });
  if (error) throw error;
  return data as BbActivity;
}

export async function toggleBbActivity(activityId: string, completed: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("bb_toggle_activity", {
    p_activity_id: activityId,
    p_completed: completed,
  });
  if (error) throw error;
  return data as BbActivity;
}

export async function updateBbActivity(activityId: string, date: string, notes: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("bb_update_activity", {
    p_activity_id: activityId,
    p_date: date,
    p_notes: notes,
  });
  if (error) throw error;
  return data as BbActivity;
}

export async function deleteBbActivity(activityId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("bb_delete_activity", {
    p_activity_id: activityId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function scheduleBbD2Revision(lessonId: string, date?: string | null) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("bb_schedule_d2_revision", {
    p_lesson_id: lessonId,
    p_date: date ?? null,
  });
  if (error) throw error;
  return data as BbActivity;
}
