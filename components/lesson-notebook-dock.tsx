"use client";

import {
  ArrowLeft,
  BookOpenCheck,
  CalendarClock,
  Check,
  ChevronRight,
  Eye,
  LoaderCircle,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  activateLessonNotebook,
  createNotebookCard,
  deleteLessonNotebook,
  deleteNotebookCard,
  ensureLessonNotebook,
  formatNotebookDate,
  isNotebookDue,
  listenNotebookUpdated,
  loadNotebookByLesson,
  type LessonNotebookCard,
  type LessonNotebookDetail,
} from "@/lib/notebook-system";

type Props = {
  lessonId: string;
  lessonTitle: string;
  subjectName?: string | null;
  contextLabel?: string;
};

type EditorStep = "list" | "front" | "back" | "preview";

export function LessonNotebookDock({ lessonId, lessonTitle, subjectName = null, contextLabel = "AULA" }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [due, setDue] = useState(false);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      const notebook = await loadNotebookByLesson(lessonId).catch(() => null);
      if (!alive) return;
      setCount(notebook?.card_count ?? 0);
      setDue(notebook ? isNotebookDue(notebook) : false);
    }
    void refresh();
    const unlisten = listenNotebookUpdated(() => void refresh());
    return () => { alive = false; unlisten(); };
  }, [lessonId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex min-h-14 items-center gap-3 rounded-2xl border border-amber-300/25 bg-[#0b0b0d]/95 px-4 text-left text-white shadow-[0_20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-amber-200/45 lg:right-7"
      >
        <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/[.08] text-amber-300">
          <NotebookPen size={19}/>
          {due ? <i className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_16px_rgba(232,121,249,.85)]" /> : null}
        </span>
        <span className="hidden sm:block">
          <strong className="block text-[9px] font-black tracking-[.13em] text-amber-300">CADERNO DE ANOTAÇÕES</strong>
          <span className="mt-0.5 block max-w-[220px] truncate text-[10px] text-white/48">{count} flashcard{count === 1 ? "" : "s"} · {lessonTitle}</span>
        </span>
      </button>

      <NotebookManagerModal
        open={open}
        onClose={() => setOpen(false)}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        subjectName={subjectName}
        contextLabel={contextLabel}
      />
    </>
  );
}

