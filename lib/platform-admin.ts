"use client";

import { createClient } from "@/lib/supabase/client";

export type AdminStudent = {
  id: string;
  nome: string | null;
  username: string | null;
  email: string | null;
  ativo: boolean;
  focus_contest_id: string | null;
  contest_name: string | null;
  contest_sigla: string | null;
  active_study_plan_id: string | null;
  plan_name: string | null;
  completed_lessons: number;
  scheduled_revisions: number;
};

export type AdminStudyPlan = {
  id: string;
  name: string;
  slug: string;
  contest_id: string;
  active: boolean;
};

export type AdminStudentsCatalog = {
  students: AdminStudent[];
  plans: AdminStudyPlan[];
};

export type AdminLevelingRow = {
  plan_id: string;
  plan_name: string;
  subject_id: string;
  subject_name: string;
  subject_position: number;
  lesson_id: string;
  lesson_title: string;
  lesson_position: number;
  question_count: number;
  required_correct: number;
  active: boolean;
  available_questions: number;
};

export type MyLevelingRow = {
  subject_id: string;
  subject_name: string;
  lesson_id: string;
  lesson_title: string;
  question_count: number;
  required_correct: number;
  available_questions: number;
  revision_id: string | null;
  revision_number: number | null;
  revision_status: "draft" | "scheduled" | "completed" | null;
  scheduled_for: string | null;
  reread_confirmed_at: string | null;
  completed_at: string | null;
};

export async function loadAdminStudentsCatalog() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_students_catalog");
  if (error) throw error;
  return data as AdminStudentsCatalog;
}

export async function updateStudentAssignment(userId: string, planId: string | null, active: boolean) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_update_student_assignment", {
    p_user_id: userId,
    p_plan_id: planId || null,
    p_active: active,
  });
  if (error) throw error;
}

export async function loadAdminLevelingCatalog() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_leveling_catalog");
  if (error) throw error;
  return (data ?? []) as AdminLevelingRow[];
}

export async function saveLevelingSetting(
  lessonId: string,
  questionCount: number,
  requiredCorrect: number,
  active: boolean,
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_upsert_leveling_setting", {
    p_lesson_id: lessonId,
    p_question_count: questionCount,
    p_required_correct: requiredCorrect,
    p_active: active,
  });
  if (error) throw error;
}

export async function loadMyLevelingOverview() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_leveling_overview");
  if (error) throw error;
  return (data ?? []) as MyLevelingRow[];
}
