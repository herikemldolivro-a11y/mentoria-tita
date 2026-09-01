"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ fallback = "/", label = "Voltar" }: { fallback?: string; label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[10px] font-black tracking-[0.1em] text-[var(--muted)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"
    >
      <ArrowLeft size={15} /> {label.toUpperCase()}
    </button>
  );
}
