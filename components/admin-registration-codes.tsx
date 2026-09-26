"use client";

import { Check, Clipboard, KeyRound, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CodeRow = {
  id: string;
  label: string | null;
  active: boolean;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
};

export function AdminRegistrationCodes() {
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("registration_codes").select("id,label,active,max_uses,uses_count,expires_at,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as CodeRow[]);
    } catch {
      setErrorMessage("Não foi possível carregar os códigos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setErrorMessage(null);
    setNewCode(null);
    setCopied(false);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_registration_code", {
        p_code: null,
        p_label: label.trim() || null,
        p_max_uses: maxUses,
        p_expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      const code = result && typeof result === "object" && "code" in result ? String(result.code) : null;
      if (!code) throw new Error("Código não retornado.");
      setNewCode(code);
      setLabel("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível gerar o código.");
    } finally {
      setCreating(false);
    }
  }

  async function copyCode() {
    if (!newCode) return;
    await navigator.clipboard.writeText(newCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6">
      <section className="tita-panel-strong rounded-[28px] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.1] bg-white/[.035] text-[var(--tita-accent)]"><KeyRound size={19} /></span>
          <div><span className="tita-kicker">NOVO CONVITE</span><h2 className="mt-1 font-serif text-2xl text-white">Gerar código de acesso</h2><p className="mt-1 text-[10px] leading-5 text-white/35">O código aparece em texto somente na criação. No banco fica armazenado apenas o hash.</p></div>
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_130px_180px_auto]" onSubmit={create}>
          <input className="min-h-11 rounded-xl border border-white/[.09] bg-white/[.025] px-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-white/[.18]" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Identificação (ex.: Turma Setembro)" />
          <input className="min-h-11 rounded-xl border border-white/[.09] bg-white/[.025] px-3 text-sm text-white outline-none focus:border-white/[.18]" type="number" min={1} max={500} value={maxUses} onChange={(event) => setMaxUses(Math.max(1, Number(event.target.value)))} aria-label="Quantidade de usos" />
          <input className="min-h-11 rounded-xl border border-white/[.09] bg-white/[.025] px-3 text-sm text-white outline-none focus:border-white/[.18]" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} aria-label="Data de expiração" />
          <button className="tita-primary-button" type="submit" disabled={creating}>{creating ? <LoaderCircle className="animate-spin" size={15} /> : <Plus size={15} />}{creating ? "GERANDO" : "GERAR"}</button>
        </form>

        {newCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4">
            <span className="text-[8px] font-black tracking-[.13em] text-emerald-300/70">COPIE AGORA</span>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="break-all font-mono text-lg font-black tracking-[.08em] text-white">{newCode}</code>
              <button type="button" onClick={copyCode} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[.1] bg-white/[.04] px-3 text-[9px] font-black tracking-[.08em] text-white/70">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "COPIADO" : "COPIAR"}</button>
            </div>
          </div>
        ) : null}

        {errorMessage ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.07] px-4 py-3 text-xs text-red-200">{errorMessage}</div> : null}
      </section>

      <section className="tita-panel overflow-hidden rounded-[28px]">
        <header className="flex items-center justify-between gap-3 border-b border-white/[.07] p-5 sm:p-6">
          <div><span className="tita-kicker">HISTÓRICO</span><h2 className="mt-1 font-serif text-2xl text-white">Códigos gerados</h2></div>
          <button type="button" onClick={() => void refresh()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-white/55" aria-label="Atualizar"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
        </header>
        <div className="divide-y divide-white/[.055]">
          {loading && !rows.length ? <div className="p-6 text-xs text-white/35">Carregando...</div> : null}
          {!loading && !rows.length ? <div className="p-6 text-xs text-white/35">Nenhum código gerado ainda.</div> : null}
          {rows.map((row) => (
            <div key={row.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div><strong className="text-sm text-white/82">{row.label || "Código sem identificação"}</strong><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[8px] font-bold tracking-[.07em] text-white/30"><span>{row.uses_count}/{row.max_uses} USOS</span><span>{row.expires_at ? `EXPIRA ${new Date(row.expires_at).toLocaleDateString("pt-BR")}` : "SEM EXPIRAÇÃO"}</span><span>CRIADO {new Date(row.created_at).toLocaleDateString("pt-BR")}</span></div></div>
              <span className={`w-fit rounded-full border px-2.5 py-1 text-[8px] font-black tracking-[.09em] ${row.active ? "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-300" : "border-white/[.08] bg-white/[.025] text-white/30"}`}>{row.active ? "ATIVO" : "ENCERRADO"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
