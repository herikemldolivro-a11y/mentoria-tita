"use client";

import { ChevronLeft, ChevronRight, Filter, LoaderCircle, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/question-card";
import {
  loadQuestionBankPage,
  loadStudyTaxonomy,
  setQuestionMark,
  submitBankAnswer,
  type QuestionBankPage,
  type QuestionStatusFilter,
  type StudyTaxonomy,
} from "@/lib/question-bank";

const statusChips: Array<{ value: QuestionStatusFilter; label: string }> = [
  { value: "all", label: "TODAS" },
  { value: "resolved", label: "RESOLVIDAS" },
  { value: "unresolved", label: "NÃO RESOLVIDAS" },
  { value: "correct", label: "ACERTEI" },
  { value: "incorrect", label: "ERREI" },
  { value: "starred", label: "DESTACADAS" },
  { value: "review", label: "PARA REVISAR" },
];

const emptyPage: QuestionBankPage = { items: [], total: 0, page: 1, page_size: 20 };

export function QuestionBank({ initialStatus = "all" }: { initialStatus?: QuestionStatusFilter }) {
  const [taxonomy, setTaxonomy] = useState<StudyTaxonomy | null>(null);
  const [data, setData] = useState<QuestionBankPage>(emptyPage);
  const [status, setStatus] = useState<QuestionStatusFilter>(initialStatus);
  const [subjectId, setSubjectId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [level, setLevel] = useState("");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSubject = taxonomy?.subjects.find((subject) => subject.id === subjectId) ?? null;
  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size));

  useEffect(() => {
    loadStudyTaxonomy().then(setTaxonomy).catch((error) => setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os filtros."));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      loadQuestionBankPage({
        status,
        subjectId: subjectId || undefined,
        lessonId: lessonId || undefined,
        level: level ? Number(level) : undefined,
        keyword: appliedKeyword,
        page,
      }).then((result) => {
        if (!active) return;
        setData(result);
        setErrorMessage(null);
      }).catch((error) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as questões.");
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [status, subjectId, lessonId, level, appliedKeyword, page]);

  const rangeLabel = useMemo(() => {
    if (!data.total) return "0 questões";
    const start = (data.page - 1) * data.page_size + 1;
    const end = Math.min(data.total, start + data.items.length - 1);
    return `${start}–${end} de ${data.total}`;
  }, [data]);

  function resetFilters() {
    setStatus("all");
    setSubjectId("");
    setLessonId("");
    setLevel("");
    setKeyword("");
    setAppliedKeyword("");
    setPage(1);
  }

  async function toggleQuestionMark(questionId: string, mark: "starred" | "review", value: boolean) {
    const next = await setQuestionMark(questionId, mark, value);
    setData((current) => ({
      ...current,
      items: current.items.map((item) => item.id === questionId ? { ...item, ...next } : item),
    }));
    return next;
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
        <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-[var(--border)] bg-[#0a0b0d] px-5 text-left text-white sm:pointer-events-none">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.18em]"><SlidersHorizontal size={16} className="text-[#d2a64e]" /> FILTROS</span>
          <Filter size={16} className="sm:hidden" />
        </button>

        <div className={`${filtersOpen ? "block" : "hidden"} space-y-5 p-4 sm:block sm:p-5`}>
          <div className="flex flex-wrap gap-2">
            {statusChips.map((chip) => (
              <button key={chip.value} type="button" onClick={() => { setStatus(chip.value); setPage(1); }} className="rounded-full border px-3.5 py-2 text-[9px] font-black tracking-[.1em] transition" style={{ borderColor: status === chip.value ? "rgba(210,166,78,.55)" : "var(--border)", background: status === chip.value ? "rgba(210,166,78,.1)" : "var(--background)", color: status === chip.value ? "var(--gold-bright)" : "var(--muted)" }}>{chip.label}</button>
            ))}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); setAppliedKeyword(keyword); setPage(1); }} className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Palavra-chave</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Palavra-chave no enunciado" className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--border-strong)]" />
            </label>
            <button className="min-h-12 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111]">BUSCAR</button>
          </form>

          <div className="grid gap-3 md:grid-cols-3">
            <FilterSelect label="MATÉRIA" value={subjectId} onChange={(value) => { setSubjectId(value); setLessonId(""); setPage(1); }} options={(taxonomy?.subjects ?? []).map((subject) => ({ value: subject.id, label: subject.name }))} empty="Todas as matérias" />
            <FilterSelect label="ASSUNTO" value={lessonId} onChange={(value) => { setLessonId(value); setPage(1); }} options={(selectedSubject?.lessons ?? []).map((lesson) => ({ value: lesson.id, label: lesson.title }))} empty={subjectId ? "Todos os assuntos" : "Selecione a matéria"} disabled={!subjectId} />
            <FilterSelect label="NÍVEL" value={level} onChange={(value) => { setLevel(value); setPage(1); }} options={[1,2,3,4].map((value) => ({ value: String(value), label: `Nível ${value}` }))} empty="Todos os níveis" />
          </div>

          <button type="button" onClick={resetFilters} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 text-[9px] font-black tracking-[.1em] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"><RotateCcw size={14} /> LIMPAR FILTROS</button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 px-1 text-[10px] font-bold text-[var(--muted)]"><span>{rangeLabel}</span>{loading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={14} /> CARREGANDO</span> : null}</div>

      {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      {!loading && data.items.length === 0 ? (
        <section className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-16 text-center"><strong className="font-serif text-2xl text-[var(--ink)]">Nenhuma questão encontrada.</strong><p className="mt-2 text-xs leading-6 text-[var(--muted)]">Ajuste os filtros ou aguarde o administrador publicar questões para o seu plano.</p></section>
      ) : null}

      <div className="space-y-4">
        {data.items.map((question, index) => (
          <QuestionCard key={question.id} question={question} number={(data.page - 1) * data.page_size + index + 1} onAnswer={(answer) => submitBankAnswer(question.id, answer)} onToggleMark={(mark, value) => toggleQuestionMark(question.id, mark, value)} />
        ))}
      </div>

      {data.total > data.page_size ? (
        <nav className="flex items-center justify-center gap-3 pt-3" aria-label="Paginação das questões">
          <button type="button" disabled={page <= 1 || loading} onClick={() => { setPage((value) => Math.max(1, value - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.08em] text-[var(--muted)] disabled:opacity-40"><ChevronLeft size={15} /> ANTERIOR</button>
          <span className="text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]">{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => { setPage((value) => Math.min(totalPages, value + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.08em] text-[var(--muted)] disabled:opacity-40">PRÓXIMA <ChevronRight size={15} /></button>
        </nav>
      ) : null}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, empty, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; empty: string; disabled?: boolean }) {
  return <label className="text-[9px] font-black tracking-[.13em] text-[var(--muted)]">{label}<select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)] disabled:opacity-50"><option value="">{empty}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
