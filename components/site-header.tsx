import { UserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return <header className="site-header"><div className="header-inner">
    <div className="header-greeting"><span className="user-icon" aria-hidden="true"><UserRound size={18} /></span><span>Olá, <strong>Aluno.</strong></span></div>
    <Brand />
    <div className="header-actions"><ThemeToggle /></div>
  </div></header>;
}
