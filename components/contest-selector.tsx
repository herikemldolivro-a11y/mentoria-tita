"use client";

import { CheckCircle2, LoaderCircle, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ContestLogo } from "@/components/contest-logo";
import { contestOptions } from "@/lib/contests";
import { createClient } from "@/lib/supabase/client";

export function ContestSelector({ currentSlug = null, changing = false }: { currentSlug?: string | null; changing?: boolean }) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(currentSlug);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function confirmSelection() {
    if (!selectedSlug || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_focus_contest", { p_contest_slug: selectedSlug });
      if (error) {
        setErrorMessage("Não foi possível salvar seu concurso foco. Tente novamente.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage("Não foi possível salvar sua escolha agora. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contestOptions.map((contest) => {
          const selected = contest.slug === selectedSlug;
          const current = contest.slug === currentSlug;
          return (
            <button
              key={contest.slug}
              type="button"
              onClick={() => setSelectedSlug(contest.slug)}
              aria-pressed={selected}
              className={`group relative flex min-h-32 items-center gap-4 rounded-2xl border p-4 text-left transition duration-200 ${
                selected
                  ? "border-[var(--gold-bright)] bg-[color-mix(in_srgb,var(--gold)_12%,var(--surface))] shadow-[0_14px_40px_rgba(0,0,0,.18)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              <ContestLogo logoPath={contest.logoPath} sigla={contest.sigla} nome={contest.instituicao} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-[10px] font-black tracking-[0.18em] text-[var(--gold-bright)]">
                  {contest.sigla}
                  {current ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[8px] tracking-[0.12em] text-emerald-400">FOCO ATUAL</span>
                  ) : null}
                </span>
                <strong className="mt-1 block font-serif text-lg leading-tight text-[var(--ink)]">{contest.nome}</strong>
                <span className="mt-1.5 block text-xs leading-relaxed text-[var(--muted)]">{contest.instituicao}</span>
              </span>
              <span className={`absolute right-3 top-3 transition ${selected ? "text-[var(--gold-bright)] opacity-100" : "opacity-0"}`} aria-hidden="true">
                <CheckCircle2 size={20} />
              </span>
            </button>
          );
        })}
      </div>

      {errorMessage ? <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{errorMessage}</div> : null}

      <div className="mt-7 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Target size={16} className="text-[var(--gold-bright)]" />
          {changing ? "O painel muda imediatamente para o novo concurso foco." : "Seu painel será direcionado para o concurso escolhido."}
        </div>
        <button
          type="button"
          disabled={!selectedSlug || isSaving || (changing && selectedSlug === currentSlug)}
          onClick={confirmSelection}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-sm font-black tracking-[0.08em] text-[#111] transition hover:bg-[var(--gold-bright)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? <LoaderCircle className="animate-spin" size={18} /> : null}
          {isSaving ? "SALVANDO..." : changing ? "SALVAR NOVO FOCO" : "CONFIRMAR MISSÃO"}
        </button>
      </div>
    </div>
  );
}
