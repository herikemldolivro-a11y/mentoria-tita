"use client";
// MT_SIMULADO_FLASHCARDS_V16: user-controlled notebook editor and D-1 review.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, ChevronRight, Eye, ImagePlus, LoaderCircle, NotebookPen, Plus, Trash2, X } from "lucide-react";

const BUCKET = "notebook-images";
type Card = {
  id:string; user_id:string; simulado_id:string; numero:number|null;
  front:string; back:string; front_image_path:string|null; back_image_path:string|null;
  last_result:boolean|null; correct_total:number; incorrect_total:number; created_at:string;
};
type SignedImages = Record<string,string>;
const mimeExt:Record<string,string> = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"};

async function signedImages(cards:Card[]) {
  const db=createClient();
  const paths=Array.from(new Set(cards.flatMap(c=>[c.front_image_path,c.back_image_path]).filter((x):x is string=>Boolean(x))));
  const entries=await Promise.all(paths.map(async p=>{
    const {data,error}=await db.storage.from(BUCKET).createSignedUrl(p,60*60);
    return [p,error?"":(data?.signedUrl??"")] as const;
  }));
  return Object.fromEntries(entries) as SignedImages;
}
async function readCards(userId:string,simuladoId:string) {
  const {data,error}=await createClient().from("mt_simulado_flashcards")
    .select("id,user_id,simulado_id,numero,front,back,front_image_path,back_image_path,last_result,correct_total,incorrect_total,created_at")
    .eq("user_id",userId).eq("simulado_id",simuladoId)
    .order("created_at",{ascending:true}).order("id",{ascending:true});
  if(error)throw error;
  return (data??[]) as Card[];
}
function CardSide({text,path,images,front}:{text:string;path:string|null;images:SignedImages;front:boolean}) {
  return <div className="space-y-3">
    {text?<p className="whitespace-pre-wrap text-sm leading-7 text-white/90">{text}</p>:null}
    {path && images[path]?<img src={images[path]} alt={front?"Print da frente do flashcard":"Print do verso do flashcard"} loading="lazy" className="max-h-[440px] w-auto max-w-full rounded-lg border border-white/15 object-contain"/>:null}
    {path && !images[path]?<span className="text-xs text-amber-200/80">Imagem anexada (sem prévia disponível)</span>:null}
  </div>;
}

