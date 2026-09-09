"use client";

import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, LoaderCircle, Medal, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadLevelingCalendar, scheduleLeveling, startScheduledLeveling, type LevelingCalendarRow } from "@/lib/leveling-calendar-system";
import { listenStudyUpdated } from "@/lib/study-database";

const WEEKDAYS=["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

export function LevelingCalendar({compact=false}:{compact?:boolean}){
  const router=useRouter();
  const [events,setEvents]=useState<LevelingCalendarRow[]>([]);
  const [month,setMonth]=useState(()=>new Date());
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [editing,setEditing]=useState<LevelingCalendarRow|null>(null);
  const [date,setDate]=useState("");

  async function refresh(){const next=await loadLevelingCalendar();setEvents(next.events??[]);}
  useEffect(()=>{let alive=true;const run=()=>refresh().catch(e=>alive&&setError(e instanceof Error?e.message:"Falha ao carregar nivelamentos."));void run().finally(()=>alive&&setLoading(false));const unlisten=listenStudyUpdated(()=>void run());return()=>{alive=false;unlisten();};},[]);

  const cells=useMemo(()=>monthCells(month),[month]);
  const current=month.getMonth();

  async function save(){if(!editing||!date||busy)return;setBusy(editing.id);setError(null);try{await scheduleLeveling(editing.id,date);setEditing(null);await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao agendar nivelamento.");}finally{setBusy(null);}}
  async function open(row:LevelingCalendarRow){if(busy)return;if(row.status==="draft"){setEditing(row);setDate(row.scheduled_for??row.recommended_for);return;}if(row.status==="completed")return;setBusy(row.id);setError(null);try{if(row.attempt_id&&row.status==="in_progress"){router.push(`/questoes/lista/${row.attempt_id}`);return;}const result=await startScheduledLeveling(row.id);router.push(`/questoes/lista/${result.attempt_id}`);}catch(e){setError(e instanceof Error?e.message:"Falha ao iniciar nivelamento.");}finally{setBusy(null);}}

  if(loading)return <div className="grid min-h-64 place-items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)]"><LoaderCircle className="animate-spin text-violet-400" size={24}/></div>;

  return <div className={compact?"space-y-4":"space-y-6"}>
    {!compact?<section className="overflow-hidden rounded-[30px] border border-violet-400/20 bg-[radial-gradient(circle_at_80%_12%,rgba(124,58,237,.22),transparent_34%),#09090d] p-6 text-white sm:p-8"><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-violet-300"><Sparkles size={14}/> CALENDÁRIO DE NIVELAMENTOS</span><h1 className="mt-3 font-serif text-4xl tracking-[-.04em] sm:text-5xl">Domínio vem depois da revisão.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/48">Quando uma revisão normal é concluída, o nivelamento correspondente entra automaticamente para o dia seguinte. Você pode mover a data aqui; o evento também fica conectado à página principal de Revisões.</p></section>:null}
    {error?<div className="rounded-2xl border border-red-500/25 bg-red-500/[.07] p-4 text-xs text-red-400"><CircleAlert className="mr-2 inline" size={15}/>{error}</div>:null}
    <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]"><header className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5"><div><span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.16em] text-violet-400"><CalendarDays size={13}/> {compact?"NIVELAMENTOS CONECTADOS":"AGENDA DE NIVELAMENTOS"}</span><h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">{monthTitle(month)}</h2></div><div className="flex gap-2"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1,12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowLeft size={16}/></button><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1,12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowRight size={16}/></button></div></header><div className="grid grid-cols-7 border-b border-[var(--border)]">{WEEKDAYS.map(d=><div key={d} className="px-2 py-3 text-center text-[8px] font-black tracking-[.13em] text-[var(--muted)]">{d}</div>)}</div><div className="grid grid-cols-7">{cells.map(cell=>{const key=toKey(cell);const rows=events.filter(e=>(e.scheduled_for??e.recommended_for)===key);return <div key={key} className={`min-h-[118px] border-b border-r border-[var(--border)] p-2 ${cell.getMonth()===current?"":"opacity-35"}`}><span className="text-[9px] font-black text-[var(--muted)]">{cell.getDate()}</span><div className="mt-2 space-y-1.5">{rows.map(row=><button key={row.id} onClick={()=>open(row)} className={`w-full rounded-lg border px-2 py-2 text-left transition ${row.status==="completed"?"border-emerald-400/20 bg-emerald-400/[.06]":"border-violet-400/22 bg-violet-400/[.075] hover:border-violet-300/40"}`}><span className="flex items-center gap-1.5"><Medal size={11} className={row.status==="completed"?"text-emerald-400":"text-violet-300"}/><strong className="truncate text-[8px] text-[var(--ink)]">N{row.leveling_number} · {row.subject_name}</strong></span><span className="mt-0.5 block truncate text-[7px] text-[var(--muted)]">{row.status==="draft"?"agendar":row.status==="completed"?"concluído":row.status==="in_progress"?"continuar":`${row.required_correct}/${row.required_count}`}</span></button>)}</div></div>})}</div></section>

    {editing?<div className="fixed inset-0 z-[95] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.currentTarget===e.target)setEditing(null)}}><section className="w-full max-w-lg rounded-[28px] border border-violet-400/25 bg-[#0d0d13] p-6 text-white"><span className="text-[9px] font-black tracking-[.18em] text-violet-300">NIVELAMENTO {editing.leveling_number}</span><h3 className="mt-2 font-serif text-3xl">{editing.lesson_title}</h3><p className="mt-2 text-xs leading-6 text-white/45">{editing.subject_name} · recomendado um dia depois da revisão.</p><label className="mt-5 block text-[9px] font-black tracking-[.12em] text-white/45">DATA<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"/></label><div className="mt-5 flex gap-2"><button onClick={()=>setEditing(null)} className="min-h-11 flex-1 rounded-xl border border-white/10 text-[10px] font-black">CANCELAR</button><button onClick={save} disabled={busy===editing.id} className="min-h-11 flex-1 rounded-xl bg-violet-600 text-[10px] font-black">{busy===editing.id?"SALVANDO...":"SALVAR DATA"}</button></div></section></div>:null}
  </div>;
}

function toKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function monthCells(reference:Date){const first=new Date(reference.getFullYear(),reference.getMonth(),1,12);first.setDate(first.getDate()-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);return d;});}
function monthTitle(date:Date){const s=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(date);return s.charAt(0).toUpperCase()+s.slice(1);}
