import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { NavigationItem } from "@/lib/navigation";

export function DashboardCard({ item, index }: { item: NavigationItem; index: number }) {
  const Icon = item.icon;
  return <Link className="dashboard-card" href={item.href} style={{ "--card-index": index } as React.CSSProperties}>
    <div className="card-topline"><span className="card-number">0{index + 1}</span><span className="card-arrow"><ArrowUpRight size={19} /></span></div>
    <span className="card-icon"><Icon size={26} strokeWidth={1.6} /></span>
    <div><h3>{item.title}</h3><p>{item.description}</p></div>
  </Link>;
}
