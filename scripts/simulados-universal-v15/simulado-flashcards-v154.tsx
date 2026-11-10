"use client";
// MT_SIMULADO_FLASHCARDS_V154
// Dedicated simulado flashcards; never selects or completes question reviews.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, NotebookPen, RotateCcw, Trash2 } from "lucide-react";

export type SimuladoFlashcard = {
  id: string; user_id: string; simulado_id: string; numero: number | null;
  front: string; back: string;
  front_image_path: string | null; back_image_path: string | null;
  last_result: boolean | null; created_at: string;
};
type ReviewReceipt = { completed_at: string; score: number; total: number };
const bucket = "notebook-images";
const dateBR = (d: string) => new Date(d+"T12:00:00Z").toLocaleDateString("pt-BR",{timeZone:"UTC"});
function previousDay(d: string) {
  const date=new Date(d+"T12:00:00Z");
  date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
function todayFortaleza() {
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function errorText(value: unknown) { return value instanceof Error ? value.message : String(value); }

function PrivateFlashcardImage({path,alt}:{path:string|null;alt:string}) {
  const [src,setSrc]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{
    let alive=true;setSrc("");setError("");
    if (!path)return;
    createClient().storage.from(bucket).createSignedUrl(path,3600).then(({data,error})=>{
      if(!alive)return;
      if(error)setError("Imagem indisponível: "+error.message);
      else setSrc(data?.signedUrl??"");
    }).catch(e=>alive&&setError(errorText(e)));
    return ()=>{alive=false;};
  },[path]);
  if(!path)return null;
  if(error)return <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>;
  return src?<img src={src} alt={alt} loading="lazy" className="mt-3 max-h-[380px] w-auto max-w-full rounded-xl border border-white/15 object-contain" />:<p className="mt-2 text-xs text-white/50">Carregando imagem...</p>;
}

async function loadCards(userId:string,simuladoId:string):Promise<SimuladoFlashcard[]> {
  const {data,error}=await createClient().from("mt_simulado_flashcards")
    .select("id,user_id,simulado_id,numero,front,back,front_image_path,back_image_path,last_result,created_at")
    .eq("user_id",userId).eq("simulado_id",simuladoId).order("created_at",{ascending:true});
  if(error)throw error;
  return (data??[]) as SimuladoFlashcard[];
}

export function SimuladoFlashcardEditor({userId,simuladoId,numero}:{userId:string;simuladoId:string;numero:number}) {
  const [cards,setCards]=useState<SimuladoFlashcard[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [editingId,setEditingId]=useState<string|null>(null);
  const [front,setFront]=useState("");
  const [back,setBack]=useState("");
  const [frontPath,setFrontPath]=useState<string|null>(null);
  const [backPath,setBackPath]=useState<string|null>(null);
  const [frontFile,setFrontFile]=useState<File|null>(null);
  const [backFile,setBackFile]=useState<File|null>(null);
  const questionCards=useMemo(()=>cards.filter(x=>x.numero===numero),[cards,numero]);
  const refresh=useCallback(async()=>setCards(await loadCards(userId,simuladoId)),[userId,simuladoId]);
  useEffect(()=>{
    let alive=true;
    loadCards(userId,simuladoId).then(data=>{if(alive)setCards(data);})
      .catch(e=>{if(alive)setError(errorText(e));})
      .finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[userId,simuladoId]);
  function resetForm(){
    setEditingId(null);setFront("");setBack("");setFrontPath(null);setBackPath(null);setFrontFile(null);setBackFile(null);
  }
  function editCard(c:SimuladoFlashcard) {
    setEditingId(c.id);setFront(c.front);setBack(c.back);
    setFrontPath(c.front_image_path);setBackPath(c.back_image_path);
    setFrontFile(null);setBackFile(null);setError("");setNotice("");
  }
  async function upload(file:File,side:"frente"|"verso") {
    if(file.size>8*1024*1024)throw Error("A imagem deve ter até 8 MB.");
    if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type))
      throw Error("Utilize uma imagem PNG, JPEG, WebP ou GIF.");
    const ext=({ "image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif" } as Record<string,string>)[file.type];
    const path=userId+"/simulados/"+simuladoId+"/"+side+"-"+crypto.randomUUID()+"."+ext;
    const {error}=await createClient().storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw error;
    return path;
  }
  async function saveCard(){
    if(busy)return;
    if(!front.trim()&&!frontFile&&!frontPath){setError("Preencha ou adicione imagem na frente.");return;}
    if(!back.trim()&&!backFile&&!backPath){setError("Preencha ou adicione imagem no verso.");return;}
    setBusy(true);setError("");setNotice("");
    try{
      const newFrontPath=frontFile?await upload(frontFile,"frente"):frontPath;
      const newBackPath=backFile?await upload(backFile,"verso"):backPath;
      const payload={user_id:userId,simulado_id:simuladoId,numero,
        front:front.trim(),back:back.trim(),front_image_path:newFrontPath,back_image_path:newBackPath,
        updated_at:new Date().toISOString()};
      const db=createClient();
      const result=editingId
        ? await db.from("mt_simulado_flashcards").update(payload).eq("id",editingId).eq("user_id",userId)
        : await db.from("mt_simulado_flashcards").insert(payload);
      if(result.error)throw result.error;
      await refresh();resetForm();
      setNotice("Flashcard salvo no caderno deste simulado. Ele será revisado na véspera da revisão agendada.");
    }catch(e){setError("Não foi possível salvar: "+errorText(e));}
    finally{setBusy(false);}
  }
  async function removeCard(id:string){
    if(busy||!window.confirm("Excluir este flashcard? A exclusão não poderá ser desfeita."))return;
    setBusy(true);setError("");setNotice("");
    try{
      const {error}=await createClient().from("mt_simulado_flashcards").delete()
        .eq("id",id).eq("user_id",userId);
      if(error)throw error;
      if(editingId===id)resetForm();
      await refresh();setNotice("Flashcard excluído.");
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  return <section data-mt-flashcard-editor="v154" className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[.045] p-5">
    <h3 className="flex items-center gap-2 text-base font-bold"><NotebookPen size={18}/> Caderno de flashcards · Simulado</h3>
    <p className="mt-2 text-xs leading-6 text-white/65">Crie cards durante a resolução. Eles são independentes de “Salvar na revisão”: nenhuma questão será selecionada automaticamente. Quando você agendar questões para o dia X, o caderno aparece no dia X−1.</p>
    {error?<p role="alert" className="mt-3 rounded-lg border border-red-400/30 p-3 text-sm text-red-300">{error}</p>:null}
    {notice?<p className="mt-3 text-xs text-emerald-300">{notice}</p>:null}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-bold text-white/80">Frente (pergunta)
        <textarea value={front} maxLength={15000} onChange={e=>setFront(e.target.value)} rows={4} placeholder="O que preciso recordar?" className="mt-2 block w-full rounded-lg border border-white/20 bg-[#111924] p-3 text-sm text-white"/>
        <span className="mt-2 flex items-center gap-2"><ImagePlus size={14}/> Imagem da frente</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setFrontFile(e.target.files?.[0]??null)} className="mt-1 w-full text-xs"/>
        {frontFile?<span className="text-xs text-amber-200">{frontFile.name}</span>:<PrivateFlashcardImage path={frontPath} alt="Imagem da frente do flashcard"/>}
      </label>
      <label className="block text-xs font-bold text-white/80">Verso (resposta)
        <textarea value={back} maxLength={15000} onChange={e=>setBack(e.target.value)} rows={4} placeholder="Resposta, explicação ou fundamento" className="mt-2 block w-full rounded-lg border border-white/20 bg-[#111924] p-3 text-sm text-white"/>
        <span className="mt-2 flex items-center gap-2"><ImagePlus size={14}/> Imagem do verso</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setBackFile(e.target.files?.[0]??null)} className="mt-1 w-full text-xs"/>
        {backFile?<span className="text-xs text-amber-200">{backFile.name}</span>:<PrivateFlashcardImage path={backPath} alt="Imagem do verso do flashcard"/>}
      </label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={busy||loading} onClick={()=>void saveCard()} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50">{busy?"Salvando...":editingId?"Atualizar flashcard":"Adicionar flashcard"}</button>
      {editingId?<button type="button" disabled={busy} onClick={resetForm} className="rounded-xl border border-white/25 px-4 py-2.5 text-xs">Cancelar edição</button>:null}
    </div>
    <div className="mt-5 border-t border-white/10 pt-4">
      <p className="text-xs font-bold">Questão {numero} · {questionCards.length} flashcard(s) · {cards.length} no simulado</p>
      {loading?<p className="mt-3 text-xs text-white/60">Carregando caderno...</p>:null}
      {questionCards.map(c=><div key={c.id} className="mt-3 rounded-xl border border-white/15 bg-white/[.04] p-3">
        <p className="whitespace-pre-wrap text-sm"><strong>Frente:</strong> {c.front||"Imagem"}</p>
        <PrivateFlashcardImage path={c.front_image_path} alt="Frente"/>
        <p className="mt-2 whitespace-pre-wrap text-sm text-white/75"><strong>Verso:</strong> {c.back||"Imagem"}</p>
        <PrivateFlashcardImage path={c.back_image_path} alt="Verso"/>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={()=>editCard(c)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Editar</button>
          <button type="button" disabled={busy} onClick={()=>void removeCard(c.id)} className="flex items-center gap-1 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200"><Trash2 size={13}/> Excluir</button>
        </div>
      </div>)}
    </div>
  </section>;
}

export function SimuladoFlashcardReview({userId,simuladoId,roundId,titulo,scheduledFor,onExit,onCompleted}:{
  userId:string;simuladoId:string;roundId:string;titulo:string;scheduledFor:string;
  onExit:()=>void;onCompleted:()=>Promise<void>;
}) {
  const [cards,setCards]=useState<SimuladoFlashcard[]>([]);
  const [receipt,setReceipt]=useState<ReviewReceipt|null>(null);
  const [answers,setAnswers]=useState<Record<string,boolean>>({});
  const [index,setIndex]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const due=previousDay(scheduledFor);
  const canFinish=todayFortaleza()>=due;
  const count=Object.keys(answers).length;
  const current=cards[index]??null;
  useEffect(()=>{
    let alive=true;
    Promise.all([
      loadCards(userId,simuladoId),
      createClient().from("mt_simulado_notebook_reviews").select("completed_at,score,total")
        .eq("user_id",userId).eq("round_id",roundId).maybeSingle(),
    ]).then(([loaded,history])=>{
      if(history.error)throw history.error;
      if(!alive)return;
      setCards(loaded);setReceipt(history.data as ReviewReceipt|null);
    }).catch(e=>alive&&setError(errorText(e))).finally(()=>alive&&setLoading(false));
    return ()=>{alive=false;};
  },[userId,simuladoId,roundId]);
  function rate(ok:boolean){
    if(!current||receipt)return;
    setAnswers(old=>({...old,[current.id]:ok}));
    setRevealed(false);
    if(index<cards.length-1)setIndex(index+1);
  }
  async function finish(){
    if(!canFinish){setError("A conclusão estará disponível em "+dateBR(due)+".");return;}
    if(!cards.length||count!==cards.length||busy||receipt)return;
    setBusy(true);setError("");
    try{
      const {data,error}=await createClient().rpc("mt_complete_simulado_notebook_review",{
        p_round_id:roundId,p_results:answers,
      });
      if(error)throw error;
      if(!(data as {ok?:boolean}|null)?.ok)throw Error("O banco não confirmou a conclusão do caderno.");
      setReceipt({completed_at:new Date().toISOString(),score:(data as {score:number}).score,total:(data as {total:number}).total});
      await onCompleted();
    }catch(e){setError(errorText(e));}
    finally{setBusy(false);}
  }
  return <main data-mt-flashcard-review="v154" className="mx-auto mt-6 max-w-4xl rounded-3xl border border-cyan-300/25 bg-[#09111c] p-5 text-white sm:p-8">
    <div className="flex flex-wrap justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-wider text-cyan-300">TITÃ · CADERNO DO SIMULADO</p>
        <h2 className="mt-2 text-2xl font-bold">{titulo}</h2>
        <p className="mt-2 text-xs text-white/65">Caderno: {dateBR(due)} · Questões: {dateBR(scheduledFor)} · rodadas independentes</p>
      </div>
      <button type="button" onClick={onExit} className="rounded-xl border border-white/25 px-4 py-2 text-sm">Voltar</button>
    </div>
    {loading?<p className="mt-6 flex gap-2"><LoaderCircle className="animate-spin"/>Carregando flashcards...</p>:null}
    {error?<p role="alert" className="mt-5 rounded-lg border border-red-400/30 p-3 text-sm text-red-300">{error}</p>:null}
    {receipt?<p className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-emerald-200"><CheckCircle2 className="mr-2 inline" size={18}/>Caderno desta rodada concluído: {receipt.score}/{receipt.total}. Isso NÃO conclui a revisão das questões.</p>:null}
    {!loading&&!cards.length?<p className="mt-6 text-sm text-white/65">Ainda não há flashcards neste simulado. O calendário não cria tarefa obrigatória para cadernos vazios.</p>:null}
    {current?<div className="mt-6 rounded-2xl border border-white/15 bg-white/[.035] p-5">
      <p className="text-xs font-bold text-cyan-300">FLASHCARD {index+1} DE {cards.length}{current.numero?" · QUESTÃO "+current.numero:""}</p>
      <h3 className="mt-4 whitespace-pre-wrap text-lg font-semibold">{current.front||"Observe a imagem:"}</h3>
      <PrivateFlashcardImage path={current.front_image_path} alt="Frente do flashcard"/>
      {revealed||receipt?<div className="mt-5 border-t border-white/15 pt-4">
        <p className="text-xs font-bold text-emerald-300">RESPOSTA</p>
        <p className="mt-2 whitespace-pre-wrap text-base">{current.back||"Observe a imagem:"}</p>
        <PrivateFlashcardImage path={current.back_image_path} alt="Verso do flashcard"/>
        {!receipt?<div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={()=>rate(false)} className="rounded-xl border border-red-300/50 px-5 py-3 font-bold text-red-200">✕ Errei</button>
          <button type="button" onClick={()=>rate(true)} className="rounded-xl bg-emerald-300 px-5 py-3 font-bold text-black">✓ Acertei</button>
        </div>:null}
      </div>:<button type="button" onClick={()=>setRevealed(true)} className="mt-5 rounded-xl bg-cyan-300 px-5 py-3 font-bold text-black">Mostrar resposta</button>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <button type="button" disabled={index===0} onClick={()=>{setIndex(i=>i-1);setRevealed(false);}} className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-30"><ChevronLeft size={14}/> Anterior</button>
        <p className="text-xs text-white/65">Respondidos: {count}/{cards.length}</p>
        <button type="button" disabled={index>=cards.length-1} onClick={()=>{setIndex(i=>i+1);setRevealed(false);}} className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-30">Próximo <ChevronRight size={14}/></button>
      </div>
    </div>:null}
    {!receipt&&cards.length>0?<div className="mt-6 rounded-2xl border border-cyan-300/25 p-4">
      <p className="text-sm text-white/70">{!canFinish?"Pode estudar agora, mas a conclusão só será liberada a partir de "+dateBR(due)+".":"Depois de classificar todos os flashcards, conclua somente o caderno."}</p>
      {count===cards.length?<button type="button" disabled={busy||!canFinish} onClick={()=>void finish()} className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-black disabled:opacity-40"><BookOpenCheck size={16}/>{busy?"Confirmando...":"Concluir revisão do caderno"}</button>:<button type="button" onClick={()=>{setIndex(0);setRevealed(false);}} className="mt-3 flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-xs"><RotateCcw size={14}/> Revisar cards restantes</button>}
    </div>:null}
  </main>;
}
