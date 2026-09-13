"use client";

import { ArrowRight, CheckCircle2, ImageIcon, Languages } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEnemEnglishDay } from "@/lib/enem-english-data";
import { createClient } from "@/lib/supabase/client";

export function EnemEnglishDailyRitual({ day, compact=false }:{ day:number; compact?:boolean }) {
  const readings = useMemo(()=>getEnemEnglishDay(day),[day]);
  const [completed,setCompleted] = useState<Set<string>>(new Set());

  useEffect(()=>{
    if (!readings.length) return;
    let alive = true;
    const run = async()=>{
      const supabase = createClient();
      const { data:auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("user_enem_english_progress").select("reading_id,completed_at").eq("user_id",auth.user.id).in("reading_id",readings.map((item)=>item.id));
      if (alive) setCompleted(new Set((data ?? []).filter((row)=>row.completed_at).map((row)=>row.reading_id)));
    };
    void run();
    return ()=>{alive=false;};
  },[readings]);

  if (!readings.length) return null;
  const done = readings.filter((item)=>completed.has(item.id)).length;

  return (
    <section className={`${compact ? "mt-3 rounded-2xl p-4" : "mt-7 rounded-[28px] p-5 sm:p-6"} border border-sky-400/15 bg-[radial-gradient(circle_at_85%_0%,rgba(56,189,248,.10),transparent_38%),#090b10] text-white`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.15em] text-sky-300"><Languages size={13}/> RITUAL DIÁRIO · INGLÊS ENEM</span>
          <h3 className={`${compact ? "mt-1 text-xl" : "mt-2 text-3xl"} font-serif`}>2 leituras reais · Dia {day}</h3>
          {!compact ? <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/40">Leia antes de ver a questão. Passe o mouse nas palavras para tradução e clique nas que quiser guardar.</p> : null}
        </div>
        <span className="text-[8px] font-black tracking-[.1em] text-white/35">{done}/2 CONCLUÍDAS</span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {readings.map((reading)=>{
          const isDone = completed.has(reading.id);
          return <Link key={reading.id} href={`/ingles/enem/${reading.id}`} className={`group rounded-2xl border p-4 transition ${isDone ? "border-violet-300/25 bg-violet-400/[.07] shadow-[0_0_28px_rgba(139,92,246,.08)]" : "border-white/[.08] bg-white/[.025] hover:border-sky-300/25"}`}>
            <div className="flex items-start justify-between gap-3"><span className="text-[8px] font-black tracking-[.12em] text-sky-300">LEITURA {reading.slot}/2 · ENEM {reading.year}</span>{reading.kind === "visual" ? <ImageIcon size={13} className="text-white/35"/> : null}</div>
            <strong className="mt-2 block text-sm leading-5 text-white/85">{reading.title}</strong>
            <span className={`mt-3 inline-flex items-center gap-1.5 text-[8px] font-black ${isDone ? "text-violet-300" : "text-white/42"}`}>{isDone ? <><CheckCircle2 size={12}/> CONCLUÍDA</> : <>LER AGORA <ArrowRight size={12} className="transition group-hover:translate-x-1"/></>}</span>
          </Link>;
        })}
      </div>
    </section>
  );
}
