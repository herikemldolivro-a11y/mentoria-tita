import { EnemQuestionSnapshotViewer } from "@/components/enem-question-snapshot-viewer";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Search = {
  subject?: string;
  lesson?: string;
  title?: string;
  saved?: string;
};

export default async function EnemQuestionViewerPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAuthenticatedUser();
  const search = await searchParams;
  const subjectSlug = search.subject ?? "";
  const lessonSlug = search.lesson ?? "";
  const lessonTitle = search.title ?? "Aula ENEM";

  return (
    <PageShell>
      <EnemQuestionSnapshotViewer
        subjectSlug={subjectSlug}
        lessonSlug={lessonSlug}
        lessonTitle={lessonTitle}
        savedOnly={search.saved === "1"}
      />
    </PageShell>
  );
}
