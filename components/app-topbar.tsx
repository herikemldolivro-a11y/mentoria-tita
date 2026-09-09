"use client";

import {
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  FileText,
  Home,
  Languages,
  Menu,
  NotebookPen,
  ShieldCheck,
  X,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { XpTopbarChip } from "@/components/xp-topbar-chip";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/revisoes", label: "Revisões", icon: CalendarClock },
  { href: "/questoes", label: "Banco de Questões", icon: BookOpenCheck },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/materiais", label: "Materiais", icon: FileText },
  { href: "/ingles", label: "Inglês", icon: Languages },
  { href: "/erros", label: "Caderno de Erros", icon: NotebookPen },
] as const;

function NavItems({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const visibleItems = isAdmin
    ? [...items, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : items;

  return (
    <nav className="space-y-1.5">
      {visibleItems.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3.5 text-[11px] font-extrabold transition-all duration-200 ${
              active
                ? "bg-[linear-gradient(100deg,rgba(124,92,255,.28),rgba(92,55,220,.12))] text-white shadow-[inset_0_0_0_1px_rgba(146,121,255,.3),0_10px_28px_rgba(68,44,160,.16)]"
                : "text-white/54 hover:bg-white/[.045] hover:text-white/90"
            }`}
          >
            {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#8f73ff]" /> : null}
            <span className={`grid h-8 w-8 place-items-center rounded-lg transition ${active ? "bg-[#795cff]/18 text-[#ad9bff]" : "bg-white/[.025] text-white/45 group-hover:text-white/75"}`}>
              <Icon size={16} strokeWidth={1.8} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppTopbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[238px] flex-col border-r border-white/[.07] bg-[#0b0b12] px-4 py-5 text-white lg:flex">
        <Link href="/" className="rounded-2xl border border-white/[.07] bg-white/[.025] p-2.5 shadow-[0_18px_50px_rgba(0,0,0,.2)]">
          <Brand />
        </Link>

        <div className="mt-7 px-2 text-[8px] font-black tracking-[.18em] text-white/28">NAVEGAÇÃO</div>
        <div className="mt-2 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavItems isAdmin={isAdmin} />
        </div>

        <div className="mt-5 rounded-2xl border border-[#795cff]/15 bg-[#795cff]/[.045] p-3">
          <span className="block text-[8px] font-black tracking-[.15em] text-[#a793ff]">FOCO 95+</span>
          <p className="mt-1 text-[9px] leading-5 text-white/38">Estude o bloco recomendado, avance no seu ritmo e mantenha a sequência.</p>
        </div>

                <div className="mt-topbar-rank-slot"><XpTopbarChip /></div>
<div className="mt-3 flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.025] p-2 mt-topbar-actions">
<ThemeToggle />
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#0b0b12]/95 px-3 py-2.5 text-white backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border border-white/[.07] bg-white/[.025] p-1.5"><Brand compact /></Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/80" aria-label="Abrir menu">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[86%] max-w-[310px] border-r border-white/10 bg-[#0b0b12] p-4 text-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <Brand />
              <button type="button" onClick={() => setMobileOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/70" aria-label="Fechar menu"><X size={18} /></button>
            </div>
            <div className="mt-7"><NavItems isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} /></div>
            <div className="mt-6 border-t border-white/[.07] pt-4"><LogoutButton /></div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
