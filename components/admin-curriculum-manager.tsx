"use client";

import {
  BookOpen,
  CalendarPlus,
  Check,
  Clipboard,
  FileJson,
  FileText,
  Layers3,
  LoaderCircle,
  Plus,
  Save,
  School,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  importWeeklyMatrix,
  loadCurriculumCatalog,
  saveLesson,
  saveSubject,
  saveWeek,
  weeklyMatrixTemplate,
  type CurriculumCatalog,
} from "@/lib/curriculum-admin";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCurriculumManager() {
  const [catalog, setCatalog] = useState<CurriculumCatalog>({ plans: [], weeks: [], subjects: [], lessons: [] });
  const [tab, setTab] = useState<"week" | "subject" | "lesson" | "matrix">("week");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [planId, setPlanId] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [weekTitle, setWeekTitle] = useState("Semana 1");

  const [subjectName, setSubjectName] = useState("");
  const [subjectShortName, setSubjectShortName] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [subjectPosition, setSubjectPosition] = useState(1);

  const [lessonWeekId, setLessonWeekId] = useState("");
  const [lessonSubjectId, setLessonSubjectId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSlug, setLessonSlug] = useState("");
  const [lessonPriority, setLessonPriority] = useState("Alta");
  const [lessonPosition, setLessonPosition] = useState(1);
  const [lessonQuestions, setLessonQuestions] = useState(35);
  const [lessonTopics, setLessonTopics] = useState("");

  const [matrixText, setMatrixText] = useState("");
  const [copied, setCopied] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const next = await loadCurriculumCatalog();
      setCatalog(next);
      const firstPlan = planId || next.plans[0]?.id || "";
      setPlanId(firstPlan);
      const weeks = next.weeks.filter((week) => week.plan_id === firstPlan && week.active).sort((a,b) => a.week_number - b.week_number);
      const subjects = next.subjects.filter((subject) => subject.plan_id === firstPlan && subject.active).sort((a,b) => a.position - b.position);
      if (!lessonWeekId || !weeks.some((week) => week.id === lessonWeekId)) setLessonWeekId(weeks[0]?.id || "");
      if (!lessonSubjectId || !subjects.some((subject) => subject.id === lessonSubjectId)) setLessonSubjectId(subjects[0]?.id || "");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o cronograma.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const currentWeeks = useMemo(
    () => catalog.weeks.filter((week) => week.plan_id === planId).sort((a,b) => a.week_number - b.week_number),
    [catalog.weeks, planId],
  );
  const currentSubjects = useMemo(
    () => catalog.subjects.filter((subject) => subject.plan_id === planId).sort((a,b) => a.position - b.position),
    [catalog.subjects, planId],
  );

  const usedWeeks = new Set(currentWeeks.filter((week) => week.active).map((week) => week.week_number));
  const availableWeekNumbers = Array.from({ length: 52 }, (_, index) => index + 1)
    .filter((number) => !usedWeeks.has(number) || number === weekNumber);

  function changePlan(nextPlanId: string) {
    setPlanId(nextPlanId);
    const weeks = catalog.weeks.filter((week) => week.plan_id === nextPlanId && week.active).sort((a,b) => a.week_number - b.week_number);
    const subjects = catalog.subjects.filter((subject) => subject.plan_id === nextPlanId && subject.active).sort((a,b) => a.position - b.position);
    setLessonWeekId(weeks[0]?.id || "");
    setLessonSubjectId(subjects[0]?.id || "");
  }

  async function submitWeek(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      await saveWeek({ planId, weekNumber, title: weekTitle || `Semana ${weekNumber}` });
      setMessage(`Semana ${weekNumber} salva.`);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a semana.");
    } finally {
      setSaving(false);
    }
  }

  async function submitSubject(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const finalSlug = subjectSlug.trim() || slugify(subjectName);
      await saveSubject({
        planId,
        slug: finalSlug,
        shortName: subjectShortName.trim() || subjectName.toUpperCase(),
        name: subjectName,
        description: subjectDescription,
        position: subjectPosition,
      });
      setMessage(`${subjectName} adicionada. Ela já ficará disponível para aulas, banco de questões e matrizes.`);
      setSubjectName("");
      setSubjectShortName("");
      setSubjectSlug("");
      setSubjectDescription("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a matéria.");
    } finally {
      setSaving(false);
    }
  }

  async function submitLesson(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const finalSlug = lessonSlug.trim() || slugify(lessonTitle);
      await saveLesson({
        subjectId: lessonSubjectId,
        weekId: lessonWeekId,
        slug: finalSlug,
        title: lessonTitle,
        priority: lessonPriority,
        position: lessonPosition,
        questionCount: lessonQuestions,
        topics: lessonTopics.split(/\r?\n/).map((topic) => topic.trim()).filter(Boolean),
      });
      setMessage("Aula salva. Tópicos e quantidade da lista já estão valendo.");
      setLessonTitle("");
      setLessonSlug("");
      setLessonTopics("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a aula.");
    } finally {
      setSaving(false);
    }
  }

  async function copyMatrixTemplate() {
    await navigator.clipboard.writeText(weeklyMatrixTemplate);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function submitMatrix() {
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const parsed = JSON.parse(matrixText);
      const result = await importWeeklyMatrix(planId, parsed);
      setMessage(`Semana ${result.week_number} importada: ${result.subjects} matéria(s) e ${result.lessons} aula(s).`);
      setMatrixText("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Matriz inválida.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle className="animate-spin" size={18} /> CARREGANDO ESTRUTURA</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <label className="block text-[9px] font-black tracking-[.14em] text-[var(--muted)]">CONCURSO / PLANO
          <select value={planId} onChange={(event) => changePlan(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--ink)] outline-none sm:max-w-xl">
            {catalog.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.contest_sigla ? `${plan.contest_sigla} · ` : ""}{plan.name}</option>)}
          </select>
        </label>
      </section>

      <div className="flex flex-wrap gap-2">
        <Tab active={tab === "week"} onClick={() => setTab("week")} icon={CalendarPlus}>ADICIONAR SEMANA</Tab>
        <Tab active={tab === "subject"} onClick={() => setTab("subject")} icon={School}>ADICIONAR MATÉRIA</Tab>
        <Tab active={tab === "lesson"} onClick={() => setTab("lesson")} icon={BookOpen}>AULAS DA SEMANA</Tab>
        <Tab active={tab === "matrix"} onClick={() => setTab("matrix")} icon={Layers3}>MATRIZ SEMANAL</Tab>
      </div>

      {message ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/[.06] p-4 text-xs text-emerald-400"><Check size={15} /> {message}</div> : null}
      {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      {tab === "week" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={submitWeek} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">NOVA SEMANA</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Escolha o número da semana.</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">SEMANA
                <select value={weekNumber} onChange={(event) => { const value = Number(event.target.value); setWeekNumber(value); setWeekTitle(`Semana ${value}`); }} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--ink)]">
                  {availableWeekNumbers.map((number) => <option key={number} value={number}>Semana {number}</option>)}
                </select>
              </label>
              <TextField label="TÍTULO" value={weekTitle} onChange={setWeekTitle} placeholder={`Semana ${weekNumber}`} />
            </div>
            <button disabled={saving || !planId} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111] disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={15} /> : <Plus size={15} />} SALVAR SEMANA</button>
          </form>

          <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">SEMANAS CADASTRADAS</span>
            <div className="mt-4 grid gap-2">
              {currentWeeks.length ? currentWeeks.map((week) => (
                <div key={week.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                  <div><strong className="text-sm text-[var(--ink)]">{week.title}</strong><span className="mt-1 block text-[9px] text-[var(--muted)]">Semana {week.week_number}</span></div>
                  <span className="text-[9px] font-black text-emerald-400">{week.active ? "ATIVA" : "ARQUIVADA"}</span>
                </div>
              )) : <p className="text-xs text-[var(--muted)]">Nenhuma semana cadastrada.</p>}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "subject" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={submitSubject} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">NOVA MATÉRIA</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Adicione qualquer disciplina.</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextField label="NOME" value={subjectName} onChange={(value) => { setSubjectName(value); if (!subjectSlug) setSubjectSlug(slugify(value)); }} placeholder="Ex.: Matemática" />
              <TextField label="SIGLA" value={subjectShortName} onChange={setSubjectShortName} placeholder="Ex.: MATEMÁTICA" />
              <TextField label="SLUG" value={subjectSlug} onChange={setSubjectSlug} placeholder="matematica" />
              <NumberField label="POSIÇÃO" value={subjectPosition} onChange={setSubjectPosition} min={1} max={99} />
            </div>
            <label className="mt-4 block text-[9px] font-black tracking-[.12em] text-[var(--muted)]">DESCRIÇÃO
              <textarea value={subjectDescription} onChange={(event) => setSubjectDescription(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--ink)] outline-none" />
            </label>
            <button disabled={saving || !subjectName.trim()} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111] disabled:opacity-50"><Plus size={15} /> ADICIONAR MATÉRIA</button>
          </form>

          <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">MATÉRIAS DO PLANO</span>
            <div className="mt-4 grid gap-2">
              {currentSubjects.map((subject) => <div key={subject.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"><strong className="text-sm text-[var(--ink)]">{subject.name}</strong><span className="mt-1 block text-[9px] text-[var(--muted)]">{subject.short_name} · /{subject.slug}</span></div>)}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "lesson" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <form onSubmit={submitLesson} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">AULA / ASSUNTO</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Defina o que entra na semana.</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SelectField label="SEMANA" value={lessonWeekId} onChange={setLessonWeekId} options={currentWeeks.filter((week) => week.active).map((week) => ({ id: week.id, name: week.title }))} />
              <SelectField label="MATÉRIA" value={lessonSubjectId} onChange={setLessonSubjectId} options={currentSubjects.filter((subject) => subject.active).map((subject) => ({ id: subject.id, name: subject.name }))} />
              <TextField label="TÍTULO DA AULA" value={lessonTitle} onChange={(value) => { setLessonTitle(value); if (!lessonSlug) setLessonSlug(slugify(value)); }} placeholder="Ex.: Patrimônio e Situação Líquida" />
              <TextField label="SLUG" value={lessonSlug} onChange={setLessonSlug} placeholder="patrimonio-e-situacao-liquida" />
              <TextField label="PRIORIDADE" value={lessonPriority} onChange={setLessonPriority} placeholder="Muito alta" />
              <NumberField label="POSIÇÃO NA MATÉRIA" value={lessonPosition} onChange={setLessonPosition} min={1} max={99} />
              <NumberField label="QUESTÕES DA LISTA" value={lessonQuestions} onChange={setLessonQuestions} min={1} max={200} />
            </div>
            <label className="mt-4 block text-[9px] font-black tracking-[.12em] text-[var(--muted)]">TÓPICOS DA AULA · UM POR LINHA
              <textarea value={lessonTopics} onChange={(event) => setLessonTopics(event.target.value)} rows={8} placeholder={"conceito\nobjeto\nfinalidade\npatrimônio"} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-6 text-[var(--ink)] outline-none" />
            </label>
            <button disabled={saving || !lessonWeekId || !lessonSubjectId || !lessonTitle.trim()} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111] disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={15} /> : <Save size={15} />} SALVAR AULA</button>
          </form>

          <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">AULAS CADASTRADAS</span>
            <div className="mt-4 max-h-[760px] space-y-2 overflow-y-auto pr-1">
              {catalog.lessons
                .filter((lesson) => currentWeeks.some((week) => week.id === lesson.week_id) && currentSubjects.some((subject) => subject.id === lesson.subject_id))
                .map((lesson) => {
                  const week = currentWeeks.find((item) => item.id === lesson.week_id);
                  const subject = currentSubjects.find((item) => item.id === lesson.subject_id);
                  return (
                    <article key={lesson.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                      <span className="text-[8px] font-black tracking-[.12em] text-[var(--gold-bright)]">{week?.title} · {subject?.short_name}</span>
                      <strong className="mt-1 block text-sm text-[var(--ink)]">{lesson.title}</strong>
                      <span className="mt-2 block text-[9px] text-[var(--muted)]">{lesson.question_count} questões na lista · {lesson.active_questions} no banco · {lesson.topics.length} tópicos</span>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/admin/conteudos?lesson=${lesson.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[8px] font-black text-[var(--gold-bright)]"><FileText size={13} /> PDF / MATERIAL</Link>
                        <Link href="/admin/questoes" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[8px] font-black text-[var(--muted)]">QUESTÕES</Link>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "matrix" ? (
        <section className="rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">MATRIZ SEMANAL</span>
              <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Cole uma semana inteira de uma vez.</h2>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">O modelo cria a semana, reaproveita matérias existentes, cria matérias novas, adiciona aulas, tópicos e a quantidade de questões de cada lista.</p>
            </div>
            <button type="button" onClick={copyMatrixTemplate} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)]"><Clipboard size={14} /> {copied ? "COPIADO" : "COPIAR MODELO DA MATRIZ"}</button>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
            <div>
              <textarea value={matrixText} onChange={(event) => setMatrixText(event.target.value)} rows={25} spellCheck={false} placeholder={weeklyMatrixTemplate} className="w-full rounded-2xl border border-[var(--border)] bg-[#090a0c] p-4 font-mono text-xs leading-6 text-white/85 outline-none focus:border-[var(--border-strong)]" />
              <button type="button" onClick={submitMatrix} disabled={saving || !matrixText.trim()} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111] disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <FileJson size={16} />} VALIDAR E IMPORTAR MATRIZ</button>
            </div>
            <aside className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
              <span className="text-[9px] font-black tracking-[.14em] text-[var(--gold-bright)]">COMO PREENCHER</span>
              <div className="mt-4 space-y-3 text-xs leading-6 text-[var(--muted)]">
                <p><strong className="text-[var(--ink)]">semana:</strong> número da semana.</p>
                <p><strong className="text-[var(--ink)]">materias:</strong> matérias que terão aulas naquela semana.</p>
                <p><strong className="text-[var(--ink)]">aulas:</strong> cada aula-mãe/assunto que será liberado.</p>
                <p><strong className="text-[var(--ink)]">questoes_lista:</strong> quantidade que o aluno receberá na lista daquela aula.</p>
                <p><strong className="text-[var(--ink)]">topicos:</strong> tópicos que compõem a aula e aparecem na revisão.</p>
                <p>Se entrar uma matéria nova como <strong className="text-[var(--ink)]">Matemática</strong>, ela passa a existir também nos filtros do Banco de Questões.</p>
              </div>
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Plus; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[9px] font-black tracking-[.1em]" style={{ borderColor: active ? "rgba(210,166,78,.5)" : "var(--border)", background: active ? "rgba(210,166,78,.08)" : "var(--surface)", color: active ? "var(--gold-bright)" : "var(--muted)" }}><Icon size={14} /> {children}</button>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)]" /></label>;
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) {
  return <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">{label}<input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }> }) {
  return <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none">{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}
