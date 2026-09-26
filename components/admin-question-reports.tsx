"use client";

import {
  CheckCircle2,
  Clipboard,
  Flag,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseFriendlyQuestionImport } from "@/lib/question-import";
import { createClient } from "@/lib/supabase/client";

type ReportReason =
  | "wrong_answer_key"
  | "missing_context"
  | "other"
  | "excluded_by_user";

type AdminQuestionReport = {
  id: string;
  question_id: string;
  user_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reason: ReportReason;
  details: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  plan_id: string;
  subject_id: string;
  lesson_id: string;
  subject_name: string | null;
  lesson_title: string | null;
  statement: string;
  question_type: "true_false" | "multiple_choice";
  choices: Record<string,string> | null;
  level: number;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  source_code: string | null;
  active: boolean;
  correct_answer: string;
  explanation: string | null;
};

type ReportGroup = {
  question: AdminQuestionReport;
  reports: AdminQuestionReport[];
};

const reasonLabels: Record<ReportReason,string> = {
  wrong_answer_key: "GABARITO ERRADO",
  missing_context: "QUESTÃO FALTANDO CONTEXTO",
  other: "OUTRO PROBLEMA",
  excluded_by_user: "QUESTÃO EXCLUÍDA PELO USUÁRIO",
};

function displayAnswer(report: AdminQuestionReport) {
  if (report.question_type === "true_false") {
    return report.correct_answer === "TRUE" ? "CERTO" : "ERRADO";
  }
  return report.correct_answer || "";
}

function currentQuestionTemplate(report: AdminQuestionReport) {
  const lines = [
    "ENUNCIADO:",
    report.statement,
    "",
    `TIPO: ${report.question_type === "multiple_choice" ? "MULTIPLA ESCOLHA" : "CERTO ERRADO"}`,
    `NÍVEL: ${report.level}`,
    `BANCA: ${report.banca ?? ""}`,
    `ANO: ${report.ano ?? ""}`,
    `PROVA: ${report.exam_name ?? ""}`,
    `FONTE: ${report.source_code ?? ""}`,
  ];

  if (report.question_type === "multiple_choice") {
    for (const letter of ["A","B","C","D","E"]) {
      const value = report.choices?.[letter];
      if (value) lines.push(`${letter}: ${value}`);
    }
  }

  lines.push(
    `GABARITO: ${displayAnswer(report)}`,
    "COMENTÁRIO:",
    report.explanation ?? "",
  );

  return lines.join("\\n");
}

