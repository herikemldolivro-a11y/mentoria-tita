"use client";

import { LoaderCircle, Save, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  plan_id: string;
  plan_name: string;
  subject_id: string;
  subject_name: string;
  subject_position: number;
  lesson_id: string;
  lesson_title: string;
  lesson_position: number;
  stage_number: number;
  question_count: number;
  required_correct: number;
  active: boolean;
  available_questions: number;
};

export function AdminLevelingManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [planId, setPlanId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("admin_leveling_stage_catalog");
      if (error) throw error;
      const next = (data ?? []) as Row[];
      setRows(next);
      setPlanId((current) => current || next[0]?.plan_id || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar os nivelamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const plans = useMemo(
    () => Array.from(new Map(rows.map((row) => [row.plan_id, { id: row.plan_id, name: row.plan_name }])).values()),
    [rows],
  );
  const subjects = useMemo(
    () => Array.from(new Map(rows.filter((row) => !planId || row.plan_id === planId).map((row) => [row.subject_id, { id: row.subject_id, name: row.subject_name }])).values()),
    [rows, planId],
  );

  const groups = useMemo(() => {
    const map = new Map<string, { lessonId: string; title: string; subject: string; available: number; stages: Row[] }>();
    for (const row of rows.filter((item) => (!planId || item.plan_id === planId) && (!subjectId || item.subject_id === subjectId))) {
      const current = map.get(row.lesson_id) ?? {
        lessonId: row.lesson_id,
        title: row.lesson_title,
        subject: row.subject_name,
        available: Number(row.available_questions),
        stages: [],
      };
      current.stages.push(row);
      current.stages.sort((a,b) => a.stage_number - b.stage_number);
      map.set(row.lesson_id, current);
    }
    return Array.from(map.values());
  }, [rows, planId, subjectId]);

  function updateLocal(lessonId: string, stageNumber: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) =>
      row.lesson_id === lessonId && row.stage_number === stageNumber ? { ...row, ...patch } : row
    ));
  }

  async function save(row: Row) {
    const key = `${row.lesson_id}-${row.stage_number}`;
    setSavingKey(key);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_upsert_leveling_stage", {
        p_lesson_id: row.lesson_id,
        p_stage_number: row.stage_number,
        p_question_count: row.question_count,
        p_required_correct: row.required_correct,
        p_active: row.active,
      });
      if (error) throw error;
      setMessage(`${row.lesson_title} · Nivelamento ${row.stage_number}: regra salva.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-52 items-center justify-center gap-2 text-xs font-black tracking-[.12em] text-[var(--muted)]"><LoaderCircle className="animate-spin" size={18} /> CARREGANDO NIVELAMENTOS 1–4</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">PLANO
            <select value={planId} onChange={(event) => { setPlanId(event.target.value); setSubjectId(""); }} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--ink)]">
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </label>
          <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">MATÉRIA
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--ink)]">
              <option value="">Todas</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {message ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">{message}</div> : null}

      <div className="space-y-4">
        {groups.map((group) => (
          <article key={group.lessonId} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div>
              <span className="text-[9px] font-black tracking-[.14em] text-[var(--gold-bright)]">{group.subject}</span>
              <h3 className="mt-1 font-serif text-2xl text-[var(--ink)]">{group.title}</h3>
              <p className="mt-2 text-[10px] font-bold text-[var(--muted)]">BANCO ATIVO: {group.available} questões</p>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-4">
              {group.stages.map((row) => {
                const key = `${row.lesson_id}-${row.stage_number}`;
                const enough = group.available >= row.question_count;
                return (
                  <section key={key} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.12em] text-[var(--gold-bright)]"><Target size={14} /> NIVELAMENTO {row.stage_number}</span>
                      <span className="text-[8px] font-black" style={{ color: enough ? "#31c765" : "#d56b6b" }}>{enough ? "BANCO OK" : "FALTAM QUESTÕES"}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <label className="text-[8px] font-black tracking-[.1em] text-[var(--muted)]">QUESTÕES
                        <input type="number" min={1} max={50} value={row.question_count} onChange={(event) => updateLocal(row.lesson_id, row.stage_number, { question_count: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-center text-sm font-black text-[var(--ink)]" />
                      </label>
                      <label className="text-[8px] font-black tracking-[.1em] text-[var(--muted)]">META
                        <input type="number" min={1} max={row.question_count} value={row.required_correct} onChange={(event) => updateLocal(row.lesson_id, row.stage_number, { required_correct: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-center text-sm font-black text-[var(--ink)]" />
                      </label>
                    </div>

                    <strong className="mt-3 block font-serif text-2xl text-[var(--ink)]">{row.required_correct}/{row.question_count}</strong>
                    <button type="button" disabled={savingKey === key} onClick={() => void save(row)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-3 text-[8px] font-black tracking-[.1em] text-[#111] disabled:opacity-50">
                      {savingKey === key ? <LoaderCircle className="animate-spin" size={13} /> : <Save size={13} />} SALVAR
                    </button>
                  </section>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
