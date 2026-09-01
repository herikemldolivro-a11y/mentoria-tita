import { BookOpenCheck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { QuestionBank } from "@/components/question-bank";

export const dynamic = "force-dynamic";

export default function QuestionsPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <header className="border-b border-[var(--border)] pb-7">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><BookOpenCheck size={16} /> TREINO INDIVIDUAL</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Banco de Questões.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Filtre por matéria, assunto e nível. O gabarito e o comentário só aparecem depois que você envia sua resposta.</p>
        </header>
        <div className="mt-7"><QuestionBank /></div>
      </div>
    </PageShell>
  );
}
