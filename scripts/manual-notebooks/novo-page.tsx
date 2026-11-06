import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ManualNotebookCreate } from "@/components/mt-manual-notebooks";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function ManualNotebookCreatePage() {
 await requireAuthenticatedUser();
 return <PageShell><Suspense fallback={<div className="mx-auto max-w-xl p-8 text-sm text-white/60">Carregando...</div>}><ManualNotebookCreate/></Suspense></PageShell>;
}
