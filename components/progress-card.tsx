import { Target } from "lucide-react";

export function ProgressCard() {
  return <section className="progress-card" aria-labelledby="week-title">
    <div className="progress-heading"><div><span className="eyebrow">CICLO ATUAL</span><h2 id="week-title">Semana 1</h2></div><div className="target-badge"><Target size={18} /><span>Meta semanal</span></div></div>
    <div className="progress-meta"><span>0 de 10 tarefas concluídas</span><strong>0% concluído</strong></div>
    <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-label="Progresso da semana"><span className="progress-fill" /></div>
    <p>Uma semana consistente começa com uma tarefa concluída.</p>
  </section>;
}
