import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import type { NavigationItem } from "@/lib/navigation";
import { PageShell } from "@/components/page-shell";

export function ComingSoonPage({ item, heading }: { item: NavigationItem; heading?: string }) {
  const Icon = item.icon;
  return <PageShell><div className="subpage-wrap">
    <Link href="/" className="back-link"><ArrowLeft size={18} /> Voltar ao painel</Link>
    <section className="coming-soon-card"><div className="corner-label">EM PREPARAÇÃO</div><span className="large-icon"><Icon size={38} strokeWidth={1.45} /></span><span className="eyebrow">MENTORIA TITÃ · FOCO 95+</span><h1>{heading ?? item.title}</h1><p>{item.description}</p><div className="availability-note"><LockKeyhole size={18} /><span>Seu conteúdo individual será disponibilizado aqui.</span></div></section>
  </div></PageShell>;
}
