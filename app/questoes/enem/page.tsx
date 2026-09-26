import { EnemQuestionSnapshotViewer } from "@/components/enem-question-snapshot-viewer";
import { EnemQuestionSourceIndex } from "@/components/enem-question-source-index";
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
      {search.saved === "1" ? null : (
        <EnemQuestionSourceIndex
          subjectSlug={subjectSlug}
          lessonTitle={lessonTitle}
        />
      )}
      <EnemQuestionSnapshotViewer
        subjectSlug={subjectSlug}
        lessonSlug={lessonSlug}
        lessonTitle={lessonTitle}
        savedOnly={search.saved === "1"}
      />
    </PageShell>
  );
}
