import { BackButton } from "@/components/back-button";
import { CompletedRevisionScheduler } from "@/components/completed-revision-scheduler";
import { PageShell } from "@/components/page-shell";
import { RevisionEnemSavedQuestions } from "@/components/revision-enem-saved-questions";
import { RevisionNotes } from "@/components/revision-notes";
import { RevisionFutureScheduler } from "@/components/revision-future-scheduler";
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
          <RevisionFutureScheduler revisionId={revisionId} />
          <CompletedRevisionScheduler revisionId={revisionId} />
          <RevisionStudyTools revisionId={revisionId} />
          <RevisionNotes revisionId={revisionId} />
          <RevisionEnemSavedQuestions revisionId={revisionId} />
          <RevisionPendingQuestions revisionId={revisionId} />
          <RevisionSession revisionId={revisionId} />
        </div>
      </div>
    </PageShell>
  );
}

