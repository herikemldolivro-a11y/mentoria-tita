import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { PrincipalCalendar } from "@/components/principal-calendar";

export const dynamic = "force-dynamic";

export default function CalendarioPrincipalPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1260px] px-4 pt-7 sm:px-6 sm:pt-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> VOLTAR AO INÍCIO</Link>
        <header className="mt-5 border-b border-[var(--border)] pb-6">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-violet-400"><CalendarDays size={16}/> CALENDÁRIO PRINCIPAL</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Sua agenda principal.</h1>
          <p className="mt-3 max-w-3xl text-xs leading-6 text-[var(--muted)]">Revisões do cronograma principal e seus nivelamentos ficam aqui. O calendário exclusivo das Listas de Questões continua separado.</p>
        </header>
      </div>
      <PrincipalCalendar />
    </PageShell>
  );
}
