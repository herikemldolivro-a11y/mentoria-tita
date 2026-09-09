"use client";

import { CalendarDays, CheckCircle2, CircleAlert, LoaderCircle, LockKeyhole, Medal, ShieldAlert, Sparkles, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadLevelingLearningHub, startManualLeveling, type LevelingCatalogRow, type LevelingLearningHub, type ManualLevelState } from "@/lib/leveling-learning-system";
import { listenStudyUpdated } from "@/lib/study-database";

export function LevelingLearningCenter() {
  const router = useRouter();
  const [data, setData] = useState<LevelingLearningHub | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const next = await loadLevelingLearningHub();
    setData(next);
    const weeks = [...new Set(next.catalog.map((row) => row.week_number))].sort((a, b) => a - b);
    setWeek((current) => current ?? weeks[0] ?? 1);
  }

  useEffect(() => {
    let alive = true;
    const run = () => refresh().catch((error) => alive && setMessage(error instanceof Error ? error.message : "Não foi possível carregar os nivelamentos."));
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

  function chooseWeek(value: number) { setWeek(value); setDay(null); setSubject(null); setMessage(null); }
  function chooseDay(value: number) { setDay(value); setSubject(null); setMessage(null); }

  async function openLevel(row: LevelingCatalogRow, level: ManualLevelState) {
    if (busy) return;
    if (!level.unlocked) {
      setMessage(level.locked_reason ?? `Conclua a Revisão ${level.level} desta aula.`);
      return;
    }
    if (level.no_questions) {
      setMessage("Ainda não há questões disponíveis neste nível. Em poucos momentos serão disponibilizadas.");
      return;
    }
    const key = `${row.lesson_id}:${level.level}`;
    setBusy(key);
    setMessage(null);
    try {
      if (level.attempt_id) {
        router.push(`/questoes/lista/${level.attempt_id}`);
        return;
      }
      const result = await startManualLeveling(row.lesson_id, level.level);
      if (!result.ok || !result.attempt_id) {
        if (result.reason === "revision_required") throw new Error(`Conclua a Revisão ${result.required_revision ?? level.level} desta aula antes de iniciar este nivelamento.`);
        if (result.reason === "no_questions") throw new Error("Ainda não há questões disponíveis neste nível. Em poucos momentos serão disponibilizadas novas questões.");
        throw new Error("Não foi possível iniciar este nivelamento agora.");
      }
      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar o nivelamento.");
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="grid min-h-72 place-items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)]"><LoaderCircle className="animate-spin text-violet-400" size={24} /></div>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-violet-400/20 bg-[radial-gradient(circle_at_80%_12%,rgba(124,58,237,.25),transparent_34%),#09090d] p-6 text-center text-white sm:p-8">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-violet-300"><Sparkles size={14} /> NIVELAMENTOS POR AULA</span>
        <h1 className="mx-auto mt-3 max-w-3xl font-serif text-4xl tracking-[-.04em] sm:text-5xl">Semana, dia, matéria, aula e nível.</h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/48">O Nivelamento 1 libera após concluir a Revisão 1 da aula; o Nível 2 após a Revisão 2; e assim por diante. Se a revisão veio da área de listas, o nivelamento aparece no calendário das listas. Se veio do estudo principal, aparece no Calendário Principal.</p>
        <Link href="/calendario" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/10 px-5 text-[9px] font-black tracking-[.12em] text-violet-100"><CalendarDays size={15} /> ABRIR CALENDÁRIO PRINCIPAL</Link>
      </section>

      {message ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[.07] p-4 text-xs text-amber-300"><CircleAlert className="mr-2 inline" size={15} />{message}</div> : null}

      <Selector label="ESCOLHA A SEMANA">{weeks.map((value) => <Choice key={value} active={week === value} onClick={() => chooseWeek(value)}>SEMANA {value}</Choice>)}</Selector>
      <Selector label="ESCOLHA O DIA">{days.map((value) => <Choice key={value} active={day === value} onClick={() => chooseDay(value)}>DIA {value}</Choice>)}</Selector>
      <Selector label="ESCOLHA A MATÉRIA">{subjects.map((value) => <Choice key={value} active={subject === value} onClick={() => setSubject(value)}>{value.toUpperCase()}</Choice>)}</Selector>

      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
        <header className="border-b border-[var(--border)] bg-[linear-gradient(110deg,rgba(124,58,237,.12),transparent_48%)] px-5 py-5 text-center sm:px-6">
          <span className="text-[9px] font-black tracking-[.18em] text-violet-400">SEMANA {week} · DIA {day}</span>
          <h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">{subject ?? "Selecione uma matéria"}</h2>
        </header>
        <div className="grid gap-4 p-4 sm:p-5">
          {visibleLessons.length ? visibleLessons.map((row) => <LessonLeveling key={row.lesson_id} row={row} busy={busy} onOpen={openLevel} />) : <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">Nenhuma aula nesta seleção.</div>}
        </div>
      </section>
    </div>
  );
}

function Selector({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center sm:px-6"><span className="text-[8px] font-black tracking-[.18em] text-[var(--muted)]">{label}</span><div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div></section>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-xl border px-5 text-[9px] font-black tracking-[.08em] transition ${active ? "border-violet-400/45 bg-violet-500/15 text-violet-200 shadow-[0_10px_35px_rgba(124,58,237,.12)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-violet-400/25 hover:text-[var(--ink)]"}`}>{children}</button>;
}

function LessonLeveling({ row, busy, onOpen }: { row: LevelingCatalogRow; busy: string | null; onOpen: (row: LevelingCatalogRow, level: ManualLevelState) => void }) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
      <span className="text-[8px] font-black tracking-[.16em] text-violet-400">{row.subject_name}</span>
      <h3 className="mt-1 font-serif text-xl text-[var(--ink)] sm:text-2xl">{row.lesson_title}</h3>
      {row.topics?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{row.topics.map((topic) => <span key={topic} className="rounded-full border border-violet-400/12 bg-violet-400/[.04] px-2.5 py-1 text-[8px] text-[var(--muted)]">{topic}</span>)}</div> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {row.levels.map((level) => <LevelCard key={level.level} row={row} level={level} working={busy === `${row.lesson_id}:${level.level}`} onOpen={onOpen} />)}
      </div>
    </article>
  );
}

function LevelCard({ row, level, working, onOpen }: { row: LevelingCatalogRow; level: ManualLevelState; working: boolean; onOpen: (row: LevelingCatalogRow, level: ManualLevelState) => void }) {
  const stars = "★".repeat(level.level);
  const blocked = !level.unlocked;
  const theme = ["border-[#9b5b35]/35 bg-[#9b5b35]/[.07]", "border-slate-300/20 bg-slate-300/[.045]", "border-amber-300/25 bg-amber-300/[.055]", "border-violet-300/30 bg-violet-400/[.08]"][level.level - 1];
  return (
    <button type="button" disabled={working} onClick={() => onOpen(row, level)} className={`min-h-[190px] rounded-2xl border p-4 text-left transition ${theme} ${blocked ? "opacity-45" : level.no_questions ? "cursor-pointer border-amber-400/25 hover:border-amber-300/45" : "cursor-pointer hover:-translate-y-0.5 hover:border-violet-300/45"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-black/15 text-violet-200">{level.passed ? <Trophy size={19} /> : level.level === 4 ? <Medal size={19} /> : <Star size={19} />}</span>
        {level.passed ? <CheckCircle2 size={18} className="text-emerald-400" /> : !level.unlocked ? <LockKeyhole size={17} className="text-[var(--muted)]" /> : level.no_questions ? <ShieldAlert size={17} className="text-amber-400" /> : null}
      </div>
      <span className="mt-4 block text-sm tracking-[.12em] text-violet-200">{stars}</span>
      <strong className="mt-1 block text-sm text-[var(--ink)]">Nivelamento · Nível {level.level}</strong>
      <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">
        {level.passed ? `Concluído${level.score !== null ? ` · melhor ${level.score}` : ""}` : level.status === "in_progress" ? "Em andamento · continuar" : !level.unlocked ? level.locked_reason ?? `Libera após a Revisão ${level.level}` : level.no_questions ? "Sem questões disponíveis. Clique para ver o aviso." : `${Math.min(10, level.available_count)} questões · meta de 90%`}
      </span>
    </button>
  );
}
