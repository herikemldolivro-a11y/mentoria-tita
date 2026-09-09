"use client";

import { BarChart3, CheckCircle2, CircleAlert, Database } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OverviewRow = {
  plan_name?: string | null;
  lesson_id: string;
  required_count?: number | string | null;
  active_count: number | string;
  total_count: number | string;
};

type Stats = {
  total: number;
  active: number;
  target: number;
  missing: number;
  completeLessons: number;
  lessonCount: number;
};

export function AdminQuestionBankTotal() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const supabase = createClient();
        const [allResult, activeResult, overviewResult] = await Promise.all([
          supabase.from("questions").select("id", { count: "exact", head: true }),
          supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("active", true),
          supabase.rpc("admin_question_overview"),
        ]);

        if (allResult.error) throw allResult.error;
        if (activeResult.error) throw activeResult.error;
        if (overviewResult.error) throw overviewResult.error;

        const overview = (overviewResult.data ?? []) as OverviewRow[];
        const cfoOverview = overview.filter((row) =>
          (row.plan_name ?? "").toLocaleUpperCase("pt-BR").includes("CFO PMAL"),
        );
        let target = 0;
        let missing = 0;
        let completeLessons = 0;

        for (const row of cfoOverview) {
          const mainTarget = Number(row.required_count ?? 35);
          const totalTarget = mainTarget + 40;
          const current = Number(row.active_count ?? 0);
          target += totalTarget;
          missing += Math.max(0, totalTarget - current);
          if (current >= totalTarget) completeLessons += 1;
        }

        if (!cancelled) {
          setStats({
            total: allResult.count ?? 0,
            active: activeResult.count ?? 0,
            target,
            missing,
            completeLessons,
            lessonCount: cfoOverview.length,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Não foi possível contar o banco.",
          );
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (errorMessage) {
    return (
      <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/[.06] p-4 text-xs text-red-400">
        {errorMessage}
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">
            VISÃO GERAL DO BANCO
          </span>
          <h2 className="mt-2 font-serif text-2xl text-[var(--ink)]">
            Total de questões em tempo real.
          </h2>
          <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">
            Meta de cobertura = lista principal da aula + 4 nivelamentos de 10 questões.
          </p>
        </div>
        <span className="text-[9px] font-black text-[var(--muted)]">
          {stats ? `${stats.completeLessons}/${stats.lessonCount} AULAS COBERTAS` : "CARREGANDO..."}
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Database} label="TOTAL NO BANCO" value={stats?.total} />
        <Stat icon={CheckCircle2} label="QUESTÕES ATIVAS" value={stats?.active} />
        <Stat icon={BarChart3} label="META CFO PMAL CADASTRADA" value={stats?.target} />
        <Stat icon={CircleAlert} label="AINDA FALTANDO" value={stats?.missing} danger />
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof Database;
  label: string;
  value?: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
      <Icon size={15} className={danger ? "text-amber-500" : "text-[var(--gold-bright)]"} />
      <span className="mt-3 block text-[7px] font-black tracking-[.1em] text-[var(--muted)]">
        {label}
      </span>
      <strong className="mt-1 block font-serif text-3xl text-[var(--ink)]">
        {value === undefined ? "—" : new Intl.NumberFormat("pt-BR").format(value)}
      </strong>
    </div>
  );
}
