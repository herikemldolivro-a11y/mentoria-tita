"use client";

import {
  BarChart3,
  CalendarDays,
  FileText,
  LoaderCircle,
  PieChart,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DayRow = {
  day: string;
  total: number;
  correct: number;
  incorrect: number;
};

type OverallStats = {
  total_answered: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  today_answered: number;
  last7_answered: number;
  daily: DayRow[];
};

type WindowKey = "24h" | "7d" | "30d";

type WindowPoint = {
  label: string;
  bucket_start: string;
  total: number;
  correct: number;
  incorrect: number;
};

type WindowStats = {
  window: WindowKey;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  series: WindowPoint[];
};

const EMPTY_OVERALL: OverallStats = {
  total_answered: 0,
  correct_count: 0,
  incorrect_count: 0,
  accuracy: 0,
  today_answered: 0,
  last7_answered: 0,
  daily: [],
};

const EMPTY_WINDOW: WindowStats = {
  window: "7d",
  total: 0,
  correct: 0,
  incorrect: 0,
  accuracy: 0,
  series: [],
};

const WINDOW_OPTIONS: Array<{ key: WindowKey; label: string }> = [
  { key: "24h", label: "ÚLTIMAS 24H" },
  { key: "7d", label: "ÚLTIMOS 7 DIAS" },
  { key: "30d", label: "ÚLTIMOS 30 DIAS" },
];

function percent(value: number) {
  const safe = Number(value || 0);
  return `${safe.toFixed(safe % 1 === 0 ? 0 : 1)}%`;
}

function numberBr(value: number) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function buildLineGeometry(values: number[], width: number, height: number, maxValue: number) {
  if (!values.length) {
    return { line: "", area: "" };
  }

  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (Math.max(0, value) / Math.max(1, maxValue)) * (height - 28) - 14;
    return { x, y };
  });

  const line = points.reduce((acc, point, index, arr) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[index - 1];
    const cx1 = prev.x + (point.x - prev.x) / 3;
    const cy1 = prev.y;
    const cx2 = point.x - (point.x - prev.x) / 3;
    const cy2 = point.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${point.x} ${point.y}`;
  }, "");

  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L ${last.x} ${height - 8} L ${first.x} ${height - 8} Z`;

  return { line, area };
}

