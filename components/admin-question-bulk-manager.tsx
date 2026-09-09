"use client";

import {
  Database,
  Filter,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminQuestionCatalogRow } from "@/components/admin-question-manager";
import { createClient } from "@/lib/supabase/client";

type Preview = {
  total: number;
  real_count: number;
  authorial_count: number;
  active_count: number;
  inactive_count: number;
  today_count: number;
  protected_count: number;
  banca_counts: Array<{ banca: string; count: number }>;
};

type DeleteResult = {
  matched: number;
  deleted: number;
  protected: number;
};

function unique<T extends { id: string; name: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function AdminQuestionBulkManager({
  catalog,
}: {
  catalog: AdminQuestionCatalogRow[];
}) {
  const [planId, setPlanId] = useState(catalog[0]?.plan_id ?? "");
  const firstSubject = catalog.find((row) => row.plan_id === planId);
  const [subjectId, setSubjectId] = useState(firstSubject?.subject_id ?? "");
  const firstLesson = catalog.find((row) => row.subject_id === subjectId);
  const [lessonId, setLessonId] = useState(firstLesson?.lesson_id ?? "");

  const [sourceType, setSourceType] = useState("");
  const [banca, setBanca] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [todayOnly, setTodayOnly] = useState(true);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const plans = useMemo(
    () =>
      unique(
        catalog.map((row) => ({
          id: row.plan_id,
          name: row.plan_name,
        })),
      ),
    [catalog],
  );

  const subjects = useMemo(
    () =>
      unique(
        catalog
          .filter((row) => row.plan_id === planId)
          .map((row) => ({
            id: row.subject_id,
            name: row.subject_name,
          })),
      ),
    [catalog, planId],
  );

  const lessons = useMemo(
    () =>
      unique(
        catalog
          .filter((row) => row.subject_id === subjectId)
          .map((row) => ({
            id: row.lesson_id,
            name: `Aula ${String(row.lesson_position).padStart(2, "0")} · ${row.lesson_title}`,
          })),
      ),
    [catalog, subjectId],
  );

  function rpcParams() {
    return {
      p_lesson_id: lessonId,
      p_source_type: sourceType || null,
      p_banca: banca.trim() || null,
      p_level: level ? Number(level) : null,
      p_active:
        status === "active" ? true : status === "inactive" ? false : null,
      p_today_only: todayOnly,
    };
  }

  async function refreshPreview() {
    if (!lessonId) {
      setErrorMessage("Selecione uma aula.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "admin_question_bulk_preview",
        rpcParams(),
      );

      if (error) throw error;
      setPreview(data as Preview);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o lote.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteBatch() {
    if (!lessonId || deleting) return;

    const count = Number(preview?.total ?? 0);
    if (!count) {
      setErrorMessage("Atualize a prévia. Não há questões nesse filtro.");
      return;
    }

    const lesson = lessons.find((item) => item.id === lessonId)?.name ?? "aula";
    const scope = todayOnly ? "ADICIONADAS HOJE" : "DE TODO O PERÍODO";

    const confirmed = window.confirm(
      `EXCLUIR ${count} QUESTÕES?\n\n${lesson}\n${scope}\n\nQuestões que já fazem parte do histórico de alunos serão protegidas e não serão apagadas.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "admin_delete_questions_bulk",
        rpcParams(),
      );

      if (error) throw error;

      const result = data as DeleteResult;
      setMessage(
        `${result.deleted} questões excluídas. ${result.protected} protegidas por já terem histórico/tentativa.`,
      );

      const { data: nextPreview, error: previewError } = await supabase.rpc(
        "admin_question_bulk_preview",
        rpcParams(),
      );

      if (previewError) throw previewError;
      setPreview(nextPreview as Preview);

      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o lote.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function changePlan(value: string) {
    const subject = catalog.find((row) => row.plan_id === value);
    const lesson = subject
      ? catalog.find((row) => row.subject_id === subject.subject_id)
      : null;

    setPlanId(value);
    setSubjectId(subject?.subject_id ?? "");
    setLessonId(lesson?.lesson_id ?? "");
    setPreview(null);
  }

  function changeSubject(value: string) {
    const lesson = catalog.find((row) => row.subject_id === value);
    setSubjectId(value);
    setLessonId(lesson?.lesson_id ?? "");
    setPreview(null);
  }

  return (
    <section className="mb-7 overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] bg-[#090a0c] p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#e4b960]">
              <Database size={15} />
              ORGANIZAR / EXCLUIR LOTES
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
              Limpeza do banco por aula.
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-white/50">
              Filtre uma aula, escolha se quer questões reais ou autorais e
              exclua o bloco de uma vez. Por segurança, o padrão está em
              “adicionadas hoje”.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3">
            <span className="block text-[8px] font-black tracking-[.13em] text-white/40">
              NOVA REGRA
            </span>
            <strong className="mt-1 block text-xs text-white/90">
              BANCA PREENCHIDA = REAL
            </strong>
            <strong className="mt-1 block text-xs text-[#e4b960]">
              SEM BANCA = AUTORAL / IA
            </strong>
          </div>
        </div>
      </header>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="CONCURSO / PLANO"
            value={planId}
            onChange={changePlan}
            options={plans}
          />
          <Select
            label="MATÉRIA"
            value={subjectId}
            onChange={changeSubject}
            options={subjects}
          />
          <Select
            label="AULA"
            value={lessonId}
            onChange={(value) => {
              setLessonId(value);
              setPreview(null);
            }}
            options={lessons}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="ORIGEM"
            value={sourceType}
            onChange={(value) => {
              setSourceType(value);
              setPreview(null);
            }}
            options={[
              { id: "", name: "Todas" },
              { id: "real", name: "Questões reais" },
              { id: "authorial", name: "Questões autorais / IA" },
            ]}
            includeEmpty={false}
          />

          <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">
            BANCA
            <input
              value={banca}
              onChange={(event) => {
                setBanca(event.target.value);
                setPreview(null);
              }}
              placeholder="Ex.: CEBRASPE"
              className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)]"
            />
          </label>

          <Select
            label="NÍVEL"
            value={level}
            onChange={(value) => {
              setLevel(value);
              setPreview(null);
            }}
            options={[
              { id: "", name: "Todos" },
              { id: "1", name: "Nível 1" },
              { id: "2", name: "Nível 2" },
              { id: "3", name: "Nível 3" },
              { id: "4", name: "Nível 4" },
            ]}
            includeEmpty={false}
          />

          <Select
            label="STATUS"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPreview(null);
            }}
            options={[
              { id: "", name: "Ativas + inativas" },
              { id: "active", name: "Somente ativas" },
              { id: "inactive", name: "Somente inativas" },
            ]}
            includeEmpty={false}
          />

          <Select
            label="DATA DE CADASTRO"
            value={todayOnly ? "today" : "all"}
            onChange={(value) => {
              setTodayOnly(value === "today");
              setPreview(null);
            }}
            options={[
              { id: "today", name: "Adicionadas hoje" },
              { id: "all", name: "Todas as datas" },
            ]}
            includeEmpty={false}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshPreview}
            disabled={loading || !lessonId}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-[9px] font-black tracking-[.1em] text-[var(--gold-bright)] disabled:opacity-40"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
            ATUALIZAR PRÉVIA
          </button>

          <button
            type="button"
            onClick={deleteBatch}
            disabled={deleting || !preview?.total}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-4 text-[9px] font-black tracking-[.1em] text-red-400 disabled:opacity-35"
          >
            <Trash2 size={15} />
            {deleting ? "EXCLUINDO..." : "EXCLUIR QUESTÕES FILTRADAS"}
          </button>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[.07] p-4 text-xs text-emerald-400">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            {errorMessage}
          </div>
        ) : null}

        {preview ? (
          <div className="mt-5">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="NO FILTRO" value={preview.total} />
              <Metric label="REAIS" value={preview.real_count} />
              <Metric label="AUTORAIS / IA" value={preview.authorial_count} />
              <Metric label="ATIVAS" value={preview.active_count} />
              <Metric label="ADICIONADAS HOJE" value={preview.today_count} />
              <Metric label="PROTEGIDAS" value={preview.protected_count} />
            </div>

            {preview.banca_counts?.length ? (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.14em] text-[var(--gold-bright)]">
                  <Filter size={13} />
                  BANCAS DAS QUESTÕES REAIS
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {preview.banca_counts.map((item) => (
                    <span
                      key={item.banca}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[9px] font-black text-[var(--muted)]"
                    >
                      {item.banca} · {item.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {preview.protected_count ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[.055] p-4">
                <ShieldAlert
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-400"
                />
                <p className="text-[10px] leading-5 text-[var(--muted)]">
                  {preview.protected_count} questão(ões) deste filtro já possuem
                  resposta ou tentativa vinculada. Elas ficam protegidas para
                  não quebrar o histórico dos alunos.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  includeEmpty = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  includeEmpty?: boolean;
}) {
  return (
    <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)]"
      >
        {includeEmpty ? <option value="">Selecione</option> : null}
        {options.map((option) => (
          <option key={`${label}-${option.id || "all"}`} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
      <span className="text-[7px] font-black tracking-[.12em] text-[var(--muted)]">
        {label}
      </span>
      <strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">
        {value}
      </strong>
    </div>
  );
}
