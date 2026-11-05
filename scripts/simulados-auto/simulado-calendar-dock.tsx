"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CalendarDays, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SimuladoCalendarReview = {
  simulado_id: string;
  titulo: string;
  dia_origem: number;
  scheduled_for: string;
  completed_at: string | null;
};

function formatDate(day: string) {
  const [y,m,d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})
    .format(new Date(y,m-1,d,12));
}

/**
 * A standalone overlay on the SAME /calendario page as PrincipalCalendar.
 * Never mutates the R1-R5 calendar, revision rows, or leveling schedules.
 * It displays every scheduled simulado grouped by actual date and opens
 * the existing saved-question runner.
 */
export function SimuladoCalendarDock() {
  const [items,setItems] = useState<SimuladoCalendarReview[]>([]);
  const [counts,setCounts] = useState<Record<string,number>>({});
  const [open,setOpen] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const db = createClient();
      const {data:auth,error:authError} = await db.auth.getUser();
      if (authError || !auth.user) throw new Error("Entre na sua conta para consultar os simulados.");
      const [dates,marks] = await Promise.all([
        db.from("mt_simulado_review_calendar")
          .select("simulado_id,titulo,dia_origem,scheduled_for,completed_at")
          .eq("user_id",auth.user.id)
          .order("scheduled_for",{ascending:true}),
        db.from("mt_simulado_saved_questions")
          .select("simulado_id").eq("user_id",auth.user.id)
      ]);
      if (dates.error) throw dates.error;
      if (marks.error) throw marks.error;
      const byId:Record<string,number>={};
      for (const q of marks.data??[]) byId[q.simulado_id]=(byId[q.simulado_id]??0)+1;
      setItems((dates.data??[]) as SimuladoCalendarReview[]);
      setCounts(byId);setError("");
    } catch(e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o calendário dos simulados.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => { if (document.visibilityState==="visible") void refresh(); };
    document.addEventListener("visibilitychange",onVisible);
    return () => document.removeEventListener("visibilitychange",onVisible);
  },[refresh]);

  const groups = useMemo(() => {
    const index:Record<string,SimuladoCalendarReview[]>={};
    for (const item of items) (index[item.scheduled_for]??=[]).push(item);
    return Object.entries(index).sort(([a],[b])=>a.localeCompare(b));
  },[items]);
  const pending=items.filter(item=>!item.completed_at).length;

  return (
    <section aria-label="Simulados no calendário principal" className="fixed bottom-4 right-4 z-[90] w-[min(430px,calc(100vw-2rem))] lg:bottom-6 lg:right-6">
      {open ? (
        <div className="mb-2 max-h-[min(66vh,560px)] overflow-y-auto rounded-2xl border border-amber-300/30 bg-[#080c14] p-4 text-white shadow-[0_20px_80px_rgba(0,0,0,.75)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black tracking-[.18em] text-amber-300">CALENDÁRIO PRINCIPAL · SIMULADOS</p>
              <h2 className="mt-1 font-serif text-xl">Revisão das questões salvas</h2>
              <p className="mt-1 text-xs leading-5 text-white/55">Agendas dos simulados por data, sem alterar suas R1–R5, cadernos ou nivelamentos.</p>
            </div>
            <button type="button" aria-label="Fechar simulados" onClick={()=>setOpen(false)}
              className="rounded-lg border border-white/15 p-2"><ChevronDown size={18}/></button>
          </div>
          {loading ? <p className="mt-4 flex items-center gap-2 text-sm"><LoaderCircle size={15} className="animate-spin"/>Carregando...</p> : null}
          {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
          {!loading && !error && groups.length===0 ?
            <p className="mt-4 text-sm text-white/60">Ainda não há simulados agendados. Salve questões e escolha a data em Estudos · Simulados.</p> : null}
          <div className="mt-3 space-y-4">{groups.map(([date,reviews])=>(
            <div key={date} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
              <h3 className="mb-2 text-sm font-black text-amber-300">{formatDate(date)}</h3>
              <div className="space-y-2">{reviews.map(review=>(
                <Link key={review.simulado_id}
                  href={`/estudos/simulados?tab=calendario&data=${date}&simulado=${encodeURIComponent(review.simulado_id)}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-3 text-xs transition hover:border-amber-300/40 hover:bg-white/[.035]">
                  <span><strong className="block text-sm text-white">{review.titulo}</strong><span className="mt-1 block text-white/55">{counts[review.simulado_id]??0} questões salvas · {review.completed_at?"Concluído":"Pendente"}</span></span>
                  <span className="shrink-0 font-bold text-amber-300">{review.completed_at?"Rever":"Iniciar"}</span>
                </Link>
              ))}</div>
            </div>
          ))}</div>
          <Link href="/estudos/simulados?tab=calendario" className="mt-4 flex justify-center rounded-xl border border-amber-300/30 p-3 text-xs font-semibold text-amber-200">Abrir todos os simulados</Link>
        </div>
      ) : null}
      <button type="button" onClick={()=>{setOpen(cur=>!cur);if(!open)void refresh();}}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/45 bg-[#10131c] px-5 py-3.5 text-sm font-black text-amber-200 shadow-[0_14px_50px_rgba(0,0,0,.65)] transition hover:border-amber-300">
        <CalendarDays size={18}/><BookOpenCheck size={17}/>
        Simulados no calendário{pending>0?` · ${pending} pendente(s)`:""}
        {open?<ChevronDown size={16}/>:<ChevronUp size={16}/>}
      </button>
    </section>
  );
}
