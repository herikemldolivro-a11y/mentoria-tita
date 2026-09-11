import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { DynamicOnboarding, type OnboardingContest } from "@/components/dynamic-onboarding";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { focusContest, displayName, profile } = await requireAuthenticatedUser();

  if (profile?.onboarding_completed_at && profile?.daily_study_minutes) redirect("/");

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("study_plans")
    .select("id,contest_id,is_default,created_at,contests(id,slug,sigla,nome,ativo)")
    .eq("active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const selectedPlans = new Map<string, { planId: string; contest: { slug: string; sigla: string; nome: string } }>();
  for (const row of plans ?? []) {
    const relation = row.contests as { slug?: string; sigla?: string; nome?: string; ativo?: boolean } | Array<{ slug?: string; sigla?: string; nome?: string; ativo?: boolean }> | null;
    const contest = Array.isArray(relation) ? relation[0] : relation;
    if (!contest?.slug || contest.ativo === false || selectedPlans.has(contest.slug)) continue;
    selectedPlans.set(contest.slug, {
      planId: row.id,
      contest: { slug: contest.slug, sigla: contest.sigla ?? contest.slug.toUpperCase(), nome: contest.nome ?? contest.slug.toUpperCase() },
    });
  }

  const planIds = Array.from(selectedPlans.values()).map((item) => item.planId);
  const { data: subjects } = planIds.length
    ? await supabase.from("study_subjects").select("id,plan_id,slug,name,short_name,position").in("plan_id", planIds).eq("active", true).order("position", { ascending: true })
    : { data: [] as Array<{ id: string; plan_id: string; slug: string; name: string; short_name: string; position: number }> };

  const subjectIds = (subjects ?? []).map((subject) => subject.id);
  const { data: matrix } = subjectIds.length
    ? await supabase.from("subject_matrix_settings").select("subject_id,recommended_weight,minimum_weight").in("subject_id", subjectIds)
    : { data: [] as Array<{ subject_id: string; recommended_weight: number; minimum_weight: number }> };

  const matrixBySubject = new Map((matrix ?? []).map((item) => [item.subject_id, item]));
  const contests: OnboardingContest[] = Array.from(selectedPlans.values()).map(({ planId, contest }) => ({
    slug: contest.slug,
    sigla: contest.sigla,
    name: contest.nome,
    subjects: (subjects ?? []).filter((subject) => subject.plan_id === planId).map((subject) => {
      const settings = matrixBySubject.get(subject.id);
      return {
        id: subject.id,
        slug: subject.slug,
        name: subject.name,
        shortName: subject.short_name,
        recommendedWeight: Number(settings?.recommended_weight ?? 1),
        minimumWeight: Number(settings?.minimum_weight ?? 0.35),
      };
    }),
  })).filter((contest) => contest.subjects.length > 0);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between border-b border-white/[.07] pb-5">
          <Brand />
          <span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[8px] font-black tracking-[.13em] text-white/45">CONFIGURAÇÃO INICIAL</span>
        </header>

        <section className="py-9 sm:py-12">
          <span className="tita-kicker">PRIMEIRO ACESSO · FOCO 95+</span>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[0.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Vamos montar seu <em className="font-normal text-[var(--tita-accent)]">Plano de Estudos.</em></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">Olá, {displayName}. Em três passos a plataforma combina concurso, tempo disponível e prioridade das matérias para distribuir toda a matriz nas suas semanas.</p>
        </section>

        <DynamicOnboarding contests={contests} displayName={displayName} initialContestSlug={focusContest?.slug} />

        <p className="mx-auto mt-8 max-w-3xl text-center text-[9px] leading-relaxed text-[var(--muted)]">Depois você pode editar o Plano de Estudos e recalcular as semanas sem apagar respostas, revisões ou histórico de desempenho.</p>
      </div>
    </main>
  );
}
