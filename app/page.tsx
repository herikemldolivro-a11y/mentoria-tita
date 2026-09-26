import { PmalHomeExperience } from "@/components/pmal-home-experience";
import { requireAuthenticatedUser } from "@/lib/auth";
import { loadPersonalSchedule, type PersonalScheduleItem } from "@/lib/personal-schedule-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { focusContest, isAdmin, displayName } = await requireAuthenticatedUser();
  const personal = await loadPersonalSchedule().catch(() => ({
    dailyStudyMinutes: null,
    scheduleWeeks: null,
    scheduleTargetWeeks: null,
    generatedAt: null,
    onboardingCompleted: false,
    items: [] as PersonalScheduleItem[],
  }));

  // MT_HOME_UNIFIED_V54 — a Home visual do CFO PMAL é a Home única da plataforma.
  // O concurso altera somente dados dinâmicos, nunca a estrutura visual.
  return (
    <PmalHomeExperience
      displayName={displayName}
      isAdmin={isAdmin}
      items={personal.items ?? []}
      contestSlug={focusContest?.slug ?? null}
      contestSigla={focusContest?.sigla ?? null}
    />
  );
}

