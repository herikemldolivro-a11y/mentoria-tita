import { EnemEssayReader } from "@/components/enem-essay-reader";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EnemEssayDayPage({ params }: { params: Promise<{ daySlug: string }> }) {
  await requireAuthenticatedUser();
  const { daySlug } = await params;
  const parsed = Number(daySlug.replace(/^dia-/i, ""));
  const day = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

  return (
    <PageShell>
      <EnemEssayReader day={day} />
    </PageShell>
  );
}
