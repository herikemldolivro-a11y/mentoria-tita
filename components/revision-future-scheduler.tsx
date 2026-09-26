"use client";

import { CalendarDays, CheckCircle2, LoaderCircle, RefreshCcw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDaysToDateKey, formatDatePtBr, todayKey } from "@/lib/revision-system";

type RevisionRow = {
  id: string;
  lesson_id: string;
  subject_name: string;
  lesson_title: string;
  revision_number: number;
  recommended_for: string;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "completed";
};

const revisionOptions = [2, 3, 4, 5] as const;

function suggestedGap(revisionNumber: number) {
  if (revisionNumber === 2) return 4;
  if (revisionNumber === 3) return 7;
  if (revisionNumber === 4) return 14;
  return 30;
}

export function RevisionFutureScheduler({ revisionId }: { revisionId: string }) {
  const supabase = useMemo(() => createClient() as any, []);
  const [source, setSource] = useState<RevisionRow | null>(null);
  const [existing, setExisting] = useState<RevisionRow[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<number>(2);
  const [date, setDate] = useState(todayKey());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data: sourceRow, error: sourceError } = await supabase
        .from("user_revisions")
        .select("id,lesson_id,subject_name,lesson_title,revision_number,recommended_for,scheduled_for,status")
        .eq("id", revisionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (sourceError) throw sourceError;
      if (!sourceRow) throw new Error("Revisão não encontrada.");

      const { data: revisionRows, error: revisionsError } = await supabase
        .from("user_revisions")
        .select("id,lesson_id,subject_name,lesson_title,revision_number,recommended_for,scheduled_for,status")
        .eq("user_id", user.id)
        .eq("lesson_id", sourceRow.lesson_id)
        .in("revision_number", revisionOptions)
        .order("revision_number", { ascending: true });

      if (revisionsError) throw revisionsError;

      const sourceTyped = sourceRow as RevisionRow;
      const rows = (revisionRows ?? []) as RevisionRow[];

      setSource(sourceTyped);
      setExisting(rows);

      const nextPreferred = Math.min(
        5,
        Math.max(2, Number(sourceTyped.revision_number || 1) + 1),
      );

      const firstOpen =
        revisionOptions.find((number) => {
          if (number < nextPreferred) return false;
          const row = rows.find((item) => item.revision_number === number);
          return row?.status !== "completed";
        }) ??
        revisionOptions.find((number) => {
          const row = rows.find((item) => item.revision_number === number);
          return row?.status !== "completed";
        }) ??
        5;

      setSelectedRevision(firstOpen);

      const target = rows.find((item) => item.revision_number === firstOpen);
      const baseDate =
        sourceTyped.scheduled_for ??
        sourceTyped.recommended_for ??
        todayKey();

      setDate(
        target?.scheduled_for ??
          addDaysToDateKey(baseDate, suggestedGap(firstOpen)),
      );

      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o agendador desta aula.",
      );
    } finally {
      setLoading(false);
    }
  }, [revisionId, supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function chooseRevision(revisionNumber: number) {
    setSelectedRevision(revisionNumber);
    setMessage(null);
    setErrorMessage(null);

    if (!source) return;

    const target = existing.find(
      (item) => item.revision_number === revisionNumber,
    );

    const baseDate =
      source.scheduled_for ??
      source.recommended_for ??
      todayKey();

    setDate(
      target?.scheduled_for ??
        addDaysToDateKey(baseDate, suggestedGap(revisionNumber)),
    );
  }

  const selectedExisting = existing.find(
    (item) => item.revision_number === selectedRevision,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!source || !date || saving) return;

    if (selectedExisting?.status === "completed") {
      setErrorMessage(
        `A ${selectedRevision}ª revisão desta aula já foi concluída.`,
      );
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc(
        "schedule_revision_from_revision_page",
        {
          p_source_revision_id: source.id,
          p_revision_number: selectedRevision,
          p_date: date,
        },
      );

      if (error) throw error;

      if (data?.already_completed) {
        setErrorMessage(
          `A ${selectedRevision}ª revisão desta aula já foi concluída.`,
        );
        return;
      }

      setMessage(
        `${selectedRevision}ª revisão salva para ${formatDatePtBr(date)}. Nivelamento e caderno foram sincronizados com a agenda.`,
      );

      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar esta revisão.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mb-6 rounded-[26px] border border-emerald-500/25 bg-emerald-500/[.035] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <LoaderCircle className="animate-spin" size={16} />
          Carregando agenda desta aula...
        </div>
      </section>
    );
  }

  if (!source) {
    return errorMessage ? (
      <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
        {errorMessage}
      </div>
    ) : null;
  }

  return (
    <section
      data-mt-revision-future-scheduler="v6"
      className="mb-6 overflow-hidden rounded-[28px] border border-emerald-500/45 bg-[linear-gradient(145deg,rgba(8,22,17,.98),rgba(5,12,10,.98))] shadow-[0_22px_70px_rgba(0,0,0,.2)]"
    >
      <div className="border-b border-emerald-500/20 p-6 sm:p-7">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-emerald-400">
          {source.status === "completed" ? (
            <CheckCircle2 size={14} />
          ) : (
            <RefreshCcw size={14} />
          )}
          {source.status === "completed"
            ? "ESTA AULA JÁ FOI REVISADA"
            : "PLANEJAMENTO DESTA AULA"}
        </span>

        <h2 className="mt-3 font-serif text-3xl text-[var(--ink)] sm:text-4xl">
          Agendar nova revisão desta aula
        </h2>

        <p className="mt-2 text-[10px] leading-5 text-[var(--muted)] sm:text-xs">
          {source.subject_name} · {source.lesson_title}
        </p>
      </div>

      <form onSubmit={submit} className="p-6 sm:p-7">
        <span className="text-[9px] font-black tracking-[.14em] text-[var(--muted)]">
          ESCOLHA A REVISÃO
        </span>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {revisionOptions.map((number) => {
            const row = existing.find(
              (item) => item.revision_number === number,
            );
            const active = selectedRevision === number;
            const completed = row?.status === "completed";
            const scheduled = Boolean(row?.scheduled_for) && !completed;

            return (
              <button
                key={number}
                type="button"
                onClick={() => chooseRevision(number)}
                className="min-h-[64px] rounded-xl border px-3 py-3 text-center transition"
                style={{
                  borderColor: active
                    ? "rgba(210,166,78,.45)"
                    : "var(--border)",
                  background: active
                    ? "rgba(210,166,78,.07)"
                    : "rgba(0,0,0,.26)",
                  opacity: completed ? 0.55 : 1,
                }}
              >
                <strong className="block font-serif text-sm text-[var(--ink)]">
                  {number}ª REVISÃO
                </strong>

                {completed ? (
                  <span className="mt-1 block text-[7px] font-black tracking-[.08em] text-emerald-400">
                    CONCLUÍDA
                  </span>
                ) : scheduled ? (
                  <span className="mt-1 block text-[7px] font-black tracking-[.08em] text-[var(--gold-bright)]">
                    AGENDADA · {formatDatePtBr(row!.scheduled_for!)}
                  </span>
                ) : (
                  <span className="mt-1 block text-[7px] font-black tracking-[.08em] text-[var(--muted)]">
                    LIVRE PARA AGENDAR
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="mt-5 block text-[9px] font-black tracking-[.14em] text-[var(--muted)]">
          DATA
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-3 min-h-12 w-full rounded-xl border border-[var(--border)] bg-black/35 px-3 text-sm font-black text-[var(--ink)] outline-none focus:border-emerald-500/50"
            required
          />
        </label>

        <button
          type="submit"
          disabled={saving || selectedExisting?.status === "completed"}
          className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#d8dde3] px-5 text-[10px] font-black tracking-[.13em] text-[#111] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saving ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <CalendarDays size={16} />
          )}
          {selectedExisting?.status === "completed"
            ? `${selectedRevision}ª REVISÃO JÁ CONCLUÍDA`
            : selectedExisting?.scheduled_for
              ? `REAGENDAR ${selectedRevision}ª REVISÃO`
              : `AGENDAR ${selectedRevision}ª REVISÃO`}
        </button>

        <p className="mt-4 text-[9px] leading-5 text-[var(--muted)]">
          Você pode agendar ou adiar quando quiser. Isso não depende de concluir questões ou nivelamento.
          Ao salvar uma revisão, os eventos de nivelamento e do caderno de anotações continuam sendo
          sincronizados pelas regras que já existem na plataforma.
        </p>

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[10px] font-bold text-emerald-400">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[10px] font-bold text-red-400">
            {errorMessage}
          </div>
        ) : null}
      </form>
    </section>
  );
}