export function PmalPerformanceReport() {
  const [overall, setOverall] = useState<OverallStats>(EMPTY_OVERALL);
  const [windowKey, setWindowKey] = useState<WindowKey>("7d");
  const [windowStats, setWindowStats] = useState<WindowStats>(EMPTY_WINDOW);
  const [loadingOverall, setLoadingOverall] = useState(true);
  const [loadingWindow, setLoadingWindow] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOverall = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_question_performance");
      if (error) throw error;
      const next = (data ?? {}) as Partial<OverallStats>;
      setOverall({ ...EMPTY_OVERALL, ...next, daily: next.daily ?? [] });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar seu relatório.");
    } finally {
      setLoadingOverall(false);
    }
  }, []);

  const refreshWindow = useCallback(async (key: WindowKey) => {
    setLoadingWindow(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_question_performance_window", { p_window: key });
      if (error) throw error;
      const next = (data ?? {}) as Partial<WindowStats>;
      setWindowStats({
        ...EMPTY_WINDOW,
        ...next,
        window: key,
        series: Array.isArray(next.series) ? next.series : [],
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o período selecionado.");
    } finally {
      setLoadingWindow(false);
    }
  }, []);

  useEffect(() => {
    void refreshOverall();
  }, [refreshOverall]);

  useEffect(() => {
    void refreshWindow(windowKey);
  }, [refreshWindow, windowKey]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshOverall();
      void refreshWindow(windowKey);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshOverall, refreshWindow, windowKey]);

  const series = useMemo(
    () => (Array.isArray(windowStats.series) && windowStats.series.length ? windowStats.series : [{ label: "-", bucket_start: "0", total: 0, correct: 0, incorrect: 0 }]),
    [windowStats.series],
  );

  const maxY = useMemo(
    () => Math.max(1, ...series.flatMap((point) => [Number(point.correct || 0), Number(point.incorrect || 0), Number(point.total || 0)])),
    [series],
  );

  const correctSeries = useMemo(() => series.map((point) => Number(point.correct || 0)), [series]);
  const incorrectSeries = useMemo(() => series.map((point) => Number(point.incorrect || 0)), [series]);

  const chartWidth = 700;
  const chartHeight = 320;
  const correctGeometry = useMemo(() => buildLineGeometry(correctSeries, chartWidth, chartHeight, maxY), [correctSeries, maxY]);
  const incorrectGeometry = useMemo(() => buildLineGeometry(incorrectSeries, chartWidth, chartHeight, maxY), [incorrectSeries, maxY]);

  const correctPct = windowStats.total ? (windowStats.correct / windowStats.total) * 100 : 0;
  const incorrectPct = windowStats.total ? (windowStats.incorrect / windowStats.total) * 100 : 0;
  const selectedLabel = WINDOW_OPTIONS.find((option) => option.key === windowKey)?.label ?? "ÚLTIMOS 7 DIAS";

  const featuredPoints = useMemo(() => {
    if (!series.length) return [];
    if (series.length <= 4) return series;
    const indexes = [0, Math.round((series.length - 1) / 3), Math.round(((series.length - 1) * 2) / 3), series.length - 1];
    return indexes.map((index) => series[index]);
  }, [series]);

  const momentumLabel = windowStats.accuracy >= 80 ? "Continue assim!" : windowStats.accuracy >= 65 ? "Ritmo de evolução" : "Hora de reagir";

  return (
    <section className="mt-report49">
      <div className="mt-report49-glow" aria-hidden="true" />

      <header className="mt-report49-header">
        <div className="mt-report49-heading">
          <span className="mt-report49-kicker"><BarChart3 size={14} /> RELATÓRIOS</span>
          <h2>Relatório de <em>desempenho</em></h2>
          <p>Acompanhe sua evolução, identifique seus pontos fortes e acelere sua aprovação.</p>
        </div>
        <div className="mt-report49-hero-copy" aria-hidden="true">
          <span>ESTUDO HOJE.</span>
          <strong>RESULTADOS SEMPRE.</strong>
        </div>
      </header>

      {error ? <div className="mt-report49-error">{error}</div> : null}

      <div className="mt-report49-controls">
        <div className="mt-report49-tabs">
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setWindowKey(option.key)}
              className={windowKey === option.key ? "is-active" : ""}
            >
              <CalendarDays size={15} />
              <span>{option.label === "ÚLTIMAS 24H" ? "Últimas 24h" : option.label === "ÚLTIMOS 7 DIAS" ? "Últimos 7 dias" : "Últimos 30 dias"}</span>
            </button>
          ))}
        </div>

        <div className="mt-report49-series-strip">
          <span className="mt-report49-series-icon"><CalendarDays size={17} /></span>
          <div className="mt-report49-series-name">
            <small>SÉRIE DO PERÍODO</small>
            <strong>ACERTEI X ERREI</strong>
          </div>
          <div className="mt-report49-series-meta">
            <small>{selectedLabel}</small>
            <span>{numberBr(windowStats.total)} respostas</span>
          </div>
        </div>
      </div>

      <div className="mt-report49-main">
        <article className="mt-report49-card mt-report49-chart-card">
          <div className="mt-report49-card-head">
            <div className="mt-report49-card-title">
              <span className="mt-report49-title-icon is-gold"><TrendingUp size={19} /></span>
              <div>
                <h3>ACERTEI X ERREI</h3>
                <p>Evolução das suas respostas no período selecionado.</p>
              </div>
            </div>
            <div className="mt-report49-legend-inline">
              <span><i className="is-blue" /> Acertei</span>
              <span><i className="is-red" /> Errei</span>
            </div>
          </div>

          {loadingWindow ? (
            <div className="mt-report49-loading"><LoaderCircle size={18} className="animate-spin" /> Carregando gráfico...</div>
          ) : (
            <>
              <div className="mt-report49-chart">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="mt49CorrectArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(48,158,255,.31)" />
                      <stop offset="100%" stopColor="rgba(48,158,255,0)" />
                    </linearGradient>
                    <linearGradient id="mt49IncorrectArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,68,105,.22)" />
                      <stop offset="100%" stopColor="rgba(255,68,105,0)" />
                    </linearGradient>
                    <filter id="mt49BlueGlow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <filter id="mt49RedGlow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>

                  {[0, 1, 2, 3, 4].map((tick) => {
                    const y = 18 + (tick / 4) * (chartHeight - 40);
                    return (
                      <g key={tick}>
                        <line x1="38" y1={y} x2={chartWidth} y2={y} stroke="rgba(155,176,210,.14)" strokeDasharray="4 7" />
                        <text x="4" y={Math.max(13, y + 4)} fill="rgba(198,210,231,.60)" fontSize="11">{Math.round(maxY - (tick / 4) * maxY)}</text>
                      </g>
                    );
                  })}

                  {series.length > 1 && series.map((point, index) => {
                    const x = 38 + (index / (series.length - 1)) * (chartWidth - 38);
                    return <line key={`${point.bucket_start}-guide`} x1={x} y1="15" x2={x} y2={chartHeight - 18} stroke="rgba(155,176,210,.06)" />;
                  })}

                  <g transform="translate(38 0) scale(.945 1)">
                    <path d={correctGeometry.area} fill="url(#mt49CorrectArea)" />
                    <path d={incorrectGeometry.area} fill="url(#mt49IncorrectArea)" />
                    <path d={correctGeometry.line} fill="none" stroke="#2f9cff" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" filter="url(#mt49BlueGlow)" />
                    <path d={incorrectGeometry.line} fill="none" stroke="#ff4469" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" filter="url(#mt49RedGlow)" />
                    {series.map((point, index) => {
                      const x = series.length === 1 ? chartWidth / 2 : (index / (series.length - 1)) * chartWidth;
                      const cyCorrect = chartHeight - (Math.max(0, point.correct) / Math.max(1, maxY)) * (chartHeight - 28) - 14;
                      const cyIncorrect = chartHeight - (Math.max(0, point.incorrect) / Math.max(1, maxY)) * (chartHeight - 28) - 14;
                      return (
                        <g key={`${point.bucket_start}-${index}`}>
                          <circle cx={x} cy={cyCorrect} r="4.5" fill="#5bb6ff" stroke="#08101a" strokeWidth="2" />
                          <circle cx={x} cy={cyIncorrect} r="4.5" fill="#ff5a78" stroke="#08101a" strokeWidth="2" />
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>

              <div className="mt-report49-point-row">
                {featuredPoints.map((point) => (
                  <div key={`featured-${point.bucket_start}`}>
                    <small>{point.label}</small>
                    <strong>{point.correct}A - {point.incorrect}E</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="mt-report49-card mt-report49-summary-card">
          <div className="mt-report49-card-head">
            <div className="mt-report49-card-title">
              <span className="mt-report49-title-icon is-gold"><PieChart size={18} /></span>
              <div><h3>RESUMO DO PERÍODO</h3></div>
            </div>
            <span className="mt-report49-period-chip"><CalendarDays size={13} /> {selectedLabel}</span>
          </div>

          {loadingWindow ? (
            <div className="mt-report49-loading"><LoaderCircle size={18} className="animate-spin" /> Carregando resumo...</div>
          ) : (
            <div className="mt-report49-summary-body">
              <div className="mt-report49-donut-shell">
                <div className="mt-report49-donut" style={{ background: `conic-gradient(#289cff 0deg ${correctPct * 3.6}deg, #ff3c64 ${correctPct * 3.6}deg ${(correctPct + incorrectPct) * 3.6}deg, rgba(255,255,255,.08) ${(correctPct + incorrectPct) * 3.6}deg 360deg)` }}>
                  <div className="mt-report49-donut-mid">
                    <div>
                      <small>TOTAL</small>
                      <strong>{numberBr(windowStats.total)}</strong>
                      <span>{selectedLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-report49-summary-side">
                <ReportLegendCard color="#2f9cff" label="Acertei" value={windowStats.correct} pct={correctPct} />
                <ReportLegendCard color="#ff4469" label="Errei" value={windowStats.incorrect} pct={incorrectPct} />
              </div>
            </div>
          )}
        </article>
      </div>

      <div className="mt-report49-bottom">
        <article className="mt-report49-bottom-card is-green">
          <span className="mt-report49-bottom-icon"><Trophy size={20} /></span>
          <div className="mt-report49-bottom-content">
            <small>APROVEITAMENTO GERAL</small>
            <strong>{loadingOverall ? "—" : percent(overall.accuracy)}</strong>
            <span>Base completa da plataforma</span>
          </div>
          <div className="mt-report49-bottom-meta">
            <b>{numberBr(overall.correct_count)}</b><span>acertos</span>
            <b>{numberBr(overall.incorrect_count)}</b><span>erros</span>
          </div>
        </article>

        <article className="mt-report49-bottom-card is-purple">
          <span className="mt-report49-bottom-icon"><FileText size={20} /></span>
          <div className="mt-report49-bottom-content">
            <small>TOTAL RESPONDIDO</small>
            <strong>{loadingWindow ? "—" : numberBr(windowStats.total)}</strong>
            <span>questões · {selectedLabel.toLowerCase()}</span>
          </div>
          <div className="mt-report49-docs" aria-hidden="true"><i /><i /><i /></div>
        </article>

        <article className="mt-report49-bottom-card is-gold">
          <span className="mt-report49-bottom-icon"><Target size={20} /></span>
          <div className="mt-report49-bottom-content">
            <small>META DE APROVAÇÃO</small>
            <h4>{momentumLabel}</h4>
            <span>{windowStats.accuracy >= 80 ? "Você está no caminho certo. Mantenha a constância!" : "Transforme os erros em prioridade na próxima sessão."}</span>
          </div>
          <div className="mt-report49-bars" aria-hidden="true"><i /><i /><i /><i /></div>
        </article>
      </div>
    </section>
  );
}

function ReportLegendCard({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div className="mt-report49-legend-card" style={{ "--legend": color } as React.CSSProperties}>
      <div className="mt-report49-legend-top">
        <span><i /> {label}</span>
        <b>{percent(pct)}</b>
      </div>
      <div className="mt-report49-legend-value"><strong>{numberBr(value)}</strong><span>questões</span></div>
      <div className="mt-report49-progress"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
    </div>
  );
}