export function NotebookManagerModal({
  open,
  onClose,
  lessonId,
  lessonTitle,
  subjectName = null,
  contextLabel = "AULA",
}: Props & { open: boolean; onClose: () => void }) {
  const [notebook, setNotebook] = useState<LessonNotebookDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<EditorStep>("list");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [previewCard, setPreviewCard] = useState<LessonNotebookCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh(createIfMissing = false) {
    setLoading(true);
    try {
      if (createIfMissing) await ensureLessonNotebook(lessonId);
      const detail = await loadNotebookByLesson(lessonId);
      setNotebook(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível abrir o caderno.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setStep("list");
    setMessage(null);
    void refresh(true);
  }, [open, lessonId]);

  function beginNewCard() {
    setFront("");
    setBack("");
    setPreviewCard(null);
    setRevealed(false);
    setMessage(null);
    setStep("front");
  }

  async function saveCard() {
    if (!front.trim() || !back.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const card = await createNotebookCard(lessonId, front, back);
      setPreviewCard(card);
      setRevealed(false);
      await refresh();
      setStep("preview");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o flashcard.");
    } finally {
      setBusy(false);
    }
  }

  async function finalizeNotebook() {
    if (!notebook || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await activateLessonNotebook(notebook.id);
      await refresh();
      setMessage(`Caderno finalizado. Primeira revisão em ${formatNotebookDate(result.next_review_on)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível finalizar o caderno.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCard(cardId: string) {
    if (!window.confirm("Excluir este flashcard do caderno?")) return;
    setBusy(true);
    try {
      await deleteNotebookCard(cardId);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeNotebook() {
    if (!notebook || !window.confirm("Excluir o caderno inteiro desta aula? Esta ação apaga todos os flashcards e o histórico.")) return;
    setBusy(true);
    try {
      await deleteLessonNotebook(notebook.id);
      setNotebook(null);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/78 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <section className="max-h-[92vh] w-full max-w-[760px] overflow-hidden rounded-t-[30px] border border-white/12 bg-[#090a0d] text-white shadow-[0_35px_120px_rgba(0,0,0,.65)] sm:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
        <header className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_85%_0%,rgba(245,190,64,.18),transparent_38%),#0b0c10] p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.18em] text-amber-300"><Sparkles size={13}/> {contextLabel}</span>
              <h2 className="mt-2 font-serif text-3xl tracking-[-.03em] sm:text-4xl">Caderno de Anotações</h2>
              <p className="mt-2 truncate text-xs text-white/45">{subjectName ? `${subjectName} · ` : ""}{lessonTitle}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/55 transition hover:text-white"><X size={18}/></button>
          </div>
          {notebook ? (
            <div className="mt-5 flex flex-wrap gap-2 text-[8px] font-black tracking-[.09em]">
              <span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-3 py-2 text-amber-200">{notebook.card_count} FLASHCARD{notebook.card_count === 1 ? "" : "S"}</span>
              <span className={`rounded-full border px-3 py-2 ${notebook.status === "active" ? "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-300" : "border-white/10 bg-white/[.03] text-white/40"}`}>{notebook.status === "active" ? "CADERNO ATIVO" : "EM CONSTRUÇÃO"}</span>
              {notebook.status === "active" ? <span className={`rounded-full border px-3 py-2 ${isNotebookDue(notebook) ? "border-fuchsia-300/25 bg-fuchsia-300/[.08] text-fuchsia-300" : "border-violet-300/20 bg-violet-300/[.05] text-violet-300"}`}>{isNotebookDue(notebook) ? "REVISÃO DISPONÍVEL" : `PRÓXIMA · ${formatNotebookDate(notebook.next_review_on)}`}</span> : null}
            </div>
          ) : null}
        </header>

        <div className="max-h-[64vh] overflow-y-auto p-5 sm:p-7">
          {loading && !notebook ? <div className="grid min-h-56 place-items-center text-xs text-white/45"><span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={17}/> ABRINDO CADERNO</span></div> : null}
          {message ? <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-xs leading-6 text-amber-100/80">{message}</div> : null}

          {!loading || notebook ? (
            <>
              {step === "front" ? (
                <div>
                  <button type="button" onClick={() => setStep("list")} className="mb-5 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/40"><ArrowLeft size={14}/> VOLTAR</button>
                  <span className="block text-[8px] font-black tracking-[.18em] text-amber-300">PASSO 1 · FRENTE</span>
                  <h3 className="mt-2 font-serif text-3xl">O que você quer lembrar?</h3>
                  <p className="mt-2 text-xs leading-6 text-white/42">Escreva a ideia, pergunta, regra ou conceito que deve aparecer antes da resposta.</p>
                  <textarea autoFocus value={front} onChange={(event) => setFront(event.target.value)} placeholder="Ex.: Qual é a diferença entre anulação e revogação?" className="mt-5 min-h-44 w-full resize-y rounded-2xl border border-white/10 bg-white/[.025] p-4 text-sm leading-7 text-white outline-none transition focus:border-amber-300/35" />
                  <button type="button" disabled={!front.trim()} onClick={() => setStep("back")} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-[10px] font-black tracking-[.12em] text-[#161006] disabled:opacity-35">FRENTE PRONTA <ChevronRight size={15}/></button>
                </div>
              ) : null}

              {step === "back" ? (
                <div>
                  <button type="button" onClick={() => setStep("front")} className="mb-5 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/40"><ArrowLeft size={14}/> EDITAR FRENTE</button>
                  <span className="block text-[8px] font-black tracking-[.18em] text-violet-300">PASSO 2 · VERSO</span>
                  <h3 className="mt-2 font-serif text-3xl">Agora explique do seu jeito.</h3>
                  <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4 text-xs leading-6 text-amber-100/70"><strong className="block text-[8px] tracking-[.12em] text-amber-300">FRENTE</strong>{front}</div>
                  <textarea autoFocus value={back} onChange={(event) => setBack(event.target.value)} placeholder="Escreva sua explicação..." className="mt-4 min-h-52 w-full resize-y rounded-2xl border border-white/10 bg-white/[.025] p-4 text-sm leading-7 text-white outline-none transition focus:border-violet-300/35" />
                  <button type="button" disabled={!back.trim() || busy} onClick={() => void saveCard()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-[10px] font-black tracking-[.12em] text-white disabled:opacity-35">{busy ? <LoaderCircle className="animate-spin" size={16}/> : <Check size={16}/>} SALVAR FLASHCARD</button>
                </div>
              ) : null}

              {step === "preview" && previewCard ? (
                <div>
                  <span className="block text-center text-[8px] font-black tracking-[.18em] text-emerald-300">FLASHCARD SALVO · TESTE AGORA</span>
                  <button type="button" onClick={() => setRevealed((value) => !value)} className="mt-5 w-full rounded-[26px] border border-white/12 bg-[linear-gradient(145deg,#13141a,#090a0d)] p-7 text-left shadow-[0_25px_80px_rgba(0,0,0,.3)]">
                    <span className="text-[8px] font-black tracking-[.16em] text-amber-300">FRENTE</span>
                    <strong className="mt-4 block font-serif text-2xl leading-tight">{previewCard.front}</strong>
                    {!revealed ? <span className="mt-8 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/45"><Eye size={15}/> TOQUE PARA REVELAR O VERSO</span> : <div className="mt-7 border-t border-white/10 pt-6"><span className="text-[8px] font-black tracking-[.16em] text-violet-300">VERSO</span><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/72">{previewCard.back}</p></div>}
                  </button>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={beginNewCard} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[.06] text-[10px] font-black tracking-[.1em] text-amber-300"><Plus size={16}/> ADICIONAR OUTRO</button>
                    <button type="button" onClick={() => setStep("list")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 text-[10px] font-black tracking-[.1em] text-white/55">VOLTAR AO CADERNO</button>
                  </div>
                </div>
              ) : null}

              {step === "list" && notebook ? (
                <div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={beginNewCard} className="group rounded-2xl border border-amber-300/22 bg-amber-300/[.055] p-4 text-left transition hover:border-amber-200/45">
                      <Plus className="text-amber-300" size={20}/>
                      <strong className="mt-3 block font-serif text-xl">Novo flashcard</strong>
                      <span className="mt-1 block text-[10px] leading-5 text-white/40">Frente primeiro. Depois você escreve a explicação no verso.</span>
                    </button>
                    {notebook.card_count > 0 ? (
                      <Link href={`/caderno/${notebook.id}`} className="rounded-2xl border border-violet-300/22 bg-violet-300/[.05] p-4 text-left transition hover:border-violet-200/40">
                        <BookOpenCheck className="text-violet-300" size={20}/>
                        <strong className="mt-3 block font-serif text-xl">Revisar agora</strong>
                        <span className="mt-1 block text-[10px] leading-5 text-white/40">Erros anteriores aparecem primeiro. Depois, os flashcards mais antigos.</span>
                      </Link>
                    ) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs leading-6 text-white/35">Seu caderno ainda está vazio. Crie o primeiro flashcard.</div>}
                  </div>

                  {notebook.status === "draft" && notebook.card_count > 0 ? (
                    <button type="button" disabled={busy} onClick={() => void finalizeNotebook()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-[10px] font-black tracking-[.12em] text-[#07130d] disabled:opacity-40"><CalendarClock size={16}/> FINALIZAR CADERNO · AGENDAR +2 DIAS</button>
                  ) : null}

                  <div className="mt-6 border-t border-white/8 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div><span className="text-[8px] font-black tracking-[.15em] text-white/30">FLASHCARDS DA AULA</span><h3 className="mt-1 font-serif text-2xl">{notebook.card_count ? `${notebook.card_count} anotação${notebook.card_count === 1 ? "" : "ões"}` : "Caderno vazio"}</h3></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {notebook.cards.map((card) => (
                        <article key={card.id} className="rounded-2xl border border-white/8 bg-white/[.022] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1"><span className="text-[8px] font-black tracking-[.12em] text-amber-300/75">FLASHCARD {card.position}</span><strong className="mt-1 block text-sm leading-6 text-white/82">{card.front}</strong><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/38">{card.back}</p></div>
                            <button type="button" disabled={busy} onClick={() => void removeCard(card.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-400/15 text-red-300/55 transition hover:bg-red-400/10 hover:text-red-300"><Trash2 size={14}/></button>
                          </div>
                          {card.last_result !== null ? <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.08em] ${card.last_result ? "border-emerald-300/15 text-emerald-300" : "border-red-300/15 text-red-300"}`}>{card.last_result ? `ÚLTIMA: ACERTOU · ${card.consecutive_correct} SEGUIDA(S)` : "ÚLTIMA: ERROU · PRIORIDADE ALTA"}</span> : null}
                        </article>
                      ))}
                    </div>
                  </div>

                  <button type="button" disabled={busy} onClick={() => void removeNotebook()} className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-400/15 px-3.5 text-[8px] font-black tracking-[.1em] text-red-300/55 transition hover:bg-red-400/[.06] hover:text-red-300"><Trash2 size={13}/> EXCLUIR CADERNO DA AULA</button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