export function AdminQuestionReports() {
  const [reports,setReports]=useState<AdminQuestionReport[]>([]);
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    setLoading(true);
    setError(null);
    try{
      const supabase=createClient() as any;
      const {data,error:rpcError}=await supabase.rpc("admin_question_reports",{p_status:"pending"});
      if(rpcError) throw rpcError;
      setReports((data ?? []) as AdminQuestionReport[]);
    }catch(e){
      setError(e instanceof Error ? e.message : "Não foi possível carregar as questões com problemas.");
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{
    void refresh();
  },[refresh]);

  const groups=useMemo<ReportGroup[]>(()=>{
    const map=new Map<string,ReportGroup>();
    for(const report of reports){
      const existing=map.get(report.question_id);
      if(existing) existing.reports.push(report);
      else map.set(report.question_id,{question:report,reports:[report]});
    }
    return [...map.values()].sort((a,b)=>
      new Date(b.reports[0].created_at).getTime()-new Date(a.reports[0].created_at).getTime()
    );
  },[reports]);

  const stats=useMemo(()=>{
    const exclusions=reports.filter((item)=>item.reason==="excluded_by_user").length;
    const reportsCount=reports.length-exclusions;
    return { exclusions, reportsCount };
  },[reports]);

  async function copyTemplate(report:AdminQuestionReport){
    try{
      await navigator.clipboard.writeText(currentQuestionTemplate(report));
      setMessage("Formato atual copiado.");
      setError(null);
    }catch{
      setError("Não foi possível copiar automaticamente. Use o botão CARREGAR NO CAMPO.");
    }
  }

  async function saveCorrection(group:ReportGroup){
    const report=group.question;
    const text=drafts[report.question_id]?.trim() ?? "";

    if(!text){
      setError("Cole ou carregue o formato corrigido antes de salvar.");
      return;
    }

    const parsed=parseFriendlyQuestionImport(text,{
      plan_id:report.plan_id,
      subject_id:report.subject_id,
      lesson_id:report.lesson_id,
    });

    if(parsed.errors.length){
      setError(parsed.errors.join(" "));
      return;
    }

    if(parsed.questions.length !== 1){
      setError("A correção deve conter exatamente uma questão.");
      return;
    }

    setSaving(report.question_id);
    setError(null);
    setMessage(null);

    try{
      const supabase=createClient() as any;
      const payload={
        ...parsed.questions[0],
        id:report.question_id,
        active:true,
      };

      const {error:saveError}=await supabase.rpc("admin_upsert_question",{p_payload:payload});
      if(saveError) throw saveError;

      const {error:resolveError}=await supabase.rpc("admin_resolve_question_reports",{
        p_question_id:report.question_id,
        p_resolution_note:"Questão corrigida pelo administrador na fila de questões com problemas.",
      });
      if(resolveError) throw resolveError;

      setReports((current)=>current.filter((item)=>item.question_id!==report.question_id));
      setDrafts((current)=>{
        const next={...current};
        delete next[report.question_id];
        return next;
      });
      setMessage("Questão corrigida. As ocorrências pendentes foram encerradas e a questão voltou a ficar disponível para tentativas futuras.");
    }catch(e){
      setError(e instanceof Error ? e.message : "Não foi possível salvar a correção.");
    }finally{
      setSaving(null);
    }
  }

  if(loading){
    return (
      <div className="grid min-h-56 place-items-center rounded-[26px] border border-[var(--border)] bg-[var(--surface)]">
        <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
          <LoaderCircle className="animate-spin" size={16}/> CARREGANDO QUESTÕES COM PROBLEMAS
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-amber-400">
              <Flag size={15}/> QUESTÕES COM PROBLEMAS
            </span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">
              {groups.length} questão(ões) aguardando análise.
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              Entram aqui tanto questões reportadas quanto questões excluídas pelos usuários.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[8px] font-black text-amber-300">
                {stats.reportsCount} REPORTE(S)
              </span>
              <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[8px] font-black text-red-300">
                {stats.exclusions} EXCLUSÃO(ÕES)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={()=>void refresh()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[9px] font-black text-[var(--muted)]"
          >
            <RefreshCw size={14}/> ATUALIZAR
          </button>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="mr-2 inline" size={15}/>{message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      ) : null}

      {!groups.length ? (
        <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
          Nenhuma questão com problema aguardando correção.
        </div>
      ) : null}

      {groups.map((group)=>{
        const report=group.question;
        const template=currentQuestionTemplate(report);
        const draft=drafts[report.question_id] ?? "";
        const hasExclusion=group.reports.some((item)=>item.reason==="excluded_by_user");

        return (
          <article
            key={report.question_id}
            className="overflow-hidden rounded-[26px] border border-amber-500/20 bg-[var(--surface)]"
          >
            <header className="border-b border-[var(--border)] bg-amber-500/[.045] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-[8px] font-black tracking-[.15em] text-amber-400">
                    QUESTÃO COM PROBLEMA
                  </span>
                  <h3 className="mt-2 font-serif text-2xl text-[var(--ink)]">
                    {report.subject_name ?? "Matéria"} · {report.lesson_title ?? "Aula"}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Nível {report.level}
                    {report.banca ? ` · ${report.banca}` : ""}
                    {report.ano ? ` · ${report.ano}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasExclusion ? (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[8px] font-black text-red-300">
                      EXCLUÍDA
                    </span>
                  ) : null}
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[8px] font-black text-amber-300">
                    {group.reports.length} OCORRÊNCIA(S)
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {group.reports.map((item)=>(
                  <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                    <strong className={item.reason==="excluded_by_user" ? "text-[9px] text-red-300" : "text-[9px] text-amber-400"}>
                      {reasonLabels[item.reason]}
                    </strong>
                    {item.details ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.details}</p> : null}
                    <span className="mt-2 block text-[8px] text-[var(--muted)]">
                      {item.reporter_name ?? item.reporter_email ?? "Usuário"} · {new Date(item.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </header>

            <div className="grid gap-5 p-5 lg:grid-cols-2 sm:p-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={()=>void copyTemplate(report)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[8px] font-black text-[var(--muted)]"
                  >
                    <Clipboard size={14}/> COPIAR FORMATO ATUAL
                  </button>
                  <button
                    type="button"
                    onClick={()=>setDrafts((current)=>({...current,[report.question_id]:template}))}
                    className="min-h-10 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 text-[8px] font-black text-violet-300"
                  >
                    CARREGAR NO CAMPO
                  </button>
                </div>

                <details className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <summary className="cursor-pointer text-[9px] font-black text-[var(--muted)]">
                    VER FORMATO ATUAL
                  </summary>
                  <pre className="mt-3 max-h-[460px] overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[var(--ink)]">
                    {template}
                  </pre>
                </details>
              </div>

              <div>
                <span className="text-[8px] font-black tracking-[.14em] text-violet-400">
                  COLE A QUESTÃO CORRIGIDA
                </span>
                <textarea
                  value={draft}
                  onChange={(event)=>setDrafts((current)=>({...current,[report.question_id]:event.target.value}))}
                  placeholder="Cole aqui o mesmo formato, já corrigido."
                  className="mt-2 min-h-[390px] w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-[11px] leading-5 text-[var(--ink)] outline-none focus:border-violet-400/45"
                />
                <button
                  type="button"
                  onClick={()=>void saveCorrection(group)}
                  disabled={saving===report.question_id || !draft.trim()}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[9px] font-black text-white disabled:opacity-45"
                >
                  {saving===report.question_id ? <LoaderCircle className="animate-spin" size={14}/> : <Save size={14}/>}
                  SALVAR CORREÇÃO E RESOLVER PROBLEMA
                </button>
                <p className="mt-2 text-[9px] leading-5 text-[var(--muted)]">
                  Ao salvar, a questão é atualizada, as ocorrências pendentes são encerradas e ela volta a ficar disponível em tentativas futuras.
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
