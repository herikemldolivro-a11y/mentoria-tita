import { DashboardCard } from "@/components/dashboard-card";
import { PageShell } from "@/components/page-shell";
import { ProgressCard } from "@/components/progress-card";
import { navigationItems } from "@/lib/navigation";

export default function Home() {
  return <PageShell><div className="dashboard-wrap">
    <section className="hero"><span className="eyebrow"><span className="eyebrow-line" /> ALTO DESEMPENHO</span><h1>Bem-vindo à<br /><em>Mentoria Titã</em></h1><p>Sua preparação. Seu desempenho. Sua aprovação.</p></section>
    <ProgressCard />
    <section className="dashboard-section" aria-labelledby="resources-title"><div className="section-heading"><div><span className="eyebrow">CENTRAL DO ALUNO</span><h2 id="resources-title">Sua jornada</h2></div><p>Todos os recursos para uma preparação de elite.</p></div><div className="dashboard-grid">{navigationItems.map((item, index) => <DashboardCard key={item.href} item={item} index={index} />)}</div></section>
  </div></PageShell>;
}
