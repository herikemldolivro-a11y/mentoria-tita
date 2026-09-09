import { ArrowLeft, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminQuestionBankTotal } from "@/components/admin-question-bank-total";
import { AdminQuestionManager, type AdminQuestionCatalogRow } from "@/components/admin-question-manager";
import { AdminQuestionBulkManager } from "@/components/admin-question-bulk-manager";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminQuestionImportHistory } from "@/components/admin-question-import-history";
export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_lesson_catalog")
    .select("plan_id,plan_slug,subject_id,subject_name,subject_slug,lesson_id,lesson_title,lesson_slug,lesson_position")
    .order("subject_name", { ascending: true })
    .order("lesson_position", { ascending: true });
  if (error) throw new Error(error.message);
  const planIds = Array.from(new Set((data ?? []).map((row) => row.plan_id)));
  const { data: planRows, error: planError } = await supabase.from("study_plans").select("id,name").in("id", planIds);
  if (planError) throw new Error(planError.message);
  const planNames = new Map((planRows ?? []).map((plan) => [plan.id, plan.name]));

  const catalog = (data ?? []).map((row) => ({
    plan_id: row.plan_id,
    plan_slug: row.plan_slug,
    plan_name: planNames.get(row.plan_id) ?? row.plan_slug,
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    subject_slug: row.subject_slug,
    lesson_id: row.lesson_id,
    lesson_title: row.lesson_title,
    lesson_slug: row.lesson_slug,
    lesson_position: row.lesson_position,
  })) as AdminQuestionCatalogRow[];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[10px] font-black tracking-[.08em] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"><ArrowLeft size={15} /> VOLTAR À CENTRAL ADMIN</Link>
        <header className="py-7 sm:py-9"><span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><BookOpenCheck size={16} /> ADMINISTRAÇÃO</span><h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Banco de questões.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Cadastre, importe, classifique, filtre e exclua lotes por aula. Questões com banca são tratadas como reais; sem banca, como autorais/IA.</p></header>
<AdminQuestionBulkManager catalog={catalog} />
        <AdminQuestionBankTotal />
        <AdminQuestionManager catalog={catalog} />

        <div className="mt-12 border-t border-[var(--border)] pt-8 [overflow-anchor:none]">
          <AdminQuestionImportHistory />
        </div>
</div>
    </PageShell>
  );
}
