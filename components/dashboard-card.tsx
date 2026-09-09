import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { NavigationItem } from "@/lib/navigation";

export function DashboardCard({
  item,
  index,
}: {
  item: NavigationItem;
  index: number;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group relative min-h-[132px] overflow-hidden rounded-[22px] border border-[#8067ff]/18 bg-[linear-gradient(145deg,rgba(128,103,255,.075),rgba(255,255,255,.018))] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[#927cff]/45 hover:shadow-[0_18px_46px_rgba(82,58,184,.16)] sm:p-5"
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#795cff]/10 blur-3xl transition group-hover:bg-[#795cff]/20" />

      <div className="relative z-10 flex h-full items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-[#8067ff]/25 bg-[#795cff]/[.09] text-[#a996ff] shadow-[inset_0_0_18px_rgba(121,92,255,.04)]">
          <Icon size={21} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <span className="text-[7px] font-black tracking-[0.2em] text-[#8f73ff]">
            0{index + 1}
          </span>
          <h3 className="mt-1 font-serif text-lg text-[var(--ink)]">
            {item.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[var(--muted)]">
            {item.description}
          </p>
        </div>

        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#8067ff]/15 bg-[#795cff]/[.035] text-[#8f73ff] transition-all duration-200 group-hover:border-[#927cff]/40 group-hover:bg-[#795cff]/10 group-hover:text-[#b8a8ff]">
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}
