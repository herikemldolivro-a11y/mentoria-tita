import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";

export function ProgressCard() {
  return (
    <section className="progress-card" aria-labelledby="week-title">
      <div className="progress-heading">
        <div>
          <span className="eyebrow">CICLO ATUAL</span>
          <h2 id="week-title">Semana 1</h2>
        </div>
        <div className="target-badge"><Target size={18} /><span>Meta semanal</span></div>
      </div>
      <div className="progress-meta"><span>0 de 10 tarefas concluídas</span><strong>0% concluído</strong></div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-label="Progresso da semana"><span className="progress-fill" /></div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="!m-0">5 aulas-mãe · teoria + 35 questões por aula.</p>
        <Link
          href="/cronograma"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-[10px] font-black tracking-[0.12em] text-[var(--gold-bright)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-raised)]"
        >
          ABRIR SEMANA 1 <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
