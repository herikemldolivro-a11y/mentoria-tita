"use client";
import { reportQuestionForUser } from "@/lib/question-bank";
import { Trash2, Highlighter, Eraser, Bookmark, Check, CheckCircle2, LoaderCircle, MessageSquareText, Scissors, Star, X, XCircle, Zap, Flag } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import type { QuestionChoiceMap, QuestionResult, QuestionType, QuestionHighlight, QuestionHighlightColor } from "@/lib/question-bank";
import { addQuestionHighlight, clearQuestionHighlights, loadQuestionHighlights } from "@/lib/question-bank";
import type { StarMarkState, StarPriority } from "@/lib/starred-questions";

type QuestionCardData={
  id?: string;
  question_id?: string;
  statement: string;
  question_type: QuestionType;
  choices: QuestionChoiceMap | null;
  level: number;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  subject_name?: string | null;
  lesson_title?: string | null;
  selected_answer?: string | null;
  is_correct?: boolean | null;
  correct_answer?: string | null;
  explanation?: string | null;
  starred?: boolean;
  saved_for_review?: boolean;
  star_priority?: StarPriority | null;
  star_hidden?: boolean;
  star_correct_streak?: number;
  star_has_error?: boolean;
};


/* TITA_HIGHLIGHTER_V2 */
const MT_HIGHLIGHT_BG: Record<QuestionHighlightColor,string> = {
  purple:"rgba(168,85,247,.42)",
  yellow:"rgba(250,204,21,.42)",
  pink:"rgba(236,72,153,.40)",
  green:"rgba(34,197,94,.38)",
  blue:"rgba(59,130,246,.40)",
  orange:"rgba(249,115,22,.42)",
};

const MT_HIGHLIGHT_COLORS: Array<{key:QuestionHighlightColor;label:string}> = [
  {key:"purple",label:"Roxo"},
  {key:"yellow",label:"Amarelo"},
  {key:"pink",label:"Rosa"},
  {key:"green",label:"Verde"},
  {key:"blue",label:"Azul"},
  {key:"orange",label:"Laranja"},
];

function renderHighlightedStatement(text:string,highlights:QuestionHighlight[]){
  if(!highlights.length)return text;
  const sorted=[...highlights].sort((a,b)=>a.start_offset-b.start_offset||a.end_offset-b.end_offset);
  const nodes=[];
  let cursor=0;

  for(const item of sorted){
    const start=Math.max(cursor,Math.min(text.length,item.start_offset));
    const end=Math.max(start,Math.min(text.length,item.end_offset));
    if(end<=start)continue;

    if(start>cursor)nodes.push(text.slice(cursor,start));
    nodes.push(
      <mark
        key={item.id}
        className="rounded-[3px] px-[1px] text-inherit"
        style={{backgroundColor:MT_HIGHLIGHT_BG[item.color]??MT_HIGHLIGHT_BG.purple}}
      >
        {text.slice(start,end)}
      </mark>
    );
    cursor=end;
  }

  if(cursor<text.length)nodes.push(text.slice(cursor));
  return nodes;
}

