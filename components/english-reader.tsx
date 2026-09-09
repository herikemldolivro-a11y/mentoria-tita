"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleX,
  Eye,
  Languages,
  LoaderCircle,
  MousePointer2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getEnglishTranslation, normalizeEnglishWord } from "@/lib/english-dictionary";
import type { EnglishReaderData, EnglishReaderQuestion, EnglishVocabularyWord } from "@/lib/english-types";
import { createClient } from "@/lib/supabase/client";

type Phase = "reading" | "vocabulary" | "questions" | "done";

function tokenize(value: string) {
  return value.split(/([A-Za-z]+(?:['’][A-Za-z]+)?)/g);
}

export function EnglishReader({ textId }: { textId: string }) {
  const router = useRouter();
  const [data, setData] = useState<EnglishReaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("reading");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealTranslation, setRevealTranslation] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_english_text_reader", { p_text_id: textId });
        if (error) throw error;
        setData(data as EnglishReaderData);
        await supabase.rpc("mark_english_text_started", { p_text_id: textId });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o texto.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [textId]);

  const savedKeys = useMemo(
    () => new Set((data?.vocabulary ?? []).map((item) => item.word_key ?? normalizeEnglishWord(item.word))),
    [data?.vocabulary],
  );

  async function toggleWord(word: string, translation: string, context: string) {
    if (!data) return;
    const supabase = createClient();
    const { data: result, error } = await supabase.rpc("toggle_english_vocab_word", {
      p_text_id: data.text.id, p_word: word, p_translation: translation, p_context: context,
    });
    if (error) { setErrorMessage(error.message); return; }

    const response = result as { saved?: boolean; id?: string };
    const key = normalizeEnglishWord(word);

    setData((current) => {
      if (!current) return current;
      if (!response.saved) {
        return { ...current, vocabulary: current.vocabulary.filter((item) => (item.word_key ?? normalizeEnglishWord(item.word)) !== key) };
      }
      const next: EnglishVocabularyWord = {
        id: response.id ?? `${Date.now()}-${key}`, word, word_key: key, translation, context,
        starred: false, saved_at: new Date().toISOString(), review_count: 0,
      };
      return { ...current, vocabulary: [next, ...current.vocabulary.filter((item) => (item.word_key ?? normalizeEnglishWord(item.word)) !== key)] };
    });
  }

  async function completeText() {
    if (!data || finishing) return;
    setFinishing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("complete_english_text", { p_text_id: data.text.id });
      if (error) throw error;
      setPhase("done");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível concluir o texto.");
    } finally {
      setFinishing(false);
    }
  }

  async function beginFinish() {
    if (!data) return;
    if (data.vocabulary.length) {
      setReviewIndex(0); setRevealTranslation(false); setPhase("vocabulary"); return;
    }
    if (data.text.mode === "exam") { setPhase("questions"); return; }
    await completeText();
  }

  async function nextVocabularyWord() {
    if (!data) return;
    const word = data.vocabulary[reviewIndex];
    if (word?.id) {
      const supabase = createClient();
      await supabase.rpc("review_english_vocab_word", { p_vocab_id: word.id });
    }
    if (reviewIndex + 1 < data.vocabulary.length) {
      setReviewIndex((value) => value + 1); setRevealTranslation(false); return;
    }
    if (data.text.mode === "exam") setPhase("questions");
    else await completeText();
  }

  async function answerQuestion(question: EnglishReaderQuestion, answer: boolean) {
    const supabase = createClient();
    const { data: result, error } = await supabase.rpc("record_english_question_answer", {
      p_question_id: question.id, p_answer: answer,
    });
    if (error) { setErrorMessage(error.message); return; }
    const response = result as { is_correct: boolean; correct_answer: boolean; explanation: string };
    setData((current) => current ? ({
      ...current,
      questions: current.questions.map((item) => item.id === question.id ? {
        ...item, answer, is_correct: response.is_correct,
        correct_answer: response.correct_answer, explanation: response.explanation,
      } : item),
    }) : current);
  }

  if (loading) {
    return <div className="mx-auto max-w-[960px] px-4 py-10"><div className="flex min-h-40 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]"><LoaderCircle className="animate-spin" size={17} /> Abrindo leitura...</div></div>;
  }

  if (!data) {
    return <div className="mx-auto max-w-[960px] px-4 py-10"><div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">{errorMessage ?? "Texto não encontrado."}</div></div>;
  }

  const currentWord = data.vocabulary[reviewIndex];
  const answered = data.questions.filter((q) => q.answer !== null).length;
  const correct = data.questions.filter((q) => q.is_correct === true).length;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <Link href={`/ingles/semana/${data.text.week_number}`} className="inline-flex min-h-10 items-center gap-2 text-[9px] font-black text-[var(--muted)]">
        <ArrowLeft size={15} /> SEMANA {data.text.week_number}
      </Link>

      {errorMessage ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      {phase === "reading" ? (
        <>
          <section className="mt-3 rounded-[28px] border border-[#d2a64e]/25 bg-[#090a0c] p-6 text-white sm:p-8">
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#e4b960]">
              <Languages size={15} /> {data.text.mode === "exam" ? "LEITURA + PROVA" : "LEITURA GUIADA"}
            </span>
            <h1 className="mt-3 font-serif text-4xl leading-[1] tracking-[-.04em] sm:text-5xl">{data.text.title}</h1>
            <div className="mt-5 flex flex-wrap gap-2 text-[8px] font-black">
              <span className="rounded-full border border-white/10 px-3 py-2 text-white/60"><Eye size={12} className="mr-1 inline" /> HOVER = TRADUÇÃO</span>
              <span className="rounded-full border border-emerald-500/25 px-3 py-2 text-emerald-400"><MousePointer2 size={12} className="mr-1 inline" /> CLIQUE = SALVAR</span>
              {data.text.mode === "exam" ? <span className="rounded-full border border-[#d2a64e]/25 px-3 py-2 text-[#e4b960]">6 ITENS C/E</span> : null}
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-8">
            <div className="space-y-6 font-serif text-[21px] leading-[2.05] text-[var(--ink)] sm:text-[23px]">
              {data.text.sentences.map((sentence, sentenceIndex) => (
                <p key={`${sentenceIndex}-${sentence.en}`}>
                  {tokenize(sentence.en).map((token, tokenIndex) => {
                    const normalized = normalizeEnglishWord(token);
                    if (!normalized) return <span key={tokenIndex}>{token}</span>;
                    const translation = getEnglishTranslation(token, data.text.word_map ?? {}, sentence.pt);
                    const saved = savedKeys.has(normalized);
                    return (
                      <span key={`${sentenceIndex}-${tokenIndex}`} className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => void toggleWord(token, translation, sentence.en)}
                          className="group relative rounded-md px-[2px] py-0.5"
                          style={{
                            background: saved ? "rgba(49,199,101,.12)" : "transparent",
                            boxShadow: saved ? "0 0 18px rgba(49,199,101,.22)" : "none",
                            outline: saved ? "1px solid rgba(49,199,101,.28)" : "none",
                          }}
                        >
                          {token}
                          <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 hidden w-max max-w-[250px] -translate-x-1/2 rounded-xl border border-[#d2a64e]/25 bg-[#0b0c0f] px-3 py-2 font-sans text-[10px] font-bold leading-4 text-white shadow-2xl group-hover:block">
                            {translation}
                            <small className="mt-1 block text-[7px] font-black text-[#e4b960]">{saved ? "SALVA NO VOCABULÁRIO" : "CLIQUE PARA SALVAR"}</small>
                          </span>
                        </button>
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <span className="text-[8px] font-black text-[var(--gold-bright)]">FONTE DE REFERÊNCIA</span>
              <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{data.text.source_note}</p>
              <p className="mt-1 text-[9px] font-bold text-[var(--muted)]">Tema: {data.text.source_title}</p>
              {data.text.source_url ? <a href={data.text.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[8px] font-black text-[var(--gold-bright)]">ABRIR FONTE ORIGINAL</a> : null}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div><span className="text-[8px] font-black text-[var(--muted)]">VOCABULÁRIO SALVO</span><strong className="block font-serif text-3xl text-[var(--ink)]">{data.vocabulary.length}</strong></div>
              <button type="button" onClick={() => void beginFinish()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black text-[#111]">FINALIZAR LEITURA <Check size={15} /></button>
            </div>
          </section>
        </>
      ) : null}

      {phase === "vocabulary" && currentWord ? (
        <section className="mt-5 rounded-[30px] border border-emerald-500/25 bg-[var(--surface)] p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 text-[9px] font-black text-emerald-500"><Sparkles size={15} /> REVISÃO DO VOCABULÁRIO · {reviewIndex + 1}/{data.vocabulary.length}</span>
          <div className="mt-8 rounded-[26px] border border-[var(--border-strong)] bg-[var(--background)] p-8 text-center sm:p-12">
            <strong className="block font-serif text-5xl text-[var(--ink)] sm:text-6xl">{currentWord.word}</strong>
            {revealTranslation ? (
              <div className="mt-6"><span className="text-[8px] font-black text-emerald-500">TRADUÇÃO</span><strong className="mt-2 block text-xl text-[var(--ink)]">{currentWord.translation}</strong></div>
            ) : (
              <button type="button" onClick={() => setRevealTranslation(true)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-[9px] font-black text-[var(--gold-bright)]"><Eye size={14} /> MOSTRAR TRADUÇÃO</button>
            )}
            {revealTranslation ? (
              <button type="button" onClick={() => void nextVocabularyWord()} className="mx-auto mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-[10px] font-black text-[#07110b]">
                {reviewIndex + 1 < data.vocabulary.length ? "PRÓXIMA PALAVRA" : data.text.mode === "exam" ? "IR PARA AS QUESTÕES" : "CONCLUIR TEXTO"} <Check size={15} />
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {phase === "questions" ? (
        <section className="mt-5 rounded-[30px] border border-[#d2a64e]/25 bg-[var(--surface)] p-5 sm:p-8">
          <span className="text-[9px] font-black text-[var(--gold-bright)]">CEBRASPE MODE · CERTO / ERRADO</span>
          <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">6 itens sobre o texto.</h2>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Compreensão literal, inferência, referência, conectores e vocabulário em contexto.</p>

          <div className="mt-6 space-y-4">
            {data.questions.map((question) => {
              const hasAnswer = question.answer !== null;
              return (
                <article key={question.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                  <span className="text-[8px] font-black text-[var(--muted)]">ITEM {question.position}</span>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[var(--ink)]">{question.statement}</p>
                  <div className="mt-4 flex gap-2">
                    <Answer label="C" active={question.answer === true} disabled={hasAnswer} onClick={() => void answerQuestion(question, true)} />
                    <Answer label="E" active={question.answer === false} disabled={hasAnswer} onClick={() => void answerQuestion(question, false)} />
                  </div>
                  {hasAnswer ? (
                    <div className="mt-4 rounded-xl border p-4" style={{ borderColor: question.is_correct ? "rgba(49,199,101,.3)" : "rgba(223,98,98,.3)", background: question.is_correct ? "rgba(49,199,101,.06)" : "rgba(223,98,98,.06)" }}>
                      <strong className="flex items-center gap-2 text-xs" style={{ color: question.is_correct ? "#31c765" : "#df6262" }}>
                        {question.is_correct ? <CheckCircle2 size={15} /> : <CircleX size={15} />} {question.is_correct ? "ACERTOU" : "ERROU"} · GABARITO {question.correct_answer ? "CERTO" : "ERRADO"}
                      </strong>
                      <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{question.explanation}</p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--background)] p-5">
            <div><span className="text-[8px] font-black text-[var(--muted)]">RESULTADO</span><strong className="block font-serif text-3xl text-[var(--ink)]">{correct}/{data.questions.length}</strong></div>
            <button type="button" disabled={answered < data.questions.length || finishing} onClick={() => void completeText()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black text-[#111] disabled:opacity-40">
              {finishing ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />} CONCLUIR TEXTO
            </button>
          </div>
        </section>
      ) : null}

      {phase === "done" ? (
        <section className="mt-5 rounded-[30px] border border-emerald-500/30 bg-emerald-500/[.055] p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={34} />
          <h2 className="mt-4 font-serif text-4xl text-[var(--ink)]">Texto concluído.</h2>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[var(--muted)]">Leitura, revisão das palavras marcadas e questões obrigatórias encerradas.</p>
          <button type="button" onClick={() => router.push(`/ingles/semana/${data.text.week_number}`)} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-[10px] font-black text-[#07110b]">VOLTAR PARA A SEMANA <Check size={15} /></button>
          <button type="button" onClick={() => { setPhase("reading"); setReviewIndex(0); setRevealTranslation(false); }} className="ml-2 mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-[10px] font-black text-[var(--muted)]"><RotateCcw size={14} /> RELER</button>
        </section>
      ) : null}
    </div>
  );
}

function Answer({ label, active, disabled, onClick }: { label: "C" | "E"; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="grid h-11 w-11 place-items-center rounded-xl border text-sm font-black disabled:cursor-default" style={{ borderColor: active ? "rgba(210,166,78,.55)" : "var(--border-strong)", background: active ? "rgba(210,166,78,.12)" : "var(--surface)", color: active ? "var(--gold-bright)" : "var(--muted)" }}>
      {label}
    </button>
  );
}
