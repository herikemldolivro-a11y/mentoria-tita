"use client";

import { CheckCircle2, FileCheck2, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function AdminPortugueseCorrectedImportCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (loading) return;
    if (!window.confirm("Importar a versão FINAL CORRIGIDA de Português? O banco ativo das 7 aulas será substituído, mantendo o histórico antigo inativo.")) return;
    setLoading(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/import-portugues-7-corrigido", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await response.json() as { ok?: boolean; imported?: number; lessons?: number; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Falha na importação.");
      setMessage({ ok: true, text: `${data.imported ?? 0} questões processadas em ${data.lessons ?? 0} aulas.` });
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Falha na importação." });
    } finally { setLoading(false); }
  }

  return (
    <section className="mb-6 rounded-[24px] border border-emerald-300/[.16] bg-emerald-300/[.035] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.16em] text-emerald-300"><FileCheck2 size={14} /> PORTUGUÊS · FINAL CORRIGIDO</span><h2 className="mt-2 font-serif text-2xl text-[var(--ink)]">7 aulas-mãe · 805 questões</h2><p className="mt-2 max-w-2xl text-[10px] leading-5 text-[var(--muted)]">115 por aula: Interpretação, Tipologia, Fonética, Acentuação, Ortografia/Hífen, Porquês e Sintaxe da Oração.</p></div>
        <button type="button" disabled={loading} onClick={() => void run()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/[.08] px-5 text-[9px] font-black tracking-[.1em] text-emerald-200 disabled:opacity-50">{loading ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {loading ? "IMPORTANDO..." : "IMPORTAR 805 CORRIGIDAS"}</button>
      </div>
      {message ? <div className={`mt-4 rounded-xl border px-4 py-3 text-xs ${message.ok ? "border-emerald-300/20 text-emerald-300" : "border-red-300/20 text-red-300"}`}>{message.text}</div> : null}
    </section>
  );
}
