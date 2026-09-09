"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  cfoPmalAdvancedSociology,
  cfoPmalRoadmap,
} from "@/lib/cfo-pmal-roadmap-data";

export function CfoPmalFullRoadmap() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("pt-BR");

  const visibleDays = useMemo(() => {
    if (!normalized) return cfoPmalRoadmap;

    return cfoPmalRoadmap
      .map((day) => ({
        ...day,
        lessons: day.lessons.filter((lesson) =>
          `${lesson.subject} ${lesson.lessonNumber ?? ""} ${lesson.title}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized),
        ),
      }))
      .filter((day) => day.lessons.length > 0 || String(day.day) === normalized);
  }, [normalized]);

  const scheduledLessons = cfoPmalRoadmap.reduce(
    (total, day) => total + day.lessons.length,
    0,
  );
  const pdfCount = cfoPmalRoadmap.reduce(
    (total, day) => total + day.lessons.filter((lesson) => lesson.pdfPath).length,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <section className="overflow-hidden rounded-[30px] border border-[#d2a64e]/25 bg-[#090a0c] p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#e4b960]">
          <ShieldCheck size={16} /> CFO PMAL 2026 · PLANO COMPLETO
        </span>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">
          39 dias de estudo organizados em uma única rota.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/52">
          Os Dias 01–09 permanecem preservados. Do Dia 10 ao Dia 39, o roteiro
          segue exatamente a ordem do cronograma ajustado enviado para a plataforma.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          <Metric label="DIAS" value="39" />
          <Metric label="AULAS NO ROTEIRO" value={String(scheduledLessons)} />
          <Metric label="ADIANTADAS" value="3" />
          <Metric label="PDFs VINCULADOS AGORA" value={String(pdfCount)} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/cronograma/semana-1"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d2a64e] px-4 text-[9px] font-black tracking-[.08em] text-[#111]"
          >
            ABRIR SEMANA ATUAL <ArrowRight size={14} />
          </Link>
          <a
            href="/materials/cfo-pmal/cronograma-cfo-pmal-39-dias.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-[9px] font-black tracking-[.08em] text-white/70"
          >
            <FileText size={14} /> ARQUIVO-FONTE
          </a>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <span className="text-[8px] font-black tracking-[.14em] text-[var(--gold-bright)]">
          NÃO REPETIR
        </span>
        <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">
          Sociologia 02–04 já estão adiantadas.
        </h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {cfoPmalAdvancedSociology.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] p-3 text-[10px] font-semibold leading-5 text-[var(--muted)]"
            >
              <CheckCircle2 className="mb-2 text-emerald-500" size={15} />
              {item}
            </div>
          ))}
        </div>
      </section>

      <label className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4">
        <Search size={16} className="text-[var(--muted)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar matéria ou assunto..."
          className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
        />
      </label>

      <div className="mt-5 space-y-4">
        {visibleDays.map((day) => (
          <article
            key={day.day}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[8px] font-black tracking-[.14em] text-[var(--gold-bright)]">
                  DIA {String(day.day).padStart(2, "0")}
                </span>
                <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">
                  {day.lessons.length} {day.lessons.length === 1 ? "aula" : "aulas"}
                </h2>
              </div>
              <span
                className={`rounded-full border px-3 py-1.5 text-[7px] font-black tracking-[.1em] ${
                  day.day <= 9
                    ? "border-emerald-500/25 bg-emerald-500/[.05] text-emerald-500"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {day.day <= 9 ? "PRESERVADO / EXECUTADO" : "PLANEJADO"}
              </span>
            </div>

            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {day.lessons.map((lesson) => (
                <div
                  key={`${day.day}-${lesson.order}-${lesson.subject}-${lesson.title}`}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--gold-bright)]">
                    <BookOpenCheck size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[7px] font-black tracking-[.08em] text-[var(--muted)]">
                      {lesson.subject}{lesson.lessonNumber ? ` ${String(lesson.lessonNumber).padStart(2, "0")}` : ""}
                    </span>
                    <strong className="mt-1 block text-[11px] leading-5 text-[var(--ink)]">
                      {lesson.title}
                    </strong>
                  </div>
                  {lesson.pdfPath ? (
                    <a
                      href={lesson.pdfPath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[rgba(210,166,78,.3)] px-2.5 text-[7px] font-black tracking-[.08em] text-[var(--gold-bright)]"
                    >
                      <FileText size={12} /> PDF
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <span className="text-[7px] font-black tracking-[.12em] text-white/40">{label}</span>
      <strong className="mt-1 block font-serif text-2xl text-white">{value}</strong>
    </div>
  );
}
