import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AdminContentManager, type AdminLesson, type AdminMaterial } from "@/components/admin-content-manager";
import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminContentsPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const { lesson } = await searchParams;

  const { data: lessonRows, error: lessonError } = await supabase
    .from("study_lesson_catalog")
    .select("plan_id,plan_slug,week_id,week_number,subject_id,subject_slug,subject_short_name,subject_name,lesson_id,lesson_slug,lesson_title,lesson_position")
    .order("week_number", { ascending: true })
    .order("subject_name", { ascending: true })
    .order("lesson_position", { ascending: true });
  if (lessonError) throw new Error(lessonError.message);

  const { data: materialRows, error: materialError } = await supabase
    .from("lesson_materials")
    .select("id,lesson_id,title,file_name,storage_path,mime_type,file_size,version,is_active,allow_download,created_at")
    .order("created_at", { ascending: false });
  if (materialError) throw new Error(materialError.message);

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[10px] font-black tracking-[.08em] text-[var(--muted)]"><ArrowLeft size={15} /> VOLTAR À CENTRAL ADMIN</Link>
        <section className="py-7 sm:py-9">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><ShieldCheck size={15} /> ADMINISTRAÇÃO</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Conteúdos das aulas.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Envie ou substitua PDFs sem mexer no código.</p>
        </section>
        <AdminContentManager lessons={(lessonRows ?? []) as AdminLesson[]} initialMaterials={(materialRows ?? []) as AdminMaterial[]} initialLessonId={lesson ?? null} />
      </div>
    </PageShell>
  );
}
