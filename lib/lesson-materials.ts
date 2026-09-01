"use client";

import { createClient } from "@/lib/supabase/client";

export const LESSON_MATERIALS_BUCKET = "lesson-materials";

export type LessonMaterial = {
  id: string;
  lesson_id: string;
  title: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version: number;
  is_active: boolean;
  allow_download: boolean;
  created_at: string;
};

type ActivePlan = {
  activeStudyPlanId: string;
};

async function getActivePlan(): Promise<ActivePlan> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Usuário não autenticado.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_study_plan_id,focus_contest_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  let activeStudyPlanId = profile?.active_study_plan_id as string | null | undefined;

  if (!activeStudyPlanId && profile?.focus_contest_id) {
    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .select("id")
      .eq("contest_id", profile.focus_contest_id)
      .eq("is_default", true)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    activeStudyPlanId = plan?.id as string | undefined;
  }

  if (!activeStudyPlanId) throw new Error("Nenhum cronograma ativo foi atribuído à sua conta.");
  return { activeStudyPlanId };
}

export async function loadActiveLessonMaterial(subjectSlug: string, lessonSlug: string) {
  const supabase = createClient();
  const { activeStudyPlanId } = await getActivePlan();

  const { data: lesson, error: lessonError } = await supabase
    .from("study_lesson_catalog")
    .select("lesson_id")
    .eq("plan_id", activeStudyPlanId)
    .eq("subject_slug", subjectSlug)
    .eq("lesson_slug", lessonSlug)
    .maybeSingle();
  if (lessonError) throw lessonError;
  if (!lesson?.lesson_id) return null;

  const { data: material, error: materialError } = await supabase
    .from("lesson_materials")
    .select("id,lesson_id,title,file_name,storage_path,mime_type,file_size,version,is_active,allow_download,created_at")
    .eq("lesson_id", lesson.lesson_id)
    .eq("material_type", "theory")
    .eq("is_active", true)
    .maybeSingle();
  if (materialError) throw materialError;

  return (material ?? null) as LessonMaterial | null;
}

export async function createLessonMaterialSignedUrl(storagePath: string, expiresIn = 3600) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(LESSON_MATERIALS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Não foi possível abrir o material.");
  return data.signedUrl;
}

export async function downloadLessonMaterial(material: LessonMaterial) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(LESSON_MATERIALS_BUCKET)
    .download(material.storage_path);
  if (error) throw error;

  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = material.file_name || "material.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
