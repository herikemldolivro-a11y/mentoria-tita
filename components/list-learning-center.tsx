"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Layers3,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  loadListLearningHub,
  scheduleListReview,
  startListReview,
  startPracticeList,
  startScheduledLeveling,
  type ListCatalogRow,
  type ListLearningHub,
  type ListReviewRow,
  type ListLevelingRow,
  type PracticeListState,
} from "@/lib/list-review-system";
import { listenStudyUpdated } from "@/lib/study-database";

type View = "schedule" | "calendar";
const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export function ListLearningCenter() {
  const router = useRouter();
  const [data, setData] = useState<ListLearningHub | null>(null);
  const [view, setView] = useState<View>("schedule");
  const [week, setWeek] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [editing, setEditing] = useState<ListReviewRow | null>(null);
  const [dateDraft, setDateDraft] = useState("");

  async function refresh() {
    const next = await loadListLearningHub();
    setData(next);
    const nextWeeks = [...new Set(next.catalog.map((row) => row.week_number))].sort((a, b) => a - b);
    setWeek((current) => current ?? nextWeeks[0] ?? 1);
  }

  useEffect(() => {
    let alive = true;
    const run = () => refresh().catch((error) => alive && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as listas."));
    void run();
    const unlisten = listenStudyUpdated(() => void run());
    return () => { alive = false; unlisten(); };
  }, []);

  const weeks = useMemo(() => [...new Set(data?.catalog.map((row) => row.week_number) ?? [])].sort((a, b) => a - b), [data]);
  const weekRows = useMemo(() => data?.catalog.filter((row) => row.week_number === week) ?? [], [data, week]);
  const days = useMemo(() => [...new Set(weekRows.map((row) => row.day_number))].sort((a, b) => a - b), [weekRows]);
  const dayRows = useMemo(() => weekRows.filter((row) => row.day_number === day), [weekRows, day]);
  const subjects = useMemo(() => [...new Set(dayRows.map((row) => row.subject_name))].sort((a, b) => a.localeCompare(b, "pt-BR")), [dayRows]);
  const visibleLessons = useMemo(() => dayRows.filter((row) => row.subject_name === subject), [dayRows, subject]);

  useEffect(() => {
    if (!days.length) { setDay(null); setSubject(null); return; }
    if (day === null || !days.includes(day)) setDay(days[0]);
  }, [days, day]);

  useEffect(() => {
    if (!subjects.length) { setSubject(null); return; }
    if (!subject || !subjects.includes(subject)) setSubject(subjects[0]);
  }, [subjects, subject]);

  function chooseWeek(value: number) {
    setWeek(value);
    setDay(null);
    setSubject(null);
    setErrorMessage(null);
  }

  function chooseDay(value: number) {
    setDay(value);
    setSubject(null);
    setErrorMessage(null);
  }

  async function openPractice(row: ListCatalogRow, list: PracticeListState) {
    if (busy || !list.unlocked) return;
    const key = `${row.lesson_id}:${list.list_number}`;
    setBusy(key);
    setErrorMessage(null);
    try {
      if (list.attempt_id) {
        router.push(`/questoes/lista/${list.attempt_id}`);
        return;
      }
      const result = await startPracticeList(row.lesson_id, list.list_number);
      if (!result.ok || !result.attempt_id) {
        if (result.reason === "previous_list") throw new Error(`Conclua a Lista ${result.required_previous ?? list.list_number - 1} antes de liberar esta.`);
        if (result.reason === "no_questions") throw new Error("Ainda não há questões disponíveis para esta aula. Assim que forem adicionadas, a Lista 1 ficará liberada automaticamente.");
        if (result.reason === "not_enough_new") throw new Error(`A próxima lista precisa de ${result.required_count ?? list.target_size} questões novas. No momento há ${result.available_count ?? 0}.`);
        throw new Error("A lista ainda não pôde ser montada. Atualize a página e tente novamente.");
      }
      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível iniciar a lista.");
    } finally {
      setBusy(null);
    }
  }

  async function saveReview() {
    if (!editing || !dateDraft || busy) return;
    setBusy(editing.id);
    setErrorMessage(null);
    try {
      await scheduleListReview(editing.id, dateDraft);
      setEditing(null);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível agendar a revisão.");
    } finally {
      setBusy(null);
    }
  }

  async function openReview(review: ListReviewRow) {
    if (busy) return;
    setBusy(review.id);
    setErrorMessage(null);
    try {
      if (review.status === "in_progress" && review.attempt_id) {
        router.push(`/questoes/lista/${review.attempt_id}`);
        return;
      }
      const result = await startListReview(review.id);
      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível iniciar a revisão.");
    } finally {
      setBusy(null);
    }
  }

  async function openListLeveling(leveling: ListLevelingRow) {
    if (busy) return;
    if (!leveling.source_completed) {
      setErrorMessage(`Conclua a Revisão ${leveling.leveling_number} desta aula antes de iniciar o Nivelamento ${leveling.leveling_number}.`);
      return;
    }
    if (leveling.available_count <= 0) {
      setErrorMessage("Ainda não há questões disponíveis neste nível. Em poucos momentos serão disponibilizadas.");
      return;
    }
    setBusy(leveling.id);
    setErrorMessage(null);
    try {
      if (leveling.attempt_id && leveling.status === "in_progress") {
        router.push(`/questoes/lista/${leveling.attempt_id}`);
        return;
      }
      const result = await startScheduledLeveling(leveling.id);
      if (!result.ok || !result.attempt_id) {
        if (result.reason === "revision_required") throw new Error(`Conclua a Revisão ${result.required_revision ?? leveling.leveling_number} antes do nivelamento.`);
        if (result.reason === "no_questions") throw new Error("Ainda não há questões disponíveis neste nível. Em poucos momentos serão disponibilizadas.");
        throw new Error("Não foi possível iniciar este nivelamento agora.");
      }
      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível iniciar o nivelamento.");
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return <div className="grid min-h-72 place-items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)]"><LoaderCircle className="animate-spin text-violet-400" size={24} /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-violet-400/20 bg-[radial-gradient(circle_at_82%_12%,rgba(124,58,237,.22),transparent_32%),#09090d] text-white">
        <div className="p-6 text-center sm:p-8">
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-violet-300"><Sparkles size={14} /> LISTAS DE QUESTÕES</span>
          <h1 className="mx-auto mt-3 max-w-3xl font-serif text-4xl tracking-[-.04em] sm:text-5xl">Escolha a semana, o dia e a matéria.</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/48">As listas desta área são independentes da teoria. A Lista 2 só libera depois de concluir a Lista 1; a Lista 3 só libera depois da Lista 2.</p>
        </div>
        <div className="grid border-t border-white/8 sm:grid-cols-3">
          <MiniInfo title="LISTA 1" value="até 35 questões" />
          <MiniInfo title="LISTA 2" value="20 questões novas" />
          <MiniInfo title="LISTA 3" value="15 questões novas" />
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={() => setView("schedule")} className={tabClass(view === "schedule")}><Layers3 size={15} /> LISTAS POR AULA</button>
        <button onClick={() => setView("calendar")} className={tabClass(view === "calendar")}><CalendarClock size={15} /> CALENDÁRIO DAS LISTAS</button>
      </div>

      {errorMessage ? <div className="rounded-2xl border border-red-500/25 bg-red-500/[.07] p-4 text-xs text-red-400"><CircleAlert className="mr-2 inline" size={15} />{errorMessage}</div> : null}

      {view === "schedule" ? (
        <>
          <SelectorSection label="ESCOLHA A SEMANA">
            {weeks.map((value) => <ChoiceButton key={value} active={week === value} onClick={() => chooseWeek(value)}>SEMANA {value}</ChoiceButton>)}
          </SelectorSection>

          <SelectorSection label="ESCOLHA O DIA">
            {days.map((value) => <ChoiceButton key={value} active={day === value} onClick={() => chooseDay(value)}>DIA {value}</ChoiceButton>)}
          </SelectorSection>

          <SelectorSection label="ESCOLHA A MATÉRIA">
            {subjects.map((value) => <ChoiceButton key={value} active={subject === value} onClick={() => setSubject(value)}>{value.toUpperCase()}</ChoiceButton>)}
          </SelectorSection>

          <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
            <header className="border-b border-[var(--border)] bg-[linear-gradient(110deg,rgba(124,58,237,.12),transparent_48%)] px-5 py-5 text-center sm:px-6">
              <span className="text-[9px] font-black tracking-[.18em] text-violet-400">SEMANA {week} · DIA {day}</span>
              <h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">{subject ?? "Selecione uma matéria"}</h2>
            </header>
            <div className="grid gap-4 p-4 sm:p-5">
              {visibleLessons.length ? visibleLessons.map((row) => <LessonLists key={row.lesson_id} row={row} busy={busy} onOpen={openPractice} />) : <EmptyState />}
            </div>
          </section>
        </>
      ) : (
        <ReviewCalendar
          reviews={data.reviews}
          month={month}
          setMonth={setMonth}
          onEdit={(review) => { setEditing(review); setDateDraft(review.scheduled_for ?? review.recommended_for); }}
          onOpen={openReview}
          levelings={data.levelings}
          onOpenLeveling={openListLeveling}
        />
      )}

      {editing ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(null); }}>
          <section className="w-full max-w-lg rounded-[28px] border border-violet-400/25 bg-[#0d0d13] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,.55)]">
            <span className="text-[9px] font-black tracking-[.18em] text-violet-300">REVISÃO {editing.review_number}</span>
            <h3 className="mt-2 font-serif text-3xl">{editing.lesson_title}</h3>
            <p className="mt-2 text-xs leading-6 text-white/45">{editing.subject_name} · questões erradas + 20 questões adicionais.</p>
            <label className="mt-5 block text-[9px] font-black tracking-[.12em] text-white/45">DATA
              <input type="date" value={dateDraft} onChange={(event) => setDateDraft(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none" />
            </label>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setEditing(null)} className="min-h-11 flex-1 rounded-xl border border-white/10 text-[10px] font-black">CANCELAR</button>
              <button onClick={saveReview} disabled={busy === editing.id} className="min-h-11 flex-1 rounded-xl bg-violet-600 text-[10px] font-black">{busy === editing.id ? "SALVANDO..." : "SALVAR DATA"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SelectorSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center sm:px-6">
      <span className="text-[8px] font-black tracking-[.18em] text-[var(--muted)]">{label}</span>
      <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div>
    </section>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-xl border px-5 text-[9px] font-black tracking-[.08em] transition ${active ? "border-violet-400/45 bg-violet-500/15 text-violet-200 shadow-[0_10px_35px_rgba(124,58,237,.12)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-violet-400/25 hover:text-[var(--ink)]"}`}>{children}</button>;
}

function LessonLists({ row, busy, onOpen }: { row: ListCatalogRow; busy: string | null; onOpen: (row: ListCatalogRow, list: PracticeListState) => void }) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[8px] font-black tracking-[.16em] text-violet-400">{row.subject_name}</span>
          <h3 className="mt-1 font-serif text-xl text-[var(--ink)] sm:text-2xl">{row.lesson_title}</h3>
        </div>
        <span className="text-[9px] font-black text-[var(--muted)]">{row.available_count} questões cadastradas</span>
      </div>

      {row.topics?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {row.topics.map((topic) => <span key={topic} className="rounded-full border border-violet-400/12 bg-violet-400/[.04] px-2.5 py-1 text-[8px] text-[var(--muted)]">{topic}</span>)}
          
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {row.practice_lists.map((list) => {
          const working = busy === `${row.lesson_id}:${list.list_number}`;
          const completed = list.status === "completed";
          const actual = Math.max(0, Number(list.actual_size || list.size || list.target_size));
          return (
            <button
              key={list.list_number}
              type="button"
              onClick={() => onOpen(row, list)}
              disabled={!list.unlocked || working}
              className={`group min-h-[172px] rounded-2xl border p-4 text-left transition ${list.unlocked ? "cursor-pointer border-violet-400/30 bg-[linear-gradient(145deg,rgba(124,58,237,.11),rgba(255,255,255,.018))] hover:-translate-y-0.5 hover:border-violet-300/55 hover:bg-violet-500/[.12]" : "cursor-not-allowed border-white/[.05] bg-black/20 opacity-45"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><ListChecks size={18} /></span>
                {completed ? <CheckCircle2 className="text-emerald-400" size={18} /> : !list.unlocked ? <LockKeyhole className="text-white/25" size={17} /> : null}
              </div>
              <span className="mt-4 block text-[8px] font-black tracking-[.14em] text-violet-400">LISTA {list.list_number}</span>
              <strong className="mt-1 block text-sm leading-5 text-[var(--ink)]">{row.subject_name} · {row.lesson_title}</strong>
              <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">
                {completed ? `Concluída · ${list.score ?? 0}/${actual}` : list.status === "in_progress" ? `Em andamento · ${actual} questões` : list.unlocked ? `${actual || Math.min(list.target_size, row.available_count)} questões nesta rodada` : list.locked_reason ?? "Bloqueada"}
              </span>
              <span className={`mt-3 inline-flex rounded-lg border px-3 py-2 text-[8px] font-black tracking-[.1em] ${list.unlocked ? "border-violet-400/30 bg-violet-400/10 text-violet-300" : "border-white/8 text-white/25"}`}>{completed ? "VER RESULTADO" : list.status === "in_progress" ? "CONTINUAR LISTA" : list.unlocked ? "INICIAR LISTA" : "BLOQUEADA"}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function EmptyState() {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center"><BookOpenCheck className="mx-auto text-violet-400" size={24} /><strong className="mt-3 block text-sm text-[var(--ink)]">Nenhuma aula nesta seleção.</strong><span className="mt-1 block text-xs text-[var(--muted)]">Escolha outro dia ou outra matéria.</span></div>;
}

function ReviewCalendar({ reviews, levelings, month, setMonth, onEdit, onOpen, onOpenLeveling }: { reviews: ListReviewRow[]; levelings: ListLevelingRow[]; month: Date; setMonth: (date: Date) => void; onEdit: (review: ListReviewRow) => void; onOpen: (review: ListReviewRow) => void; onOpenLeveling: (leveling: ListLevelingRow) => void }) {
  const cells = monthCells(month);
  const current = month.getMonth();
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5">
        <div><span className="text-[8px] font-black tracking-[.16em] text-violet-400">CALENDÁRIO EXCLUSIVO DAS LISTAS</span><h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">{monthTitle(month)}</h2></div>
        <div className="flex gap-2"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowLeft size={16} /></button><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowRight size={16} /></button></div>
      </header>
      <div className="grid grid-cols-7 border-b border-[var(--border)]">{WEEKDAYS.map((weekday) => <div key={weekday} className="px-2 py-3 text-center text-[8px] font-black tracking-[.13em] text-[var(--muted)]">{weekday}</div>)}</div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const key = toKey(date);
          const events = reviews.filter((review) => (review.scheduled_for ?? review.recommended_for) === key);
          const levelingEvents = levelings.filter((leveling) => (leveling.scheduled_for ?? leveling.recommended_for) === key);
          return (
            <div key={key} className={`min-h-[116px] border-b border-r border-[var(--border)] p-2 ${date.getMonth() === current ? "" : "opacity-35"}`}>
              <span className="text-[9px] font-black text-[var(--muted)]">{date.getDate()}</span>
              <div className="mt-2 space-y-1.5">
                {events.map((review) => <button key={review.id} onClick={() => review.status === "draft" ? onEdit(review) : review.status === "completed" ? undefined : onOpen(review)} className={`w-full rounded-lg border px-2 py-2 text-left ${review.status === "completed" ? "border-emerald-400/20 bg-emerald-400/[.06]" : "border-violet-400/20 bg-violet-400/[.07]"}`}><strong className="block truncate text-[8px] text-[var(--ink)]">R{review.review_number} · {review.subject_name}</strong><span className="mt-0.5 block truncate text-[7px] text-[var(--muted)]">{review.status === "draft" ? "agendar" : review.status === "completed" ? "concluída" : review.status === "in_progress" ? "continuar" : "iniciar"}</span></button>)}
                {levelingEvents.map((leveling) => <button key={leveling.id} type="button" onClick={() => onOpenLeveling(leveling)} className={`w-full rounded-lg border px-2 py-2 text-left ${leveling.status === "completed" ? "border-fuchsia-400/25 bg-fuchsia-400/[.07]" : leveling.source_completed ? "border-violet-400/30 bg-violet-500/[.10]" : "border-white/10 bg-white/[.025] opacity-55"}`}><strong className="block truncate text-[8px] text-[var(--ink)]">N{leveling.leveling_number} · {leveling.subject_name}</strong><span className="mt-0.5 block truncate text-[7px] text-[var(--muted)]">{leveling.status === "completed" ? "nivelamento concluído" : !leveling.source_completed ? `libera após Revisão ${leveling.leveling_number}` : leveling.available_count <= 0 ? "aguardando questões" : leveling.status === "in_progress" ? "continuar nivelamento" : "iniciar nivelamento"}</span></button>)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MiniInfo({ title, value }: { title: string; value: string }) { return <div className="border-b border-white/8 px-6 py-4 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-[8px] font-black tracking-[.13em] text-violet-300">{title}</span><strong className="ml-2 text-xs text-white/70">{value}</strong></div>; }
function tabClass(active: boolean) { return `inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[10px] font-black tracking-[.09em] ${active ? "border-violet-400/35 bg-violet-400/10 text-violet-300" : "border-[var(--border)] text-[var(--muted)]"}`; }
function toKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function monthCells(reference: Date) { const first = new Date(reference.getFullYear(), reference.getMonth(), 1, 12); first.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(first); date.setDate(first.getDate() + index); return date; }); }
function monthTitle(date: Date) { const value = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date); return value.charAt(0).toUpperCase() + value.slice(1); }
