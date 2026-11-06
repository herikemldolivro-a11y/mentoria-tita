import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ManualNotebookWorkspace } from "@/components/mt-manual-notebooks";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function ManualNotebookWorkspacePage({params}:{params:Promise<{id:string}>}) {
 await requireAuthenticatedUser();
 const {id}=await params;
 return <PageShell><Suspense fallback={<div className="mx-auto max-w-xl p-8 text-sm text-white/60">Carregando caderno...</div>}><ManualNotebookWorkspace notebookId={id}/></Suspense></PageShell>;
}
