import { PageShell } from "@/components/page-shell";
import { BarroBrancoHub } from "@/components/barro-branco-hub";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BarroBrancoPage() {
  await requireAuthenticatedUser();

  return (
    <PageShell>
      <BarroBrancoHub />
    </PageShell>
  );
}
