"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  LockKeyhole,
  Medal,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPrincipalRevision,
  loadPrincipalCalendarHub,
  reschedulePrincipalRevision,
  startPrincipalLeveling,
  type PrincipalCalendarHub,
  type PrincipalLeveling,
  type PrincipalRevision,
} from "@/lib/principal-calendar-system";
import { listenStudyUpdated } from "@/lib/study-database";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export function PrincipalCalendar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledPrefill = useRef(false);
  const [hub, setHub] = useState<PrincipalCalendarHub | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [prefillLessonId, setPrefillLessonId] = useState<string | null>(null);
  const [prefillRevisionNumber, setPrefillRevisionNumber] = useState(1);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [edit, setEdit] = useState<PrincipalRevision | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const data = await loadPrincipalCalendarHub();
    setHub(data);
  }

  useEffect(() => {
    let alive = true;
    const run = () => refresh().catch((error) => alive && setMessage(error instanceof Error ? error.message : "Não foi possível carregar o calendário."));
    void run();
    const unlisten = listenStudyUpdated(() => void run());
    return () => { alive = false; unlisten(); };
  }, []);

  useEffect(() => {
    if (!hub || handledPrefill.current) return;

    const subjectSlug = searchParams.get("subject");
    const lessonSlug = searchParams.get("lesson");
    if (!subjectSlug || !lessonSlug) return;

    handledPrefill.current = true;
    const lesson = hub.taxonomy.find((row) => row.subject_slug === subjectSlug && row.lesson_slug === lessonSlug);
    if (!lesson) {
      setMessage("A aula enviada pela trilha não foi encontrada no calendário ativo.");
      return;
    }

    const revisionNumber = Math.max(1, Math.min(4, Number(searchParams.get("revision") ?? 1) || 1));
    const recommendedDate = searchParams.get("date");
    setPrefillLessonId(lesson.lesson_id);
    setPrefillRevisionNumber(revisionNumber);
    setPrefillDate(recommendedDate);
    if (recommendedDate) {
      const parsed = new Date(`${recommendedDate}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) setMonth(parsed);
    }
    setMessage(`${lesson.subject_name} · ${lesson.lesson_title} já está preenchida. Escolha o dia e, se quiser, registre uma observação.`);
    setAddOpen(true);
  }, [hub, searchParams]);

  function openManualRevision() {
    setPrefillLessonId(null);
    setPrefillRevisionNumber(1);
    setPrefillDate(null);
    setAddOpen(true);
  }

  function closeAddRevision() {
    setAddOpen(false);
    if (prefillLessonId) router.replace("/revisoes");
    setPrefillLessonId(null);
    setPrefillRevisionNumber(1);
    setPrefillDate(null);
  }

  async function openLeveling(leveling: PrincipalLeveling) {
    if (busy) return;
    if (!leveling.source_completed) {
      setMessage(`O Nivelamento ${leveling.leveling_number} libera depois que a Revisão ${leveling.leveling_number} desta aula for concluída.`);
      return;
    }
    if (leveling.status === "completed" && leveling.attempt_id) {
      router.push(`/questoes/lista/${leveling.attempt_id}`);
      return;
    }
    setBusy(leveling.id);
    setMessage(null);
    try {
      if (leveling.status === "in_progress" && leveling.attempt_id) {
        router.push(`/questoes/lista/${leveling.attempt_id}`);
        return;
      }
      const result = await startPrincipalLeveling(leveling.id);
      if (!result.ok || !result.attempt_id) {
        if (result.reason === "revision_required") throw new Error(`Conclua a Revisão ${result.required_revision ?? leveling.leveling_number} desta aula primeiro.`);
        if (result.reason === "no_questions") throw new Error("Ainda não há questões disponíveis neste nível. Em poucos momentos serão disponibilizadas.");
        throw new Error("Não foi possível iniciar este nivelamento agora.");
      }
      router.push(`/questoes/lista/${result.attempt_id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar o nivelamento.");
    } finally {
      setBusy(null);
    }
  }

  if (!hub) {
    return <div className="mx-auto grid min-h-72 w-full max-w-[1260px] place-items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">Carregando calendário...</div>;
  }

  const cells = monthCells(month);
  const currentMonth = month.getMonth();
  const scheduledRevisions = hub.revisions.filter((item) => item.scheduled_for);
  const pendingLevelings = hub.levelings.filter((item) => item.status !== "completed");

  return (
    <div className={`mx-auto w-full max-w-[1260px] ${compact ? "" : "px-4 pb-24 pt-6 sm:px-6"}`}>
      {!compact ? (
        <section className="mb-5 overflow-hidden rounded-[28px] border border-violet-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(124,58,237,.2),transparent_38%),#09090d] p-5 text-white sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.19em] text-violet-300"><CalendarDays size={15}/> CALENDÁRIO PRINCIPAL</span>
              <h2 className="mt-2 font-serif text-3xl sm:text-5xl">Revisões + nivelamentos do estudo principal.</h2>
              <p className="mt-3 max-w-3xl text-xs leading-6 text-white/48">Você escolhe a data da revisão. O nivelamento correspondente aparece automaticamente no dia seguinte e só libera depois que essa revisão for concluída.</p>
            </div>
            <button type="button" onClick={openManualRevision} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-[10px] font-black tracking-[.1em] text-white shadow-[0_18px_45px_rgba(124,58,237,.25)] transition hover:bg-violet-400"><Plus size={16}/> ADICIONAR REVISÃO</button>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Stat title="REVISÕES AGENDADAS" value={scheduledRevisions.length}/>
            <Stat title="NIVELAMENTOS PENDENTES" value={pendingLevelings.length}/>
            <Stat title="MATÉRIAS DISPONÍVEIS" value={new Set(hub.taxonomy.map((row) => row.subject_name)).size}/>
          </div>
        </section>
      ) : null}

      {message ? <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/[.07] p-4 text-xs text-amber-300"><CircleAlert className="mr-2 inline" size={15}/>{message}</div> : null}

      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
        <header className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <span className="text-[8px] font-black tracking-[.16em] text-violet-400">AGENDA MENSAL</span>
            <h3 className="mt-1 font-serif text-2xl text-[var(--ink)] sm:text-3xl">{monthTitle(month)}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1, 12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"><ArrowLeft size={16}/></button>
            <button type="button" onClick={() => setMonth(new Date())} className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--muted)]">HOJE</button>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1, 12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"><ArrowRight size={16}/></button>
            <button type="button" onClick={openManualRevision} className="ml-1 grid h-10 w-10 place-items-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300" aria-label="Adicionar revisão"><Plus size={16}/></button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--background)]">
              {WEEKDAYS.map((weekday) => <div key={weekday} className="px-2 py-3 text-center text-[8px] font-black tracking-[.14em] text-[var(--muted)]">{weekday}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((date) => {
                const key = dateKey(date);
                const revisions = hub.revisions.filter((item) => item.scheduled_for === key);
                const levelings = hub.levelings.filter((item) => item.scheduled_for === key);
                return (
                  <div key={key} className={`min-h-[148px] border-b border-r border-[var(--border)] p-2.5 ${date.getMonth() === currentMonth ? "" : "opacity-35"}`}>
                    <span className={`grid h-7 w-7 place-items-center rounded-lg text-[9px] font-black ${key === dateKey(new Date()) ? "bg-violet-500 text-white" : "text-[var(--muted)]"}`}>{date.getDate()}</span>
                    <div className="mt-2 space-y-1.5">
                      {revisions.map((revision) => (
                        <button key={revision.id} type="button" onClick={() => revision.status === "completed" ? router.push(`/revisoes/${revision.id}`) : setEdit(revision)} className={`w-full rounded-lg border px-2 py-2 text-left transition hover:border-violet-300/45 ${revision.status === "completed" ? "border-emerald-400/20 bg-emerald-400/[.06]" : "border-violet-400/22 bg-violet-400/[.07]"}`}>
                          <strong className="block truncate text-[8px] text-[var(--ink)]">R{revision.revision_number} · {revision.subject_name}</strong>
                          <span className="mt-0.5 block truncate text-[7px] text-[var(--muted)]">{revision.lesson_title}</span>
                          <span className={`mt-1 inline-flex text-[7px] font-black ${revision.status === "completed" ? "text-emerald-400" : "text-violet-400"}`}>{revision.status === "completed" ? "CONCLUÍDA" : "ABRIR / ALTERAR DATA"}</span>
                        </button>
                      ))}
                      {levelings.map((leveling) => (
                        <button key={leveling.id} type="button" onClick={() => void openLeveling(leveling)} className={`w-full rounded-lg border px-2 py-2 text-left transition ${leveling.status === "completed" ? "border-fuchsia-400/25 bg-fuchsia-400/[.08]" : leveling.source_completed ? "border-violet-300/30 bg-violet-500/[.11] hover:border-violet-200/50" : "border-white/10 bg-white/[.02] opacity-55"}`}>
                          <div className="flex items-center gap-1.5"><Medal size={10} className="text-fuchsia-300"/><strong className="truncate text-[8px] text-[var(--ink)]">N{leveling.leveling_number} · {leveling.subject_name}</strong></div>
                          <span className="mt-0.5 block truncate text-[7px] text-[var(--muted)]">{leveling.lesson_title}</span>
                          <span className="mt-1 block text-[7px] font-black text-violet-300">{leveling.status === "completed" ? "CONCLUÍDO" : !leveling.source_completed ? `LIBERA APÓS REVISÃO ${leveling.leveling_number}` : leveling.status === "in_progress" ? "CONTINUAR NIVELAMENTO" : "INICIAR NIVELAMENTO"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {!compact ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Info icon={<RotateCcw size={17}/>} title="Revisão N" text="Escolha qualquer matéria e aula do plano. A revisão fica no Calendário Principal."/>
          <Info icon={<Clock3 size={17}/>} title="+1 dia automático" text="Se a Revisão 1 for em 10/09, o Nivelamento 1 aparece automaticamente em 11/09."/>
          <Info icon={<LockKeyhole size={17}/>} title="Liberação correta" text="Nivelamento 2 exige a Revisão 2 concluída; Nivelamento 3 exige a Revisão 3, e assim por diante."/>
        </div>
      ) : null}

      {addOpen ? (
        <AddRevisionModal
          hub={hub}
          prefillLessonId={prefillLessonId}
          prefillRevisionNumber={prefillRevisionNumber}
          prefillDate={prefillDate}
          lockLesson={Boolean(prefillLessonId)}
          onClose={closeAddRevision}
          onSaved={async () => {
            setAddOpen(false);
            if (prefillLessonId) router.replace("/revisoes");
            setPrefillLessonId(null);
            setPrefillRevisionNumber(1);
            setPrefillDate(null);
            await refresh();
          }}
        />
      ) : null}
      {edit ? <EditRevisionModal revision={edit} onClose={() => setEdit(null)} onOpen={() => router.push(`/revisoes/${edit.id}`)} onSaved={async (date) => { setBusy(edit.id); try { await reschedulePrincipalRevision(edit.id,date); setEdit(null); await refresh(); } finally { setBusy(null); } }} busy={busy === edit.id}/> : null}
    </div>
  );
}

function AddRevisionModal({
  hub,
  onClose,
  onSaved,
  prefillLessonId = null,
  prefillRevisionNumber = 1,
  prefillDate = null,
  lockLesson = false,
}: {
  hub: PrincipalCalendarHub;
  onClose: () => void;
  onSaved: () => void;
  prefillLessonId?: string | null;
  prefillRevisionNumber?: number;
  prefillDate?: string | null;
  lockLesson?: boolean;
}) {
  const subjects = useMemo(() => [...new Set(hub.taxonomy.map((row) => row.subject_name))].sort((a,b)=>a.localeCompare(b,"pt-BR")), [hub.taxonomy]);
  const prefilledLesson = useMemo(() => hub.taxonomy.find((row) => row.lesson_id === prefillLessonId) ?? null, [hub.taxonomy, prefillLessonId]);
  const [subject, setSubject] = useState(prefilledLesson?.subject_name ?? subjects[0] ?? "");
  const lessons = useMemo(() => hub.taxonomy.filter((row) => row.subject_name === subject), [hub.taxonomy, subject]);
  const [lessonId, setLessonId] = useState(prefilledLesson?.lesson_id ?? lessons[0]?.lesson_id ?? "");
  const [revision, setRevision] = useState(prefillRevisionNumber);
  const [date, setDate] = useState(prefillDate ?? dateKey(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lockLesson && prefilledLesson) {
      setSubject(prefilledLesson.subject_name);
      setLessonId(prefilledLesson.lesson_id);
      setRevision(prefillRevisionNumber);
      if (prefillDate) setDate(prefillDate);
      return;
    }
    setLessonId(lessons[0]?.lesson_id ?? "");
  }, [lessons, lockLesson, prefillDate, prefilledLesson, prefillRevisionNumber]);

  async function save() {
    if (!lessonId || !date || saving) return;
    setSaving(true); setError(null);
    try { await createPrincipalRevision({ lessonId, revisionNumber: revision, date, notes }); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível adicionar a revisão."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-violet-400/25 bg-[#0d0d13] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-black tracking-[.18em] text-violet-300">CALENDÁRIO PRINCIPAL</span>
            <h3 className="mt-2 font-serif text-3xl">{lockLesson ? "Escolha o dia da revisão." : "Adicionar revisão de qualquer matéria."}</h3>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55"><X size={17}/></button>
        </div>
        {error ? <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{error}</div> : null}

        {lockLesson && prefilledLesson ? (
          <div className="mt-6 rounded-[20px] border border-emerald-400/25 bg-emerald-400/[.06] p-4">
            <span className="text-[8px] font-black tracking-[.14em] text-emerald-300">AULA JÁ PREENCHIDA AUTOMATICAMENTE</span>
            <strong className="mt-2 block text-base text-white">{prefilledLesson.lesson_title}</strong>
            <span className="mt-1 block text-[10px] text-white/45">{prefilledLesson.subject_name} · Revisão {revision}</span>
            <p className="mt-3 text-[10px] leading-5 text-emerald-100/55">A matéria e a aula já vieram da trilha. Você escolhe a data e pode deixar uma observação opcional.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="MATÉRIA"><select value={subject} onChange={(e)=>setSubject(e.target.value)} className={selectClass}>{subjects.map((item)=><option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="REVISÃO"><select value={revision} onChange={(e)=>setRevision(Number(e.target.value))} className={selectClass}>{[1,2,3,4].map((n)=><option key={n} value={n}>Revisão {n}</option>)}</select></Field>
            </div>
            <Field label="AULA"><select value={lessonId} onChange={(e)=>setLessonId(e.target.value)} className={selectClass}>{lessons.map((lesson)=><option key={lesson.lesson_id} value={lesson.lesson_id}>Semana {lesson.week_number} · {lesson.lesson_title}</option>)}</select></Field>
          </>
        )}

        <Field label={lockLesson ? "ESCOLHA O DIA DA REVISÃO" : "DATA DA REVISÃO"}><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className={selectClass}/></Field>
        <Field label="OBSERVAÇÕES DA REVISÃO · OPCIONAL">
          <textarea
            value={notes}
            onChange={(e)=>setNotes(e.target.value.slice(0, 2000))}
            rows={4}
            maxLength={2000}
            placeholder="Ex.: errei conversão de unidade; revisar regra de três; atenção à pegadinha X..."
            className={`${selectClass} min-h-[112px] resize-y py-3 leading-6`}
          />
          <span className="mt-1 block text-right text-[8px] font-medium tracking-normal text-white/25">{notes.length}/2000</span>
        </Field>
        <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[.06] p-3 text-[10px] leading-5 text-white/55"><Sparkles className="mr-2 inline text-violet-300" size={13}/>Ao salvar, o Nivelamento {revision} será colocado automaticamente no dia seguinte. A observação ficará visível quando você abrir esta revisão.</div>
        <button type="button" onClick={() => void save()} disabled={!lessonId || saving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 text-[10px] font-black tracking-[.11em] text-white disabled:opacity-45">{saving ? "SALVANDO..." : <><Plus size={16}/> {lockLesson ? "AGENDAR ESTA AULA" : "ADICIONAR À AGENDA"}</>}</button>
      </section>
    </div>
  );
}

function EditRevisionModal({ revision, onClose, onOpen, onSaved, busy }: { revision: PrincipalRevision; onClose: () => void; onOpen: () => void; onSaved: (date:string)=>void; busy:boolean }) {
  const [date,setDate]=useState(revision.scheduled_for ?? revision.recommended_for);
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.currentTarget===e.target)onClose();}}><section className="w-full max-w-lg rounded-[28px] border border-violet-400/25 bg-[#0d0d13] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><span className="text-[9px] font-black tracking-[.17em] text-violet-300">REVISÃO {revision.revision_number}</span><h3 className="mt-2 font-serif text-2xl">{revision.lesson_title}</h3><p className="mt-1 text-xs text-white/45">{revision.subject_name}</p></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X size={16}/></button></div><Field label="DATA"><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className={selectClass}/></Field><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onOpen} className="min-h-11 rounded-xl border border-white/10 text-[9px] font-black">ABRIR REVISÃO</button><button type="button" disabled={busy} onClick={()=>onSaved(date)} className="min-h-11 rounded-xl bg-violet-500 text-[9px] font-black">{busy?"SALVANDO...":"SALVAR DATA"}</button></div></section></div>;
}

function Stat({ title,value }:{title:string;value:number}) { return <div className="rounded-xl border border-white/8 bg-white/[.025] px-4 py-3"><span className="text-[7px] font-black tracking-[.13em] text-white/35">{title}</span><strong className="mt-1 block font-serif text-2xl">{value}</strong></div>; }
function Info({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><span className="text-violet-400">{icon}</span><strong className="mt-2 block text-sm text-[var(--ink)]">{title}</strong><p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">{text}</p></div>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="mt-4 block text-[9px] font-black tracking-[.13em] text-white/45">{label}{children}</label>; }
const selectClass="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-violet-400/45";
function dateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function monthCells(reference:Date){const first=new Date(reference.getFullYear(),reference.getMonth(),1,12);first.setDate(first.getDate()-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);return d;});}
function monthTitle(date:Date){const v=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(date);return v.charAt(0).toUpperCase()+v.slice(1);}
