"use client";
// MT_ENGLISH_CALENDAR_PRIORITY_V160
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText, CheckCircle2, ChevronRight, Languages, RotateCcw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Reading={id:string;title:string;completed:boolean;slot:number};
type Summary={date:string;readings:Reading[];words_due:number;favorite_phrases:number;favorite_completed:boolean};
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const todayOrStart=()=>today()<"2026-11-10"?"2026-11-10":today();
const show=(d:string)=>new Date(d+"T12:00:00Z").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"});
export function EnglishCalendarPriority({date,compact=false}:{date?:string|null;compact?:boolean}) {
  const selected=date??todayOrStart();
  const [summary,setSummary]=useState<Summary|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    setSummary(null);setError("");
    if(selected<"2026-11-10")return;
    createClient().rpc("mt_english_calendar_summary",{p_on_date:selected})
      .then(({data,error:e})=>{
        if(!active)return;
        if(e)setError(e.message);
        else setSummary(data as Summary);
      }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Erro ao ler rotina de inglês.");});
    return ()=>{active=false;};
  },[selected]);
  if(selected<"2026-11-10")return null;
  const completed=summary?.readings.filter(x=>x.completed).length??0;
  const count=summary?.readings.length??0;
  const cards=[
    {key:"texts",label:"TEXTOS DE INGLÊS",title:count?completed+"/"+count+" leituras concluídas":"Sem textos inéditos",detail:count?summary?.readings.map(x=>x.title).join(" · "):"Adicionar novos textos para continuar",icon:<BookOpenText size={18}/>,done:count>0&&completed===count},
    {key:"words",label:"PALAVRAS INGLÊS",title:String(summary?.words_due??"—")+" palavra(s) para revisar",detail:"D+2 → D+4 → D+7 · erro volta amanhã",icon:<RotateCcw size={18}/>,done:summary?.words_due===0},
    {key:"phrases",label:"FRASES COM AS PALAVRAS FAVORITADAS",title:summary?.favorite_completed?"Frases do dia concluídas":String(summary?.favorite_phrases??"—")+"/10 frases do dia",detail:"10 frases diferentes sorteadas diariamente das favoritadas",icon:<Sparkles size={18}/>,done:Boolean(summary?.favorite_completed)}
  ];
  return <section data-mt-english-calendar-v160="1" className={(compact?"mt-4 rounded-2xl p-4":"my-6 rounded-[26px] p-5 sm:p-6")+" border border-amber-300/40 bg-[linear-gradient(135deg,#151719,#090e1a)] text-white shadow-[0_18px_46px_rgba(0,0,0,.18)]"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-300"><Languages size={17}/> PRIORIDADE · INGLÊS DIÁRIO</p>
        <h3 className={(compact?"mt-2 text-lg":"mt-2 text-2xl")+" font-serif"}>Inglês de {show(selected)}</h3>
        <p className="mt-1 text-xs text-white/55">No final do calendário: textos, palavras e frases com as palavras favoritadas.</p>
      </div>
      <Link href={"/ingles/rotina?data="+selected} className="rounded-xl border border-amber-300/45 bg-amber-300/10 px-4 py-3 text-xs font-bold text-amber-200">Abrir rotina completa</Link>
    </div>
    {error?<p role="alert" className="mt-4 text-xs text-rose-300">{error}</p>:null}
    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      {cards.map(card=><Link key={card.key} href={"/ingles/rotina?data="+selected+"&tab="+card.key}
        className={"group flex min-h-36 flex-col justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5 "+(card.done?"border-emerald-300/35 bg-emerald-300/[.055]":"border-amber-300/20 bg-white/[.035]")}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[10px] font-black text-amber-200">{card.icon}{card.label}</span>
          {card.done?<CheckCircle2 size={17} className="text-emerald-300"/>:<ChevronRight size={17} className="text-white/50"/>}
        </div>
        <div className="mt-4"><strong className="block text-base">{card.title}</strong><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/55">{card.detail}</p></div>
      </Link>)}
    </div>
  </section>;
}
