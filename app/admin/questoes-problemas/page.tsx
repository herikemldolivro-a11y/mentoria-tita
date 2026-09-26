import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { AdminQuestionProblemCenter } from "@/components/admin-question-problem-center";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminQuestionProblemsPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1380px] px-4 pb-24 pt-6 sm:px-6">
        <AdminQuestionProblemCenter />
      </div>
    </PageShell>
  );
}

