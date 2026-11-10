"use client";
// MT_ENGLISH_ROUTINE_V160 · 2 readings/day, vocabulary D+2/4/7, errors tomorrow, favorite sentences.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenText, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, Languages, LoaderCircle, RotateCcw, Sparkles, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Reading = { id:string;title:string;slot:number;completed:boolean;mode:string;url:string };
type Summary = { date:string;readings:Reading[];words_due:number;favorite_phrases:number;favorite_completed:boolean };
type Word = { id:string;word:string;translation:string;context:string|null;is_error:boolean;due_since:string;due_stages:{interval_days:number;scheduled_for:string}[];wrong_total:number;correct_total:number };
type WordQueue = {date:string;cards:Word[];count:number;future_scheduled:number};
type Phrase = {id:string;word:string;translation:string;phrase_en:string;source:"ai"|"context"|"manual"};
type PhraseQueue = {date:string;cards:Phrase[];total:number;completed:boolean;completed_at:string|null};
const START="2026-11-10";
const tz="America/Fortaleza";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const shift=(d:string,n:number)=>{const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
const showDate=(d:string)=>new Date(d+"T12:00:00Z").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"});
const err=(e:unknown)=>e instanceof Error?e.message:String(e);
const sectionStyle="rounded-[24px] border border-white/15 bg-[#0c111b] p-5 text-white sm:p-7";
function ReviewCard({word,onResult,busy,canAnswer}:{word:Word;onResult:(correct:boolean)=>void;busy:boolean;canAnswer:boolean}) {
  const [revealed,setRevealed]=useState(false);
  useEffect(()=>setRevealed(false),[word.id]);
  return <article className="mt-4 rounded-2xl border border-sky-300/20 bg-white/[.035] p-5">
    <span className="text-xs font-bold text-sky-300">{word.is_error?"RETORNO DE ERRO · DIA SEGUINTE":"REVISÃO ESPAÇADA"} · {showDate(word.due_since)}</span>
    <h3 className="mt-4 font-serif text-4xl">{word.word}</h3>
    {word.context?<p className="mt-2 text-sm leading-6 text-white/60">{word.context}</p>:null}
    {revealed?<div className="mt-4 border-t border-white/15 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Tradução / significado</p>
      <strong className="mt-2 block text-lg">{word.translation}</strong>
      <div className="mt-5 flex gap-3">
        <button disabled={busy||!canAnswer} type="button" onClick={()=>onResult(false)} className="rounded-xl border border-rose-300/50 px-5 py-3 text-sm font-bold text-rose-200 disabled:opacity-40">Errei · voltar amanhã</button>
        <button disabled={busy||!canAnswer} type="button" onClick={()=>onResult(true)} className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-black disabled:opacity-40">Acertei · avançar</button>
      </div>
    </div>:<button type="button" onClick={()=>setRevealed(true)} className="mt-5 flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-bold"><Eye size={17}/> Revelar significado</button>}
  </article>;
}

export function EnglishDailyRoutine() {
  const [day,setDay]=useState<string>(()=>today()<START?START:today());
  const [tab,setTab]=useState<"texts"|"words"|"phrases">("texts");
  const [summary,setSummary]=useState<Summary|null>(null);
  const [queue,setQueue]=useState<WordQueue|null>(null);
  const [phrases,setPhrases]=useState<PhraseQueue|null>(null);
  const [phraseViewed,setPhraseViewed]=useState<Record<string,boolean>>({});
  const [phraseMarked,setPhraseMarked]=useState<Record<string,boolean>>({});
  const [wordIndex,setWordIndex]=useState(0);
  const [revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const url=new URLSearchParams(window.location.search);
    const d=url.get("data")??url.get("date");
    if(d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d>=START)setDay(d);
    const t=url.get("tab");
    if(t==="words"||t==="phrases"||t==="texts")setTab(t);
  },[]);

  const refresh=useCallback(async()=>{
    const db=createClient();
    const auth=await db.auth.getUser();
    if(auth.error||!auth.data.user)throw Error("Entre na sua conta para acompanhar o inglês.");
    const [plan,wordReview,favReview]=await Promise.all([
      db.rpc("mt_english_calendar_summary",{p_on_date:day}),
      db.rpc("get_english_spaced_review_queue",{p_on_date:day}),
      db.rpc("mt_english_favorite_daily",{p_on_date:day}),
    ]);
    if(plan.error)throw plan.error;
    if(wordReview.error)throw wordReview.error;
    if(favReview.error)throw favReview.error;
    setSummary(plan.data as Summary);
    setQueue(wordReview.data as WordQueue);
    setPhrases(favReview.data as PhraseQueue);
  },[day]);

  useEffect(()=>{
    let alive=true;setLoading(true);setError("");setMessage("");setWordIndex(0);
    setPhraseViewed({});setPhraseMarked({});
    refresh().catch(e=>{if(alive)setError(err(e));}).finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[refresh,revision]);

  const todayKey=today();
  const future=day>todayKey;
  const cards=queue?.cards??[];
  const current=cards[Math.min(wordIndex,Math.max(cards.length-1,0))]??null;
  const markedCount=Object.values(phraseMarked).filter(Boolean).length;
  const dayFullyRead=Boolean(summary?.readings.length)&&summary!.readings.every(r=>r.completed);
  const dateNav=(delta:number)=>setDay(d=>{const x=shift(d,delta);return x<START?START:x;});

  async function reviewWord(correct:boolean){
    if(!current||busy||future)return;
    setBusy(true);setError("");
    try{
      const {error:e}=await createClient().rpc("record_english_spaced_review",{p_vocab_id:current.id,p_correct:correct});
      if(e)throw e;
      setWordIndex(0);
      await refresh();
      setMessage(correct?"Acerto registrado. Próxima revisão avançou na sequência 2 → 4 → 7.":"Erro registrado. Esta palavra volta amanhã; não precisa repeti-la hoje.");
    }catch(e){setError(err(e));}finally{setBusy(false);}
  }

  async function completePhrases(){
    if(!phrases?.cards.length||phrases.completed||busy||future||markedCount!==phrases.cards.length)return;
    setBusy(true);setError("");
    try{
      const {error:e}=await createClient().rpc("mt_english_complete_favorite_daily",{p_on_date:day});
      if(e)throw e;
      await refresh();setMessage("✓ As frases com as palavras favoritadas foram concluídas neste dia.");
    }catch(e){setError(err(e));}finally{setBusy(false);}
  }

  async function generateNewPhrases(){
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/ingles/frases",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"Não foi possível criar frases com IA.");
      await refresh();setMessage("Frases novas geradas com IA para "+body.generated+" palavra(s).");
    }catch(e){setError(err(e));}finally{setBusy(false);}
  }

  const pendingAI=useMemo(()=>phrases?.cards.filter(x=>x.source!=="ai").length??0,[phrases]);
  return <main data-mt-english-v160="1" className="mx-auto max-w-[1160px] px-4 pb-24 pt-7 text-[var(--ink)] sm:px-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/ingles" className="text-xs font-bold text-[var(--muted)]">← Voltar ao Inglês</Link>
      <Link href="/ingles/vocabulario" className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--gold-bright)]"><Star size={16} className="mr-2 inline"/>Favoritar palavras no vocabulário</Link>
    </div>
    <section className="mt-5 rounded-[28px] border border-amber-300/30 bg-[linear-gradient(135deg,#101a2b,#090e16)] p-6 text-white sm:p-8">
      <span className="text-xs font-black uppercase tracking-wider text-amber-300"><Languages size={17} className="mr-2 inline"/> TITÃ · REORGANIZAÇÃO DO INGLÊS</span>
      <h1 className="mt-3 font-serif text-4xl">Rotina diária de Inglês</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Dois textos inéditos por dia, palavras salvas em revisões 2 → 4 → 7 dias e, separadamente, 10 frases aleatórias com suas palavras favoritadas. Tudo preserva seu histórico.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={day===START} onClick={()=>dateNav(-1)} className="rounded-xl border border-white/20 p-3 disabled:opacity-30" aria-label="Dia anterior"><ChevronLeft/></button>
        <input type="date" min={START} value={day} onChange={e=>{if(e.target.value>=START)setDay(e.target.value);}} className="rounded-xl border border-amber-300/25 bg-[#111a2c] px-4 py-3 font-bold text-white"/>
        <button type="button" onClick={()=>dateNav(1)} className="rounded-xl border border-white/20 p-3" aria-label="Próximo dia"><ChevronRight/></button>
        <button type="button" onClick={()=>setDay(today()<START?START:today())} className="rounded-xl border border-white/20 px-4 py-3 text-xs font-bold">Hoje / primeiro dia</button>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={()=>setTab("texts")} className={"rounded-xl border p-4 text-left "+(tab==="texts"?"border-amber-300 bg-amber-300/10":"border-white/15")}>
          <p className="text-xs text-amber-300">TEXTOS DE INGLÊS</p><strong className="mt-2 block text-xl">{summary?.readings.length??"—"}/2</strong><span className="text-xs text-white/60">Novos textos do dia</span>
        </button>
        <button type="button" onClick={()=>setTab("words")} className={"rounded-xl border p-4 text-left "+(tab==="words"?"border-sky-300 bg-sky-300/10":"border-white/15")}>
          <p className="text-xs text-sky-300">PALAVRAS INGLÊS</p><strong className="mt-2 block text-xl">{queue?.count??"—"}</strong><span className="text-xs text-white/60">Revisões vencidas até {showDate(day)}</span>
        </button>
        <button type="button" onClick={()=>setTab("phrases")} className={"rounded-xl border p-4 text-left "+(tab==="phrases"?"border-emerald-300 bg-emerald-300/10":"border-white/15")}>
          <p className="text-xs text-emerald-300">FRASES COM AS PALAVRAS FAVORITADAS</p><strong className="mt-2 block text-xl">{phrases?.total??"—"}/10</strong><span className="text-xs text-white/60">{phrases?.completed?"Concluídas":"Atividade diária independente"}</span>
        </button>
      </div>
    </section>
    {error?<p role="alert" className="mt-5 rounded-xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-300">{error}</p>:null}
    {message?<p className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-300">{message}</p>:null}
    {loading?<div className="mt-6 flex gap-3 rounded-2xl border border-[var(--border)] p-7"><LoaderCircle className="animate-spin"/>Carregando rotina...</div>:null}
    {!loading && tab==="texts"?<section className={"mt-6 "+sectionStyle}>
      <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><BookOpenText/> Dois textos de {showDate(day)}</h2>{dayFullyRead?<span className="text-sm text-emerald-300">✓ Concluídos</span>:null}</div>
      <p className="mt-2 text-sm text-white/65">Só entram textos ainda não concluídos antes da reorganização. Leia, salve palavras clicando nelas e finalize normalmente no leitor.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{(summary?.readings??[]).map(t=><Link key={t.id} href={t.url+"?return=rotina"} className={"rounded-2xl border p-5 transition hover:border-amber-200 "+(t.completed?"border-emerald-400/35 bg-emerald-300/[.05]":"border-amber-300/20 bg-white/[.035]")}>
        <p className="text-xs font-bold text-amber-300">LEITURA {t.slot} / 2 · {t.mode==="exam"?"COM QUESTÕES":"LEITURA"}</p>
        <strong className="mt-3 block font-serif text-xl">{t.title}</strong>
        <span className={"mt-4 inline-block text-xs font-bold "+(t.completed?"text-emerald-300":"text-amber-200")}>{t.completed?"✓ Já concluído · reler":"Abrir e estudar →"}</span>
      </Link>)}</div>
      {!summary?.readings.length?<p className="mt-5 rounded-xl border border-white/15 p-5 text-sm text-white/70">Não há textos inéditos cadastrados para esta data. Os 12 textos originais ficam preservados; será necessário adicionar novos textos para continuar o ritmo de 2 por dia.</p>:null}
      {day>todayKey?<p className="mt-4 text-xs text-white/55">Leituras futuras disponíveis para consulta; marque como concluídas somente após estudá-las.</p>:null}
    </section>:null}
    {!loading && tab==="words"?<section className={"mt-6 "+sectionStyle}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex gap-2 text-xl font-bold"><RotateCcw/> Palavras inglês</h2><span className="text-sm text-sky-300">{cards.length} pendentes até {showDate(day)}</span></div>
      <p className="mt-2 text-sm leading-6 text-white/70">Salvou a palavra → revisão em 2 dias → acertou: 4 dias depois → acertou: 7 dias depois. Errou? Volta no dia seguinte, quantas vezes forem necessárias.</p>
      {future?<p className="mt-4 rounded-xl border border-amber-300/25 p-3 text-sm text-amber-200">Prévia do dia futuro. Os botões de acerto e erro só são liberados na data da revisão.</p>:null}
      {current?<ReviewCard key={current.id} word={current} onResult={correct=>void reviewWord(correct)} busy={busy} canAnswer={!future}/>:<p className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-300/5 p-5 text-emerald-200"><CheckCircle2 size={17} className="mr-2 inline"/>Nenhuma palavra pendente para este dia. As próximas aparecem automaticamente no calendário.</p>}
      {cards.length>1?<div className="mt-4 flex flex-wrap gap-2">{cards.map((w,i)=><button key={w.id} type="button" onClick={()=>setWordIndex(i)} className={"rounded-lg border px-3 py-2 text-xs "+(i===wordIndex?"border-sky-300 text-sky-200":"border-white/20 text-white/65")}>{i+1}. {w.word}</button>)}</div>:null}
    </section>:null}
    {!loading && tab==="phrases"?<section className={"mt-6 "+sectionStyle}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex gap-2 text-xl font-bold"><Sparkles/> Frases com as palavras favoritadas</h2><span className="text-sm text-emerald-300">{phrases?.completed?"Concluída":markedCount+"/"+(phrases?.total??0)+" revisadas"}</span></div>
      <p className="mt-2 text-sm leading-6 text-white/70">Todo dia o sistema sorteia 10 palavras diferentes das que você favoritara. Leia a frase em inglês, tente lembrar o significado e confirme a revisão. Esta atividade não interfere na revisão das palavras salvas.</p>
      {pendingAI>0?<div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 p-3">
        <p className="text-xs text-amber-200">{pendingAI} frase(s) contextual(is) aguardam criação pela IA.</p>
        <button type="button" disabled={busy} onClick={()=>void generateNewPhrases()} className="rounded-lg border border-amber-300/40 px-3 py-2 text-xs font-bold text-amber-300 disabled:opacity-40">Gerar com IA</button>
      </div>:null}
      {phrases?.completed?<p className="mt-4 flex gap-2 rounded-xl border border-emerald-300/30 p-4 text-emerald-200"><CheckCircle2/>As frases deste dia já foram concluídas.</p>:null}
      <div className="mt-5 grid gap-3 md:grid-cols-2">{(phrases?.cards??[]).map((p,i)=><article key={p.id} className="rounded-xl border border-white/15 bg-white/[.035] p-4">
        <span className="text-xs font-bold text-emerald-300">FRASE {i+1} · {p.source==="ai"?"CRIADA COM IA":"CONTEXTO ORIGINAL"}</span>
        <p className="mt-3 whitespace-pre-wrap text-base leading-7">{p.phrase_en}</p>
        <button type="button" onClick={()=>setPhraseViewed(s=>({...s,[p.id]:!s[p.id]}))} className="mt-3 rounded-lg border border-white/25 px-3 py-2 text-xs">{phraseViewed[p.id]?"Ocultar significado":"Mostrar significado de "+p.word}</button>
        {phraseViewed[p.id]?<p className="mt-2 text-sm font-bold text-amber-200">{p.word} = {p.translation}</p>:null}
        {!phrases.completed?<label className="mt-4 flex items-center gap-2 text-xs text-white/80">
          <input type="checkbox" disabled={future} checked={Boolean(phraseMarked[p.id])} onChange={e=>setPhraseMarked(s=>({...s,[p.id]:e.target.checked}))} className="h-4 w-4"/>
          Revisada {future?"(disponível na data)":""}
        </label>:null}
      </article>)}</div>
      {phrases?.cards.length ? !phrases.completed?<button type="button" disabled={busy||future||markedCount!==phrases.cards.length} onClick={()=>void completePhrases()} className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-black disabled:opacity-40"><Check/>Concluir as {phrases.cards.length} frases de hoje</button>:null
        :<p className="mt-4 text-sm text-white/65">Nenhuma palavra favoritada. Vá ao vocabulário e clique na estrela; as próximas entrarão automaticamente aqui.</p>}
    </section>:null}
    <div className="mt-6 flex flex-wrap justify-between gap-3 rounded-xl border border-[var(--border)] p-4 text-xs text-[var(--muted)]">
      <p>As revisões são salvas no Supabase. O calendário usa sempre o estado mais recente.</p>
      <Link href="/calendario" className="flex items-center gap-2 font-bold text-[var(--gold-bright)]"><CalendarDays size={16}/>Ver calendário principal</Link>
    </div>
  </main>;
}
