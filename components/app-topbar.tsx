"use client";

import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  FileText,
  Home,
  NotebookPen,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/cronograma/semana-1", label: "Cronograma", icon: CalendarDays },
  { href: "/revisoes", label: "Revisões", icon: CalendarClock },
  { href: "/questoes", label: "Banco de Questões", icon: BookOpenCheck },
  { href: "/materiais", label: "Materiais", icon: FileText },
  { href: "/desempenho", label: "Desempenho", icon: BarChart3 },
  { href: "/erros", label: "Caderno de Erros", icon: NotebookPen },
] as const;

export function AppTopbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const visibleItems = isAdmin ? [...items, { href: "/admin", label: "Admin", icon: ShieldCheck }] : items;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0b0d]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[84px] w-full max-w-[1420px] items-center gap-3 px-3 sm:px-5">
        <Link
          href="/"
          className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.025] p-1.5 transition hover:border-[#c99a3d]/45"
          aria-label="Ir para o início"
        >
          <Brand compact />
        </Link>

        <nav className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-stretch gap-1">
            {visibleItems.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative inline-flex h-[83px] items-center gap-2 px-3 text-[11px] font-bold transition sm:px-3.5 ${
                    active ? "text-[#e6bd67]" : "text-white/76 hover:text-white"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                  {active ? <span className="absolute inset-x-2 bottom-0 h-[2px] bg-[#d9aa4e]" /> : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2 border-l border-white/10 pl-2 sm:pl-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
