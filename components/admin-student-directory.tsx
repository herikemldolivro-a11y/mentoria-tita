"use client";

import { CheckCircle2, LoaderCircle, Search, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  loadAdminStudentsCatalog,
  updateStudentAssignment,
  type AdminStudentsCatalog,
} from "@/lib/platform-admin";

export function AdminStudentDirectory() {
  const [catalog, setCatalog] = useState<AdminStudentsCatalog>({ students: [], plans: [] });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setCatalog(await loadAdminStudentsCatalog());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const students = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return catalog.students;
    return catalog.students.filter((student) =>
      [student.nome, student.username, student.email, student.contest_sigla, student.plan_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [catalog.students, query]);

  async function save(userId: string, planId: string | null, active: boolean) {
    setSavingId(userId);
    setMessage(null);
    try {
      await updateStudentAssignment(userId, planId, active);
      await refresh();
      setMessage("Aluno atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o aluno.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-52 items-center justify-center gap-2 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle className="animate-spin" size={18} /> CARREGANDO ALUNOS</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[var(--gold-bright)]"><UsersRound size={16} /> DIRETÓRIO DE ALUNOS</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">{catalog.students.length} alunos cadastrados</h2>
          </div>
          <label className="relative min-w-0 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar aluno..." className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--border-strong)]" />
          </label>
        </div>
      </section>

      {message ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">{message}</div> : null}

      <div className="grid gap-3">
        {students.map((student) => (
          <article key={student.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_260px_auto] lg:items-center">
              <div className="flex min-w-0 gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] text-[var(--gold-bright)]"><UserRound size={19} /></span>
                <div className="min-w-0">
                  <strong className="block truncate font-serif text-xl text-[var(--ink)]">{student.nome || "Aguardando primeiro acesso"}</strong>
                  <span className="mt-1 block truncate text-[10px] text-[var(--muted)]">@{student.username || "sem-usuario"} · {student.contest_sigla || "sem foco"}</span>
                  <span className="mt-2 block text-[9px] font-bold text-[var(--muted)]">{student.completed_lessons} aulas concluídas · {student.scheduled_revisions} revisões agendadas</span>
                </div>
              </div>

              <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">
                CRONOGRAMA / PLANO
                <select
                  value={student.active_study_plan_id ?? ""}
                  onChange={(event) => void save(student.id, event.target.value || null, student.ativo)}
                  disabled={savingId === student.id}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none"
                >
                  <option value="">Sem plano atribuído</option>
                  {catalog.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
              </label>

              <button
                type="button"
                disabled={savingId === student.id}
                onClick={() => void save(student.id, student.active_study_plan_id, !student.ativo)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black tracking-[.1em]"
                style={{
                  borderColor: student.ativo ? "rgba(49,199,101,.35)" : "var(--border)",
                  color: student.ativo ? "#31c765" : "var(--muted)",
                  background: student.ativo ? "rgba(49,199,101,.06)" : "var(--background)",
                }}
              >
                {savingId === student.id ? <LoaderCircle className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                {student.ativo ? "ATIVO" : "INATIVO"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
