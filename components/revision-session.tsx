"use client";

import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  FileText,
  LockKeyhole,
  MonitorPlay,
  RefreshCcw,
  RotateCcw,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { getPrfLesson } from "@/lib/prf-week-one";
import {
  addDaysToDateKey,
  formatDatePtBr,
  isRevisionDue,
  toDateKey,
  type RevisionEvent,
} from "@/lib/revision-system";
import {
  listenStudyUpdated,
  loadRevisionEvent,
  queueRevisionDraft,
  registerLevelingAttempt,
  updateRevisionReread,
  updateRevisionStudyMode,
} from "@/lib/study-database";

const gold = "#d2a64e";
const green = "#31c765";

export function RevisionSession({ revisionId }: { revisionId: string }) {
  const router = useRouter();
  const [revision, setRevision] = useState<RevisionEvent | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [score, setScore] = useState(9);

  const refresh = useCallback(async () => {
    try {
      setRevision(await loadRevisionEvent(revisionId));
    } finally {
      setHydrated(true);
    }
  }, [revisionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unlisten = listenStudyUpdated(() => void refresh());
    return () => {
      window.clearTimeout(timer);
      unlisten();
    };
  }, [refresh]);

  const lessonResult = useMemo(() => {
    if (!revision) return null;
    return getPrfLesson(revision.subjectSlug, revision.lessonSlug);
  }, [revision]);

  if (!hydrated) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">Carregando revisão...</div>;
  }

  if (!revision || !lessonResult) {
    return (
      <section className="rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-7">
        <span className="text-[10px] font-black tracking-[.18em] text-[var(--gold-bright)]">REVISÃO</span>
        <h1 className="mt-3 font-serif text-4xl text-[var(--ink)]">Revisão não encontrada.</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Ela pode ter sido removida ou ainda não foi criada no calendário.</p>
        <Link href="/revisoes" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-xs font-black text-[#111]">VOLTAR AO CALENDÁRIO <ArrowRight size={16} /></Link>
      </section>
    );
  }

  const { lesson } = lessonResult;
  const due = isRevisionDue(revision) || revision.status === "completed";
  const attempts = revision.levelingAttempts ?? [];
  const currentRound = revision.levelingRound ?? 1;
  const lastAttempt = attempts.at(-1) ?? null;
  const approved = revision.status === "completed";
  const levelingReady = Boolean(revision.rereadConfirmed) && due && !approved;

  async function setStudyMode(mode: "platform-pdf" | "external-course") {
    if (!revision) return;
    setRevision({ ...revision, studyMode: mode });
    await updateRevisionStudyMode(revision.id, mode);
  }

  async function toggleReread() {
    if (!revision) return;
    const confirmed = !revision.rereadConfirmed;
    setRevision({ ...revision, rereadConfirmed: confirmed });
    await updateRevisionReread(revision.id, confirmed);
  }

  async function registerScore() {
    if (!revision || !levelingReady) return;
    const next = await registerLevelingAttempt(revision.id, score);
    setRevision(next);
  }

  async function scheduleNextRevision() {
    if (!revision || revision.revisionNumber !== 1 || !revision.completedAt) return;
    const completedDate = toDateKey(new Date(revision.completedAt));
    const draft = await queueRevisionDraft({
      subjectSlug: revision.subjectSlug,
      subjectName: revision.subjectName,
      lessonSlug: revision.lessonSlug,
      lessonTitle: revision.lessonTitle,
      revisionNumber: 2,
      recommendedDate: addDaysToDateKey(completedDate, 4),
    });
    router.push(`/revisoes?agendar=${draft.id}`);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[#090a0c] text-white shadow-[0_24px_70px_rgba(0,0,0,.24)]">
        <div className="grid lg:grid-cols-[1fr_300px]">
          <div className="p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[#e4b960]"><RefreshCcw size={15} /> {revision.subjectName} · REVISÃO {revision.revisionNumber}</span>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.035em] sm:text-5xl">{revision.lessonTitle}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">Primeiro releia o material. Depois faça o nivelamento de 10 questões. A revisão só é concluída com pelo menos 9 acertos.</p>
          </div>
          <aside className="border-t border-white/10 bg-white/[0.025] p-5 lg:border-l lg:border-t-0 lg:p-6">
            <span className="text-[9px] font-black tracking-[.15em] text-white/40">DATA PROGRAMADA</span>
            <strong className="mt-1 block font-serif text-2xl">{formatDatePtBr(revision.date)}</strong>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-[9px] font-black tracking-[.12em] text-white/42">STATUS</span>
              <strong className="mt-1 flex items-center gap-2 text-sm" style={{ color: approved ? green : due ? gold : "rgba(255,255,255,.55)" }}>
                {approved ? <CheckCircle2 size={16} /> : due ? <Target size={16} /> : <CalendarClock size={16} />}
                {approved ? "Concluída" : due ? "Disponível agora" : "Agendada"}
              </strong>
            </div>
          </aside>
        </div>
      </section>

      {!due ? (
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex gap-3">
            <LockKeyhole className="mt-0.5 shrink-0 text-[var(--muted)]" size={20} />
            <div>
              <strong className="font-serif text-xl text-[var(--ink)]">Esta revisão ainda não chegou.</strong>
              <p className="mt-1 text-xs leading-6 text-[var(--muted)]">Ela está programada para {formatDatePtBr(revision.date)}. Se quiser testar agora, mova o card para hoje no calendário de revisões.</p>
              <Link href="/revisoes" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]">ABRIR CALENDÁRIO <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[26px] border p-5 sm:p-7" style={{ borderColor: revision.rereadConfirmed ? "rgba(49,199,101,.38)" : due ? "rgba(210,166,78,.36)" : "var(--border)", background: "var(--surface)", opacity: due ? 1 : 0.55 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-[10px] font-black tracking-[.2em]" style={{ color: revision.rereadConfirmed ? green : due ? gold : "var(--muted)" }}>ETAPA 01 · RELEITURA</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Releia o conteúdo antes das questões.</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">Revise os tópicos abaixo pelo PDF da Mentoria Titã ou pelo seu cursinho. Depois confirme que terminou a releitura.</p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[9px] font-black tracking-[.12em]" style={{ color: revision.rereadConfirmed ? green : "var(--muted)" }}>{revision.rereadConfirmed ? "RELEITURA CONCLUÍDA" : "AGUARDANDO"}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {lesson.topics.map((topic, index) => (
            <span key={`${lesson.slug}-review-${index}-${topic}`} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[10px] leading-relaxed text-[var(--muted)]">{topic}</span>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={!due || approved} onClick={() => setStudyMode("platform-pdf")} className="rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed" style={{ borderColor: revision.studyMode === "platform-pdf" ? "rgba(210,166,78,.5)" : "var(--border)", background: revision.studyMode === "platform-pdf" ? "rgba(210,166,78,.06)" : "var(--background)" }}>
            <FileText className="text-[var(--gold-bright)]" size={21} />
            <strong className="mt-3 block font-serif text-lg text-[var(--ink)]">Reabrir PDF da plataforma</strong>
            <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">Quando o PDF real for vinculado, a leitura acontece dentro da plataforma.</span>
          </button>
          <button type="button" disabled={!due || approved} onClick={() => setStudyMode("external-course")} className="rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed" style={{ borderColor: revision.studyMode === "external-course" ? "rgba(210,166,78,.5)" : "var(--border)", background: revision.studyMode === "external-course" ? "rgba(210,166,78,.06)" : "var(--background)" }}>
            <MonitorPlay className="text-[var(--gold-bright)]" size={21} />
            <strong className="mt-3 block font-serif text-lg text-[var(--ink)]">Vou revisar no meu cursinho</strong>
            <span className="mt-1 block text-[10px] leading-5 text-[var(--muted)]">Use seu material externo e volte para confirmar a releitura.</span>
          </button>
        </div>

        {revision.studyMode === "platform-pdf" ? (
          <div className="mt-4 grid min-h-[230px] place-items-center rounded-2xl border border-[var(--border-strong)] bg-[#0a0b0d] p-6 text-center text-white">
            <div className="max-w-md">
              <FileText className="mx-auto text-[#d9ab50]" size={34} />
              <strong className="mt-3 block font-serif text-xl">Leitor da revisão</strong>
              <p className="mt-2 text-[10px] leading-5 text-white/45">O PDF desta aula aparecerá aqui quando você enviar e vincular o material.</p>
            </div>
          </div>
        ) : null}

        <button type="button" disabled={!due || approved || !revision.studyMode} onClick={toggleReread} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[10px] font-black tracking-[.11em] disabled:cursor-not-allowed disabled:opacity-45" style={{ borderColor: revision.rereadConfirmed ? "rgba(49,199,101,.4)" : "rgba(210,166,78,.35)", background: revision.rereadConfirmed ? "rgba(49,199,101,.07)" : "rgba(210,166,78,.05)", color: revision.rereadConfirmed ? green : gold }}>
          {revision.rereadConfirmed ? <RotateCcw size={15} /> : <Check size={15} />}
          {revision.rereadConfirmed ? "DESMARCAR RELEITURA" : "CONFIRMO QUE RELI O MATERIAL"}
        </button>
      </section>

      <section className="rounded-[26px] border p-5 sm:p-7" style={{ borderColor: approved ? "rgba(49,199,101,.4)" : levelingReady ? "rgba(210,166,78,.4)" : "var(--border)", background: approved ? "rgba(49,199,101,.045)" : "var(--surface)", opacity: revision.rereadConfirmed || approved ? 1 : 0.55 }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="text-[10px] font-black tracking-[.2em]" style={{ color: approved ? green : levelingReady ? gold : "var(--muted)" }}>ETAPA 02 · NIVELAMENTO</span>
            <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Meta obrigatória: 9 de 10.</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">Se você errar 2 ou mais questões, o assunto ainda não está dominado. Um novo bloco de 10 questões é liberado e o processo se repete até atingir 9/10 ou 10/10.</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-right">
            <span className="text-[8px] font-black tracking-[.14em] text-[var(--muted)]">BLOCO ATUAL</span>
            <strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">{currentRound}</strong>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><span className="text-[8px] font-black tracking-[.13em] text-[var(--muted)]">PRIORIDADE 1</span><strong className="mt-2 block text-xs text-[var(--ink)]">Questões erradas antes</strong></div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><span className="text-[8px] font-black tracking-[.13em] text-[var(--muted)]">PRIORIDADE 2</span><strong className="mt-2 block text-xs text-[var(--ink)]">Piores tópicos</strong></div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><span className="text-[8px] font-black tracking-[.13em] text-[var(--muted)]">PRIORIDADE 3</span><strong className="mt-2 block text-xs text-[var(--ink)]">Questões difíceis</strong></div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><span className="text-[8px] font-black tracking-[.13em] text-[var(--muted)]">PRIORIDADE 4</span><strong className="mt-2 block text-xs text-[var(--ink)]">Ainda não respondidas</strong></div>
        </div>

        {attempts.length > 0 ? (
          <div className="mt-5 space-y-2">
            {attempts.map((attempt) => (
              <div key={`${attempt.round}-${attempt.completedAt}`} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs">
                <span className="text-[var(--muted)]">Bloco {attempt.round}</span>
                <strong style={{ color: attempt.score >= 9 ? green : "#d56b6b" }}>{attempt.score}/10 · {attempt.score >= 9 ? "APROVADO" : "NOVO BLOCO NECESSÁRIO"}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {!approved ? (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <strong className="flex items-center gap-2 text-sm text-[var(--ink)]"><CircleAlert size={16} className="text-[var(--gold-bright)]" /> Banco de questões ainda não conectado</strong>
            <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">Nesta fase, use o campo abaixo apenas para testar a regra do nivelamento. Quando o banco real entrar, este bloco será substituído pelas 10 questões selecionadas automaticamente.</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">SIMULAR ACERTOS
                <input type="number" min={0} max={10} value={score} onChange={(event: ChangeEvent<HTMLInputElement>) => setScore(Number(event.target.value))} disabled={!levelingReady} className="mt-2 block h-11 w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-center text-lg font-black text-[var(--ink)] outline-none disabled:opacity-40" />
              </label>
              <button type="button" disabled={!levelingReady} onClick={registerScore} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111] disabled:cursor-not-allowed disabled:opacity-40">
                REGISTRAR BLOCO {currentRound} <ArrowRight size={15} />
              </button>
            </div>
            {lastAttempt && lastAttempt.score <= 8 ? <p className="mt-3 text-[10px] font-bold text-[#d56b6b]">Você fez {lastAttempt.score}/10. Um novo bloco de 10 foi liberado. Meta continua 9/10.</p> : null}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-5">
            <CheckCircle2 size={22} style={{ color: green }} />
            <strong className="mt-3 block font-serif text-2xl text-[var(--ink)]">Revisão {revision.revisionNumber} concluída.</strong>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Releitura confirmada e nivelamento aprovado com pelo menos 9/10.</p>

            {revision.revisionNumber === 1 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={scheduleNextRevision} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-[10px] font-black tracking-[.1em]" style={{ color: green }}>
                  <CalendarClock size={15} /> ABRIR CALENDÁRIO PARA AGENDAR REVISÃO 2
                </button>
                <Link href="/revisoes" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--muted)]">ABRIR CALENDÁRIO <ArrowRight size={15} /></Link>
              </div>
            ) : (
              <Link href="/revisoes" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--muted)]">VOLTAR AO CALENDÁRIO <ArrowRight size={15} /></Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
