"use client";

import { BookOpenText, GraduationCap, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPrincipalRevision, type PrincipalCalendarHub } from "@/lib/principal-calendar-system";
import {
  createPrincipalCalendarManualItem,
  schedulePrincipalLevelingManual,
  setPrincipalRevisionNotes,
} from "@/lib/principal-calendar-custom-system";

type Mode = "lesson" | "revision" | "leveling";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-violet-400/45";
const labelClass =
  "mb-1.5 block text-[8px] font-black tracking-[.14em] text-white/38";

export function CalendarQuickAddModal({
  hub,
  onClose,
  onSaved,
}: {
  hub: PrincipalCalendarHub;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("lesson");
  const [date, setDate] = useState(dateKey(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = useMemo(
    () => [...new Set(hub.taxonomy.map((row) => row.subject_name))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [hub.taxonomy],
  );
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const lessons = useMemo(
    () => hub.taxonomy.filter((row) => row.subject_name === subject),
    [hub.taxonomy, subject],
  );
  const [lessonId, setLessonId] = useState(lessons[0]?.lesson_id ?? "");
  const [number, setNumber] = useState(1);

  const [manualSubject, setManualSubject] = useState("");
  const [manualLesson, setManualLesson] = useState("");

  useEffect(() => {
    setLessonId(lessons[0]?.lesson_id ?? "");
  }, [subject, lessons]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      if (mode === "lesson") {
        if (!manualSubject.trim()) throw new Error("Digite o nome da matéria.");
        if (!manualLesson.trim()) throw new Error("Digite o nome da aula.");
        await createPrincipalCalendarManualItem({
          subjectName: manualSubject,
          lessonTitle: manualLesson,
          notes,
          date,
        });
      } else if (mode === "revision") {
        if (!lessonId) throw new Error("Selecione uma aula.");
        const revision = await createPrincipalRevision({
          lessonId,
          revisionNumber: number,
          date,
        });
        if (notes.trim() && revision?.id) {
          await setPrincipalRevisionNotes(revision.id, notes);
        }
      } else {
        if (!lessonId) throw new Error("Selecione uma aula.");
        await schedulePrincipalLevelingManual({
          lessonId,
          levelingNumber: number,
          date,
          notes,
        });
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar o item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="w-full max-w-2xl rounded-[28px] border border-violet-400/25 bg-[#0d0d13] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-black tracking-[.18em] text-violet-300">+ CALENDÁRIO</span>
            <h3 className="mt-2 font-serif text-3xl">O que você quer criar?</h3>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55">
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <ModeButton active={mode === "lesson"} onClick={() => setMode("lesson")} icon={<BookOpenText size={15} />} title="AULA" />
          <ModeButton active={mode === "revision"} onClick={() => setMode("revision")} icon={<RotateCcw size={15} />} title="REVISÃO" />
          <ModeButton active={mode === "leveling"} onClick={() => setMode("leveling")} icon={<GraduationCap size={15} />} title="NIVELAMENTO" />
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{error}</div> : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {mode === "lesson" ? (
            <>
              <label>
                <span className={labelClass}>MATÉRIA</span>
                <input value={manualSubject} onChange={(e) => setManualSubject(e.target.value)} placeholder="Ex.: Direito Penal" className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>NOME DA AULA</span>
                <input value={manualLesson} onChange={(e) => setManualLesson(e.target.value)} placeholder="Ex.: Teoria do crime" className={inputClass} />
              </label>
            </>
          ) : (
            <>
              <label>
                <span className={labelClass}>MATÉRIA</span>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
                  {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>AULA</span>
                <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className={inputClass}>
                  {lessons.map((lesson) => <option key={lesson.lesson_id} value={lesson.lesson_id}>{lesson.lesson_title}</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>{mode === "revision" ? "REVISÃO" : "NIVELAMENTO"}</span>
                <select value={number} onChange={(e) => setNumber(Number(e.target.value))} className={inputClass}>
                  {[1,2,3,4].map((item) => <option key={item} value={item}>{mode === "revision" ? `R${item}` : `N${item}`}</option>)}
                </select>
              </label>
            </>
          )}

          <label>
            <span className={labelClass}>DATA</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </label>

          <label className="sm:col-span-2">
            <span className={labelClass}>OBSERVAÇÃO</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escreva qualquer observação para lembrar depois..."
              rows={4}
              className={`${inputClass} min-h-[105px] resize-y py-3`}
            />
          </label>
        </div>

        {mode === "leveling" ? (
          <div className="mt-4 rounded-xl border border-fuchsia-400/15 bg-fuchsia-400/[.05] p-3 text-[9px] leading-5 text-white/45">
            O nivelamento fica vinculado à aula selecionada. Se a revisão correspondente ainda não estiver concluída, ele aparece no calendário, mas continua bloqueado até essa revisão ser concluída.
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/10 px-4 text-[9px] font-black tracking-[.08em] text-white/50">
            CANCELAR
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-violet-500 px-5 text-[9px] font-black tracking-[.08em] text-white hover:bg-violet-400 disabled:opacity-50">
            {saving ? "SALVANDO..." : "ADICIONAR AO CALENDÁRIO"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border text-[8px] font-black tracking-[.1em] transition ${
        active
          ? "border-violet-300/35 bg-violet-400/[.12] text-violet-100"
          : "border-white/[.08] bg-white/[.025] text-white/38 hover:text-white/70"
      }`}
    >
      {icon}
      {title}
    </button>
  );
}
