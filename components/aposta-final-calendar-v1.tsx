"use client";
// MT_APOSTA_FINAL_CALENDAR_V1 · Revisions are created by the existing mt_finish_simulado_round RPC.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ArrowRight, NotebookPen, Target, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Row = {id:string;simulado_id:string;round_number:number;scheduled_for:string|null;completed_at:string|null;titulo:string};
function fmt(d:string){return new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});}
function prev(d:string){const date=new Date(d+"T12:00:00Z");date.setUTCDate(date.getUTCDate()-1);return date.toISOString().slice(0,10);}
function dayOf(id:string){const match=id.match(/^aposta-final-s01-d(\d{2})$/);return match?Number(match[1]):0;}
export function ApostaFinalCalendar(){
 const [items,setItems]=useState<Row[]>([]);
 const [error,setError]=useState("");
 useEffect(()=>{
   let alive=true;
   (async()=>{
    const db=createClient();
    const {data:auth}=await db.auth.getUser();
    if(!auth.user)return;
    const {data,error:e}=await db.from("mt_simulado_review_rounds")
      .select("id,simulado_id,round_number,scheduled_for,completed_at,titulo")
      .eq("user_id",auth.user.id).like("simulado_id","aposta-final-s01-d%")
      .not("scheduled_for","is",null).order("scheduled_for",{ascending:true});
    if(e)throw e;
    if(alive)setItems((data??[]) as Row[]);
   })().catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));});
   return()=>{alive=false;};
 },[]);
 const scheduled=useMemo(()=>items.filter(r=>!r.completed_at&&r.scheduled_for&&dayOf(r.simulado_id)),[items]);
 if(!scheduled.length&&!error)return null;
 return <section data-mt-aposta-final-calendar="1" className="mb-6 overflow-hidden rounded-[25px] border border-amber-300/25 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,.13),transparent_45%),#101522] text-white">
   <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
     <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-amber-200"><Target size={14}/> CFO PMAL · APOSTA FINAL</p>
       <h2 className="mt-1 font-serif text-2xl">Revisões dos sete dias</h2>
       <p className="mt-1 text-xs text-white/55">Eventos agendados por você. Os flashcards ficam disponíveis na véspera.</p>
     </div>
     <Link href="/aposta-final" className="inline-flex items-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-2.5 text-xs font-bold text-amber-200">Abrir Aposta Final <ArrowRight size={15}/></Link>
   </div>
   {error?<p role="alert" className="p-5 text-xs text-red-300">{error}</p>:null}
   <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
     {scheduled.map(r=>{
       const dia=dayOf(r.simulado_id);
       const day=String(dia).padStart(2,"0");
       const href="/aposta-final?dia="+dia+"&round="+encodeURIComponent(r.id);
       return <article key={r.id} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-amber-200"><CalendarDays size={14}/> {fmt(r.scheduled_for!)}</div>
         <h3 className="mt-2 font-bold">Semana 1 · Dia {day}</h3>
         <p className="mt-1 text-xs text-white/50">Direito Penal · Revisão R{r.round_number}</p>
         <div className="mt-4 flex flex-wrap gap-2">
           <Link href={href} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-300 px-3.5 py-2.5 text-xs font-bold text-black">Resolver revisão <ArrowRight size={14}/></Link>
           <Link href={href+"&notebook=1"} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3.5 py-2.5 text-xs font-bold text-cyan-200"><NotebookPen size={14}/> Caderno · {fmt(prev(r.scheduled_for!))}</Link>
         </div>
       </article>;
     })}
   </div>
 </section>;
}
