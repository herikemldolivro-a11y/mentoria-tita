"use client";

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { useState } from "react";
import type { RevisionDraft } from "@/lib/revision-system";

export function RevisionPrefilledScheduler({
  draft,
  onClose,
  onSave,
}: {
  draft: RevisionDraft;
  onClose: () => void;
  onSave: (date: string, notes: string) => void | Promise<void>;
}) {
  // MT_PREFILLED_REVISION_VISUAL_V47_3
  const [date, setDate] = useState(draft.recommendedDate);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function save() {
    if (!date || saving) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      await onSave(date, notes);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar a revisão.",
      );
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#03040c]/82 p-4 backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        data-mt-prefilled-v47="3"
        className="relative my-4 w-full max-w-[1040px] overflow-hidden rounded-[32px] border border-violet-400/60 bg-[#060814] text-white shadow-[0_38px_140px_rgba(42,15,120,.62)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,rgba(126,47,255,.24),transparent_37%),radial-gradient(circle_at_8%_100%,rgba(39,57,220,.12),transparent_34%),radial-gradient(circle_at_50%_-10%,rgba(255,255,255,.04),transparent_24%)]" />

        <div className="relative p-5 sm:p-8 lg:p-10">
          <div className="flex items-start justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-violet-300">
                <CalendarDays size={15} /> CALENDÁRIO PRINCIPAL
              </span>

              <h2 className="mt-3 max-w-[760px] font-serif text-[2.7rem] leading-none tracking-[-.045em] sm:text-[3.65rem]">
                Escolha o dia da revisão
                <span className="text-violet-400">.</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] border border-violet-400/45 bg-violet-400/[.06] text-white/75 shadow-[inset_0_0_22px_rgba(100,60,255,.08)] transition hover:bg-violet-400/10 hover:text-white"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/[.08] p-4 text-xs text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 overflow-hidden rounded-[22px] border border-emerald-300/55 bg-[radial-gradient(circle_at_92%_50%,rgba(22,220,184,.18),transparent_34%),linear-gradient(135deg,rgba(5,60,63,.58),rgba(3,14,28,.88))] p-5 shadow-[0_0_32px_rgba(20,220,185,.13)] sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[22px] border border-emerald-300/50 bg-emerald-300/10 text-emerald-200 shadow-[0_0_28px_rgba(52,230,190,.16)]">
                <BookOpen size={33} />
              </span>

              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black tracking-[.15em] text-emerald-300">
                  AULA JÁ PREENCHIDA AUTOMATICAMENTE
                </span>
                <strong className="mt-2 block font-serif text-[1.7rem] leading-tight sm:text-[2rem]">
                  {draft.lessonTitle}
                </strong>
                <p className="mt-1 text-sm text-white/56">
                  {draft.subjectName} · Revisão {draft.revisionNumber}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 border-t border-emerald-200/12 pt-4 text-[11px] leading-6 text-white/50">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-cyan-300/60 text-cyan-300">
                i
              </span>
              <p>
                A matéria e a aula já vieram da trilha. Você escolhe a data e pode deixar uma observação opcional.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <label className="block">
              <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.18em] text-violet-300">
                <CalendarDays size={15} /> ESCOLHA O DIA DA REVISÃO
              </span>

              <div className="mt-3 rounded-[22px] border border-violet-300/70 bg-[#0a0c18] px-5 py-2 shadow-[inset_0_0_30px_rgba(98,68,255,.05)]">
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="min-h-14 w-full bg-transparent text-[1.65rem] font-black tracking-[.04em] text-white outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.18em] text-violet-300">
                <FileText size={15} /> OBSERVAÇÕES DA REVISÃO · OPCIONAL
              </span>

              <div className="mt-3 rounded-[22px] border border-violet-300/45 bg-[#0a0c18] px-5 py-4 shadow-[inset_0_0_30px_rgba(98,68,255,.04)]">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value.slice(0, 2000))}
                  rows={5}
                  placeholder="Ex.: errei conversão de unidade; revisar regra de três; atenção à pegadinha X..."
                  className="w-full resize-y bg-transparent text-base leading-7 text-white outline-none placeholder:text-white/25"
                />
              </div>

              <span className="mt-2 block text-right text-[10px] text-white/30">
                {notes.length}/2000
              </span>
            </label>
          </div>
        </div>

        <footer className="relative flex flex-col-reverse gap-3 border-t border-white/8 bg-black/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-violet-300/30 px-7 text-base font-black text-white/70 transition hover:bg-white/[.03] hover:text-white"
          >
            <ArrowLeft size={18} /> Cancelar
          </button>

          <button
            type="button"
            disabled={!date || saving}
            onClick={() => void save()}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-violet-200/70 bg-[linear-gradient(90deg,#5423ff,#8b31ff,#7450ff)] px-8 text-base font-black text-white shadow-[0_0_30px_rgba(112,51,255,.52)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? (
              <>
                <LoaderCircle className="animate-spin" size={18} />
                SALVANDO...
              </>
            ) : (
              <>
                <CalendarDays size={18} />
                Confirmar revisão
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}