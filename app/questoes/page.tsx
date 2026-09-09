import { BookOpenCheck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { QuestionHub } from "@/components/question-hub";

export const dynamic = "force-dynamic";

export default function QuestionsPage() {
  return <PageShell><div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10"><header className="mb-8 border-b border-[var(--border)] pb-7"><span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-violet-400"><BookOpenCheck size={16}/> CENTRAL DE QUESTÕES</span><h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Como você quer treinar?</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Escolha entre o banco livre, as listas organizadas por aula ou o calendário próprio de nivelamentos conectado às revisões.</p></header><QuestionHub/></div></PageShell>;
}
