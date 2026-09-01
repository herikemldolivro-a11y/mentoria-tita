import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { PrfSubjectRoadmap } from "@/components/prf-subject-roadmap";
import { getPrfSubject } from "@/lib/prf-week-one";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function PrfSubjectPage({ params }: { params: Promise<{ materia: string }> }) {
  const { focusContest } = await requireAuthenticatedUser();
  if (focusContest?.slug !== "prf") redirect("/cronograma");

  const { materia } = await params;
  const subject = getPrfSubject(materia);
  if (!subject) notFound();

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/cronograma/semana-1" label="Voltar para as matérias" />
        <div className="mt-5"><PrfSubjectRoadmap subject={subject} /></div>
      </div>
    </PageShell>
  );
}
