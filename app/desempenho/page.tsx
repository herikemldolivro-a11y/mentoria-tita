import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { PerformanceDashboard } from "@/components/performance-dashboard";

export const dynamic = "force-dynamic";

export default function DesempenhoPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1260px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> VOLTAR AO INÍCIO</Link>
        <PerformanceDashboard />
      </div>
    </PageShell>
  );
}