export function QuestionCard({
  question,
  number,
  onAnswer,
  onToggleMark,
  onSetStarPriority,
  compact = false,
  hidePreviousResolution = false,
}: {
  question: QuestionCardData;
  number: number;
  onAnswer: (answer: string) => Promise<QuestionResult>;
  onToggleMark?: (mark: "starred" | "review", value: boolean) => Promise<{ starred: boolean; saved_for_review: boolean }>;
  onSetStarPriority?: (priority: StarPriority | null) => Promise<StarMarkState>;
  compact?: boolean;
  hidePreviousResolution?: boolean;
}) {
  // MT_QUESTION_REPORT_STATE_V1
  const [reportOpen,setReportOpen]=useState(false);
  const [reportingQuestion,setReportingQuestion]=useState(false);
  const [reportReason,setReportReason]=useState<"wrong_answer_key"|"missing_context"|"other">("wrong_answer_key");
  const [reportDetails,setReportDetails]=useState("");
  const questionIdForReport=
    (question as unknown as {question_id?:string;id?:string}).question_id ??
    (question as unknown as {question_id?:string;id?:string}).id ??
    null;

const [selected, setSelected] = useState(hidePreviousResolution ? "" : (question.selected_answer ?? ""));
  const [result, setResult] = useState<QuestionResult | null>(
    !hidePreviousResolution && question.selected_answer && question.is_correct !== null && question.is_correct !== undefined
      ? { is_correct: question.is_correct, correct_answer: question.correct_answer ?? "", explanation: question.explanation ?? null }
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState<"starred" | "review" | null>(null);
  const [starred, setStarred] = useState(Boolean(question.starred));
  const [starPriority, setStarPriority] = useState<StarPriority | null>(
    question.star_priority ?? (question.starred ? 1 : null),
  );
  const [saved, setSaved] = useState(Boolean(question.saved_for_review));
  const [starMenuOpen, setStarMenuOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [eliminated, setEliminated] = useState<Record<string, boolean>>({});
  const starBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!starBoxRef.current?.contains(event.target as Node)) setStarMenuOpen(false);
    }
    if (starMenuOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [starMenuOpen]);

  useEffect(() => {
    setEliminated({});
  }, [question.statement, number]);

  const options = question.question_type === "true_false"
    ? [["TRUE", "Certo"], ["FALSE", "Errado"]]
    : Object.entries(question.choices ?? {}).sort(([a], [b]) => a.localeCompare(b));

  const highlightQuestionId=question.question_id??question.id??null;
  const textRef=useRef<HTMLDivElement|null>(null);
  const [highlights,setHighlights]=useState<QuestionHighlight[]>([]);
  const [highlighterOpen,setHighlighterOpen]=useState(false);
  const [highlighterEnabled,setHighlighterEnabled]=useState(false);
  const [highlightColor,setHighlightColor]=useState<QuestionHighlightColor>("purple");
  const [highlightSaving,setHighlightSaving]=useState(false);

  useEffect(()=>{
    const savedColor=window.localStorage.getItem("mt-question-highlighter-color") as QuestionHighlightColor|null;
    if(savedColor&&MT_HIGHLIGHT_BG[savedColor])setHighlightColor(savedColor);
  },[]);

  useEffect(()=>{
    let alive=true;

    if(!highlightQuestionId){
      setHighlights([]);
      return()=>{alive=false};
    }

    loadQuestionHighlights(highlightQuestionId)
      .then(items=>{if(alive)setHighlights(items)})
      .catch(()=>{if(alive)setHighlights([])});

    return()=>{alive=false};
  },[highlightQuestionId]);

  function chooseHighlightColor(color:QuestionHighlightColor){
    setHighlightColor(color);
    setHighlighterEnabled(true);
    setHighlighterOpen(true);
    window.localStorage.setItem("mt-question-highlighter-color",color);
  }

  async function applyHighlightSelection(){
    if(!highlighterEnabled||!highlightQuestionId||!textRef.current||highlightSaving)return;

    const selection=window.getSelection();
    if(!selection||selection.rangeCount===0||selection.isCollapsed)return;

    const range=selection.getRangeAt(0);
    const root=textRef.current;

    if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return;

    const beforeStart=document.createRange();
    beforeStart.selectNodeContents(root);
    beforeStart.setEnd(range.startContainer,range.startOffset);

    const beforeEnd=document.createRange();
    beforeEnd.selectNodeContents(root);
    beforeEnd.setEnd(range.endContainer,range.endOffset);

    const start=beforeStart.toString().length;
    const end=beforeEnd.toString().length;

    if(end<=start)return;

    setHighlightSaving(true);
    setError(null);

    try{
      const savedHighlight=await addQuestionHighlight(highlightQuestionId,start,end,highlightColor);

      setHighlights(current=>[
        ...current.filter(item=>!(item.start_offset<end&&item.end_offset>start)),
        savedHighlight,
      ].sort((a,b)=>a.start_offset-b.start_offset||a.end_offset-b.end_offset));

      selection.removeAllRanges();
    }catch(e){
      setError(e instanceof Error?e.message:"Não foi possível salvar o marca-texto.");
    }finally{
      setHighlightSaving(false);
    }
  }

  async function clearAllHighlights(){
    if(!highlightQuestionId||highlightSaving||highlights.length===0)return;
    if(!window.confirm("Limpar todas as marcações desta questão?"))return;

    setHighlightSaving(true);
    setError(null);

    try{
      await clearQuestionHighlights(highlightQuestionId);
      setHighlights([]);
    }catch(e){
      setError(e instanceof Error?e.message:"Não foi possível limpar as marcações.");
    }finally{
      setHighlightSaving(false);
    }
  }



  function choose(value: string) {
    if (submitting || result) return;
    setSelected(value);
    setShowExplanation(false);
  }

  function toggleEliminated(value: string) {
    if (submitting || result) return;
    setEliminated((current) => {
      const next = { ...current, [value]: !current[value] };
      return next;
    });
    if (selected === value) setSelected("");
  }

  async function answer() {
    if (!selected || submitting || result) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = await onAnswer(selected);
      setResult(next);
      setNonce((value) => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível corrigir a resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleReview() {
    if (!onToggleMark || marking) return;
    setMarking("review");
    try {
      const next = await onToggleMark("review", !saved);
      setSaved(next.saved_for_review);
      setStarred(next.starred);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar a marcação.");
    } finally {
      setMarking(null);
    }
  }

  async function chooseStarPriority(priority: StarPriority | null) {
    if (marking) return;
    setMarking("starred");
    setError(null);
    try {
      if (onSetStarPriority) {
        const next = await onSetStarPriority(priority);
        setStarred(next.starred);
        setStarPriority(next.star_priority);
        setSaved(next.saved_for_review);
      } else if (onToggleMark) {
        const next = await onToggleMark("starred", priority !== null);
        setStarred(next.starred);
        setStarPriority(priority);
        setSaved(next.saved_for_review);
      }
      setStarMenuOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar as estrelas.");
    } finally {
      setMarking(null);
    }
  }
  // MT_QUESTION_REPORT_FUNCTION_V1
  async function submitQuestionReport(){
    if(!questionIdForReport || reportingQuestion) return;

    setReportingQuestion(true);
    setError(null);

    try{
      await reportQuestionForUser(
        questionIdForReport,
        reportReason,
        reportDetails,
      );
      setReportOpen(false);
      window.location.reload();
    }catch(e){
      setError(e instanceof Error ? e.message : "Não foi possível reportar a questão.");
      setReportingQuestion(false);
    }
  }

const feedback = result ? (result.is_correct ? "mt-question-correct-pop" : "mt-question-wrong-shake") : "";

  return (
    <article key={nonce} className={`relative overflow-visible rounded-[24px] border bg-[var(--surface)] p-5 transition sm:p-7 ${feedback} ${result?.is_correct ? "border-emerald-400/30" : result && !result.is_correct ? "border-red-400/30" : "border-[var(--border)]"}`}>
    {reportOpen ? (
      <section
        data-mt-question-report-panel="v1"
        className="relative z-20 mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/[.055] p-4 pr-14"
      >
        <span className="text-[8px] font-black tracking-[.15em] text-amber-400">
          REPORTAR QUESTÃO
        </span>
        <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
          A questão sai da sua preparação e entra na fila de correção do administrador.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {([
            ["wrong_answer_key","GABARITO ERRADO"],
            ["missing_context","FALTANDO CONTEXTO"],
            ["other","OUTRO PROBLEMA"],
          ] as const).map(([value,label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setReportReason(value)}
              className={`min-h-10 rounded-xl border px-3 text-[8px] font-black tracking-[.06em] ${
                reportReason===value
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          value={reportDetails}
          onChange={(event) => setReportDetails(event.target.value.slice(0,1200))}
          placeholder="Detalhe o problema, se quiser."
          className="mt-3 min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-xs text-[var(--ink)] outline-none focus:border-amber-400/45"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setReportOpen(false)}
            disabled={reportingQuestion}
            className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-[8px] font-black text-[var(--muted)]"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={() => void submitQuestionReport()}
            disabled={reportingQuestion}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-[8px] font-black text-black disabled:opacity-45"
          >
            {reportingQuestion ? <LoaderCircle className="animate-spin" size={13} /> : <Flag size={13} />}
            REPORTAR QUESTÃO
          </button>
        </div>
      </section>
    ) : null}

    

      {result ? <div className={`absolute inset-x-0 top-0 h-1 rounded-t-[24px] ${result.is_correct ? "bg-emerald-400" : "bg-red-400"}`} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]">
          <span className="rounded-full border border-violet-400/20 bg-violet-400/[.07] px-3 py-1.5 text-violet-300">
            QUESTÃO {String(number).padStart(2, "0")}
          </span>
          {question.banca ? <span>{question.banca}</span> : null}
          {question.ano ? <span>· {question.ano}</span> : null}
          {question.exam_name ? <span>· {question.exam_name}</span> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
{/* MT_REPORT_INLINE_V46 */}
{questionIdForReport ? (
  <button
    type="button"
    data-mt-question-report="v1"
    title="Reportar questão"
    aria-label="Reportar questão"
    onClick={() => setReportOpen((value) => !value)}
    disabled={reportingQuestion}
    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-[var(--surface)] text-amber-400 shadow-sm transition hover:border-amber-400/60 hover:bg-amber-500/10 disabled:opacity-45"
  >
    {reportingQuestion ? <LoaderCircle className="animate-spin" size={14} /> : <Flag size={15} />}
  </button>
) : null}

          {onToggleMark ? (
            <button
              type="button"
              onClick={() => void toggleReview()}
              disabled={Boolean(marking)}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[8px] font-black ${saved ? "border-violet-400/35 bg-violet-400/10 text-violet-300" : "border-[var(--border)] text-[var(--muted)]"}`}
            >
              <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
              {saved ? "NA REVISÃO" : "REVISAR"}
            </button>
          ) : null}

          {(onSetStarPriority || onToggleMark) ? (
            <div ref={starBoxRef} className="relative">
              <button
                type="button"
                onClick={() => setStarMenuOpen((value) => !value)}
                disabled={Boolean(marking)}
                title="Definir prioridade da questão estrelada"
                className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-xl border px-2 transition ${
                  starred
                    ? "border-amber-300/45 bg-amber-300/[.10] text-amber-300"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-amber-300/35 hover:text-amber-300"
                }`}
              >
                {marking === "starred" ? <LoaderCircle size={14} className="animate-spin" /> : <Star size={15} fill={starred ? "currentColor" : "none"} />}
                {starred && starPriority ? <span className="text-[8px] font-black">×{starPriority}</span> : null}
              </button>

              {starMenuOpen ? (
                <div className="absolute right-0 top-11 z-[70] w-[250px] rounded-2xl border border-amber-300/20 bg-[#0b0c0f]/[.98] p-3 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl">
                  <span className="block text-[8px] font-black tracking-[.13em] text-amber-300">PRIORIDADE DA QUESTÃO</span>
                  <p className="mt-1 text-[9px] leading-4 text-white/38">Escolha quantas estrelas esta questão merece para sua revisão.</p>
                  <div className="mt-3 grid gap-2">
                    {([1, 2, 3] as StarPriority[]).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => void chooseStarPriority(priority)}
                        className={`flex min-h-10 items-center justify-between rounded-xl border px-3 text-left transition ${
                          starPriority === priority
                            ? "border-amber-300/45 bg-amber-300/[.11]"
                            : "border-white/[.08] bg-white/[.025] hover:border-amber-300/25"
                        }`}
                      >
                        <span className="text-[14px] tracking-[.08em] text-amber-300">{"★".repeat(priority)}{"☆".repeat(3 - priority)}</span>
                        <span className="text-[8px] font-black text-white/45">
                          {priority === 3 ? "MÁXIMA" : priority === 2 ? "MÉDIA" : "NORMAL"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {starred ? (
                    <button
                      type="button"
                      onClick={() => void chooseStarPriority(null)}
                      className="mt-2 min-h-9 w-full rounded-xl border border-red-400/15 bg-red-400/[.04] text-[8px] font-black text-red-300/80"
                    >
                      REMOVER DAS ESTRELADAS
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[8px] font-black text-violet-300">
            NÍVEL {question.level}
          </span>
        </div>
      </div>

      {question.subject_name || question.lesson_title ? (
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-[var(--muted)]">
          {question.subject_name ? <span>{question.subject_name}</span> : null}
          {question.lesson_title ? <span>→ {question.lesson_title}</span> : null}
        </div>
      ) : null}

      
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={()=>{
          setHighlighterOpen(v=>!v);
          setHighlighterEnabled(v=>!v);
        }}
        disabled={!highlightQuestionId||highlightSaving}
        className={"inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[8px] font-black transition " + (highlighterEnabled?"border-violet-400/45 bg-violet-400/12 text-violet-200":"border-[var(--border)] text-[var(--muted)] hover:border-violet-400/30")}
      >
        {highlightSaving?<LoaderCircle size={14} className="animate-spin"/>:<Highlighter size={14}/>}
        MARCA-TEXTO
      </button>

      {highlighterOpen?
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <span className="mr-1 text-[8px] font-black tracking-[.08em] text-[var(--muted)]">
            ESCOLHA A COR E ARRASTE SOBRE O TEXTO
          </span>

          {MT_HIGHLIGHT_COLORS.map(item=>
            <button
              key={item.key}
              type="button"
              title={item.label}
              aria-label={"Marca-texto "+item.label}
              onClick={()=>chooseHighlightColor(item.key)}
              className={"h-6 w-6 rounded-md border transition " + (highlightColor===item.key?"scale-110 border-white/70 ring-2 ring-violet-400/35":"border-white/15")}
              style={{backgroundColor:MT_HIGHLIGHT_BG[item.key]}}
            />
          )}

          {highlights.length?
            <button
              type="button"
              onClick={()=>void clearAllHighlights()}
              disabled={highlightSaving}
              className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 text-[8px] font-black text-[var(--muted)] hover:text-red-300"
            >
              <Eraser size={12}/> LIMPAR
            </button>
          :null}
        </div>
      :null}
    </div>

    <div
      ref={textRef}
      onMouseUp={()=>void applyHighlightSelection()}
      onTouchEnd={()=>window.setTimeout(()=>void applyHighlightSelection(),120)}
      className={"mt-5 overflow-y-auto whitespace-pre-wrap pr-4 text-[15px] leading-7 text-[var(--ink)] [scrollbar-width:thin] sm:text-base " + (highlighterEnabled?"cursor-text select-text":"")}
      style={{maxHeight:"clamp(16rem, 48vh, 34rem)"}}
    >
      {renderHighlightedStatement(question.statement,highlights)}
    </div>


      {question.question_type === "true_false" ? (
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {options.map(([value, label]) => {
            const checked = selected === value;
            const correct = result?.correct_answer === value;
            const wrong = Boolean(result && !result.is_correct && checked);
            const isTrue = value === "TRUE";
            const isEliminated = Boolean(eliminated[value]);
            return (
              <div key={value} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => choose(value)}
                  disabled={submitting || Boolean(result)}
                  className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[16px] border px-4 text-[12px] font-black transition ${checked && !result ? "border-violet-400/55 bg-violet-500 text-white shadow-[0_8px_24px_rgba(124,58,237,.22)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-violet-400/28 hover:bg-violet-400/[.035]"} ${isEliminated && !checked && !result ? "opacity-35" : ""}`}
                  style={result ? { borderColor: correct ? "rgba(34,197,94,.48)" : wrong ? "rgba(239,68,68,.48)" : "var(--border)", background: correct ? "rgba(34,197,94,.07)" : wrong ? "rgba(239,68,68,.07)" : "var(--background)", color: correct ? "#4ade80" : wrong ? "#f87171" : undefined } : undefined}
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-lg ${isTrue ? "text-emerald-400" : "text-red-400"}`}>
                    {isTrue ? <Check size={16} /> : <X size={16} />}
                  </span>
                  <span className={isEliminated && !checked && !result ? "line-through" : ""}>{label}</span>
                  {correct ? <CheckCircle2 className="shrink-0 text-emerald-400" size={18} /> : wrong ? <XCircle className="shrink-0 text-red-400" size={18} /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => toggleEliminated(value)}
                  disabled={submitting || Boolean(result)}
                  title={isEliminated ? "Reverter exclusão" : "Excluir alternativa visualmente"}
                  className={`grid h-auto w-11 shrink-0 place-items-center rounded-[16px] border transition ${isEliminated ? "border-amber-300/40 bg-amber-300/[.12] text-amber-300" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-amber-300/28 hover:text-amber-300"}`}
                >
                  <Scissors size={15} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 grid gap-2.5">
          {options.map(([value, label]) => {
            const checked = selected === value;
            const correct = result?.correct_answer === value;
            const wrong = Boolean(result && !result.is_correct && checked);
            const isEliminated = Boolean(eliminated[value]);
            return (
              <div key={value} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => choose(value)}
                  disabled={submitting || Boolean(result)}
                  className={`group flex w-full items-start gap-3 rounded-[16px] border p-4 text-left transition ${checked && !result ? "border-violet-400/55 bg-violet-400/[.085] shadow-[0_10px_30px_rgba(124,58,237,.08)]" : "border-[var(--border)] bg-[var(--background)] hover:border-violet-400/28 hover:bg-violet-400/[.035]"} ${isEliminated && !checked && !result ? "opacity-35" : ""}`}
                  style={result ? { borderColor: correct ? "rgba(34,197,94,.48)" : wrong ? "rgba(239,68,68,.48)" : "var(--border)", background: correct ? "rgba(34,197,94,.07)" : wrong ? "rgba(239,68,68,.07)" : "var(--background)" } : undefined}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-[12px] font-black ${checked && !result ? "border-violet-300/50 bg-violet-500 text-white" : "border-[var(--border)] text-violet-300"}`}
                    style={result ? { borderColor: correct ? "rgba(34,197,94,.45)" : wrong ? "rgba(239,68,68,.45)" : "var(--border)", color: correct ? "#4ade80" : wrong ? "#f87171" : undefined } : undefined}
                  >
                    {value}
                  </span>
                  <span className={`pt-1.5 text-sm leading-6 text-[var(--ink)] ${isEliminated && !checked && !result ? "line-through" : ""}`}>{label}</span>
                  {correct ? <CheckCircle2 className="ml-auto mt-1.5 shrink-0 text-emerald-400" size={18} /> : wrong ? <XCircle className="ml-auto mt-1.5 shrink-0 text-red-400" size={18} /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => toggleEliminated(value)}
                  disabled={submitting || Boolean(result)}
                  title={isEliminated ? "Reverter exclusão" : "Excluir alternativa visualmente"}
                  className={`grid w-12 shrink-0 place-items-center rounded-[16px] border px-2 transition ${isEliminated ? "border-amber-300/40 bg-amber-300/[.12] text-amber-300" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-amber-300/28 hover:text-amber-300"}`}
                >
                  <Scissors size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void answer()}
          disabled={!selected || submitting || Boolean(result)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-[10px] font-black tracking-[.1em] text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? <LoaderCircle className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
          {result ? "RESPONDIDA" : "CONFIRMAR RESPOSTA"}
        </button>
        {result ? (
          <span className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[10px] font-black ${result.is_correct ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" : "border-red-400/30 bg-red-400/10 text-red-400"}`}>
            {result.is_correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {result.is_correct ? "ACERTOU" : "ERROU"}
            <span className="ml-1 inline-flex items-center gap-1 rounded-lg bg-black/10 px-2 py-1">
              <Zap size={12} />{result.is_correct ? "+12 XP" : "+4 XP"}
            </span>
          </span>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">{error}</p> : null}

      {result ? (
        <div className={`mt-5 rounded-2xl border p-4 sm:p-5 ${result.is_correct ? "border-emerald-400/20 bg-emerald-400/[.045]" : "border-red-400/20 bg-red-400/[.045]"}`}>
          <span className={`text-[9px] font-black tracking-[.14em] ${result.is_correct ? "text-emerald-400" : "text-red-400"}`}>
            GABARITO · {formatAnswer(result.correct_answer, question.question_type)}
          </span>
          <button onClick={() => setShowExplanation((value) => !value)} className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[9px] font-black text-[var(--muted)]">
            <MessageSquareText size={14} />{showExplanation ? "FECHAR COMENTÁRIO" : "ABRIR COMENTÁRIO"}
          </button>
          {showExplanation ? <p className="mt-3 whitespace-pre-wrap border-t border-[var(--border)] pt-3 text-xs leading-6 text-[var(--muted)]">{result.explanation || "Questão corrigida. Comentário ainda não cadastrado."}</p> : null}
        </div>
      ) : null}

      <style jsx global>{`@keyframes mtCorrectPop{0%{transform:scale(1)}45%{transform:scale(1.008);box-shadow:0 0 0 4px rgba(34,197,94,.08)}100%{transform:scale(1)}}@keyframes mtWrongShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}.mt-question-correct-pop{animation:mtCorrectPop .46s ease}.mt-question-wrong-shake{animation:mtWrongShake .38s ease}`}</style>
    </article>
  );
}

function formatAnswer(answer: string, type: QuestionType) {
  if (type === "true_false") return answer === "TRUE" ? "CERTO" : "ERRADO";
  return answer || "—";
}

