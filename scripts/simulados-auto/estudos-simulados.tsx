"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SimuladoExamRunner } from "@/components/simulado-exam-runner";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, BookOpenCheck, Bookmark, CheckCircle2, ExternalLink, LoaderCircle, ChevronLeft, ChevronRight } from "lucide-react";

type Question = { numero:number; pagina:number; gabarito:string; trecho?:string };
type Simulado = { id:string; dia:number; titulo:string; origem:string; total:number; arquivos:Record<string,string>; questoes:Question[] };
type Review = { user_id:string; simulado_id:string; dia_origem:number; titulo:string; scheduled_for:string; completed_at:string|null };
type Saved = { simulado_id:string; numero:number };

const api = "/api/estudos/simulados";
const dateStr = (date:Date) => new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
const plusDays = (date:string, days:number) => {
  const d = new Date(date+"T12:00:00");
  d.setDate(d.getDate()+days);
  return dateStr(d);
};

export function TitaSimuladosSemanaUm() {
  const [simulados,setSimulados]=useState<Simulado[]>([]);
  const [userId,setUserId]=useState("");
  const [dia,setDia]=useState(1);
  const [activeId,setActiveId]=useState("dia-01-geral");
  const [tab,setTab]=useState<"estudos"|"calendario">("estudos");
  const [saved,setSaved]=useState<Saved[]>([]);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [selectedDate,setSelectedDate]=useState(dateStr(new Date()));
  const [reviewDate,setReviewDate]=useState(plusDays(dateStr(new Date()),2));
  const [working,setWorking]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [showAnswers,setShowAnswers]=useState<Record<string,boolean>>({});
  const [results,setResults]=useState<Record<string,string>>({});
  const [runningId,setRunningId]=useState<string|null>(null);
  const deepLinkOpened=useRef(false);

  const current = useMemo(()=>simulados.find(s=>s.id===activeId) ?? simulados.find(s=>s.dia===dia) ?? null,[simulados,activeId,dia]);
  const currentSaved = current ? saved.filter(x=>x.simulado_id===current.id).map(x=>x.numero):[];
  const reviewForCurrent = reviews.find(r=>r.simulado_id===current?.id);
  const calendarDays = [...new Set(reviews.map(r=>r.scheduled_for))].sort();
  const running=simulados.find(s=>s.id===runningId)??null;
  const runningQuestions=running
    ? running.questoes.filter(q=>saved.some(x=>x.simulado_id===running.id&&x.numero===q.numero)).sort((a,b)=>a.numero-b.numero)
    : [];

  useEffect(()=>{
    if(deepLinkOpened.current || !simulados.length || !userId)return;
    const url=new URLSearchParams(window.location.search);
    const requested=url.get("simulado");
    if(!requested && url.get("tab")!=="calendario")return;
    deepLinkOpened.current=true;
    setTab("calendario");
    if(url.get("data"))setSelectedDate(url.get("data")!);
    if(requested && simulados.some(s=>s.id===requested))setRunningId(requested);
  },[simulados,userId]);



  async function refresh(user:string) {
    const supabase = createClient();
    const [marks,dates] = await Promise.all([
      supabase.from("mt_simulado_saved_questions").select("simulado_id,numero").eq("user_id",user),
      supabase.from("mt_simulado_review_calendar").select("*").eq("user_id",user).order("scheduled_for")
    ]);
    if(marks.error)throw marks.error;
    if(dates.error)throw dates.error;
    setSaved((marks.data??[]) as Saved[]);
    setReviews((dates.data??[]) as Review[]);
  }

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const supabase=createClient();
      const [manifest,auth]=await Promise.all([fetch(api,{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Falha ao carregar o catálogo de simulados.");return r.json()}),supabase.auth.getUser()]);
      if(auth.error || !auth.data.user)throw new Error("Entre na sua conta da TITÃ para salvar os simulados.");
      if(!alive)return;
      const list=manifest.simulados as Simulado[];
      setSimulados(list);
      setUserId(auth.data.user.id);
      await refresh(auth.data.user.id);
    })().catch(e=>{if(alive)setError(e instanceof Error?e.message:"Não foi possível abrir o módulo.");}).finally(()=>{if(alive)setLoading(false)});
    return ()=>{alive=false};
  },[]);

  async function toggleSave(sim:Simulado,number:number){
    if(!userId||working)return;
    const exists=saved.some(q=>q.simulado_id===sim.id&&q.numero===number);
    setWorking(sim.id+"-"+number);setError("");setMessage("");
    try {
      const db=createClient();
      const {error:e}=exists ? await db.from("mt_simulado_saved_questions").delete().eq("user_id",userId).eq("simulado_id",sim.id).eq("numero",number)
        : await db.from("mt_simulado_saved_questions").upsert({user_id:userId,simulado_id:sim.id,numero:number},{onConflict:"user_id,simulado_id,numero"});
      if(e)throw e;
      await refresh(userId);
      setMessage(exists?"Questão retirada da seleção.":"Questão salva em "+sim.titulo+".");
    }catch(e){setError(e instanceof Error?e.message:"Erro ao salvar.");}
    finally{setWorking("")}
  }

  async function schedule(sim:Simulado){
    if(!userId||working)return;
    const n=saved.filter(x=>x.simulado_id===sim.id).length;
    if(!n){setError("Salve ao menos uma questão antes de agendar.");return;}
    if(!reviewDate){setError("Escolha a data da revisão.");return;}
    setWorking("schedule");setError("");
    try {
      const {error:e}=await createClient().from("mt_simulado_review_calendar").upsert({
        user_id:userId,simulado_id:sim.id,dia_origem:sim.dia,titulo:sim.titulo,
        scheduled_for:reviewDate,updated_at:new Date().toISOString(),
        ...(reviewForCurrent?.completed_at?{completed_at:null}:{})
      },{onConflict:"user_id,simulado_id"});
      if(e)throw e;
      await refresh(userId);
      setSelectedDate(reviewDate);
      setTab("calendario");
      setMessage(sim.titulo+" agendado para "+reviewDate+" com "+n+" questões salvas.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível agendar.");}
    finally{setWorking("")}
  }

  async function finishReview(review:Review){
    if(!userId||working)return;
    setWorking("finish");setError("");
    try {
      const {error:e}=await createClient().from("mt_simulado_review_calendar")
        .update({completed_at:review.completed_at?null:new Date().toISOString(),updated_at:new Date().toISOString()})
        .eq("user_id",userId).eq("simulado_id",review.simulado_id);
      if(e)throw e;
      await refresh(userId);
      setMessage(review.completed_at?"Revisão reaberta.":"Revisão concluída.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar.");}
    finally{setWorking("")}
  }

  const pdfLink=(file:string,page?:number)=>api+"/pdf/"+encodeURIComponent(file)+(page?"#page="+page:"");

  if(running) return <div className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7">
    <SimuladoExamRunner
      key={running.id} simulado={running} questoes={runningQuestions} userId={userId}
      onExit={()=>setRunningId(null)}
      onCompleted={async()=>{
        const review=reviews.find(r=>r.simulado_id===running.id);
        if(!review)throw new Error("Esta revisão ainda não foi agendada.");
        const {error:e}=await createClient().from("mt_simulado_review_calendar")
          .update({completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})
          .eq("user_id",userId).eq("simulado_id",running.id);
        if(e)throw e;
        await refresh(userId);
        setRunningId(null);setTab("calendario");
        setSelectedDate(review.scheduled_for);
        setMessage("Revisão de "+running.titulo+" concluída e atualizada no calendário principal.");
      }}
    />
  </div>;

  return <div className="mx-auto max-w-[1350px] px-4 pb-24 pt-6 sm:px-7 text-[var(--ink)]">
    <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#17131f] to-[#09090d] p-5 text-white sm:p-8">
      <p className="text-xs uppercase tracking-[.22em] text-amber-300">TITÃ · ESTUDOS</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-5xl">Simulados PMAL · Semana 01</h1>
      <p className="mt-3 max-w-3xl text-sm text-white/65">Sete dias separados do cronograma de 48 dias. Enunciados completos permanecem nos PDFs originais; marque somente as questões que quer revisar.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={()=>setTab("estudos")} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab==="estudos"?"bg-amber-300 text-black":"border border-white/15 bg-white/5 text-white"}`}><BookOpenCheck className="mr-2 inline" size={16}/>Simulados</button>
        <button type="button" onClick={()=>setTab("calendario")} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab==="calendario"?"bg-amber-300 text-black":"border border-white/15 bg-white/5 text-white"}`}><CalendarDays className="mr-2 inline" size={16}/>Calendário das questões salvas</button>
      </div>
    </div>
    {loading?<div className="my-12 flex items-center gap-3"><LoaderCircle className="animate-spin"/>Carregando simulados...</div>:null}
    {error?<p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>:null}
    {message?<p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</p>:null}
    {!loading && tab==="estudos"? <>
      <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">{[1,2,3,4,5,6,7].map(d=><button key={d} onClick={()=>{setDia(d);setActiveId(simulados.find(s=>s.dia===d)?.id??"");setMessage("");}} className={`rounded-xl border p-3 text-sm font-bold ${dia===d?"border-amber-300/70 bg-amber-400/10 text-amber-300":"border-white/15"}`}>Dia {String(d).padStart(2,"0")}</button>)}</div>
      <div className="mt-4 flex flex-wrap gap-2">{simulados.filter(s=>s.dia===dia).map(s=><button key={s.id} onClick={()=>{setActiveId(s.id);setMessage("");}} className={`rounded-xl border px-4 py-3 text-sm font-bold ${current?.id===s.id?"border-amber-300 bg-amber-400/10 text-amber-300":"border-white/15"}`}>{s.titulo}</button>)}</div>
      {current?<section className="mt-5 rounded-[22px] border border-white/10 bg-[var(--surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs uppercase tracking-wider text-[var(--muted)]">{current.origem}</p><h2 className="mt-1 text-2xl font-bold">{current.titulo}</h2><p className="mt-1 text-sm text-[var(--muted)]">{current.total} questões · {currentSaved.length} salvas para revisão</p></div>
          <a href={pdfLink(current.arquivos.prova)} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-amber-300/40 px-4 py-3 text-sm font-semibold text-amber-300">Abrir prova completa <ExternalLink className="ml-2 inline" size={14}/></a>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">{current.arquivos.comentado?<a href={pdfLink(current.arquivos.comentado)} target="_blank" rel="noopener noreferrer" className="text-sm underline">PDF comentado original</a>:null}{current.arquivos.gabarito?<a href={pdfLink(current.arquivos.gabarito)} target="_blank" rel="noopener noreferrer" className="text-sm underline">Gabarito original</a>:null}</div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{current.questoes.map(q=>{
          const key=current.id+"-"+q.numero;
          const isSaved=currentSaved.includes(q.numero);
          return <div key={q.numero} className={`rounded-xl border p-3 ${isSaved?"border-amber-400/35 bg-amber-400/5":"border-white/10"}`}>
            <div className="flex items-center justify-between"><strong>Questão {String(q.numero).padStart(3,"0")}</strong><span className="text-xs text-[var(--muted)]">Página {q.pagina}</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={pdfLink(current.arquivos.prova,q.pagina)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:border-amber-400">Ver questão completa ↗</a>
              <button type="button" disabled={!!working} onClick={()=>toggleSave(current,q.numero)} className={`rounded-lg px-3 py-2 text-xs font-bold ${isSaved?"bg-amber-400 text-black":"border border-amber-400/35 text-amber-300"}`}><Bookmark className="mr-1 inline" size={13}/>{isSaved?"Salva ✓":"Salvar na revisão"}</button>
              <button type="button" onClick={()=>setShowAnswers(v=>({...v,[key]:!v[key]}))} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Gabarito</button>
            </div>{showAnswers[key]?<div className="mt-2 text-xs font-bold text-emerald-400">Gabarito: {q.gabarito==="X"?"Anulada":q.gabarito==="C"?"Certo":"Errado"}</div>:null}
          </div>
        })}</div>
        <div className="mt-7 rounded-2xl border border-amber-400/25 bg-amber-300/5 p-4">
          <h3 className="text-lg font-bold">Concluir simulado e agendar revisão</h3><p className="mt-1 text-sm text-[var(--muted)]">{currentSaved.length} questões selecionadas. O calendário fica separado das revisões R1–R5 e dos nivelamentos.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm">Data da revisão <input type="date" value={reviewDate} onChange={e=>setReviewDate(e.target.value)} className="ml-2 rounded-lg border border-white/20 bg-transparent p-2"/></label>
          <button disabled={!!working||!currentSaved.length} onClick={()=>schedule(current)} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black disabled:opacity-40">{working==="schedule"?"Salvando...":"Concluir e colocar no calendário"}</button></div>
          {reviewForCurrent?<p className="mt-2 text-xs">Já agendado: {reviewForCurrent.scheduled_for}</p>:null}
        </div>
      </section>:null}
    </>:null}
    {!loading && tab==="calendario"?<div className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
        <h2 className="text-lg font-bold">Dias de revisão</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Selecione a data e inicie as questões salvas em ordem numérica.</p>
        <label className="mt-4 block text-xs">Ir para data<input type="date" className="mt-1 w-full rounded-lg border border-white/15 bg-transparent p-2" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label>
        <div className="mt-3 space-y-2">{calendarDays.map(d=><button key={d} type="button" onClick={()=>setSelectedDate(d)} className={`block w-full rounded-xl border p-3 text-left text-sm ${selectedDate===d?"border-amber-400/60 bg-amber-300/10":"border-white/10"}`}>{new Date(d+"T12:00:00").toLocaleDateString("pt-BR")} · {reviews.filter(x=>x.scheduled_for===d).length} simulado(s)</button>)}</div>
        <a href={"/calendario"} className="mt-5 block rounded-xl border border-emerald-400/35 px-3 py-3 text-center text-xs font-semibold text-emerald-300">Abrir calendário principal</a>
      </aside>
      <section className="space-y-4">{reviews.filter(x=>x.scheduled_for===selectedDate).length===0?<div className="rounded-2xl border border-white/10 p-6 text-sm text-[var(--muted)]">Nenhuma revisão agendada para esta data.</div>:null}
        {reviews.filter(x=>x.scheduled_for===selectedDate).map(review=>{
          const sim=simulados.find(s=>s.id===review.simulado_id);
          if(!sim)return null;
          const selected=sim.questoes.filter(q=>saved.some(x=>x.simulado_id===sim.id&&x.numero===q.numero)).sort((a,b)=>a.numero-b.numero);
          return <article key={review.simulado_id} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-amber-300">Dia {String(review.dia_origem).padStart(2,"0")} · {review.completed_at?"Revisão concluída":"Revisão pendente"}</p><h3 className="mt-1 text-2xl font-bold">{review.titulo}</h3><p className="mt-1 text-sm text-[var(--muted)]">{selected.length} questões selecionadas</p></div>
            <span className="rounded-lg border border-amber-400/25 px-3 py-2 text-xs font-bold text-amber-300">Ordem crescente</span></div>
            <p className="mt-4 text-xs leading-6 text-[var(--muted)]">Questões salvas: {selected.map(q=>String(q.numero).padStart(3,"0")).join(", ") || "Nenhuma"}. Você resolverá uma de cada vez, com o enunciado completo na própria tela, correção e anotações.</p>
            <button type="button" disabled={!selected.length} onClick={()=>setRunningId(sim.id)} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-3 text-base font-black text-black disabled:opacity-40">
              <BookOpenCheck size={20}/>{review.completed_at?"Refazer revisão":"Iniciar simulado"}
            </button>
          </article>
        })}</section>
    </div>:null}
  </div>;
}
