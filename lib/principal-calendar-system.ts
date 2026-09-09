"use client";

import { createClient } from "@/lib/supabase/client";

export type PrincipalTaxonomyRow = {
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  lesson_position: number;
  week_number: number;
};

export type PrincipalRevision = {
  id: string;
  lesson_id: string;
  subject_name: string;
  subject_slug: string;
  lesson_title: string;
  lesson_slug: string;
  revision_number: number;
  recommended_for: string;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "completed";
  completed_at: string | null;
};

export type PrincipalLeveling = {
  id: string;
  lesson_id: string;
  leveling_number: number;
  recommended_for: string;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "in_progress" | "completed";
  completed_at: string | null;
  lesson_title: string;
  lesson_slug: string;
  subject_name: string;
  subject_slug: string;
  source_completed: boolean;
  attempt_id: string | null;
};

export type PrincipalCalendarHub = {
  taxonomy: PrincipalTaxonomyRow[];
  revisions: PrincipalRevision[];
  levelings: PrincipalLeveling[];
};

export async function loadPrincipalCalendarHub() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_principal_calendar_hub");
  if (error) throw error;
  const result = data as Partial<PrincipalCalendarHub> | null;
  return {
    taxonomy: result?.taxonomy ?? [],
    revisions: result?.revisions ?? [],
    levelings: result?.levelings ?? [],
  } satisfies PrincipalCalendarHub;
}

export async function createPrincipalRevision(input: { lessonId: string; revisionNumber: number; date: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_or_schedule_principal_revision", {
    p_lesson_id: input.lessonId,
    p_revision_number: input.revisionNumber,
    p_date: input.date,
  });
  if (error) throw error;
  return data as PrincipalRevision;
}

export async function reschedulePrincipalRevision(revisionId: string, date: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_principal_revision_schedule", {
    p_revision_id: revisionId,
    p_date: date,
  });
  if (error) throw error;
  return data as PrincipalRevision;
}

export async function startPrincipalLeveling(levelingId: string) {
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
