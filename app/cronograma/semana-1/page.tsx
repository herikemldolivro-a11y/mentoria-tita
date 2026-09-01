import { redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { PrfWeekOneMap } from "@/components/prf-week-one-schedule";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function SemanaUmPage() {
  const { focusContest } = await requireAuthenticatedUser();
  if (focusContest?.slug !== "prf") redirect("/cronograma");

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-4 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/" label="Voltar ao painel" />
      </div>
      <PrfWeekOneMap />
    </PageShell>
  );
}
