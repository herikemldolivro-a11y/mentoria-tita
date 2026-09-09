import { BookmarkCheck } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { QuestionBank } from "@/components/question-bank";
import { PrincipalCalendar } from "@/components/principal-calendar";
export default function RevisoesPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1260px] px-4 pt-7 sm:px-6 sm:pt-9">
        <BackButton fallback="/" label="Voltar ao painel" />
      </div>
      <PrincipalCalendar compact />
      <section className="mx-auto w-full max-w-[1260px] px-4 pb-24 sm:px-6">
        <header className="mb-6 border-t border-[var(--border)] pt-9">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><BookmarkCheck size={16} /> QUESTÕES SALVAS</span>
          <h2 className="mt-2 font-serif text-3xl text-[var(--ink)] sm:text-4xl">Sua fila de revisão.</h2>
          <p className="mt-3 max-w-2xl text-xs leading-6 text-[var(--muted)]">As questões marcadas com “Salvar na revisão” aparecem aqui automaticamente.</p>
        </header>
        <QuestionBank initialStatus="review" />
      </section>
    </PageShell>
  );
}
