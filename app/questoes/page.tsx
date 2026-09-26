import { PageShell } from "@/components/page-shell";
import { QuestionHub } from "@/components/question-hub";

export const dynamic = "force-dynamic";

export default function QuestionsPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1380px] px-4 pb-16 pt-5 sm:px-6 sm:pt-6 xl:px-7">
        <QuestionHub />
      </div>
    </PageShell>
  );
}

