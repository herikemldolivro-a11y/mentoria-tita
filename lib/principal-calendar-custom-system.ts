"use client";

import { createClient } from "@/lib/supabase/client";

export type PrincipalCalendarManualItem = {
  id: string;
  subject_name: string;
  lesson_title: string;
  notes: string | null;
  scheduled_for: string;
  status: "scheduled" | "completed";
  completed_at: string | null;
  created_at: string;
};

export async function loadPrincipalCalendarManualItems() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mt_list_principal_calendar_manual_items");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as PrincipalCalendarManualItem[];
}

export async function createPrincipalCalendarManualItem(input: {
  subjectName: string;
  lessonTitle: string;
  notes?: string;
  date: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mt_create_principal_calendar_manual_item", {
    p_subject_name: input.subjectName,
    p_lesson_title: input.lessonTitle,
    p_notes: input.notes ?? "",
    p_date: input.date,
  });
  if (error) throw error;
  return data as PrincipalCalendarManualItem;
}

export async function togglePrincipalCalendarManualItem(itemId: string, completed: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mt_toggle_principal_calendar_manual_item", {
    p_item_id: itemId,
    p_completed: completed,
  });
  if (error) throw error;
  return data as PrincipalCalendarManualItem;
}

export async function deletePrincipalCalendarManualItem(itemId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mt_delete_principal_calendar_manual_item", {
    p_item_id: itemId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function setPrincipalRevisionNotes(revisionId: string, notes: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mt_set_principal_revision_notes", {
    p_revision_id: revisionId,
    p_notes: notes,
  });
  if (error) throw error;
  return data;
}

export async function schedulePrincipalLevelingManual(input: {
  lessonId: string;
  levelingNumber: number;
  date: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mt_schedule_principal_leveling_manual", {
    p_lesson_id: input.lessonId,
    p_leveling_number: input.levelingNumber,
    p_date: input.date,
    p_notes: input.notes ?? "",
  });
  if (error) throw error;
  return data;
}
