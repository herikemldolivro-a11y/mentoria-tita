import { PageShell } from "@/components/page-shell";
import { ManualNotebookDirectory } from "@/components/mt-manual-notebooks";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function ManualNotebookDirectoryPage() {
 await requireAuthenticatedUser();
 return <PageShell><div className="mx-auto max-w-5xl px-4 pb-24 pt-7"><ManualNotebookDirectory/></div></PageShell>;
}
