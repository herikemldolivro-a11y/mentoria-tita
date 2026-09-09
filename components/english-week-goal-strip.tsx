"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function EnglishWeekGoalStrip({ weekNumber }: { weekNumber: number }) {
  const [completed, setCompleted] = useState(0);
  const [target, setTarget] = useState(12);
  const [level, setLevel] = useState("English");

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_my_english_week", { p_week: weekNumber });
      const payload = data as { goal?: { target_texts?: number; level_label?: string }; texts?: Array<{ status?: string }> } | null;
      setTarget(payload?.goal?.target_texts ?? 12);
      setLevel(payload?.goal?.level_label ?? "English");
      setCompleted((payload?.texts ?? []).filter((text) => text.status === "completed").length);
    };
    void run();
  }, [weekNumber]);

  return (
    <Link href={`/ingles/semana/${weekNumber}`} className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(210,166,78,.3)] bg-[rgba(210,166,78,.055)] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(210,166,78,.28)] text-[var(--gold-bright)]"><Languages size={17} /></span>
        <div>
          <span className="text-[8px] font-black tracking-[.13em] text-[var(--gold-bright)]">META FIXA DE INGLÊS · {level}</span>
          <strong className="mt-1 block text-sm text-[var(--ink)]">{completed}/{target} textos concluídos</strong>
        </div>
      </div>
      <span className="text-[9px] font-black text-[var(--gold-bright)]">ABRIR</span>
    </Link>
  );
}
