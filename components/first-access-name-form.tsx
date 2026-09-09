"use client";

import { ArrowRight, LoaderCircle, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FirstAccessNameForm({ hasFocusContest }: { hasFocusContest: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_my_display_name", { p_name: name.trim() });
      if (error) throw error;
      router.replace(hasFocusContest ? "/" : "/onboarding");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar seu nome.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-[10px] font-black tracking-[.14em] text-[var(--muted)]">COMO DEVEMOS TE CHAMAR?</span>
        <span className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 focus-within:border-[var(--border-strong)]">
          <UserRound size={18} className="text-[var(--gold-bright)]" />
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: João Silva"
            minLength={2}
            maxLength={80}
            required
            className="min-w-0 flex-1 bg-transparent text-base text-[var(--ink)] outline-none"
          />
        </span>
      </label>

      {errorMessage ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">{errorMessage}</p> : null}

      <button
        type="submit"
        disabled={saving || name.trim().length < 2}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-xs font-black tracking-[.1em] text-[#111] disabled:opacity-45"
      >
        {saving ? <LoaderCircle className="animate-spin" size={17} /> : null}
        CONTINUAR <ArrowRight size={16} />
      </button>
    </form>
  );
}
