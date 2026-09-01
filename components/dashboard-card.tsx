import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { NavigationItem } from "@/lib/navigation";

export function DashboardCard({ item, index }: { item: NavigationItem; index: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex min-h-[118px] items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:shadow-[var(--shadow)]"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] text-[var(--gold-bright)]">
        <Icon size={22} strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[8px] font-black tracking-[0.18em] text-[var(--muted)]">0{index + 1}</span>
        <h3 className="mt-1 font-serif text-lg text-[var(--ink)]">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--muted)]">{item.description}</p>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition group-hover:border-[var(--border-strong)] group-hover:text-[var(--gold-bright)]">
        <ArrowUpRight size={17} />
      </span>
    </Link>
  );
}