export function SimuladoFlashcardEditor({
  open,onClose,simuladoId,simuladoTitle,questionNumber,userId,onChanged,
}:{
  open:boolean; onClose:()=>void;simuladoId:string;simuladoTitle:string;
  questionNumber:number|null;userId:string;onChanged:(count:number)=>void;
}) {
  const [cards,setCards]=useState<Card[]>([]);
  const [images,setImages]=useState<SignedImages>({});
  const [front,setFront]=useState("");
  const [back,setBack]=useState("");
  const [frontFile,setFrontFile]=useState<File|null>(null);
  const [backFile,setBackFile]=useState<File|null>(null);
  const [resetKey,setResetKey]=useState(0);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [viewCard,setViewCard]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    const rows=await readCards(userId,simuladoId);
    const signed=await signedImages(rows);
    setCards(rows);setImages(signed);onChanged(rows.length);
  },[userId,simuladoId,onChanged]);

  useEffect(()=>{
    if(!open)return;
    let alive=true;
    setError("");setMessage("");setLoading(true);
    (async()=>{
      const rows=await readCards(userId,simuladoId);
      const signed=await signedImages(rows);
      if(!alive)return;
      setCards(rows);setImages(signed);onChanged(rows.length);
    })().catch(e=>{if(alive)setError(e instanceof Error?e.message:"Não foi possível abrir o caderno.");})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false};
  },[open,simuladoId,userId,onChanged]);

  async function upload(file:File,cardId:string,side:"front"|"back"){
    if(!mimeExt[file.type])throw Error("Use imagens PNG, JPG, WEBP ou GIF.");
    if(file.size>8*1024*1024)throw Error("O print deve ter no máximo 8 MB.");
    const path=userId+"/simulados/"+simuladoId+"/"+cardId+"/"+side+"-"+crypto.randomUUID()+"."+mimeExt[file.type];
    const {error:e}=await createClient().storage.from(BUCKET).upload(path,file,{
      contentType:file.type,upsert:false,cacheControl:"3600",
    });
    if(e)throw e;
    return path;
  }
  async function saveCard(){
    if(busy||(!front.trim()&&!frontFile)||(!back.trim()&&!backFile))return;
    setBusy(true);setError("");setMessage("");
    const uploaded:string[]=[];
    try{
      if(front.length>15000||back.length>15000)throw Error("O texto deve ter até 15.000 caracteres por lado.");
      const id=crypto.randomUUID();
      const frontPath=frontFile?await upload(frontFile,id,"front"):null;
      if(frontPath)uploaded.push(frontPath);
      const backPath=backFile?await upload(backFile,id,"back"):null;
      if(backPath)uploaded.push(backPath);
      const {error:e}=await createClient().from("mt_simulado_flashcards").insert({
        id,user_id:userId,simulado_id:simuladoId,numero:questionNumber,
        front:front.trim(),back:back.trim(),
        front_image_path:frontPath,back_image_path:backPath,
      });
      if(e)throw e;
      setFront("");setBack("");setFrontFile(null);setBackFile(null);setResetKey(k=>k+1);
      setMessage("Flashcard salvo. Ele será revisado um dia antes de cada rodada agendada deste simulado.");
      await refresh();
    }catch(e){
      if(uploaded.length)await createClient().storage.from(BUCKET).remove(uploaded).catch(()=>{});
      setError(e instanceof Error?e.message:"Não foi possível salvar o flashcard.");
    }finally{setBusy(false);}
  }
  async function removeCard(card:Card) {
    if(busy||!window.confirm("Excluir este flashcard do simulado?"))return;
    setBusy(true);setError("");
    try{
      const {error:e}=await createClient().from("mt_simulado_flashcards")
        .delete().eq("id",card.id).eq("user_id",userId);
      if(e)throw e;
      const paths=[card.front_image_path,card.back_image_path].filter((p):p is string=>Boolean(p));
      if(paths.length)await createClient().storage.from(BUCKET).remove(paths);
      if(viewCard===card.id)setViewCard(null);
      await refresh();setMessage("Flashcard excluído.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível excluir o flashcard.");}
    finally{setBusy(false);}
  }
  if(!open)return null;
  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label={"Caderno de anotações de "+simuladoTitle} onClick={e=>e.stopPropagation()} className="max-h-[94vh] w-full max-w-[790px] overflow-y-auto rounded-t-[26px] border border-amber-300/25 bg-[#090d14] text-white shadow-2xl sm:rounded-[26px]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0b1019] p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">Caderno de Anotações · Simulados</p>
          <h2 className="mt-1 font-serif text-2xl">Flashcards de {simuladoTitle}</h2>
          <p className="mt-1 text-xs text-white/55">{cards.length} flashcard(s) · Frente e verso com texto e/ou print</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar caderno" className="rounded-lg border border-white/20 p-2"><X size={19}/></button>
      </div>
      <div className="space-y-6 p-5">
        {error?<p role="alert" className="rounded-lg border border-red-400/30 p-3 text-sm text-red-300">{error}</p>:null}
        {message?<p className="rounded-lg border border-emerald-300/30 p-3 text-sm text-emerald-200">{message}</p>:null}
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[.04] p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-200"><Plus size={17}/> Novo flashcard {questionNumber?"· Questão "+String(questionNumber).padStart(3,"0"):""}</h3>
          <p className="mt-1 text-xs text-white/60">Crie agora. Quando programar a revisão das questões para o dia X, este caderno aparecerá no calendário em X−1.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black text-amber-300">FRENTE</label>
              <textarea value={front} onChange={e=>setFront(e.target.value)} rows={5} placeholder="Pergunta, conceito ou anotação..." className="w-full rounded-xl border border-white/20 bg-[#111824] p-3 text-sm text-white outline-none focus:border-amber-300"/>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 p-3 text-xs text-white/80"><ImagePlus size={16}/> {frontFile?frontFile.name:"Adicionar print da frente"}
                <input key={"front-"+resetKey} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={e=>setFrontFile(e.target.files?.[0]??null)}/>
              </label>
              {frontFile?<button type="button" onClick={()=>{setFrontFile(null);setResetKey(k=>k+1)}} className="text-xs text-red-300">Remover print</button>:null}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-violet-300">VERSO</label>
              <textarea value={back} onChange={e=>setBack(e.target.value)} rows={5} placeholder="Resposta, regra, macete, comentário..." className="w-full rounded-xl border border-white/20 bg-[#111824] p-3 text-sm text-white outline-none focus:border-violet-300"/>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 p-3 text-xs text-white/80"><ImagePlus size={16}/> {backFile?backFile.name:"Adicionar print do verso"}
                <input key={"back-"+resetKey} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={e=>setBackFile(e.target.files?.[0]??null)}/>
              </label>
              {backFile?<button type="button" onClick={()=>{setBackFile(null);setResetKey(k=>k+1)}} className="text-xs text-red-300">Remover print</button>:null}
            </div>
          </div>
          <button type="button" disabled={busy||(!front.trim()&&!frontFile)||(!back.trim()&&!backFile)} onClick={()=>void saveCard()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-black text-[#131006] disabled:opacity-40">{busy?<LoaderCircle className="animate-spin" size={16}/>:<CheckCircle2 size={16}/>}Salvar flashcard</button>
        </div>
        <div>
          <h3 className="text-base font-bold">Flashcards do simulado</h3>
          {loading?<p className="mt-3 text-sm text-white/60">Carregando caderno...</p>:null}
          {!loading && cards.length===0?<p className="mt-3 text-sm text-white/55">Nenhum flashcard criado. Um caderno vazio não gera atividade no calendário.</p>:null}
          <div className="mt-3 space-y-3">
            {cards.map((c,i)=><div key={c.id} className="rounded-xl border border-white/15 bg-white/[.025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-amber-200">Flashcard {i+1}{c.numero?" · Q"+String(c.numero).padStart(3,"0"):""}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setViewCard(old=>old===c.id?null:c.id)} className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs"><Eye size={14}/>{viewCard===c.id?"Ocultar":"Ver"}</button>
                  <button type="button" disabled={busy} onClick={()=>void removeCard(c)} className="flex items-center gap-1 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300"><Trash2 size={14}/>Excluir</button>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-white/75">{c.front||"Print da frente"}</p>
              {viewCard===c.id?<div className="mt-3 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
                <div><p className="mb-2 text-xs font-bold text-amber-300">FRENTE</p><CardSide front text={c.front} path={c.front_image_path} images={images}/></div>
                <div><p className="mb-2 text-xs font-bold text-violet-300">VERSO</p><CardSide front={false} text={c.back} path={c.back_image_path} images={images}/></div>
              </div>:null}
            </div>)}
          </div>
        </div>
        <button type="button" onClick={onClose} className="w-full rounded-xl border border-white/25 px-5 py-3 text-sm font-bold">Fechar e voltar à resolução</button>
      </div>
    </section>
  </div>;
}

