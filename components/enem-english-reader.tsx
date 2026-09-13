"use client";

import { ArrowLeft, Bookmark, Check, CheckCircle2, Eye, ImageIcon, Languages, LoaderCircle, MousePointer2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { commonEnglishTranslations, normalizeEnglishWord } from "@/lib/english-dictionary";
import { getEnemEnglishReading, type EnemEnglishReading } from "@/lib/enem-english-data";
import { createClient } from "@/lib/supabase/client";

type SavedWord = { word:string; word_key:string; translation:string; context:string };
type Progress = { reading_completed_at:string|null; answer:string|null; is_correct:boolean|null; completed_at:string|null };

function tokenize(value:string) {
  return value.split(/([A-Za-z]+(?:['’][A-Za-z]+)?)/g);
}

function translationFor(reading:EnemEnglishReading, token:string) {
  const key = normalizeEnglishWord(token);
  return reading.glossary?.[key] ?? commonEnglishTranslations[key] ?? "Tradução não cadastrada · salve para revisar pelo contexto";
}

export function EnemEnglishReader({ readingId }:{ readingId:string }) {
  const reading = getEnemEnglishReading(readingId);
  const [userId,setUserId] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [progress,setProgress] = useState<Progress>({ reading_completed_at:null, answer:null, is_correct:null, completed_at:null });
  const [saved,setSaved] = useState<SavedWord[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string|null>(null);

  useEffect(() => {
    if (!reading) { setLoading(false); return; }
    let alive = true;
    const run = async () => {
      try {
        const supabase = createClient();
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw authError ?? new Error("Usuário não autenticado.");
        if (!alive) return;
        setUserId(auth.user.id);
        const [{ data:p, error:pError }, { data:v, error:vError }] = await Promise.all([
          supabase.from("user_enem_english_progress").select("reading_completed_at,answer,is_correct,completed_at").eq("user_id",auth.user.id).eq("reading_id",reading.id).maybeSingle(),
          supabase.from("user_enem_english_vocab").select("word,word_key,translation,context").eq("user_id",auth.user.id).eq("reading_id",reading.id).order("saved_at",{ ascending:false }),
        ]);
        if (pError) throw pError;
        if (vError) throw vError;
        if (!alive) return;
        if (p) setProgress(p as Progress);
        setSaved((v ?? []) as SavedWord[]);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Não foi possível carregar a leitura.");
      } finally { if (alive) setLoading(false); }
    };
    void run();
    return () => { alive = false; };
  }, [reading]);

  const savedKeys = useMemo(() => new Set(saved.map((item)=>item.word_key)),[saved]);

  if (!reading) return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-red-400">Leitura ENEM não encontrada.</div>;
  if (loading) return <div className="mx-auto grid min-h-72 max-w-4xl place-items-center px-4"><LoaderCircle className="animate-spin text-violet-300"/></div>;

  async function toggleWord(word:string,context:string) {
    if (!userId || !reading) return;
    const key = normalizeEnglishWord(word);
    if (!key) return;
    const supabase = createClient();
    const existing = savedKeys.has(key);
    setError(null);
    if (existing) {
      const { error:deleteError } = await supabase.from("user_enem_english_vocab").delete().eq("user_id",userId).eq("reading_id",reading.id).eq("word_key",key);
      if (deleteError) { setError(deleteError.message); return; }
      setSaved((current)=>current.filter((item)=>item.word_key!==key));
      return;
    }
    const translation = translationFor(reading,word);
    const row = { user_id:userId, reading_id:reading.id, word, word_key:key, translation, context };
    const { error:insertError } = await supabase.from("user_enem_english_vocab").insert(row);
    if (insertError) { setError(insertError.message); return; }
    setSaved((current)=>[row,...current]);
  }

  async function finishReading() {
    if (!userId || busy) return;
    setBusy(true); setError(null);
    const now = new Date().toISOString();
    const supabase = createClient();
    const { error:saveError } = await supabase.from("user_enem_english_progress").upsert({
      user_id:userId, reading_id:reading.id, reading_completed_at:progress.reading_completed_at ?? now, updated_at:now,
    },{ onConflict:"user_id,reading_id" });
    if (saveError) setError(saveError.message);
    else setProgress((current)=>({ ...current, reading_completed_at:current.reading_completed_at ?? now }));
    setBusy(false);
  }

  async function answer(key:"A"|"B"|"C"|"D"|"E") {
    if (!userId || !progress.reading_completed_at || progress.answer || busy) return;
    setBusy(true); setError(null);
    const now = new Date().toISOString();
    const correct = key === reading.correct;
    const supabase = createClient();
    const { error:saveError } = await supabase.from("user_enem_english_progress").upsert({
      user_id:userId, reading_id:reading.id, reading_completed_at:progress.reading_completed_at,
      answer:key, is_correct:correct, completed_at:now, updated_at:now,
    },{ onConflict:"user_id,reading_id" });
    if (saveError) setError(saveError.message);
    else setProgress((current)=>({ ...current, answer:key, is_correct:correct, completed_at:now }));
    setBusy(false);
  }

  const interactiveText = (text:string, context=text) => (
    <>{tokenize(text).map((token,index)=>{
      const key = normalizeEnglishWord(token);
      if (!key) return <span key={index}>{token}</span>;
      const translation = translationFor(reading,token);
      const isSaved = savedKeys.has(key);
      return (
        <button key={`${key}-${index}`} type="button" onClick={()=>void toggleWord(token,context)} className={`group relative inline rounded px-[2px] transition ${isSaved ? "bg-emerald-400/12 text-emerald-100 ring-1 ring-emerald-300/25" : "hover:bg-violet-400/12"}`}>
          {token}
          <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 hidden w-max max-w-[250px] -translate-x-1/2 rounded-xl border border-violet-300/20 bg-[#0a0b10] px-3 py-2 font-sans text-[10px] font-bold leading-4 text-white shadow-2xl group-hover:block">
            {translation}
            <small className={`mt-1 block text-[7px] font-black ${isSaved ? "text-emerald-300" : "text-violet-300"}`}>{isSaved ? "SALVA · CLIQUE PARA REMOVER" : "CLIQUE PARA SALVAR"}</small>
          </span>
        </button>
      );
    })}</>
  );

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <Link href="/ingles/enem" className="inline-flex min-h-10 items-center gap-2 text-[9px] font-black tracking-[.08em] text-[var(--muted)]"><ArrowLeft size={15}/> VOLTAR ÀS LEITURAS ENEM</Link>

      {error ? <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-300">{error}</div> : null}

      <section className="mt-3 overflow-hidden rounded-[30px] border border-violet-400/20 bg-[radial-gradient(circle_at_85%_0%,rgba(124,58,237,.20),transparent_38%),#08090d] text-white shadow-[0_28px_90px_rgba(0,0,0,.35)]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[8px] font-black tracking-[.12em]">
            <span className="rounded-full border border-violet-300/20 bg-violet-300/[.07] px-3 py-1.5 text-violet-200">DIA {reading.day} · LEITURA {reading.slot}/2</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-white/45">ENEM {reading.year}</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-white/45">{reading.kind === "visual" ? "VISUAL" : "TEXTO"}</span>
          </div>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{reading.title}</h1>
          <p className="mt-3 text-[10px] leading-5 text-white/40">{reading.application} · {reading.questionLabel}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.025] px-3 py-2 text-[8px] font-black text-white/55"><Eye size={12}/> PASSE O MOUSE = TRADUÇÃO</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[.05] px-3 py-2 text-[8px] font-black text-emerald-300"><MousePointer2 size={12}/> CLIQUE = SALVAR PALAVRA</span>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><span className="text-[8px] font-black tracking-[.15em] text-violet-400">ETAPA 01 · LEITURA</span><h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Leia primeiro. A questão fica bloqueada até o fim.</h2></div>
          <div className="text-right"><span className="text-[7px] font-black text-[var(--muted)]">PALAVRAS SALVAS</span><strong className="block font-serif text-2xl text-[var(--ink)]">{saved.length}</strong></div>
        </div>

        {reading.kind === "visual" && reading.visual ? (
          <VisualStudy visual={reading.visual} renderText={interactiveText}/>
        ) : (
          <div className="space-y-6 font-serif text-[20px] leading-[1.9] text-[var(--ink)] sm:text-[22px]">
            {reading.paragraphs.map((paragraph,index)=><p key={index} className="whitespace-pre-line">{interactiveText(paragraph,paragraph)}</p>)}
          </div>
        )}

        <div className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <span className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">FONTE</span><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{reading.source}</p>
        </div>

        {!progress.reading_completed_at ? (
          <button type="button" disabled={busy} onClick={()=>void finishReading()} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-[10px] font-black tracking-[.09em] text-white shadow-[0_14px_40px_rgba(124,58,237,.22)] disabled:opacity-45">{busy ? <LoaderCircle className="animate-spin" size={15}/> : <Check size={15}/>} TERMINEI A LEITURA · LIBERAR QUESTÃO</button>
        ) : <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-4 py-2 text-[9px] font-black text-emerald-300"><CheckCircle2 size={14}/> LEITURA CONCLUÍDA · QUESTÃO LIBERADA</div>}
      </section>

      {progress.reading_completed_at ? (
        <section className="mt-5 rounded-[30px] border border-violet-400/20 bg-[var(--surface)] p-5 sm:p-8">
          <span className="text-[8px] font-black tracking-[.15em] text-violet-400">ETAPA 02 · QUESTÃO REAL ENEM</span>
          {reading.questionExcerpt?.length ? (
            <div className="mt-5 rounded-[22px] border border-sky-400/20 bg-sky-400/[.045] p-4 sm:p-5">
              <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.12em] text-sky-300"><Sparkles size={13}/> TRECHO-CHAVE RECOLOCADO PARA RESOLVER</span>
              <div className="mt-3 space-y-2 font-serif text-lg leading-8 text-[var(--ink)]">{reading.questionExcerpt.map((excerpt,index)=><p key={index}>{interactiveText(excerpt,excerpt)}</p>)}</div>
            </div>
          ) : null}

          <h2 className="mt-6 text-base font-black leading-7 text-[var(--ink)]">{reading.question}</h2>
          <div className="mt-4 space-y-2.5">
            {reading.options.map((option)=>{
              const answered = Boolean(progress.answer);
              const chosen = progress.answer === option.key;
              const correct = option.key === reading.correct;
              const className = answered
                ? correct ? "border-emerald-400/30 bg-emerald-400/[.07] text-emerald-900 dark:text-emerald-100" : chosen ? "border-red-400/30 bg-red-400/[.06] text-red-700 dark:text-red-200" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] opacity-65"
                : "border-[var(--border)] bg-[var(--background)] text-[var(--ink)] hover:border-violet-400/30 hover:bg-violet-400/[.04]";
              return <button key={option.key} type="button" disabled={answered||busy} onClick={()=>void answer(option.key)} className={`flex w-full gap-3 rounded-2xl border p-4 text-left text-sm leading-6 transition ${className}`}><strong className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-current/15">{option.key}</strong><span>{option.text}</span></button>;
            })}
          </div>

          {progress.answer ? (
            <div className={`mt-5 rounded-2xl border p-5 ${progress.is_correct ? "border-emerald-400/25 bg-emerald-400/[.06]" : "border-amber-400/25 bg-amber-400/[.06]"}`}>
              <span className={`text-[9px] font-black tracking-[.1em] ${progress.is_correct ? "text-emerald-500" : "text-amber-500"}`}>{progress.is_correct ? "ACERTOU" : `GABARITO: ${reading.correct}`}</span>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{reading.explanation}</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/[.015] p-6 text-center text-xs text-[var(--muted)]">🔒 A questão só aparece depois que você marcar a leitura como concluída.</section>
      )}
    </div>
  );
}

function VisualStudy({ visual, renderText }:{ visual:NonNullable<EnemEnglishReading["visual"]>; renderText:(text:string,context?:string)=>React.ReactNode }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#090b10] p-4 text-white sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.12em] text-violet-300"><ImageIcon size={13}/> RECRIAÇÃO ESQUEMÁTICA INTERATIVA</span><span className="text-[7px] font-black text-white/30">PALAVRAS CLICÁVEIS</span></div>
      {visual.variant === "cups" ? <div className="flex min-h-64 items-end justify-center gap-5 rounded-2xl bg-[#f1ece4] p-7 text-[#17130f]">{visual.lines.map((line,index)=><div key={line} className="flex items-center justify-center rounded-b-[28px] rounded-t-lg border-4 border-[#5f4937] bg-[#d2b08d] px-3 text-center font-black shadow-xl" style={{ width:90+index*35, height:100+index*45 }}><span>{renderText(line,line)}</span></div>)}</div> : null}
      {visual.variant === "delete" ? <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-white/15 bg-[#e9eef8] text-[#182133] shadow-xl"><div className="bg-[#d8e2f4] px-4 py-3 text-xs font-bold">{renderText(visual.lines[0],visual.lines.join(" "))}</div><div className="p-5"><div className="h-5 overflow-hidden rounded bg-[#c6d0df]"><div className="h-full w-[70%] bg-blue-500"/></div><div className="mt-4 space-y-2 text-sm">{visual.lines.slice(1).map((line)=><div key={line}>{renderText(line,line)}</div>)}</div></div></div> : null}
      {visual.variant === "food" ? <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10"><div className="bg-[#574838] p-6 text-center text-lg font-black">{renderText(visual.lines[0],visual.lines[0])}</div><div className="bg-[#315f32] p-6 text-center text-lg font-black">{renderText(visual.lines[1],visual.lines[1])}</div></div> : null}
      {visual.variant === "office" ? <div className="rounded-2xl bg-[#e8eaed] p-5 text-[#17191d]"><div className="grid grid-cols-6 gap-2">{Array.from({length:18},(_,i)=><div key={i} className="grid h-12 place-items-center rounded bg-[#c6c9ce] text-xl">👔</div>)}</div><div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-[#b4b7bd] bg-white p-4 text-center font-semibold">{renderText(visual.lines[0],visual.lines[0])}</div></div> : null}
      {visual.variant === "homeless" ? <div className="mx-auto max-w-xl rounded-2xl bg-[#eee7da] p-7 text-center text-[#392e25]"><div className="border-4 border-[#785c49] p-5 font-serif text-3xl"><span>{renderText("Home Sweet",visual.lines.join(" "))}</span><strong className="block text-red-700">{renderText("Broken",visual.lines.join(" "))}</strong><span>{renderText("Home",visual.lines.join(" "))}</span></div><div className="mt-5 space-y-1 text-sm font-semibold">{visual.lines.slice(1).map((line)=><div key={line}>{renderText(line,line)}</div>)}</div></div> : null}
      {visual.variant === "scene" ? <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-5"><strong className="text-sm text-amber-200">ROTEIRO RECUPERADO DA CENA</strong><p className="mt-3 text-sm leading-7 text-white/70">{visual.description}</p><p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] leading-5 text-white/45">Os balões originais em inglês não foram recuperados literalmente no material. Por fidelidade, a plataforma não inventa palavras para esta questão visual.</p></div> : null}
      {visual.variant !== "scene" ? <p className="mt-4 text-[10px] leading-5 text-white/45">{visual.description}</p> : null}
      {visual.note ? <p className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-3 text-[9px] leading-5 text-amber-100/55">{visual.note}</p> : null}
    </div>
  );
}
