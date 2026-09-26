"use client";

import { CheckCircle2, Languages, LoaderCircle } from "lucide-react";
import { useState } from "react";

type Result = {
  ok: boolean;
  imported?: number;
  lessons?: number;
  error?: string;
};

export function AdminPortugueseMastersImportCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function importPack() {
    if (loading) return;

    if (!window.confirm(
      "Importar o arquivo final das aulas 02 a 08 de Português? As listas antigas dessas 7 aulas serão preservadas no histórico, mas sairão do banco ativo para não duplicar questões."
    )) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/import-portugues-02-08", {
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
    <section className="mb-7 overflow-hidden rounded-[24px] border border-amber-300/[.18] bg-[linear-gradient(135deg,rgba(120,53,15,.10),rgba(8,9,12,.98))] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-amber-300">
            <Languages size={15} /> CFO PMAL · PORTUGUÊS
          </span>
          <h2 className="mt-2 font-serif text-2xl text-[var(--ink)] sm:text-3xl">
            Aulas-mãe 02 a 08 · pacote final
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
            805 questões do arquivo enviado, exatamente 115 por aula. Sintaxe da oração, Sintaxe do período,
            Concordância, Regência, Crase, Colocação pronominal e Pontuação.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void importPack()}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/[.12] px-5 text-[9px] font-black tracking-[.12em] text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-400/[.18] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {loading ? "IMPORTANDO..." : "IMPORTAR 805 QUESTÕES"}
        </button>
      </div>

      {result ? (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
          result.ok
            ? "border-emerald-400/25 bg-emerald-400/[.07] text-emerald-300"
            : "border-red-400/25 bg-red-400/[.07] text-red-300"
        }`}>
          {result.ok
            ? `${result.imported ?? 0} questões ativas distribuídas em ${result.lessons ?? 0} aulas.`
            : result.error ?? "Falha na importação."}
        </div>
      ) : null}
    </section>
  );
}