export function SimuladoFlashcardReview({
  roundId,simuladoId,simuladoTitle,userId,scheduledFor,onExit,onCompleted,
}:{
  roundId:string;simuladoId:string;simuladoTitle:string;userId:string;
  scheduledFor:string|null;onExit:()=>void;onCompleted:()=>Promise<void>;
}) {
  const [cards,setCards]=useState<Card[]>([]);
  const [images,setImages]=useState<SignedImages>({});
  const [position,setPosition]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [results,setResults]=useState<Record<string,boolean>>({});
  const [completed,setCompleted]=useState<{score:number;total:number}|null>(null);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const dueDay=useMemo(()=>{
    if(!scheduledFor)return "";
    const d=new Date(scheduledFor+"T12:00:00");
    d.setDate(d.getDate()-1);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  },[scheduledFor]);
  const todayKey=()=>{
    const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  };
  useEffect(()=>{
    let alive=true;setLoading(true);setError("");
    (async()=>{
      const db=createClient();
      const [data,review]=await Promise.all([
        readCards(userId,simuladoId),
        db.from("mt_simulado_notebook_reviews").select("score,total,completed_at")
          .eq("user_id",userId).eq("round_id",roundId).maybeSingle()
      ]);
      if(review.error)throw review.error;
      const signed=await signedImages(data);
      if(!alive)return;
      setCards([...data].sort((a,b)=>
        Number(a.last_result===false?0:1)-Number(b.last_result===false?0:1)||
        b.incorrect_total-a.incorrect_total||
        a.created_at.localeCompare(b.created_at)));
      setImages(signed);
      if(review.data)setCompleted({score:review.data.score,total:review.data.total});
    })().catch(e=>{if(alive)setError(e instanceof Error?e.message:"Não foi possível carregar os flashcards.");})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false};
  },[userId,simuladoId,roundId]);

  const current=cards[position]??null;
  const finished=cards.length>0 && Object.keys(results).length===cards.length;
  async function finish(){
    if(busy||!finished||completed)return;
    setBusy(true);setError("");
    try{
      const {data,error:e}=await createClient().rpc("mt_complete_simulado_notebook_review",{
        p_round_id:roundId,p_results:results,
      });
      if(e)throw e;
      if(!(data as {ok?:boolean})?.ok)throw Error("Conclusão não confirmada no banco.");
      setCompleted({score:Number(data.score),total:Number(data.total)});
      setMessage("Caderno concluído e marcado no calendário. A revisão das questões continua na data marcada.");
      await onCompleted();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível concluir o caderno.");}
    finally{setBusy(false);}
  }
  return <section className="mx-auto mt-6 max-w-[1050px] rounded-[26px] border border-violet-300/25 bg-[#0a0e18] p-5 text-white sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-violet-300">Caderno de anotações · D−1 · Simulado</span>
        <h1 className="mt-2 font-serif text-3xl">{simuladoTitle}</h1>
        <p className="mt-2 text-sm text-white/60">Revisão dos flashcards: {dueDay?dueDay.split("-").reverse().join("/"):"sem data"} · Questões: {scheduledFor?scheduledFor.split("-").reverse().join("/"):"sem data"}</p>
      </div>
      <button type="button" onClick={onExit} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm"><X size={16}/> Voltar ao calendário</button>
    </div>
    {error?<p role="alert" className="mt-5 rounded-xl border border-red-400/30 p-4 text-sm text-red-300">{error}</p>:null}
    {message?<p className="mt-5 rounded-xl border border-emerald-400/30 p-4 text-sm text-emerald-200">{message}</p>:null}
    {loading?<div className="mt-12 flex items-center gap-3 text-sm text-white/70"><LoaderCircle className="animate-spin" size={18}/>Carregando flashcards...</div>:null}
    {!loading && completed?<div className="mt-8 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-300"><CheckCircle2 size={22}/> Caderno concluído</h2>
      <p className="mt-3 text-sm text-white/75">Acertos: {completed.score} de {completed.total}. Esta conclusão fica registrada somente para a rodada correspondente.</p>
      <button type="button" onClick={onExit} className="mt-5 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-black">Voltar ao calendário</button>
    </div>:null}
    {!loading && !completed && cards.length===0?<p className="mt-7 text-sm text-white/70">Este caderno ainda não tem flashcards. Abra a resolução das questões e crie um na opção Caderno de anotações.</p>:null}
    {!loading && !completed && cards.length>0 && !finished && current?<div className="mt-7">
      <div className="mb-3 flex items-center justify-between text-xs text-white/55"><span>Flashcard {position+1} de {cards.length}{current.numero?" · Q"+String(current.numero).padStart(3,"0"):""}</span><span>{Object.keys(results).length} respondidos</span></div>
      <div className="min-h-72 rounded-2xl border border-white/15 bg-[#121827] p-6">
        <span className="text-xs font-black tracking-wider text-amber-300">{revealed?"VERSO":"FRENTE"}</span>
        <div className="mt-5"><CardSide text={revealed?current.back:current.front} path={revealed?current.back_image_path:current.front_image_path} front={!revealed} images={images}/></div>
        {!revealed?<button type="button" onClick={()=>setRevealed(true)} className="mt-8 flex items-center gap-2 rounded-xl border border-violet-300/40 px-4 py-3 text-sm font-bold text-violet-200"><Eye size={17}/>Revelar o verso</button>:null}
      </div>
      {revealed?<div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={()=>{setResults(r=>({...r,[current.id]:false}));setPosition(i=>i+1);setRevealed(false);}} className="rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-4 font-bold text-red-300">Errei · rever amanhã</button>
        <button type="button" onClick={()=>{setResults(r=>({...r,[current.id]:true}));setPosition(i=>i+1);setRevealed(false);}} className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 font-bold text-emerald-300">Acertei</button>
      </div>:null}
    </div>:null}
    {!loading && !completed && finished?<div className="mt-8 rounded-xl border border-violet-400/35 bg-violet-400/[.06] p-6">
      <h2 className="text-xl font-bold">Todos os {cards.length} flashcards revisados</h2>
      <p className="mt-2 text-sm text-white/70">{Object.values(results).filter(Boolean).length} acertos · {Object.values(results).filter(x=>!x).length} erros. Os erros ficam marcados para amanhã.</p>
      {dueDay && dueDay>todayKey()?<p className="mt-4 text-sm text-amber-300">O caderno ficará disponível para concluir a partir de {dueDay.split("-").reverse().join("/")}.</p>:null}
      <button type="button" onClick={()=>void finish()} disabled={busy||(!!dueDay&&dueDay>todayKey())} className="mt-5 w-full rounded-xl bg-emerald-300 px-5 py-3 font-black text-black disabled:opacity-40">{busy?"Salvando...":"Concluir caderno no calendário"}</button>
    </div>:null}
  </section>;
}
