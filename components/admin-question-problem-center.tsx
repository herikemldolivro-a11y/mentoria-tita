"use client";

import { Copy, RefreshCw, ShieldAlert, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProblemRow = {
  id: string;
  plan_name: string;
  plan_slug: string;
  subject_name: string;
  subject_slug: string;
  lesson_title: string;
  lesson_slug: string;
  statement: string;
  question_type: string;
  choices: Record<string, string> | null;
  correct_answer: string | null;
  explanation: string | null;
  level: number;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  source_code: string | null;
  source_type: string | null;
  reported: boolean;
  report_reasons: string[];
  problem_score: number;
  problem_flags: string[];
};

type ProblemResponse = {
  stats: {
    total: number;
    reported: number;
    high_priority: number;
    possible_context: number;
    generic_choices: number;
    embedded_choices: number;
    truncated: number;
  };
  rows: ProblemRow[];
};

function exportRows(rows: ProblemRow[]) {
  return rows.map((row) => ({
    id: row.id,
    problem_flags: row.problem_flags,
    source: {
      plan: row.plan_name,
      subject: row.subject_name,
      lesson: row.lesson_title,
      banca: row.banca,
      ano: row.ano,
      prova: row.exam_name,
      source_code: row.source_code,
    },
    statement: row.statement,
    choices: row.choices,
    correct_answer: row.correct_answer,
    explanation: row.explanation,
  }));
}

export function AdminQuestionProblemCenter() {
  const [subject, setSubject] = useState("lingua-portuguesa");
  const [onlyReported, setOnlyReported] = useState(false);
  const [data, setData] = useState<ProblemResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"problems" | "copy">("problems");
  const [clipboardText, setClipboardText] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const supabase = createClient() as any;
      const { data: result, error } = await supabase.rpc(
        "admin_question_problem_candidates",
        {
          p_subject_slug: subject === "all" ? null : subject,
          p_only_reported: onlyReported,
          p_limit: 5000,
        },
      );
      if (error) throw error;
      setData(result as ProblemResponse);
      setSelected(new Set());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as questões suspeitas.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, onlyReported]);

  const visible = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.id,
        row.subject_name,
        row.lesson_title,
        row.statement,
        row.banca ?? "",
        row.exam_name ?? "",
        row.problem_flags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data?.rows, search]);

  const selectedRows = useMemo(
    () => visible.filter((row) => selected.has(row.id)),
    [selected, visible],
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(visible.map((row) => row.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function generateJson() {
    const rows = selectedRows.length ? selectedRows : visible;
    const text = JSON.stringify(exportRows(rows), null, 2);
    setClipboardText(text);
    setTab("copy");
  }

  async function copyJson() {
    if (!clipboardText.trim()) generateJson();
    const text =
      clipboardText.trim() ||
      JSON.stringify(exportRows(selectedRows.length ? selectedRows : visible), null, 2);
    await navigator.clipboard.writeText(text);
    setMessage(`${selectedRows.length || visible.length} questão(ões) copiadas.`);
  }

  async function applyCorrections() {
    if (applying) return;
    setErrorMessage(null);
    setMessage(null);

    let payload: unknown;
    try {
      payload = JSON.parse(clipboardText);
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error("Cole um array JSON com pelo menos uma questão.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "JSON inválido.",
      );
      return;
    }

    if (
      !window.confirm(
        `Aplicar as correções de ${(payload as unknown[]).length} questão(ões)?`,
      )
    ) {
      return;
    }

    setApplying(true);
    try {
      const supabase = createClient() as any;
      const { data: result, error } = await supabase.rpc(
        "admin_apply_question_corrections",
        { p_payload: payload },
      );
      if (error) throw error;

      setMessage(
        `Correções aplicadas. ${Number(result?.resolved_reports ?? 0)} reporte(s) resolvido(s).`,
      );
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar as correções.",
      );
    } finally {
      setApplying(false);
    }
  }

  const stats = data?.stats;

  return (
    <div data-mt-admin-question-problems-v56="1">
      <section className="overflow-hidden rounded-[28px] border border-white/[.08] bg-[#090b11] text-white">
        <header className="border-b border-white/[.07] bg-[radial-gradient(circle_at_85%_0%,rgba(245,158,11,.12),transparent_32%),#090b11] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-amber-300">
                <ShieldAlert size={15} />
                AUDITORIA DE QUESTÕES
              </span>
              <h1 className="mt-2 font-serif text-3xl tracking-[-.035em] sm:text-5xl">
                Questões com problemas.
              </h1>
              <p className="mt-3 max-w-3xl text-xs leading-6 text-white/45">
                Junta reportes reais e busca automática por questões parecidas:
                contexto ausente, enunciado cortado, alternativas genéricas,
                alternativas duplicadas no enunciado e outros formatos suspeitos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-[10px] font-black tracking-[.1em] text-white/70 transition hover:bg-white/[.08] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              ATUALIZAR
            </button>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="TOTAL SUSPEITAS" value={stats?.total ?? 0} />
            <Stat label="REPORTADAS" value={stats?.reported ?? 0} />
            <Stat label="ALTA PRIORIDADE" value={stats?.high_priority ?? 0} />
            <Stat label="SEM CONTEXTO" value={stats?.possible_context ?? 0} />
            <Stat label="ALT. GENÉRICAS" value={stats?.generic_choices ?? 0} />
            <Stat label="ENUNCIADO CORTADO" value={stats?.truncated ?? 0} />
          </div>
        </header>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl border border-white/[.08] bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setTab("problems")}
                className={`rounded-lg px-4 py-2 text-[10px] font-black tracking-[.08em] ${
                  tab === "problems"
                    ? "bg-white/[.09] text-white"
                    : "text-white/40"
                }`}
              >
                PROBLEMAS
              </button>
              <button
                type="button"
                onClick={() => setTab("copy")}
                className={`rounded-lg px-4 py-2 text-[10px] font-black tracking-[.08em] ${
                  tab === "copy"
                    ? "bg-white/[.09] text-white"
                    : "text-white/40"
                }`}
              >
                COPIAR / COLAR
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="min-h-10 rounded-xl border border-white/[.08] bg-[#0d111a] px-3 text-xs font-semibold text-white outline-none"
              >
                <option value="lingua-portuguesa">Língua Portuguesa</option>
                <option value="all">Todas as matérias</option>
              </select>

              <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[.08] bg-[#0d111a] px-3 text-[10px] font-black tracking-[.06em] text-white/60">
                <input
                  type="checkbox"
                  checked={onlyReported}
                  onChange={(event) => setOnlyReported(event.target.checked)}
                />
                SÓ REPORTADAS
              </label>
            </div>
          </div>

          {message ? (
            <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[.05] px-4 py-3 text-xs text-emerald-200">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/[.05] px-4 py-3 text-xs text-red-200">
              {errorMessage}
            </div>
          ) : null}

          {tab === "problems" ? (
            <>
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por ID, matéria, aula, banca, trecho ou problema..."
                  className="min-h-11 flex-1 rounded-xl border border-white/[.08] bg-[#0d111a] px-4 text-xs text-white outline-none placeholder:text-white/25"
                />
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="min-h-11 rounded-xl border border-violet-300/20 bg-violet-300/[.06] px-4 text-[10px] font-black tracking-[.08em] text-violet-200"
                >
                  SELECIONAR TODAS ({visible.length})
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="min-h-11 rounded-xl border border-white/[.08] px-4 text-[10px] font-black tracking-[.08em] text-white/45"
                >
                  LIMPAR
                </button>
                <button
                  type="button"
                  onClick={generateJson}
                  className="min-h-11 rounded-xl border border-amber-300/30 bg-amber-300/[.08] px-4 text-[10px] font-black tracking-[.08em] text-amber-200"
                >
                  GERAR PARA CORRIGIR ({selected.size || visible.length})
                </button>
              </div>

              <div className="mt-4 max-h-[66vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {loading ? (
                  <div className="rounded-2xl border border-white/[.07] p-6 text-sm text-white/45">
                    Carregando auditoria...
                  </div>
                ) : null}

                {!loading &&
                  visible.map((row) => (
                    <label
                      key={row.id}
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        selected.has(row.id)
                          ? "border-violet-300/35 bg-violet-300/[.06]"
                          : row.reported
                            ? "border-amber-300/22 bg-amber-300/[.035]"
                            : "border-white/[.07] bg-white/[.02]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {row.reported ? (
                              <span className="rounded-full border border-amber-300/25 bg-amber-300/[.08] px-2 py-1 text-[8px] font-black text-amber-200">
                                REPORTADA
                              </span>
                            ) : null}
                            <span className="text-[9px] font-black text-white/65">
                              {row.subject_name} · {row.lesson_title}
                            </span>
                            <span className="text-[8px] text-white/25">
                              {row.id}
                            </span>
                          </div>

                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/72">
                            {row.statement}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {row.problem_flags.map((flag) => (
                              <span
                                key={flag}
                                className="rounded-md border border-red-300/15 bg-red-300/[.045] px-2 py-1 text-[8px] font-black tracking-[.04em] text-red-200/80"
                              >
                                {flag.replaceAll("_", " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                        <strong className="shrink-0 text-sm text-white/65">
                          {row.problem_score}
                        </strong>
                      </div>
                    </label>
                  ))}
              </div>
            </>
          ) : (
            <div className="mt-4">
              <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 text-xs leading-6 text-white/50">
                Selecione as questões na aba <b className="text-white/80">PROBLEMAS</b>,
                clique em <b className="text-white/80">GERAR PARA CORRIGIR</b>, copie
                este JSON, corrija os campos <b className="text-white/80">statement</b>,
                <b className="text-white/80"> choices</b>,
                <b className="text-white/80"> correct_answer</b> e
                <b className="text-white/80"> explanation</b>. Depois cole o JSON
                corrigido aqui e aplique.
              </div>

              <textarea
                value={clipboardText}
                onChange={(event) => setClipboardText(event.target.value)}
                spellCheck={false}
                placeholder="O JSON das questões selecionadas aparece aqui..."
                className="mt-3 h-[52vh] w-full resize-y rounded-2xl border border-white/[.08] bg-[#070910] p-4 font-mono text-[11px] leading-5 text-white/75 outline-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generateJson}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[.1] bg-white/[.04] px-4 text-[10px] font-black tracking-[.08em] text-white/65"
                >
                  <Wrench size={14} />
                  REGERAR JSON
                </button>
                <button
                  type="button"
                  onClick={() => void copyJson()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/[.07] px-4 text-[10px] font-black tracking-[.08em] text-violet-200"
                >
                  <Copy size={14} />
                  COPIAR
                </button>
                <button
                  type="button"
                  onClick={() => void applyCorrections()}
                  disabled={applying || !clipboardText.trim()}
                  className="min-h-11 rounded-xl border border-emerald-300/25 bg-emerald-300/[.08] px-5 text-[10px] font-black tracking-[.08em] text-emerald-200 disabled:opacity-40"
                >
                  {applying ? "APLICANDO..." : "APLICAR CORREÇÕES COLADAS"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-3">
      <span className="block text-[7px] font-black tracking-[.1em] text-white/32">
        {label}
      </span>
      <strong className="mt-1 block font-serif text-2xl text-white">
        {value}
      </strong>
    </div>
  );
}

