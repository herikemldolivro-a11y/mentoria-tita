import { UserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ displayName, role }: { displayName: string; role: "student" | "admin" }) {
  return <header className="site-header" data-user-role={role}><div className="header-inner">
    <div className="header-greeting"><span className="user-icon" aria-hidden="true"><UserRound size={18} /></span><span>Olá, <strong>{displayName}.</strong></span></div>
    <Brand />
    <div className="header-actions"><ThemeToggle /><LogoutButton /></div>
  </div></header>;
}
