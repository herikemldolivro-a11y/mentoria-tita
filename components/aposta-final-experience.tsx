"use client";
// MT_APOSTA_FINAL_CFO_PMAL_V1 · 210 questões · Semana 1
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, Flame, LockKeyhole, NotebookPen, RotateCcw, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SimuladoExamRunner, type SimuladoExam, type SimuladoQuestion } from "@/components/simulado-exam-runner";
import { SimuladoFlashcardReview } from "@/components/simulado-flashcards";
import weekOne from "@/data/aposta-final/semana-01-direito-penal.json";

type ApostaQuestion = {
  numero:number; uuid:string; id_banco:number; assunto:string; ano:string; prova:string; banca:string;
  codigo_fonte:string; identificador_externo:string; apostafinal_referente:string;
  enunciado:string; gabarito:string; comentario:string; nota_automatica:string;
  comentario_verificado:boolean; gabarito_validado:boolean;
};
type ApostaDay = {dia:number; titulo:string; questoes:ApostaQuestion[]};
type Round = {id:string; simulado_id:string; titulo:string; dia_origem:number; round_number:number; scheduled_for:string|null; completed_at:string|null};
type Answer = {round_id:string;numero:number;acertou:boolean|null};
type ActiveRun = {simulado:SimuladoExam;round:Round;questions:SimuladoQuestion[];saved:number[]};
const days = weekOne.dias as ApostaDay[];
const simId = (day:number) => "aposta-final-s01-d"+String(day).padStart(2,"0");
const toDate = (value:string) => new Date(value+"T12:00:00").toLocaleDateString("pt-BR");
function dateKey(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function toSimulado(d:ApostaDay):SimuladoExam {
  return { id:simId(d.dia),dia:d.dia,titulo:"APOSTA FINAL · Semana 1 · Dia "+String(d.dia).padStart(2,"0"),
    origem:"CFO PMAL · Direito Penal · arquivo enviado",total:d.questoes.length,formato:"certo-errado",arquivos:{},
    questoes:d.questoes.map(q=>({
      numero:q.numero,pagina:0,gabarito:q.gabarito,
      enunciado:q.enunciado,comentario:q.comentario,
      notaAutomatica:q.nota_automatica,comentarioVerificado:q.comentario_verificado,
      gabaritoValidado:q.gabarito_validado,assunto:q.assunto,banca:q.banca,ano:q.ano,prova:q.prova,
    } as SimuladoQuestion))};
}
function newError(e:unknown){return e instanceof Error?e.message:String(e);}
export function ApostaFinalExperience(){
  const router=useRouter();
  const [userId,setUserId]=useState("");
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [rounds,setRounds]=useState<Round[]>([]);
  const [answers,setAnswers]=useState<Answer[]>([]);
  const [active,setActive]=useState<ActiveRun|null>(null);
  const [notebook,setNotebook]=useState<{simuladoId:string;round:Round}|null>(null);
  const [week,setWeek]=useState(1);
  const deepLinkOpened=useRef(false);
  const total=days.reduce((n,d)=>n+d.questoes.length,0);
  const allInitialAnswered=useMemo(()=>days.reduce((n,d)=>{
    const initial=rounds.find(r=>r.simulado_id===simId(d.dia)&&r.round_number===0);
    if(!initial)return n;
    return n+answers.filter(a=>a.round_id===initial.id).length;
  },0),[rounds,answers]);
  const completedDays=days.filter(d=>rounds.some(r=>r.simulado_id===simId(d.dia)&&r.round_number===0&&r.completed_at)).length;
  const percent=total?Math.round(allInitialAnswered/total*100):0;

  async function reload(uid:string){
    const db=createClient();
    const {data:r,error:er}=await db.from("mt_simulado_review_rounds")
      .select("id,simulado_id,titulo,dia_origem,round_number,scheduled_for,completed_at")
      .eq("user_id",uid).like("simulado_id","aposta-final-s01-d%")
      .order("round_number",{ascending:true});
    if(er)throw er;
    const all=(r??[]) as Round[];
    setRounds(all);
    if(!all.length){setAnswers([]);return;}
    const {data:a,error:ea}=await db.from("mt_simulado_round_answers")
      .select("round_id,numero,acertou").eq("user_id",uid).in("round_id",all.map(x=>x.id));
    if(ea)throw ea;
    setAnswers((a??[]) as Answer[]);
  }

  useEffect(()=>{
    let alive=true;
    const db=createClient();
    db.auth.getUser().then(async ({data,error:authError})=>{
      if(authError)throw authError;
      if(!data.user)throw Error("Faça login na TITÃ para usar a Aposta Final.");
      if(!alive)return;
      setUserId(data.user.id);
      await reload(data.user.id);
    }).catch(e=>{if(alive)setError(newError(e));})
      .finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[]);

  async function openDay(day:number,requestedRoundId?:string,openNotebook=false){
    if(working||!userId)return;
    const d=days.find(x=>x.dia===day);
    if(!d){setError("Dia da Aposta Final não encontrado.");return;}
    setWorking(true);setError("");setNotice("");
    try{
      const db=createClient();
      let r:Round;
      if(requestedRoundId){
        const {data,error:e}=await db.from("mt_simulado_review_rounds")
          .select("id,simulado_id,titulo,dia_origem,round_number,scheduled_for,completed_at")
          .eq("user_id",userId).eq("id",requestedRoundId).eq("simulado_id",simId(day)).maybeSingle();
        if(e)throw e;
        if(!data)throw Error("Revisão deste dia não encontrada. Abra a Aposta Final pelo painel.");
        r=data as Round;
      }else{
        const {data,error:e}=await db.rpc("mt_begin_simulado_round",{
          p_simulado_id:simId(day),p_titulo:"APOSTA FINAL · Direito Penal · Dia "+String(day).padStart(2,"0"),p_dia_origem:day
        });
        if(e)throw e;
        if(!data?.id)throw Error("A rodada deste dia não foi aberta.");
        r={id:String(data.id),simulado_id:simId(day),titulo:String(data.titulo),dia_origem:day,
          round_number:Number(data.round_number),scheduled_for:data.scheduled_for??null,
          completed_at:data.completed_at??null};
      }
      if(openNotebook){
        if(!r.scheduled_for)throw Error("O caderno depende de uma revisão agendada para este dia.");
        setActive(null);setNotebook({simuladoId:simId(day),round:r});
        return;
      }
      const [scope,selected]=await Promise.all([
        db.from("mt_simulado_round_scope").select("numero").eq("user_id",userId).eq("round_id",r.id),
        db.from("mt_simulado_round_selections").select("numero").eq("user_id",userId).eq("round_id",r.id),
      ]);
      if(scope.error)throw scope.error;
      if(selected.error)throw selected.error;
      const allowed=new Set((scope.data??[]).map(x=>x.numero as number));
      if(r.round_number>0&&allowed.size===0)throw Error("Nenhuma questão selecionada na rodada anterior. Abra o dia inicial ou outra revisão.");
      const sim=toSimulado(d);
      const questionList=r.round_number===0 ? sim.questoes : sim.questoes.filter(q=>allowed.has(q.numero));
      if(!questionList.length)throw Error("Nenhuma questão encontrada para esta rodada.");
      setNotebook(null);
      setActive({simulado:sim,round:r,questions:questionList,saved:(selected.data??[]).map(x=>x.numero as number)});
      await reload(userId);
    }catch(e){setError(newError(e));}
    finally{setWorking(false);}
  }

  useEffect(()=>{
    if(!userId||loading||deepLinkOpened.current)return;
    const query=new URLSearchParams(window.location.search);
    const day=Number(query.get("dia")||"0");
    const round=query.get("round")||undefined;
    if(day<1||day>7)return;
    deepLinkOpened.current=true;
    void openDay(day,round,query.get("notebook")==="1");
  },[loading,userId]);

  async function finish(nextDate:string){
    if(!active)throw Error("Nenhuma rodada aberta.");
    const {error:e}=await createClient().rpc("mt_finish_simulado_round",{
      p_round_id:active.round.id,p_next_date:nextDate
    });
    if(e)throw e;
    setActive(null);
    await reload(userId);
    setNotice("Dia concluído! Sua revisão foi adicionada ao Calendário Principal em "+toDate(nextDate)+". O caderno de flashcards aparece na véspera.");
    router.replace("/aposta-final");
  }

  const goBack=async()=>{
    setNotebook(null);setActive(null);
    await reload(userId).catch(e=>setError(newError(e)));
    router.replace("/aposta-final");
  };

  if(active)return <main className="mx-auto max-w-[1500px] px-3 pb-24 pt-5 sm:px-6 text-white">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-[#111827] p-4">
      <div><p className="text-[10px] font-black uppercase tracking-[.15em] text-amber-300">CFO PMAL · APOSTA FINAL · SEMANA 01</p>
      <p className="mt-1 text-sm text-white/75">{days.find(x=>x.dia===active.simulado.dia)?.titulo} · {active.questions.length} questões nesta rodada</p></div>
      <Link href="/calendario" className="text-xs font-bold text-amber-200 hover:underline">Calendário principal</Link>
    </div>
    <SimuladoExamRunner key={active.round.id} simulado={active.simulado} questoes={active.questions}
      userId={userId} roundId={active.round.id} roundNumber={active.round.round_number}
      isRoundCompleted={Boolean(active.round.completed_at)}
      initialSavedNumbers={active.saved} enableWholeDayReview
      onSavedChanged={async()=>{ /* As seleções da rodada são gerenciadas no runner; nunca automáticas. */ }}
      onExit={()=>{void goBack();}} onCompleted={finish}/>
  </main>;

  if(notebook)return <main className="mx-auto max-w-[1400px] px-4 pb-20 pt-5 sm:px-7">
    <SimuladoFlashcardReview key={notebook.round.id} userId={userId}
      simuladoId={notebook.simuladoId} roundId={notebook.round.id}
      titulo={notebook.round.titulo} scheduledFor={notebook.round.scheduled_for!}
      onExit={()=>{void goBack();}} onCompleted={async()=>{await reload(userId);setNotice("Caderno revisado. A revisão de questões é independente.");}} />
  </main>;

  return <main data-mt-aposta-final-v1="1" className="mx-auto max-w-[1480px] px-3 pb-24 pt-5 text-white sm:px-6 sm:pt-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link href="/cronograma" className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white"><ArrowLeft size={16}/> Voltar ao CFO PMAL</Link>
      <Link href="/calendario" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/80 hover:border-amber-300/40"><CalendarDays size={16}/> Calendário principal</Link>
    </div>
    <section className="relative overflow-hidden rounded-[32px] border border-amber-300/20 bg-[radial-gradient(ellipse_at_85%_0%,rgba(250,204,21,.13),transparent_42%),radial-gradient(ellipse_at_5%_90%,rgba(56,189,248,.10),transparent_40%),#080d18] px-5 py-7 shadow-[0_30px_110px_rgba(0,0,0,.35)] sm:px-9 sm:py-10">
      <div className="pointer-events-none absolute -right-9 top-3 text-[170px] font-black leading-none text-amber-200/[.035] sm:text-[220px]">01</div>
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/[.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-200"><Target size={14}/> Operação reta final · CFO PMAL 2026</div>
          <h1 className="mt-5 font-serif text-5xl leading-[.98] tracking-[-.045em] sm:text-6xl">APOSTA <span className="text-amber-300">FINAL.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Sete dias de questões estratégicas por matéria. Responda, corrija, anote, crie flashcards e decida exatamente o que entra na sua próxima revisão.</p>
        </div>
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-amber-300/25 bg-amber-300/[.06] shadow-[inset_0_0_35px_rgba(250,204,21,.04)]"><Trophy size={44} className="text-amber-200"/></div>
      </div>
      <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Questões cadastradas</p><strong className="mt-1 block font-serif text-4xl">210</strong><p className="mt-1 text-xs text-white/40">Semana 1 · Direito Penal</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Questões respondidas</p><strong className="mt-1 block font-serif text-4xl">{allInitialAnswered}<span className="text-lg text-white/40"> / 210</span></strong><p className="mt-1 text-xs text-white/40">Seu progresso é salvo automaticamente</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Dias concluídos</p><strong className="mt-1 block font-serif text-4xl">{completedDays}<span className="text-lg text-white/40"> / 7</span></strong><p className="mt-1 text-xs text-white/40">Você escolhe a data de revisão</p></div>
      </div>
      <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#fbbf24)] transition-all" style={{width:percent+"%"}}/></div>
      <p className="relative mt-2 text-right text-[10px] font-bold tracking-wide text-amber-200/75">{percent}% DA SEMANA RESPONDIDA</p>
    </section>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] font-black tracking-[.19em] text-amber-300">MISSÕES POR SEMANA</p><h2 className="mt-2 font-serif text-3xl">Seu campo de treino</h2></div>
      <div className="inline-flex gap-2 rounded-2xl border border-white/10 bg-[#0d1320] p-1.5">
        {[1,2,3,4].map(n=><button key={n} type="button" onClick={()=>setWeek(n)} className={"min-h-10 rounded-xl px-4 text-xs font-bold transition "+(week===n?"bg-amber-300 text-black":"text-white/60 hover:bg-white/5")}>S{String(n).padStart(2,"0")}{n>1?<LockKeyhole size={11} className="ml-1 inline opacity-50"/>:null}</button>)}
      </div>
    </div>
    {error?<div role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>:null}
    {notice?<div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>:null}
    {loading?<p className="mt-7 flex items-center gap-2 text-sm text-white/60"><RotateCcw size={17} className="animate-spin"/>Sincronizando seu progresso...</p>:null}
    {week!==1?<section className="mt-5 rounded-[28px] border border-dashed border-white/20 bg-[#0e1422] px-6 py-14 text-center">
      <LockKeyhole size={36} className="mx-auto text-amber-300/65"/>
      <h3 className="mt-4 font-serif text-3xl">Semana {String(week).padStart(2,"0")}</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/50">Aguardando o TXT da próxima matéria. Esta semana será adicionada sem modificar o progresso da Semana 1.</p>
      <button type="button" onClick={()=>setWeek(1)} className="mt-6 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-black">Voltar à Semana 1</button>
    </section>:<>
      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300/15 bg-[#111824] p-5">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200/70">SEMANA 01 · MATÉRIA</p><h3 className="mt-1 font-serif text-2xl">Direito Penal</h3><p className="mt-1 text-xs text-white/50">6 dias por conteúdo + Dia 7 com 10 questões de cada dia anterior</p></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[.06] px-4 py-2 text-xs font-bold text-amber-100"><Flame size={15}/> 210 QUESTÕES</span>
      </section>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.map(d=>{
          const initial=rounds.find(r=>r.simulado_id===simId(d.dia)&&r.round_number===0);
          const initialAnswers=answers.filter(a=>a.round_id===initial?.id);
          const answered=initialAnswers.length;
          const finished=Boolean(initial?.completed_at);
          const pending=rounds.filter(r=>r.simulado_id===simId(d.dia)&&r.round_number>0&&!r.completed_at)
            .sort((a,b)=>b.round_number-a.round_number)[0];
          const today=dateKey();
          const due=Boolean(pending?.scheduled_for&&pending.scheduled_for<=today);
          const p=Math.round(answered/d.questoes.length*100);
          return <article key={d.dia} className={"group relative overflow-hidden rounded-[27px] border p-5 transition-all duration-200 hover:-translate-y-0.5 sm:p-6 "+(d.dia===7?"border-amber-300/40 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,.12),transparent_50%),#11151e] shadow-[0_20px_70px_rgba(0,0,0,.20)]":"border-white/[.09] bg-[#0e1522] hover:border-amber-300/25")}>
            <div className="flex items-start justify-between gap-3">
              <span className={"grid h-14 w-14 place-items-center rounded-2xl border font-serif text-3xl "+(d.dia===7?"border-amber-300/35 bg-amber-300/10 text-amber-200":"border-white/10 bg-white/5 text-white")}>{String(d.dia).padStart(2,"0")}</span>
              <span className={"rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest "+(finished?"border-emerald-300/25 bg-emerald-300/10 text-emerald-300":p?"border-sky-300/25 bg-sky-300/10 text-sky-200":"border-white/10 bg-white/5 text-white/50")}>{finished?"Concluído":p?"Em andamento":"Disponível"}</span>
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[.16em] text-amber-300/70">{d.dia===7?"DESAFIO · APOSTA FINAL":"MISSÃO DO DIA"} · {d.questoes.length} questões</p>
            <h4 className="mt-2 min-h-[58px] font-serif text-[23px] leading-[1.12] text-white">{d.titulo}</h4>
            <div className="mt-5 flex items-center justify-between text-[11px] text-white/45"><span>{answered} de {d.questoes.length} respondidas</span><span>{p}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300 transition-all" style={{width:p+"%"}}/></div>
            {pending?.scheduled_for?<p className="mt-3 flex items-center gap-2 text-xs text-sky-200/75"><CalendarDays size={14}/>{due?"Revisão disponível: ":"Próxima revisão: "}{toDate(pending.scheduled_for)}</p>:<p className="mt-3 text-xs text-white/40">Revisão agendada somente por sua escolha</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" disabled={working||loading||!userId} onClick={()=>void openDay(d.dia)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-3 text-xs font-black text-[#111827] transition hover:bg-amber-200 disabled:opacity-40">{working?"Aguarde":finished?"Abrir revisão":"Resolver dia"}<ArrowRight size={16}/></button>
              {pending?<button type="button" disabled={working||loading} title="Abrir rodada de revisão agendada" onClick={()=>void openDay(d.dia,pending.id)} className="min-h-11 rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 text-xs font-bold text-sky-200">R{pending.round_number}</button>:null}
              {pending?.scheduled_for?<button type="button" disabled={working||loading} title="Revisar flashcards do caderno na véspera da revisão" onClick={()=>void openDay(d.dia,pending.id,true)} className="min-h-11 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-200"><NotebookPen size={17}/></button>:null}
            </div>
          </article>;
        })}
      </div>
    </>}
    <section className="mt-8 flex items-start gap-3 rounded-[22px] border border-white/10 bg-[#0b111b] p-5">
      <ShieldCheck size={20} className="mt-0.5 shrink-0 text-sky-300"/>
      <div><h3 className="text-sm font-bold">Fidelidade ao material enviado</h3>
      <p className="mt-1 text-xs leading-6 text-white/50">As questões e os gabaritos foram importados do TXT original. A fonte informa que banca, ano, gabarito e alguns comentários ainda não receberam validação independente. Os comentários aparecem somente depois que você responder; as revisões são selecionadas manualmente.</p></div>
    </section>
  </main>;
}
