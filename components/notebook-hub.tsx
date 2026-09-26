"use client";

import { ArrowRight, CalendarClock, LoaderCircle, NotebookPen, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NotebookManagerModal } from "@/components/lesson-notebook-dock";
import {
  formatNotebookDate,
  isNotebookDue,
  listenNotebookUpdated,
  loadNotebookHub,
  notebookTodayKey,
  type LessonNotebookHub,
} from "@/lib/notebook-system";

type Tab = "today" | "all" | "draft";

export function NotebookHub() {
  const [hub, setHub] = useState<LessonNotebookHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("today");
  const [subjectId, setSubjectId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await loadNotebookHub();
      setHub(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar seus cadernos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const unlisten = listenNotebookUpdated(() => void refresh());
    return unlisten;
  }, []);

  const selectedSubject = hub?.taxonomy.subjects.find((subject) => subject.id === subjectId) ?? null;
  const selectedLesson = selectedSubject?.lessons.find((lesson) => lesson.id === lessonId) ?? null;
  const today = notebookTodayKey();
  const due = useMemo(() => (hub?.notebooks ?? []).filter((item) => isNotebookDue(item, today)), [hub, today]);

  const visible = useMemo(() => {
    const notebooks = hub?.notebooks ?? [];
    if (tab === "today") return notebooks.filter((item) => isNotebookDue(item, today));
    if (tab === "draft") return notebooks.filter((item) => item.status === "draft");
    return notebooks;
  }, [hub, tab, today]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-amber-300/18 bg-[radial-gradient(circle_at_85%_0%,rgba(245,190,64,.2),transparent_38%),linear-gradient(145deg,#121009,#09090c_72%)] p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-amber-300"><NotebookPen size={15}/> SISTEMA DE APRENDIZAGEM ATIVA</span>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="font-serif text-4xl tracking-[-.04em] sm:text-5xl">Seus cadernos por aula.</h2><p className="mt-3 max-w-3xl text-xs leading-6 text-white/45">Crie frente e verso do seu jeito. A revisão acontece por bloco da aula: +2 dias, +4, +7 e depois +15 dias continuamente.</p></div>
          <div className="min-w-[190px] rounded-2xl border border-amber-300/18 bg-amber-300/[.06] p-4"><span className="text-[8px] font-black tracking-[.16em] text-amber-300">DISPONÍVEIS HOJE</span><strong className="mt-1 block font-serif text-4xl">{due.length}</strong><span className="text-[9px] text-white/38">caderno{due.length === 1 ? "" : "s"} para revisar</span></div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <span className="text-[8px] font-black tracking-[.16em] text-violet-400">ABRIR / CRIAR POR AULA</span>
        <h3 className="mt-2 font-serif text-2xl text-[var(--ink)]">Escolha a aula e continue o mesmo caderno.</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1.35fr_auto]">
          <label className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">MATÉRIA<select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setLessonId(""); }} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none"><option value="">Selecione...</option>{(hub?.taxonomy.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">AULA<select disabled={!subjectId} value={lessonId} onChange={(event) => setLessonId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none disabled:opacity-45"><option value="">{subjectId ? "Selecione a aula..." : "Escolha a matéria"}</option>{(selectedSubject?.lessons ?? []).map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
          <button type="button" disabled={!selectedLesson} onClick={() => setManagerOpen(true)} className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[9px] font-black tracking-[.1em] text-[#111] disabled:opacity-35"><Plus size={15}/> ABRIR CADERNO</button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {[{value:"today",label:`HOJE · ${due.length}`},{value:"all",label:`TODOS · ${hub?.notebooks.length ?? 0}`},{value:"draft",label:"EM CONSTRUÇÃO"}].map((item) => <button key={item.value} type="button" onClick={() => setTab(item.value as Tab)} className={`rounded-full border px-4 py-2 text-[9px] font-black tracking-[.1em] ${tab === item.value ? "border-amber-300/35 bg-amber-300/[.08] text-[var(--gold-bright)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{item.label}</button>)}
      </div>

      {errorMessage ? <div className="rounded-2xl border border-red-500/25 bg-red-500/[.07] p-4 text-xs text-red-400">{errorMessage}</div> : null}
      {loading ? <div className="grid min-h-48 place-items-center text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={16}/> CARREGANDO CADERNOS</span></div> : null}

      {!loading && !visible.length ? <section className="rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-14 text-center"><NotebookPen className="mx-auto text-[var(--gold-bright)]" size={28}/><h3 className="mt-4 font-serif text-3xl text-[var(--ink)]">{tab === "today" ? "0 disponíveis hoje." : "Nenhum caderno aqui ainda."}</h3><p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-[var(--muted)]">{tab === "today" ? "Quando um bloco chegar à data programada, a aula aparecerá aqui automaticamente." : "Escolha uma matéria e uma aula acima para criar o primeiro."}</p></section> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map((notebook) => (
          <article key={notebook.id} className="group rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--border-strong)] sm:p-6">
            <div className="flex items-start justify-between gap-4"><div className="min-w-0"><span className="text-[8px] font-black tracking-[.15em] text-violet-400">{notebook.subject_name}</span><h3 className="mt-2 font-serif text-2xl leading-tight text-[var(--ink)]">{notebook.lesson_title}</h3></div><span className={`rounded-full border px-3 py-2 text-[7px] font-black tracking-[.08em] ${isNotebookDue(notebook) ? "border-fuchsia-400/25 bg-fuchsia-400/[.06] text-fuchsia-400" : notebook.status === "active" ? "border-emerald-400/20 bg-emerald-400/[.05] text-emerald-400" : "border-white/10 text-[var(--muted)]"}`}>{isNotebookDue(notebook) ? "REVISAR HOJE" : notebook.status === "active" ? "ATIVO" : "RASCUNHO"}</span></div>
            <div className="mt-5 grid grid-cols-3 gap-2"><MiniStat label="FLASHCARDS" value={String(notebook.card_count)}/><MiniStat label="ERROS PRIORITÁRIOS" value={String(notebook.incorrect_count)}/><MiniStat label="PRÓXIMA" value={notebook.status === "active" ? formatNotebookDate(notebook.next_review_on).slice(0,5) : "—"}/></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {notebook.card_count ? <Link href={`/caderno/${notebook.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[.055] text-[9px] font-black tracking-[.1em] text-violet-400">REVISAR CADERNO <ArrowRight size={14}/></Link> : <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[9px] font-black text-[var(--muted)]">SEM FLASHCARDS</span>}
              <button type="button" onClick={() => { setSubjectId(notebook.subject_id); setLessonId(notebook.lesson_id); setManagerOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.045] text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)]"><Plus size={14}/> EDITAR / ADICIONAR</button>
            </div>
          </article>
        ))}
      </div>

      {selectedLesson ? <NotebookManagerModal open={managerOpen} onClose={() => setManagerOpen(false)} lessonId={selectedLesson.id} lessonTitle={selectedLesson.title} subjectName={selectedSubject?.name ?? null} contextLabel="CENTRAL DE CADERNOS"/> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><span className="block text-[7px] font-black tracking-[.11em] text-[var(--muted)]">{label}</span><strong className="mt-1 block font-serif text-xl text-[var(--ink)]">{value}</strong></div>;
}
