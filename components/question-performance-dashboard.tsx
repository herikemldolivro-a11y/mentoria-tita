"use client";

import {
  Activity,
  CheckCircle2,
  CircleX,
  Crosshair,
  LoaderCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PerformanceSubject = {
  subject_name: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
};

type PerformanceDay = {
  day: string;
  total: number;
  correct: number;
  incorrect: number;
};

type PerformanceStats = {
  total_answered: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  today_answered: number;
  last7_answered: number;
  subjects: PerformanceSubject[];
  daily: PerformanceDay[];
};

const EMPTY: PerformanceStats = {
  total_answered: 0,
  correct_count: 0,
  incorrect_count: 0,
  accuracy: 0,
  today_answered: 0,
  last7_answered: 0,
  subjects: [],
  daily: [],
};

function dayLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function QuestionPerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_question_performance");

      if (error) throw error;

      setStats({
        ...EMPTY,
        ...(data as Partial<PerformanceStats> | null),
        subjects: ((data as PerformanceStats | null)?.subjects ?? []),
        daily: ((data as PerformanceStats | null)?.daily ?? []),
      });
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar seu desempenho.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const ring = useMemo(() => {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const percent = Math.max(0, Math.min(100, stats.accuracy || 0));

    return {
      radius,
      circumference,
      offset: circumference - (percent / 100) * circumference,
    };
  }, [stats.accuracy]);

  const maxDaily = Math.max(
    1,
    ...stats.daily.map((item) => Math.max(0, Number(item.total || 0))),
  );

  const weakestSubject = useMemo(() => {
    const eligible = stats.subjects.filter((item) => item.total > 0);
    if (!eligible.length) return null;

    return [...eligible].sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.total - a.total;
    })[0];
  }, [stats.subjects]);

  return (
    <section className="mb-6 overflow-hidden rounded-[30px] border border-[#8067ff]/20 bg-[var(--surface)] shadow-[0_26px_80px_rgba(67,45,158,.10)]">
      <div className="relative overflow-hidden border-b border-[#8067ff]/15 bg-[#0b0b12] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-28 h-72 w-72 rounded-full bg-[#795cff]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#9b82ff]/[.08] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8067ff]/25 bg-[#795cff]/[.09] px-3 py-1.5 text-[8px] font-black tracking-[.18em] text-[#b8a8ff]">
              <Activity size={14} />
              DESEMPENHO EM QUESTÕES
            </span>
            <h2 className="mt-4 font-serif text-3xl tracking-[-.035em] sm:text-4xl">
              Seu raio-X de desempenho.
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/48">
              Acertos, erros e ritmo de estudo reunidos em um painel único.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-[8px] font-black tracking-[.08em] text-white/60">
              HOJE · {stats.today_answered}
            </span>
            <span className="rounded-full border border-[#8067ff]/30 bg-[#795cff]/[.10] px-3 py-2 text-[8px] font-black tracking-[.08em] text-[#b8a8ff]">
              7 DIAS · {stats.last7_answered}
            </span>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="border-b border-red-500/20 bg-red-500/[.06] px-5 py-3 text-xs text-red-400 sm:px-7">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 p-5 sm:p-7 xl:grid-cols-[330px_1fr]">
        <div className="rounded-[24px] border border-[#8067ff]/15 bg-[linear-gradient(145deg,rgba(128,103,255,.045),var(--background))] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[8px] font-black tracking-[.16em] text-[#8067ff]">
                APROVEITAMENTO GERAL
              </span>
              <p className="mt-2 max-w-[150px] text-[10px] leading-5 text-[var(--muted)]">
                Percentual de acertos em todas as respostas registradas.
              </p>
            </div>

            <div className="relative h-[142px] w-[142px] shrink-0">
              <svg
                viewBox="0 0 128 128"
                className="-rotate-90 h-full w-full"
                aria-label={`Aproveitamento ${formatPercent(stats.accuracy)}`}
              >
                <circle
                  cx="64"
                  cy="64"
                  r={ring.radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-[var(--border)]"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={ring.radius}
                  fill="none"
                  stroke="#8067ff"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ring.circumference}
                  strokeDashoffset={ring.offset}
                  className="transition-all duration-700"
                />
              </svg>

              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <strong className="block font-serif text-3xl leading-none text-[var(--ink)]">
                    {loading ? "—" : formatPercent(stats.accuracy)}
                  </strong>
                  <span className="mt-1 block text-[7px] font-black tracking-[.15em] text-[var(--muted)]">
                    ACERTOS
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-red-500/15">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, stats.accuracy))}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric
              icon={<Target size={14} />}
              label="FEITAS"
              value={stats.total_answered}
              tone="purple"
            />
            <Metric
              icon={<CheckCircle2 size={14} />}
              label="ACERTOS"
              value={stats.correct_count}
              tone="green"
            />
            <Metric
              icon={<CircleX size={14} />}
              label="ERROS"
              value={stats.incorrect_count}
              tone="red"
            />
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[24px] border border-[#8067ff]/12 bg-[var(--background)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[8px] font-black tracking-[.16em] text-[#8067ff]">
                  RITMO · ÚLTIMOS 7 DIAS
                </span>
                <h3 className="mt-1 font-serif text-xl text-[var(--ink)]">
                  Acertos e erros por dia
                </h3>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#8067ff]/18 bg-[#795cff]/[.06] text-[#8f73ff]">
                <TrendingUp size={18} />
              </span>
            </div>

            <div className="mt-5 grid h-[170px] grid-cols-7 items-end gap-2 sm:gap-3">
              {(stats.daily.length
                ? stats.daily
                : Array.from({ length: 7 }, (_, index) => ({
                    day: `2026-01-0${index + 1}`,
                    total: 0,
                    correct: 0,
                    incorrect: 0,
                  }))
              ).map((item) => {
                const totalHeight =
                  item.total > 0 ? Math.max(14, (item.total / maxDaily) * 118) : 4;
                const correctRatio =
                  item.total > 0 ? item.correct / item.total : 0;
                const incorrectRatio =
                  item.total > 0 ? item.incorrect / item.total : 0;

                return (
                  <div
                    key={item.day}
                    className="flex h-full min-w-0 flex-col items-center justify-end"
                    title={`${item.total} respondidas · ${item.correct} acertos · ${item.incorrect} erros`}
                  >
                    <span className="mb-2 text-[8px] font-black text-[var(--muted)]">
                      {item.total}
                    </span>
                    <div
                      className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-lg bg-[#8067ff]/10"
                      style={{ height: totalHeight }}
                    >
                      <div
                        className="w-full bg-emerald-500"
                        style={{
                          height: `${Math.max(
                            item.correct > 0 ? 8 : 0,
                            correctRatio * totalHeight,
                          )}px`,
                        }}
                      />
                      <div
                        className="w-full bg-red-500/80"
                        style={{
                          height: `${Math.max(
                            item.incorrect > 0 ? 8 : 0,
                            incorrectRatio * totalHeight,
                          )}px`,
                        }}
                      />
                    </div>
                    <span className="mt-2 truncate text-[7px] font-black tracking-[.06em] text-[var(--muted)]">
                      {dayLabel(item.day)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 border-t border-[#8067ff]/10 pt-3 text-[8px] font-black tracking-[.1em] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-emerald-500" /> ACERTOS
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-red-500/80" /> ERROS
              </span>
            </div>
          </div>

          {weakestSubject ? (
            <div className="rounded-[20px] border border-[#8067ff]/18 bg-[#795cff]/[.045] p-4">
              <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.14em] text-[#8f73ff]">
                <Crosshair size={14} />
                PONTO DE ATENÇÃO
              </span>
              <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <strong className="block font-serif text-xl text-[var(--ink)]">
                    {weakestSubject.subject_name}
                  </strong>
                  <span className="text-[10px] text-[var(--muted)]">
                    {weakestSubject.incorrect} erro(s) em {weakestSubject.total} resposta(s)
                  </span>
                </div>
                <strong className="font-serif text-2xl text-[#8067ff]">
                  {formatPercent(weakestSubject.accuracy)}
                </strong>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[#8067ff]/10 p-5 sm:p-7">
        <div className="mb-4">
          <span className="text-[8px] font-black tracking-[.16em] text-[#8067ff]">
            DESEMPENHO POR MATÉRIA
          </span>
          <h3 className="mt-1 font-serif text-2xl text-[var(--ink)]">
            Onde você está forte e onde precisa reagir.
          </h3>
        </div>

        {loading ? (
          <div className="flex min-h-24 items-center justify-center gap-2 text-xs text-[var(--muted)]">
            <LoaderCircle className="animate-spin" size={16} />
            Atualizando desempenho...
          </div>
        ) : stats.subjects.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {stats.subjects.map((subject) => (
              <div
                key={subject.subject_name}
                className="rounded-2xl border border-[#8067ff]/10 bg-[var(--background)] p-4 transition hover:border-[#8067ff]/25"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-xs text-[var(--ink)]">
                      {subject.subject_name}
                    </strong>
                    <span className="mt-1 block text-[8px] font-bold text-[var(--muted)]">
                      {subject.total} feitas · {subject.correct} acertos · {subject.incorrect} erros
                    </span>
                  </div>
                  <strong
                    className="shrink-0 font-serif text-xl"
                    style={{
                      color:
                        subject.accuracy >= 80
                          ? "#31c765"
                          : subject.accuracy >= 60
                            ? "#8067ff"
                            : "#df6262",
                    }}
                  >
                    {formatPercent(subject.accuracy)}
                  </strong>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(0, Math.min(100, subject.accuracy))}%`,
                      background:
                        subject.accuracy >= 80
                          ? "#31c765"
                          : subject.accuracy >= 60
                            ? "#8067ff"
                            : "#df6262",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#8067ff]/25 bg-[#795cff]/[.025] px-5 py-8 text-center">
            <strong className="font-serif text-xl text-[var(--ink)]">
              Seu gráfico começa na primeira questão.
            </strong>
            <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">
              Responda questões da plataforma e este painel passará a mostrar
              seus acertos, erros e desempenho por matéria automaticamente.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "purple" | "green" | "red";
}) {
  const toneStyle =
    tone === "green"
      ? {
          borderColor: "rgba(49,199,101,.22)",
          background: "rgba(49,199,101,.055)",
          color: "#31c765",
        }
      : tone === "red"
        ? {
            borderColor: "rgba(223,98,98,.22)",
            background: "rgba(223,98,98,.055)",
            color: "#df6262",
          }
        : {
            borderColor: "rgba(128,103,255,.25)",
            background: "rgba(121,92,255,.065)",
            color: "#8067ff",
          };

  return (
    <div className="rounded-xl border p-3" style={toneStyle}>
      <span className="flex items-center gap-1.5 text-[7px] font-black tracking-[.1em]">
        {icon}
        {label}
      </span>
      <strong className="mt-1 block font-serif text-2xl text-[var(--ink)]">
        {value}
      </strong>
    </div>
  );
}
