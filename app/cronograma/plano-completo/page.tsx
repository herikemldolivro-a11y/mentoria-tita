import { CfoPmalFullRoadmap } from "@/components/cfo-pmal-full-roadmap";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlanoCompletoCfoPmalPage() {
  await requireAuthenticatedUser();

  return (
    <PageShell>
      <CfoPmalFullRoadmap />
    </PageShell>
  );
}
