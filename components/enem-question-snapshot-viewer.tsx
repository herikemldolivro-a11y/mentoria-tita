"use client";

import { ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, Copy, Images, ListOrdered, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEnemQuestionSourceInfo,
  loadEnemQuestionSnapshotManifest,
  resolveEnemSnapshotLessonKey,
  sortEnemQuestionSnapshots,
  type EnemQuestionSnapshot,
} from "@/lib/enem-question-snapshots";
import { createClient } from "@/lib/supabase/client";

type SourceAudit = {
  label: string;
  loaded: number;
  total: number;
};

type EnemQuestionSnapshotViewerProps = {
  subjectSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  savedOnly?: boolean;
  embedded?: boolean;
  context?: "lesson" | "revision";
};

export function EnemQuestionSnapshotViewer({
  subjectSlug,
  lessonSlug,
  lessonTitle,
  savedOnly = false,
  embedded = false,
  context = "lesson",
}: EnemQuestionSnapshotViewerProps) {
  const lessonKey = useMemo(() => resolveEnemSnapshotLessonKey(subjectSlug, lessonTitle), [subjectSlug, lessonTitle]);
  const [questions, setQuestions] = useState<EnemQuestionSnapshot[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [sourceAudit, setSourceAudit] = useState<SourceAudit | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!lessonKey) {
      setErrorMessage("Ainda não existe uma lista visual classificada para esta aula.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const [{ data: auth }, manifest] = await Promise.all([
        supabase.auth.getUser(),
        loadEnemQuestionSnapshotManifest(),
      ]);

      const lessonQuestions = sortEnemQuestionSnapshots(manifest.filter((question) => question.lessonKey === lessonKey));
      const sourceSeed = lessonQuestions[0] ?? null;

      if (sourceSeed) {
        const source = getEnemQuestionSourceInfo(sourceSeed);
        const loaded = manifest.filter((item) => getEnemQuestionSourceInfo(item).source === source.source).length;
        setSourceAudit({ label: source.label, loaded, total: source.total });
      } else {
        setSourceAudit(null);
      }

      let saved = new Set<string>();

      if (auth.user) {
        const { data, error } = await supabase
          .from("user_enem_saved_questions")
          .select("question_id")
          .eq("user_id", auth.user.id)
          .eq("subject_slug", subjectSlug)
          .eq("lesson_slug", lessonSlug);
        if (error) throw error;
        saved = new Set((data ?? []).map((item) => item.question_id));
      }

      const visible = savedOnly ? lessonQuestions.filter((question) => saved.has(question.id)) : lessonQuestions;
      setSavedIds(saved);
      setQuestions(visible);
      setIndex((current) => Math.min(current, Math.max(visible.length - 1, 0)));
      setPickerOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as questões desta aula.");
    } finally {
      setLoading(false);
    }
  }, [lessonKey, lessonSlug, savedOnly, subjectSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setIndex((value) => Math.min(questions.length - 1, value + 1));
      if (event.key === "Escape") setPickerOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [questions.length]);

  const current = questions[index] ?? null;
  const isSaved = current ? savedIds.has(current.id) : false;
  const sourceInfo = current ? getEnemQuestionSourceInfo(current) : null;

  async function toggleSaved() {
    if (!current || saving) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Faça login para salvar questões para revisão.");

      if (isSaved) {
        const { error } = await supabase
          .from("user_enem_saved_questions")
          .delete()
          .eq("user_id", auth.user.id)
          .eq("question_id", current.id)
          .eq("lesson_slug", lessonSlug);
        if (error) throw error;
        setSavedIds((previous) => {
          const next = new Set(previous);
          next.delete(current.id);
          return next;
        });
        if (savedOnly) {
          setQuestions((previous) => previous.filter((question) => question.id !== current.id));
          setIndex((value) => Math.max(0, value - (index === questions.length - 1 ? 1 : 0)));
        }
      } else {
        const { error } = await supabase
          .from("user_enem_saved_questions")
          .upsert({
            user_id: auth.user.id,
            question_id: current.id,
            subject_slug: subjectSlug,
            lesson_slug: lessonSlug,
            lesson_title: lessonTitle,
          }, { onConflict: "user_id,question_id,lesson_slug" });
        if (error) throw error;
        setSavedIds((previous) => new Set(previous).add(current.id));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível alterar a questão salva.");
    } finally {
      setSaving(false);
    }
  }

  async function copyCurrentQuestionImage() {
    if (!current || copying) return;
    setCopying(true);
    setCopyMessage(null);
    setErrorMessage(null);

    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("Seu navegador não liberou cópia de imagem pela área de transferência.");
      }

      const image = new Image();
      image.src = current.sheet;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = current.w;
      canvas.height = current.h;
      const context2d = canvas.getContext("2d");
      if (!context2d) throw new Error("Não foi possível preparar a imagem desta questão.");

      context2d.fillStyle = "#ffffff";
      context2d.fillRect(0, 0, canvas.width, canvas.height);
      context2d.drawImage(
        image,
        current.x ?? 0,
        current.y,
        current.w,
        current.h,
        0,
        0,
        current.w,
        current.h,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Não foi possível gerar a imagem para copiar."));
        }, "image/png");
      });

      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyMessage("IMAGEM COPIADA");
      window.setTimeout(() => setCopyMessage(null), 1800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível copiar a imagem.");
    } finally {
      setCopying(false);
    }
  }

  function selectQuestion(questionIndex: number) {
    setIndex(questionIndex);
    setPickerOpen(false);
  }

  if (loading) {
    return <div className="grid min-h-[420px] place-items-center"><LoaderCircle className="animate-spin text-violet-300" size={26} /></div>;
  }

  const eyebrow = savedOnly
    ? "REVISÃO · QUESTÕES SALVAS"
    : context === "revision"
      ? "REVISÃO · LISTA COMPLETA DA AULA"
      : "LISTA VISUAL · SALVE O QUE QUER REVER";

  const description = savedOnly
    ? "Estas são as questões que você marcou durante o estudo. Use as setas ou selecione diretamente o número que quer rever."
    : context === "revision"
      ? "A mesma lista visual da aula fica disponível dentro da revisão. Use Selecionar questão para ir direto ao número desejado, sem passar uma por uma."
      : "Uma questão por vez, recortada diretamente da lista original. Use as setas, selecione diretamente o número desejado e marque com o favorito as questões que precisam reaparecer na revisão desta aula.";

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-5xl px-4 pb-24 pt-7 sm:px-6"}>
      {!embedded ? (
        <Link href="javascript:history.back()" onClick={(event) => { event.preventDefault(); history.back(); }} className="inline-flex min-h-10 items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]">
          <ArrowLeft size={15} /> VOLTAR PARA A AULA
        </Link>
      ) : null}

      <section className={`${embedded ? "mt-0" : "mt-4"} rounded-[30px] border border-violet-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(139,92,246,.16),transparent_35%),var(--surface)] p-5 sm:p-7`}>
        <span className="text-[9px] font-black tracking-[.16em] text-violet-300">{eyebrow}</span>
        <h1 className="mt-2 font-serif text-3xl text-[var(--ink)] sm:text-4xl">{lessonTitle}</h1>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">{description}</p>

        {sourceAudit ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.045] px-4 py-3 text-[9px] font-black tracking-[.06em] text-emerald-200/80">
            <CheckCircle2 size={14} className="text-emerald-300" />
            ORDEM VERIFICADA · {sourceAudit.label.toUpperCase()} · {sourceAudit.loaded}/{sourceAudit.total} IMAGENS PRESENTES
          </div>
        ) : null}
      </section>

      {errorMessage ? <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-300">{errorMessage}</div> : null}
      {copyMessage ? <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-center text-[10px] font-black tracking-[.1em] text-emerald-300">{copyMessage}</div> : null}

      {!current ? (
        <section className="mt-5 rounded-[28px] border border-dashed border-white/10 bg-white/[.02] p-8 text-center">
          <Images className="mx-auto text-white/25" size={30} />
          <h2 className="mt-4 font-serif text-2xl text-[var(--ink)]">{savedOnly ? "Nenhuma questão salva nesta aula." : "Lista visual ainda não instalada."}</h2>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-[var(--muted)]">
            {savedOnly ? "Quando você salvar uma questão durante a lista, ela aparece aqui automaticamente na revisão." : "Quando o pacote visual desta aula estiver instalado, as questões aparecem aqui automaticamente, inclusive dentro da revisão."}
          </p>
        </section>
      ) : (
        <section className="mt-5 overflow-hidden rounded-[30px] border border-[var(--border-strong)] bg-[#08090b]">
          <header className="flex flex-col gap-3 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <span className="text-[8px] font-black tracking-[.14em] text-white/35">{current.section}</span>
              <strong className="mt-1 block text-sm text-white">Questão {index + 1} de {questions.length} nesta aula</strong>
              {sourceInfo ? (
                <span className="mt-1 block text-[8px] font-bold text-white/30">
                  ORIGINAL · {sourceInfo.position}/{sourceInfo.total} NA LISTA {sourceInfo.label.toUpperCase()}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={copying} onClick={() => void copyCurrentQuestionImage()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] px-4 text-[9px] font-black tracking-[.08em] text-cyan-200 transition hover:border-cyan-200/35 disabled:opacity-50">
                {copying ? <LoaderCircle size={15} className="animate-spin" /> : <Copy size={15} />} COPIAR IMAGEM
              </button>
              <button type="button" onClick={() => setPickerOpen((value) => !value)} aria-expanded={pickerOpen} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black tracking-[.08em] transition ${pickerOpen ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-200" : "border-emerald-300/20 bg-emerald-300/[.05] text-emerald-200 hover:border-emerald-200/35"}`}>
                <ListOrdered size={15} /> SELECIONAR QUESTÃO
              </button>
              <button type="button" disabled={saving} onClick={() => void toggleSaved()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black tracking-[.08em] transition ${isSaved ? "border-violet-300/35 bg-violet-400/10 text-violet-200" : "border-white/[.12] bg-white/[.035] text-white/65 hover:border-violet-300/30"}`}>
                {saving ? <LoaderCircle size={15} className="animate-spin" /> : isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {isSaved ? "SALVA PARA REVISÃO" : "SALVAR PARA REVISÃO"}
              </button>
            </div>
          </header>

          {pickerOpen ? (
            <div className="border-b border-white/[.07] bg-[#0d0f12] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[8px] font-black tracking-[.14em] text-emerald-300">IR DIRETO PARA</span>
                  <strong className="mt-1 block text-sm text-white">Selecione o número da questão</strong>
                </div>
                <span className="rounded-lg border border-white/[.08] bg-white/[.03] px-2.5 py-1 text-[8px] font-black text-white/35">{questions.length} QUESTÕES</span>
              </div>
              <div className="mt-4 grid max-h-56 grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-10 md:grid-cols-12">
                {questions.map((question, questionIndex) => {
                  const active = questionIndex === index;
                  return (
                    <button
                      key={`${question.id}-picker`}
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => selectQuestion(questionIndex)}
                      className={`min-h-10 rounded-lg border text-[10px] font-black transition ${active ? "border-emerald-300/55 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,.08)]" : "border-white/[.09] bg-white/[.025] text-white/55 hover:border-emerald-300/30 hover:text-white"}`}
                    >
                      {questionIndex + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div
            className="select-none bg-white p-3 sm:p-6"
            title="Botão direito: copiar esta questão como imagem"
            onContextMenu={(event) => {
              event.preventDefault();
              void copyCurrentQuestionImage();
            }}
          >
            <div className="mb-2 text-center text-[8px] font-black tracking-[.1em] text-black/35">BOTÃO DIREITO = COPIAR ESTA QUESTÃO COMO IMAGEM</div>
            <svg viewBox={`0 ${current.y} ${current.w} ${current.h}`} role="img" aria-label={`Questão ${current.number}`} className="mx-auto block h-auto w-full max-w-[760px]">
              <image href={current.sheet} x="0" y="0" width={current.sheetW} height={current.sheetH} preserveAspectRatio="xMinYMin meet" />
            </svg>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-white/[.07] p-4 sm:p-5">
            <button type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[.10] px-4 text-[9px] font-black text-white/55 disabled:opacity-25">
              <ChevronLeft size={17} /> ANTERIOR
            </button>
            <div className="hidden text-center text-[8px] font-black tracking-[.1em] text-white/30 sm:block">SELECIONE O NÚMERO ACIMA OU USE AS SETAS · A ORDEM DA AULA É CONTÍNUA</div>
            <button type="button" disabled={index >= questions.length - 1} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[.10] px-4 text-[9px] font-black text-white/55 disabled:opacity-25">
              PRÓXIMA <ChevronRight size={17} />
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
