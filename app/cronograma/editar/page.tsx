import { redirect } from "next/navigation";
import { EnemStudyPlanEditor } from "@/components/enem-study-plan-editor";
import { PageShell } from "@/components/page-shell";
import { StudyPlanEditor, type StudyPlanEditorSubject } from "@/components/study-plan-editor";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditarPlanoDeEstudosPage() {
  const { user, profile, focusContest, displayName } = await requireAuthenticatedUser();
  if (!profile?.active_study_plan_id || !focusContest?.slug) redirect("/onboarding");

  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("study_subjects")
    .select("id,slug,name,short_name,position")
    .eq("plan_id", profile.active_study_plan_id)
    .eq("active", true)
    .order("position", { ascending: true });

  const subjectIds = (subjects ?? []).map((subject) => subject.id);
  const [{ data: matrix }, { data: preferences }] = await Promise.all([
    subjectIds.length
      ? supabase.from("subject_matrix_settings").select("subject_id,recommended_weight,minimum_weight").in("subject_id", subjectIds)
      : Promise.resolve({ data: [] as Array<{ subject_id: string; recommended_weight: number; minimum_weight: number }> }),
    subjectIds.length
      ? supabase.from("user_subject_preferences").select("subject_id,weight,recommended_weight").eq("user_id", user.id).in("subject_id", subjectIds)
      : Promise.resolve({ data: [] as Array<{ subject_id: string; weight: number; recommended_weight: number }> }),
  ]);

  const matrixMap = new Map((matrix ?? []).map((item) => [item.subject_id, item]));
  const preferenceMap = new Map((preferences ?? []).map((item) => [item.subject_id, item]));

  const editorSubjects: StudyPlanEditorSubject[] = (subjects ?? []).map((subject) => {
    const settings = matrixMap.get(subject.id);
    const preference = preferenceMap.get(subject.id);
    const recommendedWeight = Number(settings?.recommended_weight ?? preference?.recommended_weight ?? 1);
    return {
      id: subject.id,
      slug: subject.slug,
      name: subject.name,
      shortName: subject.short_name,
      recommendedWeight,
      minimumWeight: Number(settings?.minimum_weight ?? 0.35),
      currentWeight: Number(preference?.weight ?? recommendedWeight),
    };
  });

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        {focusContest.slug === "enem-40-dias" ? (
          <EnemStudyPlanEditor subjects={editorSubjects} />
        ) : (
          <StudyPlanEditor
            contestSlug={focusContest.slug}
            contestName={focusContest.nome}
            contestSigla={focusContest.sigla}
            displayName={displayName}
            initialDailyMinutes={profile.daily_study_minutes ?? 240}
            currentWeeks={profile.schedule_weeks ?? profile.schedule_target_weeks ?? null}
            subjects={editorSubjects}
          />
        )}
      </main>
    </PageShell>
  );
}
