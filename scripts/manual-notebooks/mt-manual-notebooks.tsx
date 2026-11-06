"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Check, ChevronLeft, ChevronRight, Clock3, LoaderCircle, NotebookPen, Plus, Save, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notebook = {
  id:string; user_id:string; subject_name:string; topic_name:string;
  scheduled_for:string; status:"draft"|"active"; review_step:number;
  created_at:string;last_reviewed_at:string|null;
};
type Card = {
 id:string;notebook_id:string;user_id:string;front:string;back:string;position:number;
 last_result:boolean|null; correct_total:number;incorrect_total:number;
};
const LOCAL_UPDATE = "mt:manual-notebook-updated";
const today = () => {
 const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
};
const pretty = (s:string) => new Date(s+"T12:00:00").toLocaleDateString("pt-BR");
const fire=()=>window.dispatchEvent(new Event(LOCAL_UPDATE));

export function useManualNotebookCounts() {
 const [counts,setCounts]=useState<Record<string,number>>({});
 useEffect(()=>{
  let live=true;
  const load=async()=>{
   try {
    const db=createClient();
    const {data:auth}=await db.auth.getUser();
    if(!auth.user)return;
    const {data,error}=await db.from("mt_manual_notebooks").select("scheduled_for").eq("user_id",auth.user.id);
    if(error)throw error;
    const next:Record<string,number>={};
    for(const x of data??[])next[x.scheduled_for]=(next[x.scheduled_for]??0)+1;
    if(live)setCounts(next);
   } catch { /* Do not break the existing calendar if manual notebooks are unavailable. */ }
  };
  void load();
  const focus=()=>void load();
  window.addEventListener(LOCAL_UPDATE,focus);
  window.addEventListener("focus",focus);
  return ()=>{live=false;window.removeEventListener(LOCAL_UPDATE,focus);window.removeEventListener("focus",focus)};
 },[]);
 return counts;
}

export function ManualNotebookDayItems({date}:{date:string}) {
 const [items,setItems]=useState<Notebook[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let live=true;
  async function load(){
   const db=createClient();const {data:auth}=await db.auth.getUser();
   if(!auth.user){if(live)setLoading(false);return;}
   const {data}=await db.from("mt_manual_notebooks").select("*").eq("user_id",auth.user.id).eq("scheduled_for",date).order("created_at");
   if(live){setItems((data??[]) as Notebook[]);setLoading(false);}
  }
  void load();
  const update=()=>void load();
  window.addEventListener(LOCAL_UPDATE,update);
  return ()=>{live=false;window.removeEventListener(LOCAL_UPDATE,update)};
 },[date]);
 if(loading)return null;
 if(!items.length)return null;
 return <div className="space-y-2">
  {items.map(n=><Link key={n.id} href={`/caderno/manual/${n.id}`}
   className="flex min-h-[72px] items-center gap-3 rounded-[16px] border border-cyan-300/55 bg-[linear-gradient(90deg,rgba(6,182,212,.17),rgba(10,16,31,.9))] px-4 py-3 text-left transition hover:border-cyan-200 hover:bg-cyan-400/15">
   <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200"><NotebookPen size={18}/></span>
   <span className="min-w-0 flex-1"><strong className="block truncate text-[13px] font-black text-cyan-200">CADERNO AVULSO · {n.subject_name}</strong>
    <span className="mt-1 block truncate text-xs text-white/70">{n.topic_name} · {n.status==="draft"?"CRIAR FLASHCARDS":`REVISÃO ${n.review_step+1}`}</span>
   </span>
   <span className="shrink-0 text-[10px] font-black text-cyan-200">{n.status==="draft"?"EDITAR":"ABRIR"} ›</span>
  </Link>)}
 </div>;
}

