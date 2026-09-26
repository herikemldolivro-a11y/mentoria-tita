"use client";

import { BookOpenCheck, CheckCircle2, LoaderCircle } from "lucide-react";
import { useState } from "react";

type Result = {
  ok: boolean;
  imported?: number;
  lessons?: number;
  error?: string;
};

export function AdminMorphologyImportCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function importPack() {
    if (loading) return;
    if (!window.confirm("Importar/atualizar o pacote de Morfologia do CFO PMAL com 1.150 questões distribuídas em 10 aulas?")) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/import-morfologia-pmal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await response.json()) as Result;
      setResult(payload);

      if (payload.ok) {
        window.setTimeout(() => window.location.reload(), 900);
      }
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível importar o pacote.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-7 overflow-hidden rounded-[24px] border border-violet-300/[.18] bg-[linear-gradient(135deg,rgba(76,29,149,.11),rgba(8,9,12,.98))] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-violet-300">
            <BookOpenCheck size={15} /> CFO PMAL · PORTUGUÊS
          </span>
          <h2 className="mt-2 font-serif text-2xl text-[var(--ink)] sm:text-3xl">
            Pacote Morfologia · 10 aulas
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
            1.150 questões do arquivo final, 115 por aula. O botão é idempotente: se você clicar outra vez,
            ele atualiza as mesmas questões em vez de duplicá-las.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void importPack()}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/30 bg-violet-400/[.12] px-5 text-[9px] font-black tracking-[.12em] text-violet-100 transition hover:border-violet-200/55 hover:bg-violet-400/[.18] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {loading ? "IMPORTANDO..." : "IMPORTAR 1.150 QUESTÕES"}
        </button>
      </div>

      {result ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
            result.ok
              ? "border-emerald-400/25 bg-emerald-400/[.07] text-emerald-300"
              : "border-red-400/25 bg-red-400/[.07] text-red-300"
          }`}
        >
          {result.ok
            ? `${result.imported ?? 0} questões processadas em ${result.lessons ?? 0} aulas. Banco atualizado.`
            : result.error ?? "Falha na importação."}
        </div>
      ) : null}
    </section>
  );
}
