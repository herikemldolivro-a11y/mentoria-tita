"use client";

import {
  ArrowLeft,
  BookOpenCheck,
  CalendarClock,
  Check,
  Eye,
  LoaderCircle,
  NotebookPen,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
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
  loadNotebookByLesson,
  updateNotebookCard,
  type LessonNotebookCard,
  type LessonNotebookDetail,
} from "@/lib/notebook-system";

type EditorStep = "list" | "front" | "back" | "preview";

export function NotebookLessonWorkspace({ lessonId }: { lessonId: string }) {
  const [notebook, setNotebook] = useState<LessonNotebookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<EditorStep>("list");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [previewCard, setPreviewCard] = useState<LessonNotebookCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  async function refresh(createIfMissing = false) {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (createIfMissing) await ensureLessonNotebook(lessonId);
      const detail = await loadNotebookByLesson(lessonId);
      if (!detail) throw new Error("O caderno desta aula não foi encontrado.");
      setNotebook(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o caderno.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(true);
  }, [lessonId]);

  function beginNewCard() {
    setEditingCardId(null);
    setFront("");
    setBack("");
    setPreviewCard(null);
    setRevealed(false);
    setMessage(null);
    setStep("front");
  }

  function beginEditCard(card: LessonNotebookCard) {
    setEditingCardId(card.id);
    setFront(card.front);
    setBack(card.back);
    setPreviewCard(null);
    setRevealed(false);
    setMessage(null);
    setStep("front");
  }

  async function saveCard() {
    if (!front.trim() || !back.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const card = editingCardId
        ? await updateNotebookCard(editingCardId, front, back)
        : await createNotebookCard(lessonId, front, back);
      setPreviewCard(card);
      setRevealed(false);
      await refresh();
      setStep("preview");
      setMessage(editingCardId ? "Flashcard atualizado com sucesso." : null);
      setEditingCardId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o flashcard.");
    } finally {
      setBusy(false);
    }
  }

  async function finalizeNotebook() {
    if (!notebook || busy) return;
    setBusy(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const result = await activateLessonNotebook(notebook.id);
      await refresh();
      setMessage(result.next_review_on ? `Caderno finalizado. Ele acompanha a revisão da aula; próxima revisão do caderno em ${formatNotebookDate(result.next_review_on)}.` : "Caderno finalizado. Quando você agendar a revisão da aula, o caderno será colocado automaticamente 1 dia antes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível finalizar o caderno.");
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível excluir o flashcard.");
    } finally {
      setBusy(false);
    }
  }

  async function removeNotebook() {
    if (!notebook || !window.confirm("Excluir o caderno inteiro desta aula? Esta ação apaga todos os flashcards e o histórico.")) return;
    setBusy(true);
    try {
      await deleteLessonNotebook(notebook.id);
      window.location.href = "/caderno";
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível excluir o caderno.");
      setBusy(false);
    }
  }

  if (loading && !notebook) {
    return (
      <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10">
        <div className="grid min-h-64 place-items-center text-center">
          <div>
            <LoaderCircle className="mx-auto animate-spin text-[var(--gold-bright)]" size={28}/>
            <strong className="mt-4 block font-serif text-2xl text-[var(--ink)]">Abrindo o caderno da aula...</strong>
            <p className="mt-2 text-xs text-[var(--muted)]">Agora ele abre numa página própria. Se houver demora, o sistema mostra o erro em vez de ficar travado.</p>
          </div>
        </div>
      </section>
    );
  }

  if (errorMessage && !notebook) {
    return (
      <section className="rounded-[30px] border border-red-500/25 bg-red-500/[.06] p-7 text-center sm:p-10">
        <NotebookPen className="mx-auto text-red-300" size={30}/>
        <h2 className="mt-4 font-serif text-3xl text-[var(--ink)]">Não consegui abrir este caderno.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-red-300/80">{errorMessage}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => void refresh(true)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111]">TENTAR NOVAMENTE</button>
          <Link href="/caderno" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 text-[10px] font-black tracking-[.1em] text-[var(--muted)]">VOLTAR AOS CADERNOS</Link>
        </div>
      </section>
    );
  }

  if (!notebook) return null;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[32px] border border-amber-300/18 bg-[radial-gradient(circle_at_85%_0%,rgba(245,190,64,.18),transparent_38%),linear-gradient(145deg,#121009,#09090c_72%)] text-white">
        <div className="p-6 sm:p-8">
          <Link href="/caderno" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-white/45"><ArrowLeft size={14}/> VOLTAR AOS CADERNOS</Link>
          <span className="mt-6 block text-[8px] font-black tracking-[.18em] text-amber-300"><Sparkles className="mr-2 inline" size={13}/> CADERNO DA AULA</span>
          <h1 className="mt-2 font-serif text-3xl tracking-[-.03em] sm:text-5xl">{notebook.lesson_title}</h1>
          <p className="mt-2 text-xs text-white/45">{notebook.subject_name}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[8px] font-black tracking-[.09em]">
            <span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-3 py-2 text-amber-200">{notebook.card_count} FLASHCARD{notebook.card_count === 1 ? "" : "S"}</span>
            <span className={`rounded-full border px-3 py-2 ${notebook.status === "active" ? "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-300" : "border-white/10 bg-white/[.03] text-white/40"}`}>{notebook.status === "active" ? "CADERNO ATIVO" : "EM CONSTRUÇÃO"}</span>
            {notebook.status === "active" ? <span className={`rounded-full border px-3 py-2 ${isNotebookDue(notebook) ? "border-fuchsia-300/25 bg-fuchsia-300/[.08] text-fuchsia-300" : "border-violet-300/20 bg-violet-300/[.05] text-violet-300"}`}>{isNotebookDue(notebook) ? "REVISÃO DISPONÍVEL" : `PRÓXIMA · ${formatNotebookDate(notebook.next_review_on)}`}</span> : null}
          </div>
        </div>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-xs leading-6 text-emerald-300">{message}</div> : null}
      {errorMessage ? <div className="rounded-2xl border border-red-500/25 bg-red-500/[.07] p-4 text-xs leading-6 text-red-400">{errorMessage}</div> : null}

      <section className="rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-7">
        {step === "front" ? (
          <div>
            <button type="button" onClick={() => setStep("list")} className="mb-5 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> VOLTAR</button>
            <span className="block text-[8px] font-black tracking-[.18em] text-[var(--gold-bright)]">PASSO 1 · FRENTE</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">{editingCardId ? "Editar a frente da anotação" : "O que você quer lembrar?"}</h2>
            <textarea autoFocus value={front} onChange={(event) => setFront(event.target.value)} placeholder="Ex.: Qual é a diferença entre anulação e revogação?" className="mt-5 min-h-44 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-7 text-[var(--ink)] outline-none transition focus:border-amber-300/35" />
            <button type="button" disabled={!front.trim()} onClick={() => setStep("back")} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.12em] text-[#111] disabled:opacity-35">{editingCardId ? "FRENTE EDITADA" : "FRENTE PRONTA"}</button>
          </div>
        ) : null}

        {step === "back" ? (
          <div>
            <button type="button" onClick={() => setStep("front")} className="mb-5 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><ArrowLeft size={14}/> EDITAR FRENTE</button>
            <span className="block text-[8px] font-black tracking-[.18em] text-violet-400">PASSO 2 · VERSO</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">{editingCardId ? "Atualize a explicação." : "Agora explique do seu jeito."}</h2>
            <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4 text-xs leading-6 text-[var(--ink)]"><strong className="block text-[8px] tracking-[.12em] text-[var(--gold-bright)]">FRENTE</strong>{front}</div>
            <textarea autoFocus value={back} onChange={(event) => setBack(event.target.value)} placeholder="Escreva sua explicação..." className="mt-4 min-h-52 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-7 text-[var(--ink)] outline-none transition focus:border-violet-300/35" />
            <button type="button" disabled={!back.trim() || busy} onClick={() => void saveCard()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-[10px] font-black tracking-[.12em] text-white disabled:opacity-35">{busy ? <LoaderCircle className="animate-spin" size={16}/> : <Check size={16}/>} {editingCardId ? "SALVAR EDIÇÃO" : "SALVAR FLASHCARD"}</button>
          </div>
        ) : null}

        {step === "preview" && previewCard ? (
          <div>
            <span className="block text-center text-[8px] font-black tracking-[.18em] text-emerald-400">{message ? "FLASHCARD ATUALIZADO · TESTE AGORA" : "FLASHCARD SALVO · TESTE AGORA"}</span>
            <button type="button" onClick={() => setRevealed((value) => !value)} className="mt-5 w-full rounded-[26px] border border-[var(--border-strong)] bg-[var(--background)] p-7 text-left">
              <span className="text-[8px] font-black tracking-[.16em] text-[var(--gold-bright)]">FRENTE</span>
              <strong className="mt-4 block font-serif text-2xl leading-tight text-[var(--ink)]">{previewCard.front}</strong>
              {!revealed ? <span className="mt-8 inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><Eye size={15}/> TOQUE PARA REVELAR O VERSO</span> : <div className="mt-7 border-t border-[var(--border)] pt-6"><span className="text-[8px] font-black tracking-[.16em] text-violet-400">VERSO</span><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ink)]/80">{previewCard.back}</p></div>}
            </button>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={beginNewCard} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[.06] text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]"><Plus size={16}/> ADICIONAR OUTRO</button>
              <button type="button" onClick={() => setStep("list")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-[10px] font-black tracking-[.1em] text-[var(--muted)]">VOLTAR AO CADERNO</button>
            </div>
          </div>
        ) : null}

        {step === "list" ? (
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={beginNewCard} className="rounded-2xl border border-amber-300/22 bg-amber-300/[.055] p-4 text-left transition hover:border-amber-200/45">
                <Plus className="text-[var(--gold-bright)]" size={20}/>
                <strong className="mt-3 block font-serif text-xl text-[var(--ink)]">Novo flashcard</strong>
                <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">Frente primeiro. Depois você escreve a explicação no verso.</span>
              </button>
              {notebook.card_count > 0 ? (
                <Link href={`/caderno/${notebook.id}`} className="rounded-2xl border border-violet-300/22 bg-violet-300/[.05] p-4 text-left transition hover:border-violet-200/40">
                  <BookOpenCheck className="text-violet-400" size={20}/>
                  <strong className="mt-3 block font-serif text-xl text-[var(--ink)]">Revisar agora</strong>
                  <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">Erros anteriores primeiro; depois, os flashcards mais antigos.</span>
                </Link>
              ) : <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-xs leading-6 text-[var(--muted)]">Seu caderno ainda está vazio. Crie o primeiro flashcard.</div>}
            </div>

            {notebook.status === "draft" && notebook.card_count > 0 ? (
              <button type="button" disabled={busy} onClick={() => void finalizeNotebook()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-[10px] font-black tracking-[.12em] text-[#07130d] disabled:opacity-40"><CalendarClock size={16}/> FINALIZAR CADERNO · ACOMPANHAR REVISÕES</button>
            ) : null}

            <div className="mt-7 border-t border-[var(--border)] pt-6">
              <span className="text-[8px] font-black tracking-[.15em] text-[var(--muted)]">FLASHCARDS DA AULA</span>
              <h3 className="mt-1 font-serif text-2xl text-[var(--ink)]">{notebook.card_count ? `${notebook.card_count} anotação${notebook.card_count === 1 ? "" : "ões"}` : "Caderno vazio"}</h3>
              <div className="mt-4 space-y-2">
                {notebook.cards.map((card) => (
                  <article key={card.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1"><span className="text-[8px] font-black tracking-[.12em] text-[var(--gold-bright)]">FLASHCARD {card.position}</span><strong className="mt-1 block text-sm leading-6 text-[var(--ink)]">{card.front}</strong><p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{card.back}</p></div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" disabled={busy} onClick={() => beginEditCard(card)} className="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/18 text-amber-400/80 transition hover:bg-amber-300/[.08]"><PencilLine size={14}/></button>
                        <button type="button" disabled={busy} onClick={() => void removeCard(card.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-red-400/15 text-red-400/70 transition hover:bg-red-400/10"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    {card.last_result !== null ? <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.08em] ${card.last_result ? "border-emerald-300/15 text-emerald-400" : "border-red-300/15 text-red-400"}`}>{card.last_result ? `ÚLTIMA: ACERTOU · ${card.consecutive_correct} SEGUIDA(S)` : "ÚLTIMA: ERROU · PRIORIDADE ALTA"}</span> : null}
                  </article>
                ))}
              </div>
            </div>

            <button type="button" disabled={busy} onClick={() => void removeNotebook()} className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-400/15 px-3.5 text-[8px] font-black tracking-[.1em] text-red-400/70 transition hover:bg-red-400/[.06]"><Trash2 size={13}/> EXCLUIR CADERNO DA AULA</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