export function ManualNotebookCreate() {
 const router=useRouter();const query=useSearchParams();
 const [userId,setUserId]=useState("");
 const [subject,setSubject]=useState("");
 const [topic,setTopic]=useState("");
 const [date,setDate]=useState(query.get("date") || today());
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{createClient().auth.getUser().then(({data})=>setUserId(data.user?.id??""))},[]);
 async function create(e:React.FormEvent) {
  e.preventDefault();if(busy)return;
  if(!subject.trim()||!topic.trim()){setError("Preencha a matéria e o assunto.");return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){setError("Escolha a data da primeira revisão.");return;}
  if(!userId){setError("Faça login na TITÃ.");return;}
  setBusy(true);setError("");
  try {
   const db=createClient();
   const {data,error:e1}=await db.from("mt_manual_notebooks").insert({
    user_id:userId,subject_name:subject.trim(),topic_name:topic.trim(),scheduled_for:date
   }).select("id").single();
   if(e1)throw e1;if(!data?.id)throw new Error("O caderno não foi criado.");
   fire();
   router.push(`/caderno/manual/${data.id}?mode=edit`);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível criar o caderno.");}
  finally{setBusy(false)}
 }
 return <div className="mx-auto max-w-2xl px-4 pb-24 pt-7">
  <Link href="/calendario" className="text-xs text-cyan-400">← Voltar ao calendário</Link>
  <div className="mt-6 rounded-[28px] border border-cyan-300/30 bg-[#0b111e] p-6 text-white shadow-lg sm:p-8">
   <span className="text-xs font-black uppercase tracking-[.15em] text-cyan-300">Caderno avulso · Revisões automáticas</span>
   <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Criar caderno de anotações</h1>
   <p className="mt-3 text-sm leading-6 text-white/60">Você escolhe a matéria e o assunto livremente. Ao criar, abre a área de flashcards. Depois de revisar no dia programado, o calendário avança automaticamente: +2, +4, +7 e +15 dias.</p>
   <form onSubmit={create} className="mt-6 space-y-5">
    <label className="block text-sm font-semibold text-white/85">Matéria<input autoFocus maxLength={140} required value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Ex.: Direito Administrativo" className="mt-2 w-full rounded-xl border border-white/20 bg-black/30 p-3 text-white outline-none focus:border-cyan-300"/></label>
    <label className="block text-sm font-semibold text-white/85">Assunto<input maxLength={220} required value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Ex.: Poderes administrativos" className="mt-2 w-full rounded-xl border border-white/20 bg-black/30 p-3 text-white outline-none focus:border-cyan-300"/></label>
    <label className="block text-sm font-semibold text-white/85">Primeira revisão<input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-black/30 p-3 text-white outline-none focus:border-cyan-300"/></label>
    <p className="text-xs text-cyan-200/85">Caderno avulso em azul-ciano. Não entra no limite diário de 5 nivelamentos.</p>
    {error?<p role="alert" className="text-sm text-rose-300">{error}</p>:null}
    <button type="submit" disabled={busy||!userId} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 font-black text-[#05212a] disabled:opacity-50">{busy?<LoaderCircle className="animate-spin" size={17}/>:<Plus size={17}/>}CRIAR CADERNO E ADICIONAR FLASHCARDS</button>
   </form>
  </div>
 </div>;
}

export function ManualNotebookWorkspace({notebookId}:{notebookId:string}) {
 const router=useRouter();const query=useSearchParams();
 const [userId,setUserId]=useState("");
 const [notebook,setNotebook]=useState<Notebook|null>(null);
 const [cards,setCards]=useState<Card[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [front,setFront]=useState("");
 const [back,setBack]=useState("");
 const [editing,setEditing]=useState<string|null>(null);
 const [mode,setMode]=useState<"edit"|"review">(query.get("mode")==="edit"?"edit":"review");
 const [index,setIndex]=useState(0);
 const [revealed,setRevealed]=useState(false);
 const [answers,setAnswers]=useState<Record<string,boolean>>({});
 const [summary,setSummary]=useState<{next_review_on:string;correct:number;total:number;gap_days:number}|null>(null);

 async function reload(uid?:string) {
  const db=createClient();let current=uid||userId;
  if(!current){const {data}=await db.auth.getUser();current=data.user?.id??"";}
  if(!current)throw new Error("Faça login para acessar o caderno.");
  const [n,c]=await Promise.all([
   db.from("mt_manual_notebooks").select("*").eq("id",notebookId).eq("user_id",current).single(),
   db.from("mt_manual_notebook_cards").select("*").eq("notebook_id",notebookId).eq("user_id",current).order("position",{ascending:true}).order("created_at",{ascending:true})
  ]);
  if(n.error)throw n.error;if(c.error)throw c.error;
  setNotebook(n.data as Notebook);setCards((c.data??[]) as Card[]);
  setUserId(current);
 }
 useEffect(()=>{
  let live=true;
  (async()=>{
   try{await reload();}catch(e){if(live)setError(e instanceof Error?e.message:"Falha ao abrir caderno.");}
   finally{if(live)setLoading(false)}
  })();
  return ()=>{live=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[notebookId]);

 const due=Boolean(notebook?.status==="active"&&notebook.scheduled_for<=today());
 const ordered=useMemo(()=>[...cards].sort((a,b)=>a.position-b.position),[cards]);
 const current=ordered[index]??null;
 const allAnswered=ordered.length>0&&Object.keys(answers).length===ordered.length;

 async function addCard(e:React.FormEvent){
  e.preventDefault();if(busy||!userId||!notebook)return;
  if(!front.trim()||!back.trim()){setError("Informe frente e verso.");return;}
  setBusy(true);setError("");setMessage("");
  try{
   const db=createClient();
   if(editing) {
    const {error:e1}=await db.from("mt_manual_notebook_cards").update({front:front.trim(),back:back.trim(),updated_at:new Date().toISOString()}).eq("id",editing).eq("notebook_id",notebook.id).eq("user_id",userId);
    if(e1)throw e1;
   } else {
    const pos=cards.reduce((n,c)=>Math.max(n,c.position),0)+1;
    const {error:e1}=await db.from("mt_manual_notebook_cards").insert({notebook_id:notebook.id,user_id:userId,front:front.trim(),back:back.trim(),position:pos});
    if(e1)throw e1;
   }
   setFront("");setBack("");setEditing(null);
   await reload(userId);fire();setMessage("Flashcard salvo e vinculado ao calendário.");
  }catch(e){setError(e instanceof Error?e.message:"Erro ao salvar flashcard.");}
  finally{setBusy(false)}
 }

 async function removeCard(id:string){
  if(busy||!notebook||!userId)return;
  if(!window.confirm("Excluir este flashcard?"))return;
  setBusy(true);setError("");
  try{
   const {error:e}=await createClient().from("mt_manual_notebook_cards").delete().eq("id",id).eq("user_id",userId).eq("notebook_id",notebook.id);
   if(e)throw e;
   await reload(userId);fire();
  }catch(e){setError(e instanceof Error?e.message:"Erro ao excluir flashcard.");}
  finally{setBusy(false)}
 }

 function mark(correct:boolean) {
  if(!current)return;
  setAnswers(a=>({...a,[current.id]:correct}));
  setRevealed(false);
  if(index<ordered.length-1)setIndex(index+1);
 }

 async function finishReview(){
  if(!notebook||!userId||!due||!allAnswered||busy)return;
  setBusy(true);setError("");
  try {
   const {data,error:e}=await createClient().rpc("mt_complete_manual_notebook_review",{
    p_notebook_id:notebook.id,p_expected_date:notebook.scheduled_for,p_results:answers
   });
   if(e)throw e;
   if(!data?.ok)throw new Error("Não foi possível concluir esta revisão.");
   setSummary(data as {next_review_on:string;correct:number;total:number;gap_days:number});
   setAnswers({});setIndex(0);setRevealed(false);
   await reload(userId);
   fire();
  }catch(e){setError(e instanceof Error?e.message:"Erro ao concluir revisão.");}
  finally{setBusy(false)}
 }

 if(loading)return <div className="mx-auto grid min-h-80 max-w-4xl place-items-center text-white"><LoaderCircle className="animate-spin"/></div>;
 if(!notebook)return <div className="mx-auto max-w-3xl p-8 text-red-400">{error||"Caderno não encontrado."}</div>;
 return <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 text-white">
  <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/calendario" className="text-xs text-cyan-300">← Calendário principal</Link><Link href="/caderno/manual" className="text-xs text-cyan-300">Todos os cadernos avulsos</Link></div>
  <header className="mt-5 rounded-[28px] border border-cyan-300/40 bg-[#0b1420] p-5 sm:p-7">
   <p className="text-[11px] font-black tracking-[.14em] text-cyan-300">CADERNO AVULSO · SEM LIMITE DIÁRIO</p>
   <h1 className="mt-2 font-serif text-3xl sm:text-4xl">{notebook.subject_name}</h1>
   <p className="mt-1 text-lg text-white/80">{notebook.topic_name}</p>
   <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/70"><span>{cards.length} flashcards</span><span>·</span><span>{notebook.status==="draft"?"EM CONSTRUÇÃO":`Revisão ${notebook.review_step+1}`}</span><span>·</span><span>Data: {pretty(notebook.scheduled_for)}</span></div>
   <div className="mt-5 flex gap-2">
    <button type="button" onClick={()=>{setMode("edit");setSummary(null)}} className={`rounded-xl px-4 py-3 text-sm font-black ${mode==="edit"?"bg-cyan-300 text-[#051922]":"border border-cyan-300/30 text-cyan-200"}`}>Criar / editar flashcards</button>
    <button type="button" disabled={!cards.length} onClick={()=>{setMode("review");setSummary(null);setIndex(0);setAnswers({});setRevealed(false)}} className={`rounded-xl px-4 py-3 text-sm font-black ${mode==="review"?"bg-cyan-300 text-[#051922]":"border border-cyan-300/30 text-cyan-200"} disabled:opacity-40`}>Revisar caderno</button>
   </div>
  </header>
  {error?<p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>:null}
  {message?<p className="mt-5 text-sm text-emerald-300">{message}</p>:null}
  {mode==="edit"?<div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
    <form onSubmit={addCard} className="self-start rounded-2xl border border-white/10 bg-[#0b101a] p-5">
      <h2 className="text-xl font-black">{editing?"Editar flashcard":"Adicionar flashcard"}</h2>
      <label className="mt-5 block text-sm text-white/75">Frente / pergunta<textarea required maxLength={12000} rows={5} value={front} onChange={e=>setFront(e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-white/20 bg-black/40 p-3 text-white outline-none focus:border-cyan-300" placeholder="Pergunta, conceito, pegadinha..."/></label>
      <label className="mt-4 block text-sm text-white/75">Verso / resposta<textarea required maxLength={16000} rows={6} value={back} onChange={e=>setBack(e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-white/20 bg-black/40 p-3 text-white outline-none focus:border-cyan-300" placeholder="Resposta completa, explicação, fundamento..."/></label>
      <button disabled={busy} type="submit" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 font-black text-[#05202b] disabled:opacity-40"><Save size={17}/>{editing?"Salvar alterações":"Salvar flashcard"}</button>
      {editing?<button type="button" onClick={()=>{setEditing(null);setFront("");setBack("")}} className="mt-3 text-sm text-white/60">Cancelar edição</button>:null}
      <p className="mt-4 text-xs leading-5 text-cyan-100/70">Assim que você salvar o primeiro flashcard, o caderno entra na revisão automática da data escolhida. Não conta nos 5 nivelamentos.</p>
    </form>
    <section className="space-y-3"><h2 className="text-lg font-black">Flashcards salvos ({cards.length})</h2>{cards.length===0?<div className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-white/60">Nenhum flashcard ainda. Crie o primeiro ao lado.</div>:null}
     {ordered.map((c,i)=><div key={c.id} className="rounded-xl border border-cyan-300/20 bg-[#0b101a] p-4"><p className="text-xs text-cyan-300">CARD {i+1}</p><p className="mt-2 whitespace-pre-wrap text-sm font-bold">{c.front}</p><p className="mt-2 whitespace-pre-wrap text-sm text-white/60">{c.back}</p><div className="mt-4 flex gap-3"><button type="button" onClick={()=>{setEditing(c.id);setFront(c.front);setBack(c.back)}} className="text-xs text-cyan-300">Editar</button><button type="button" onClick={()=>removeCard(c.id)} className="text-xs text-rose-300">Excluir</button></div></div>)}
    </section>
   </div>:null}
  {mode==="review"?<section className="mt-6 rounded-2xl border border-cyan-300/30 bg-[#0b101a] p-5 sm:p-8">
    {summary?<div className="text-center"><Check size={40} className="mx-auto text-emerald-400"/><h2 className="mt-3 text-3xl font-black">Revisão concluída!</h2><p className="mt-3 text-white/70">{summary.correct} de {summary.total} flashcards lembrados. Próxima revisão: <strong className="text-cyan-300">{pretty(summary.next_review_on)}</strong> (+{summary.gap_days} dias).</p><Link href="/calendario" className="mt-6 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#05202b]">Voltar ao calendário</Link></div>:
    !cards.length?<div className="text-center text-white/60">Crie pelo menos um flashcard primeiro.</div>:
    !due?<div className="text-center"><Clock3 className="mx-auto text-cyan-300" size={30}/><h2 className="mt-4 text-2xl font-bold">Próxima revisão em {pretty(notebook.scheduled_for)}</h2><p className="mt-2 text-white/65">Você pode editar os cartões agora. A revisão automática só libera quando chegar a data.</p><button onClick={()=>setMode("edit")} className="mt-5 rounded-xl border border-cyan-300/40 px-5 py-3 text-cyan-300">Editar flashcards</button></div>:
    <div><div className="flex items-center justify-between"><span className="text-xs font-black text-cyan-300">REVISÃO {notebook.review_step+1}</span><span className="text-xs text-white/60">{Math.min(index+1,ordered.length)} / {ordered.length}</span></div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{width: `${Object.keys(answers).length/ordered.length*100}%`}}/></div>
      {current?<article className="mt-5 rounded-xl border border-white/10 p-5"><p className="text-[10px] tracking-wider text-cyan-300">FRENTE DO FLASHCARD</p><p className="mt-4 whitespace-pre-wrap text-xl leading-8">{current.front}</p>
       {revealed?<div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4"><p className="text-xs font-black text-emerald-300">RESPOSTA</p><p className="mt-3 whitespace-pre-wrap text-base leading-7">{current.back}</p></div>:null}
       <div className="mt-6 flex flex-wrap gap-3">{!revealed?<button onClick={()=>setRevealed(true)} className="w-full rounded-xl bg-cyan-300 py-3 font-black text-[#05202b]">Mostrar resposta</button>:<><button onClick={()=>mark(false)} className="flex-1 rounded-xl border border-rose-300/40 py-3 font-black text-rose-300">Errei</button><button onClick={()=>mark(true)} className="flex-1 rounded-xl bg-emerald-400 py-3 font-black text-[#062217]">Acertei</button></>}</div>
      </article>:null}
      {allAnswered?<button type="button" onClick={finishReview} disabled={busy} className="mt-5 min-h-12 w-full rounded-xl bg-cyan-300 px-4 font-black text-[#05202b] disabled:opacity-50">Concluir revisão e agendar próxima data</button>:null}
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-white/45"><button type="button" onClick={()=>{setIndex(i=>Math.max(i-1,0));setRevealed(false)}} disabled={index===0} className="inline-flex items-center gap-1 disabled:opacity-25"><ChevronLeft size={14}/>Anterior</button><span>{Object.keys(answers).length} / {ordered.length} respondidos</span><button type="button" onClick={()=>{setIndex(i=>Math.min(i+1,ordered.length-1));setRevealed(false)}} disabled={index===ordered.length-1} className="inline-flex items-center gap-1 disabled:opacity-25">Próximo<ChevronRight size={14}/></button></div>
    </div>}</section>:null}
 </div>;
}

export function ManualNotebookDirectory() {
 const [items,setItems]=useState<Notebook[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let live=true;
  const load=async()=>{const db=createClient();const {data:auth}=await db.auth.getUser();if(!auth.user){if(live)setLoading(false);return;}
    const {data}=await db.from("mt_manual_notebooks").select("*").eq("user_id",auth.user.id).order("scheduled_for");
    if(live){setItems((data??[]) as Notebook[]);setLoading(false);}
  };
  void load();
  window.addEventListener(LOCAL_UPDATE,load);
  return ()=>{live=false;window.removeEventListener(LOCAL_UPDATE,load)};
 },[]);
 return <section className="mt-6 rounded-2xl border border-cyan-300/35 bg-[#091320] p-5 text-white sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black tracking-wider text-cyan-300">REVISÃO AUTÔNOMA · CADERNOS AVULSOS</p><h2 className="mt-2 font-serif text-2xl">Meus cadernos criados pelo calendário</h2></div><Link href={`/caderno/manual/novo?date=${today()}`} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-[#05202b]">+ Criar novo</Link></div>
  {loading?<div className="mt-4 text-sm text-white/60">Carregando...</div>:!items.length?<p className="mt-4 text-sm text-white/60">Nenhum caderno avulso criado ainda.</p>:<div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map(item=><Link href={`/caderno/manual/${item.id}`} key={item.id} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] p-4 hover:border-cyan-300/60"><p className="text-[10px] font-bold text-cyan-300">{item.subject_name} · {item.status==="draft"?"EM CONSTRUÇÃO":"REVISÃO "+(item.review_step+1)}</p><h3 className="mt-2 text-lg font-bold">{item.topic_name}</h3><p className="mt-3 text-xs text-white/65">Agendado para {pretty(item.scheduled_for)}</p></Link>)}</div>}
 </section>;
}
