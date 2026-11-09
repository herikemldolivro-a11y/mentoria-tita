"use client";
// MT_SIMULADO_UNIVERSAL_V15

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle, NotebookPen, Save, X } from "lucide-react";

export type SimuladoQuestion = { numero: number; pagina: number; gabarito: string; trecho?: string };
export type SimuladoExam = {
  id: string;
  dia: number;
  titulo: string;
  origem: string;
  total: number;
  arquivos: Record<string, string>;
  questoes: SimuladoQuestion[];
};

type AnswerRow = { numero: number; resposta: "C" | "E"; acertou: boolean | null };
type NoteRow = { numero: number; nota: string };
type PreparedTextRow = { numero: number; pagina: number; enunciado: string; texto_base: string | null };

function previewText(q: SimuladoQuestion) {
  const raw = (q.trecho ?? "").trim();
  if (!raw) return "";
  const next = q.numero + 1;
  const nextPattern = new RegExp("(?:\\s)(?:0?" + next + ")[.)](?=\\s)", "g");
  const m = nextPattern.exec(raw);
  return m ? raw.slice(0, m.index).trim() : raw;
}

export function SimuladoExamRunner({
  simulado, questoes, userId, roundId, roundNumber, isRoundCompleted = false, initialSavedNumbers, onSavedChanged, onExit, onCompleted,
}: {
  simulado: SimuladoExam;
  questoes: SimuladoQuestion[];
  userId: string;
  roundId: string;
  roundNumber: number;
  isRoundCompleted?: boolean;
  initialSavedNumbers: number[];
  onSavedChanged: () => Promise<void>;
  onExit: () => void;
  onCompleted: (nextDate: string) => Promise<void>;
}) {
  const ordered = useMemo(() => [...questoes].sort((a,b) => a.numero-b.numero),[questoes]);
  const [index,setIndex] = useState(0);
  const [answers,setAnswers] = useState<Record<number,AnswerRow>>({});
  const [notes,setNotes] = useState<Record<number,string>>({});
  const [persistedNotes,setPersistedNotes] = useState<Record<number,string>>({});
  const [preparedTexts,setPreparedTexts] = useState<Record<number,PreparedTextRow>>({});
  const [preparedError,setPreparedError] = useState<string | null>(null);
  const [savedNumbers,setSavedNumbers] = useState<number[]>(initialSavedNumbers);
  const [showScheduling,setShowScheduling] = useState(false);
  const [nextDate,setNextDate] = useState(() => { const d=new Date();d.setDate(d.getDate()+2);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); });
  const [selected,setSelected] = useState<"C"|"E"|null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [showPdf,setShowPdf] = useState(true);
  const q = ordered[index] ?? null;
  const prepared = q ? preparedTexts[q.numero] : null;
  const displayEnunciado = prepared?.enunciado || (q ? previewText(q) : "");
  const displayTextoBase = prepared?.texto_base || null;
  const previous = q ? answers[q.numero] : null;
  const noteText = q ? notes[q.numero] ?? "" : "";
  const dirty = q ? noteText !== (persistedNotes[q.numero] ?? "") : false;
  const resolvedCount = ordered.filter(v=>Boolean(answers[v.numero])).length;
  const progress = ordered.length ? Math.round(resolvedCount / ordered.length * 100) : 0;
  const allResolved = ordered.length>0 && resolvedCount === ordered.length;
  const today=new Date();
  const todayKey=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const savedCount=savedNumbers.length;
  useEffect(()=>setSavedNumbers(initialSavedNumbers),[simulado.id,initialSavedNumbers.join(",")]);

  useEffect(() => {
    let alive=true;
    const db=createClient();
    Promise.all([
      db.from("mt_simulado_round_answers").select("numero,resposta,acertou").eq("user_id",userId).eq("round_id",roundId),
      db.from("mt_simulado_question_notes").select("numero,nota").eq("user_id",userId).eq("simulado_id",simulado.id),
    ]).then(([a,n])=>{
      if(a.error)throw a.error;
      if(n.error)throw n.error;
      if(!alive)return;
      const savedAnswers:Record<number,AnswerRow>={};
      for(const item of (a.data??[]) as AnswerRow[])savedAnswers[item.numero]=item;
      const stored:Record<number,string>={};
      for(const item of (n.data??[]) as NoteRow[])stored[item.numero]=item.nota;
      setAnswers(savedAnswers);setNotes(stored);setPersistedNotes(stored);
    }).catch(e=>alive&&setError(e instanceof Error?e.message:"Falha ao carregar suas respostas."))
      .finally(()=>alive&&setLoading(false));
    return ()=>{alive=false};
  },[userId,simulado.id,roundId]);

  useEffect(()=>{
    setSelected(q && answers[q.numero] ? answers[q.numero].resposta : null);
  },[index,q?.numero,answers]);

  // MT_SIMULADO_01_COMPLETE_TEXTS_V9: retained for compatibility.
  // MT_SIMULADOS_01_02_COMPLETE_TEXTS_V10: load selected PDFs for Simulados 01 and 02.
  // Private RLS-controlled texts are keyed by the user's simulado and number.
  // The original PDF and all other simulados remain unchanged.
  useEffect(() => {
    // Prepared text lookup applies to every future simulado; PDF remains the fallback.
    let alive = true;
    const db = createClient();
    db.from("mt_simulado_question_texts")
      .select("numero,pagina,enunciado,texto_base")
      .eq("user_id", userId)
      .eq("simulado_id", simulado.id)
      .then(({data,error}) => {
        if (!alive) return;
        if (error) {
          setPreparedError("Não foi possível carregar os enunciados preparados: " + error.message);
          return;
        }
        const byNumber: Record<number,PreparedTextRow> = {};
        for (const item of (data??[]) as PreparedTextRow[]) {
          if (Number.isInteger(item.numero) && item.enunciado) byNumber[item.numero] = item;
        }
        setPreparedTexts(byNumber);
        setPreparedError(null);
      })
      .catch((e: unknown) => {
        if (alive) setPreparedError(e instanceof Error ? e.message : "Erro ao carregar enunciados.");
      });
    return () => { alive = false; };
  }, [simulado.id,userId]);



  const saveNote = useCallback(async (number:number,value:string)=>{
    const db=createClient();
    const {error:e}=await db.from("mt_simulado_question_notes").upsert({
      user_id:userId,simulado_id:simulado.id,numero:number,nota:value,updated_at:new Date().toISOString(),
    },{onConflict:"user_id,simulado_id,numero"});
    if(e)throw e;
    setPersistedNotes(cur=>({...cur,[number]:value}));
  },[userId,simulado.id]);

  async function saveCurrentNote(){
    if(!q||!dirty||saving)return;
    setSaving(true);setError("");
    try{
      await saveNote(q.numero,noteText);
      setMessage("Anotação salva. Ela aparecerá nas próximas revisões desta questão.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar anotação.");}
    finally{setSaving(false);}
  }

  async function move(delta:number){
    if(!q||saving)return;
    setSaving(true);setError("");setMessage("");
    try{
      if(dirty)await saveNote(q.numero,noteText);
      setIndex(cur=>Math.max(0,Math.min(ordered.length-1,cur+delta)));
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a anotação.");}
    finally{setSaving(false);}
  }

  async function selectQuestion(newIndex:number){
    if(!q||saving)return;
    setSaving(true);setError("");setMessage("");
    try{
      if(dirty)await saveNote(q.numero,noteText);
      setIndex(newIndex);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar anotação.");}
    finally{setSaving(false);}
  }

  async function correct(){
    if(!q || !selected || saving)return;
    setSaving(true);setError("");setMessage("");
    try{
      if(dirty)await saveNote(q.numero,noteText);
      const correct=q.gabarito==="X" ? null : selected===q.gabarito;
      const {error:e}=await createClient().from("mt_simulado_round_answers").upsert({
        user_id:userId,round_id:roundId,numero:q.numero,resposta:selected,acertou:correct,
        answered_at:new Date().toISOString(),
      },{onConflict:"user_id,round_id,numero"});
      if(e)throw e;
      setAnswers(cur=>({...cur,[q.numero]:{numero:q.numero,resposta:selected,acertou:correct}}));
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível corrigir a resposta.");}
    finally{setSaving(false);}
  }

  async function saveForRevision(){
    if(!q||saving||savedNumbers.includes(q.numero))return;
    setSaving(true);setError("");
    try{
      const {error:e}=await createClient().from("mt_simulado_saved_questions").upsert({
        user_id:userId,simulado_id:simulado.id,numero:q.numero,
      },{onConflict:"user_id,simulado_id,numero"});
      if(e)throw e;
      setSavedNumbers(old=>old.includes(q.numero)?old:[...old,q.numero].sort((a,b)=>a-b));
      await onSavedChanged();
      setMessage("Questão "+String(q.numero).padStart(3,"0")+" salva para a próxima revisão de "+simulado.titulo+".");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a questão.");}
    finally{setSaving(false);}
  }

  async function finish(){
    if(!q||saving||isRoundCompleted)return;
    if(!allResolved){setError("Corrija todas as questões desta resolução antes de concluir.");return;}
    if(!savedCount){setError("Salve ao menos uma questão para programar a revisão.");return;}
    if(savedNumbers.some(n=>!answers[n])){setError("Corrija também todas as questões salvas.");return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || nextDate<=todayKey){
      setError("Escolha uma data FUTURA para revisar as questões.");return;
    }
    setSaving(true);setError("");
    try{
      if(dirty)await saveNote(q.numero,noteText);
      await onCompleted(nextDate);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível agendar a próxima revisão.");}
    finally{setSaving(false);}
  }

  const pdf = simulado.arquivos.prova
    ? "/api/estudos/simulados/pdf/"+encodeURIComponent(simulado.arquivos.prova)
    : null;

  if(!q) return <div className="rounded-2xl border border-white/10 p-6">Nenhuma questão salva para resolver. <button onClick={onExit} className="underline">Voltar</button></div>;

  return <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080b11] p-4 text-white sm:p-6" aria-label={"Resolução de "+simulado.titulo}>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">{simulado.titulo} · Revisão das questões salvas</p>
        <h2 className="mt-2 font-serif text-3xl">Questão {String(q.numero).padStart(3,"0")}</h2>
        <p className="mt-1 text-sm text-white/60">Questão {index+1} de {ordered.length}, na ordem original da prova · {progress}% respondidas</p>
      </div>
      <button type="button" onClick={async()=>{if(dirty)await saveCurrentNote();onExit();}} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm"><X size={16}/> Sair da resolução</button>
    </header>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs font-semibold text-white/60">{savedCount} questão(ões) selecionada(s) · Rodada {roundNumber===0?"inicial":roundNumber}</span>
      <button type="button" disabled={saving||savedNumbers.includes(q.numero)} onClick={saveForRevision} className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold ${savedNumbers.includes(q.numero)?"border-emerald-400/40 bg-emerald-400/10 text-emerald-300":"border-amber-300/50 bg-amber-300/10 text-amber-200"} disabled:opacity-70`}><Save size={14}/>{savedNumbers.includes(q.numero)?"✓ Salva na revisão":"Salvar na revisão"}</button>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{width:progress+"%"}}/></div>
    {error?<p role="alert" className="mt-4 rounded-xl border border-red-500/40 p-3 text-sm text-red-300">{error}</p>:null}
    {message?<p className="mt-4 text-sm text-emerald-300">{message}</p>:null}
    {allResolved && !isRoundCompleted ? (
      <div className="mt-5 rounded-2xl border border-emerald-400/35 bg-emerald-400/[.07] p-5">
        <p className="font-bold text-emerald-300">Todas as {ordered.length} questões desta resolução foram respondidas.</p>
        <p className="mt-1 text-sm text-white/65">Marque {simulado.titulo} como concluído e escolha a próxima revisão. Ela terá só as {savedCount} questões salvas e abrirá diretamente aqui pelo calendário.</p>
        {!showScheduling ? <button type="button" disabled={!savedCount||saving} onClick={()=>setShowScheduling(true)} className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 font-black text-[#051a13] disabled:opacity-40"><CheckCircle2 className="mr-2 inline" size={17}/>Marcar assunto como concluído</button> : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-white/80">Data da próxima revisão
              <input type="date" min={todayKey} value={nextDate} onChange={e=>setNextDate(e.target.value)} className="mt-1 block rounded-xl border border-white/30 bg-[#131e22] p-3 text-sm text-white"/>
            </label>
            <button type="button" onClick={finish} disabled={saving||!savedCount||nextDate<=todayKey} className="min-h-11 rounded-xl bg-emerald-400 px-5 py-3 font-black text-[#051a13] disabled:opacity-40">{saving?"Agendando...":"Confirmar conclusão e agendar revisão"}</button>
          </div>
        )}
      </div>
    ) : null}
    {isRoundCompleted ? <p className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/[.08] px-4 py-3 text-sm text-emerald-200">Rodada concluída. As respostas desta etapa permanecem salvas no histórico.</p> : null}
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-black tracking-wider text-amber-300">ENUNCIADO DA QUESTÃO {String(q.numero).padStart(3,"0")}</span><span className="text-xs text-white/45">Página original {q.pagina}</span></div>
          {preparedError ? <p role="alert" className="mt-4 text-xs text-red-300">{preparedError}</p> : null}
          {displayEnunciado
            ? <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-white/95">{displayEnunciado}</p>
            : <p className="mt-4 text-sm text-white/70">Enunciado integral disponível no documento original exibido ao lado.</p>}
          {displayTextoBase ? (
            <div className="mt-5 rounded-xl border border-amber-200/25 bg-amber-300/[.045] p-4">
              <h4 className="text-xs font-black tracking-wide text-amber-300">TEXTO-BASE ORIGINAL DA QUESTÃO</h4>
              <p className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-white/85">{displayTextoBase}</p>
            </div>
          ) : null}
          <p className="mt-4 text-xs leading-6 text-white/55">
            {prepared ? "Enunciado preparado para este simulado. O PDF original permanece ao lado para conferir a diagramação." :
              "Textos-base, figuras e fórmulas do PDF original continuam disponíveis ao lado. Consulte a página antes de responder."}
          </p>
          <button type="button" onClick={()=>setShowPdf(x=>!x)} className="mt-3 rounded-xl border border-white/20 px-3 py-2 text-xs text-amber-300">{showPdf?"Ocultar página original":"Mostrar página original completa"}</button>
        </div>
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/[.035] p-5">
          <h3 className="text-base font-bold">Marque sua resposta</h3>
          <p className="mt-1 text-xs text-white/55">Escolha uma alternativa e clique em Corrigir. A resposta oficial só aparece depois.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["C","E"] as const).map(value=><button key={value} type="button" disabled={!!previous||loading||saving||isRoundCompleted} onClick={()=>setSelected(value)} className={`min-h-14 rounded-xl border text-base font-black ${selected===value?"border-amber-300 bg-amber-300 text-black":"border-white/20 bg-white/5 text-white"} disabled:opacity-70`}>{value==="C"?"CERTO":"ERRADO"}</button>)}
          </div>
          {!previous?<button type="button" disabled={!selected||saving||loading||isRoundCompleted} onClick={correct} className="mt-4 w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black disabled:opacity-40">{saving?"Salvando...":"Corrigir resposta"}</button>:<div className={`mt-4 rounded-xl border p-4 text-sm ${previous.acertou===true?"border-emerald-400/35 bg-emerald-400/10 text-emerald-300":previous.acertou===false?"border-red-400/35 bg-red-400/10 text-red-300":"border-white/20 bg-white/5"}`}>
            <strong>{previous.acertou===true?"ACERTOU!":previous.acertou===false?"ERROU":"QUESTÃO ANULADA"}</strong><p className="mt-1">Sua resposta: {previous.resposta==="C"?"Certo":"Errado"}. Gabarito: {q.gabarito==="X"?"Anulada":q.gabarito==="C"?"Certo":"Errado"}.</p>
          </div>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <h3 className="flex items-center gap-2 font-bold"><NotebookPen size={18}/> Anotações desta questão</h3>
          <p className="mt-1 text-xs text-white/55">Ficam salvas pelo simulado e número da questão. Você pode consultá-las em qualquer revisão futura.</p>
          <textarea value={noteText} disabled={loading} onChange={e=>setNotes(cur=>({...cur,[q.numero]:e.target.value}))} rows={5} maxLength={10000} placeholder="Escreva aqui o erro, macete, fundamento, comentário ou ponto de atenção..." className="mt-3 w-full resize-y rounded-xl border border-white/15 bg-[#0e131e] p-3 text-sm leading-6 text-white outline-none focus:border-amber-300"/>
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-white/45">{dirty?"Alterações ainda não salvas":"Anotação sincronizada"}</span><button type="button" disabled={saving||loading||!dirty} onClick={saveCurrentNote} className="flex items-center gap-2 rounded-xl border border-amber-300/40 px-3 py-2 text-xs font-bold text-amber-300 disabled:opacity-50"><Save size={14}/>Salvar anotação</button></div>
        </div>
      </div>
      {showPdf && pdf?<div className="min-w-0 rounded-2xl border border-white/15 bg-white/[.025] p-3">
        <div className="mb-3 flex items-center justify-between gap-3"><strong className="text-sm">Questão completa e texto-base original</strong><span className="text-xs text-white/60">Página {q.pagina}</span></div>
        <iframe key={simulado.id+"-"+q.pagina} src={pdf+"#page="+q.pagina+"&view=FitH&navpanes=0"} title={`Prova original - ${simulado.titulo} - página ${q.pagina}`} className="h-[68vh] min-h-[520px] w-full rounded-lg border border-white/10 bg-white" />
        <p className="mt-2 text-xs leading-5 text-white/55">O PDF está incorporado nesta página da TITÃ. Desça ou amplie para ler todo o enunciado e os textos associados, sem sair do simulado.</p>
      </div>:null}
    </div>
    <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
      <button type="button" onClick={()=>move(-1)} disabled={index===0||saving} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-bold disabled:opacity-30"><ChevronLeft size={18}/>Questão anterior</button>
      <div className="flex flex-wrap items-center justify-center gap-1">{ordered.map((it,i)=><button key={it.numero} type="button" onClick={()=>selectQuestion(i)} disabled={saving} aria-label={`Ir para questão ${it.numero}`} title={`Questão ${it.numero}`} className={`h-2.5 w-2.5 rounded-full ${i===index?"bg-amber-300":answers[it.numero]?"bg-emerald-400":"bg-white/25"}`}/>)}</div>
      {index<ordered.length-1?<button type="button" onClick={()=>move(1)} disabled={saving} className="flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-bold text-black disabled:opacity-40">Próxima questão<ChevronRight size={18}/></button>:<button type="button" onClick={()=>{if(!allResolved)setError("Corrija todas as questões antes de marcar o simulado como concluído.");else setShowScheduling(true);}} disabled={saving||isRoundCompleted} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black disabled:opacity-40"><CheckCircle2 size={18}/>{allResolved?"Marcar assunto como concluído":"Termine todas as questões"}</button>}
    </footer>
  </section>;
}
