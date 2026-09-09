"use client";

import { Clock3, History, LoaderCircle, RefreshCw, ShieldAlert, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ImportBatch = {
  id: string;
  created_at: string;
  original_count: number;
  current_count: number;
  real_count: number;
  authorial_count: number;
  protected_count: number;
  plans: string[];
  subjects: string[];
  lessons: string[];
  bancas: Array<{ banca: string; count: number }>;
  deleted_at: string | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function ordinalLabel(value: number) {
  return `${value}ª ADIÇÃO NESTA AULA`;
}

export function AdminQuestionImportHistory() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("admin_question_import_history", { p_limit: 60 });
      if (error) throw error;
      setBatches((data ?? []) as ImportBatch[]);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o histórico de lotes.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const additionByBatch = useMemo(() => {
    const result = new Map<string, number>();
    const perLesson = new Map<string, number>();
    const chronological = [...batches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const batch of chronological) {
      if (batch.lessons.length !== 1) continue;
      const lesson = batch.lessons[0].trim().toLocaleLowerCase("pt-BR");
      if (!lesson) continue;
      const next = (perLesson.get(lesson) ?? 0) + 1;
      perLesson.set(lesson, next);
      result.set(batch.id, next);
    }
    return result;
  }, [batches]);

  async function removeBatch(batch: ImportBatch) {
    if (deletingId || batch.deleted_at) return;
    if (batch.protected_count > 0) {
      setErrorMessage(`Esse lote tem ${batch.protected_count} questão(ões) já usadas em respostas ou tentativas. Ele está protegido para não quebrar o histórico dos alunos.`);
      return;
    }
    const lessonLabel = batch.lessons.length === 1 ? batch.lessons[0] : `${batch.lessons.length} aulas`;
    const confirmed = window.confirm(`EXCLUIR O LOTE INTEIRO?

${batch.current_count} questões
${lessonLabel}
Importado em ${formatDateTime(batch.created_at)}

Isso remove as questões do banco de uma vez.`);
    if (!confirmed) return;

    setDeletingId(batch.id);
    setMessage(null);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("admin_delete_question_import_batch", { p_batch_id: batch.id });
      if (error) throw error;
      const result = data as { ok?: boolean; deleted?: number; protected?: number; message?: string };
      if (!result.ok) {
        setErrorMessage(result.message ?? `O lote não pôde ser excluído. ${result.protected ?? 0} questão(ões) protegidas.`);
        return;
      }
      setMessage(`${result.deleted ?? 0} questões do lote foram excluídas.`);
      await refresh(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível excluir o lote.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mb-2 overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] [overflow-anchor:none]">
      <header className="border-b border-[var(--border)] bg-[#0b0b12] p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#9e8aff]"><History size={15} /> HISTÓRICO DE IMPORTAÇÕES</span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">Cada aula mantém sua sequência de lotes.</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-white/45">A mesma aula recebe 1ª adição, 2ª adição, 3ª adição e assim por diante. O histórico continua no fim desta página.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-white/10 px-3 text-[9px] font-black tracking-[.1em] text-white/65 hover:text-[#a996ff] disabled:opacity-40 sm:self-auto"><RefreshCw className={loading ? "animate-spin" : ""} size={14} /> ATUALIZAR</button>
        </div>
      </header>

      <div className="p-5 sm:p-6">
        {message ? <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[.07] p-4 text-xs text-emerald-400">{message}</div> : null}
        {errorMessage ? <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}
        {loading && !batches.length ? <div className="flex min-h-28 items-center justify-center gap-2 text-xs text-[var(--muted)]"><LoaderCircle className="animate-spin" size={16} /> Carregando lotes...</div> : null}
        {!loading && !batches.length ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--muted)]">Nenhuma importação encontrada.</div> : null}

        <div className="space-y-3">
          {batches.map((batch, index) => {
            const deleted = Boolean(batch.deleted_at);
            const isLatest = index === 0 && !deleted;
            const deleting = deletingId === batch.id;
            const addition = additionByBatch.get(batch.id);
            return (
              <article key={batch.id} className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: isLatest ? "rgba(128,103,255,.45)" : "var(--border)", background: deleted ? "rgba(255,255,255,.018)" : isLatest ? "rgba(128,103,255,.045)" : "var(--background)", opacity: deleted ? .55 : 1 }}>
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {addition ? <span className="rounded-full border border-[#8067ff]/30 bg-[#8067ff]/[.07] px-2.5 py-1 text-[8px] font-black tracking-[.09em] text-[#8067ff]">{ordinalLabel(addition)}</span> : null}
                      {isLatest ? <span className="rounded-full border border-[rgba(210,166,78,.35)] bg-[rgba(210,166,78,.06)] px-2.5 py-1 text-[8px] font-black tracking-[.09em] text-[var(--gold-bright)]">ÚLTIMO LOTE</span> : null}
                      {deleted ? <span className="rounded-full border border-red-500/25 bg-red-500/[.06] px-2.5 py-1 text-[8px] font-black tracking-[.1em] text-red-400">EXCLUÍDO</span> : null}
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[var(--muted)]"><Clock3 size={12} /> {formatDateTime(batch.created_at)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                      <div><span className="block text-[8px] font-black tracking-[.12em] text-[var(--muted)]">QUESTÕES</span><strong className="mt-0.5 block font-serif text-3xl text-[var(--ink)]">{deleted ? batch.original_count : batch.current_count}</strong></div>
                      <div className="pb-1 text-[10px] leading-5 text-[var(--muted)]"><strong className="text-[var(--ink)]">{batch.subjects.join(" · ") || "Matéria não identificada"}</strong><br />{batch.lessons.join(" · ") || "Aula não identificada"}</div>
                    </div>

                    {!deleted ? <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[8px] font-black text-[var(--gold-bright)]">REAIS · {batch.real_count}</span><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[8px] font-black text-[var(--muted)]">AUTORAIS · {batch.authorial_count}</span>{batch.bancas.map((item) => <span key={`${batch.id}-${item.banca}`} className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[8px] font-black text-[var(--muted)]">{item.banca} · {item.count}</span>)}</div> : null}

                    {!deleted && batch.protected_count > 0 ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[.05] p-3"><ShieldAlert className="mt-0.5 shrink-0 text-amber-400" size={14} /><p className="text-[9px] leading-5 text-[var(--muted)]">{batch.protected_count} questão(ões) já entraram em histórico/tentativa. Esse lote fica protegido contra exclusão total.</p></div> : null}
                  </div>

                  {!deleted ? <button type="button" onClick={() => void removeBatch(batch)} disabled={deleting} title="Excluir lote inteiro" aria-label="Excluir lote inteiro" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-500/30 bg-red-500/[.07] text-red-400 transition hover:bg-red-500/15 disabled:opacity-40">{deleting ? <LoaderCircle className="animate-spin" size={17} /> : <X size={18} />}</button> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"><Trash2 size={15} /></div>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
