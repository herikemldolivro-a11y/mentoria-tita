"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Calculator, Flag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { prfSubjects, type PrfSubject } from "@/lib/prf-week-one";
import {
  listenStudyUpdated,
  loadSubjectProgressSummary,
  startWeek,
  type SubjectProgressSummary,
} from "@/lib/study-database";

const completedGreen = "#31c765";

function SubjectCard({ subject }: { subject: PrfSubject }) {
  const activeLessons = subject.lessons.filter((lesson) => lesson.weekOne);
  const isAccounting = subject.slug === "contabilidade";
  const [summary, setSummary] = useState<SubjectProgressSummary>({
    started: false,
    completedLessons: 0,
    totalLessons: activeLessons.length,
    completedSteps: 0,
    totalSteps: activeLessons.length * 2,
    percent: 0,
  });

  const refresh = useCallback(async () => {
    try {
      setSummary(await loadSubjectProgressSummary(subject.slug));
    } catch {
      // A tela continua utilizável; o erro aparecerá ao entrar na matéria se necessário.
    }
  }, [subject.slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unlisten = listenStudyUpdated(() => void refresh());
    return () => {
      window.clearTimeout(timer);
      unlisten();
    };
  }, [refresh]);

  return (
    <article className="group overflow-hidden rounded-[24px] border border-[var(--border)] bg-[#0c0d0f] text-white transition hover:-translate-y-0.5 hover:border-[#d2a64e]/45">
      <div className="grid min-h-[185px] gap-5 p-5 sm:grid-cols-[74px_1fr_auto] sm:items-center sm:p-6">
        <span className="grid h-[66px] w-[66px] place-items-center rounded-[20px] border border-[#d2a64e]/25 bg-[#d2a64e]/[0.08] text-[#e5bd6d]">
          {isAccounting ? <BookOpenCheck size={28} /> : <Calculator size={28} />}
        </span>

        <div className="min-w-0">
          <span className="text-[9px] font-black tracking-[0.2em] text-[#d9ab50]">{subject.shortName} · SEMANA 1</span>
          <h3 className="mt-2 font-serif text-3xl leading-tight text-white">{subject.name}</h3>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-white/48">{subject.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-bold tracking-[0.08em] text-white/52">
            <span className="rounded-full border border-white/10 px-3 py-1.5">{activeLessons.length} AULAS</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">{activeLessons.length * 35} QUESTÕES</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">{summary.percent}% CONCLUÍDO</span>
          </div>
        </div>

        <Link
          href={`/cronograma/semana-1/${subject.slug}`}
          className="inline-flex min-h-12 min-w-[170px] items-center justify-center gap-2 rounded-xl border border-[#d2a64e]/30 bg-[#d2a64e]/10 px-5 text-[10px] font-black tracking-[0.13em] text-[#e5bd6d] transition hover:bg-[#d2a64e] hover:text-[#111]"
        >
          {summary.started ? "CONTINUAR MATÉRIA" : "INICIAR MATÉRIA"} <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}

export function PrfWeekOneMap() {
  useEffect(() => {
    const timer = window.setTimeout(() => void startWeek(1), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-9">
      <section>
        <div className="mb-5">
          <span className="text-[10px] font-black tracking-[0.22em] text-[var(--gold-bright)]">MATÉRIAS DA SEMANA</span>
          <h1 className="mt-2 font-serif text-3xl text-[var(--ink)] sm:text-4xl">Duas frentes. Uma missão.</h1>
        </div>
        <div className="space-y-4">
          {prfSubjects.map((subject) => <SubjectCard key={subject.slug} subject={subject} />)}
        </div>
      </section>

      <section className="mt-8 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex gap-3">
          <Flag className="mt-0.5 shrink-0 text-[var(--gold-bright)]" size={19} />
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">COMO FUNCIONA CADA AULA</span>
            <strong className="mt-1 block font-serif text-xl text-[var(--ink)]">Uma sequência protegida, com revisão programada.</strong>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">A próxima aula só libera depois de Teoria + Lista. Ao concluir a aula, a Mentoria recomenda Revisão 1 em +2 dias. Na revisão: releitura do material → nivelamento de 10 questões → aprovação somente com 9/10. Depois da Revisão 1, a recomendação da Revisão 2 é +4 dias.</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-5">
              {[
                ["01", "Teoria", "Dourado enquanto disponível"],
                ["02", "Lista", "35 questões"],
                ["03", "Agendar revisão", "+2 dias recomendado"],
                ["04", "Revisão", "Releitura do conteúdo"],
                ["05", "Nivelamento", "Meta 9/10"],
              ].map(([number, title, note]) => (
                <div key={number} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3.5">
                  <span className="text-[8px] font-black tracking-[.14em] text-[var(--gold-bright)]">{number}</span>
                  <strong className="mt-1 block text-xs text-[var(--ink)]">{title}</strong>
                  <span className="mt-1 block text-[9px] leading-4 text-[var(--muted)]">{note}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[10px] leading-5 text-[var(--muted)]">Dourado = disponível. Cinza = bloqueado/futuro. <span style={{ color: completedGreen }}>Verde = somente o que foi realmente concluído.</span></p>
          </div>
        </div>
      </section>
    </div>
  );
}
