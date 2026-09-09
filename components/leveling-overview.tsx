"use client";

import { ArrowRight, CalendarClock, CheckCircle2, LoaderCircle, LockKeyhole, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMyLevelingOverview, type MyLevelingRow } from "@/lib/platform-admin";

export function LevelingOverview() {
  const [rows, setRows] = useState<MyLevelingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadMyLevelingOverview()
      .then(setRows)
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os nivelamentos."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-52 items-center justify-center gap-2 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle className="animate-spin" size={18} /> CARREGANDO NIVELAMENTOS</div>;

  return (
    <div className="space-y-4">
      {errorMessage ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}
      {rows.map((row) => {
        const completed = row.revision_status === "completed";
        const scheduled = row.revision_status === "scheduled";
        const ready = scheduled && Boolean(row.reread_confirmed_at);
        const enough = row.available_questions >= row.question_count;

        return (
          <article key={row.lesson_id} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_220px_auto] lg:items-center">
              <div>
                <span className="text-[9px] font-black tracking-[.14em] text-[var(--gold-bright)]">{row.subject_name}</span>
                <h3 className="mt-1 font-serif text-2xl text-[var(--ink)]">{row.lesson_title}</h3>
                <p className="mt-2 text-xs text-[var(--muted)]">Meta atual: <strong className="text-[var(--ink)]">{row.required_correct}/{row.question_count}</strong> · Banco: {row.available_questions} questões</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                <span className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">STATUS</span>
                <strong className="mt-1 flex items-center gap-2 text-sm" style={{ color: completed ? "#31c765" : ready ? "var(--gold-bright)" : "var(--muted)" }}>
                  {completed ? <CheckCircle2 size={15} /> : ready ? <Target size={15} /> : scheduled ? <CalendarClock size={15} /> : <LockKeyhole size={15} />}
                  {completed ? "Aprovado" : ready ? "Pronto para iniciar" : scheduled ? "Aguardando releitura/data" : "Ainda sem revisão"}
                </strong>
              </div>

              {row.revision_id ? (
                <Link href={`/revisoes/${row.revision_id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)]">
                  ABRIR REVISÃO <ArrowRight size={14} />
                </Link>
              ) : (
                <Link href="/revisoes" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--muted)]">
                  ABRIR CALENDÁRIO <ArrowRight size={14} />
                </Link>
              )}

              {!enough ? <p className="lg:col-span-3 rounded-xl border border-amber-500/20 bg-amber-500/[.05] px-4 py-3 text-[10px] font-bold text-amber-500">Banco insuficiente: faltam {row.question_count - row.available_questions} questões para este nivelamento.</p> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
