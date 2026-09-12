import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { RevisionNotes } from "@/components/revision-notes";
import { RevisionPendingQuestions } from "@/components/revision-pending-questions";
import { RevisionSession } from "@/components/revision-session";
import { RevisionStudyTools } from "@/components/revision-study-tools";

export default async function RevisionPage({ params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/revisoes" label="Voltar ao calendário" />
        <div className="mt-5">
          <RevisionStudyTools revisionId={revisionId} />
          <RevisionNotes revisionId={revisionId} />
          <RevisionPendingQuestions revisionId={revisionId} />
          <RevisionSession revisionId={revisionId} />
        </div>
      </div>
    </PageShell>
  );
}
