import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { TitaSimuladosSemanaUm } from "@/components/estudos-simulados";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAuthenticatedUser();
  return (
    <PageShell>
      <TitaSimuladosSemanaUm />
    </PageShell>
  );
}
