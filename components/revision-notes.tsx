"use client";

import { Check, MessageSquareText, Pencil, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function RevisionNotes({ revisionId }: { revisionId: string }) {
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("user_revisions")
      .select("notes")
      .eq("id", revisionId)
      .maybeSingle();

    if (loadError) throw loadError;
    const value = String(data?.notes ?? "");
    setNotes(value);
    setDraft(value);
  }, [revisionId]);

  useEffect(() => {
    let alive = true;
    void load()
      .catch((loadError) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as observações.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [load]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const normalized = draft.trim().slice(0, 2000);
      const supabase = createClient();
      const { error: saveError } = await supabase
        .from("user_revisions")
        .update({ notes: normalized || null, updated_at: new Date().toISOString() })
        .eq("id", revisionId);
      if (saveError) throw saveError;
      setNotes(normalized);
      setDraft(normalized);
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as observações.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="mb-6 rounded-[22px] border border-violet-400/15 bg-violet-400/[.025] p-5 text-xs text-[var(--muted)]">Carregando observações...</section>;
  }

  return (
    <section className="mb-6 rounded-[24px] border border-violet-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(139,92,246,.13),transparent_36%),var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[.08] text-violet-300">
            <MessageSquareText size={17} />
          </span>
          <div>
            <span className="text-[8px] font-black tracking-[.15em] text-violet-400">OBSERVAÇÕES DA REVISÃO</span>
            <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Suas anotações ficam presas a esta revisão.</h2>
            <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">Use para registrar erro recorrente, ponto de atenção, fórmula, pegadinha ou qualquer coisa que queira lembrar quando abrir esta revisão.</p>
          </div>
        </div>

        {!editing ? (
          <button type="button" onClick={() => { setDraft(notes); setEditing(true); }} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.06] px-3 text-[9px] font-black tracking-[.08em] text-violet-300">
            <Pencil size={13} /> {notes ? "EDITAR" : "ADICIONAR"}
          </button>
        ) : null}
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{error}</div> : null}
      {saved ? <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-3 py-1.5 text-[9px] font-black text-emerald-300"><Check size={12} /> SALVO</div> : null}

      {editing ? (
        <div className="mt-5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
            maxLength={2000}
            rows={5}
            className="min-h-[132px] w-full resize-y rounded-2xl border border-violet-400/20 bg-black/20 px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]/45 focus:border-violet-400/45"
            placeholder="Escreva sua observação..."
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[8px] font-black tracking-[.08em] text-[var(--muted)]">{draft.length}/2000</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setDraft(notes); setEditing(false); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[9px] font-black text-[var(--muted)]"><X size={13} /> CANCELAR</button>
              <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-[9px] font-black text-white disabled:opacity-45"><Save size={13} /> {saving ? "SALVANDO..." : "SALVAR OBSERVAÇÃO"}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`mt-5 rounded-2xl border px-4 py-4 text-sm leading-7 ${notes ? "border-violet-400/15 bg-violet-400/[.035] text-[var(--ink)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"}`}>
          {notes || "Nenhuma observação registrada nesta revisão."}
        </div>
      )}
    </section>
  );
}
