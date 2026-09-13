"use client";

import { ArrowLeft, Check, CheckCircle2, FileText, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEnemEssayAnalysis, type EssayHighlight, type EssayHighlightKind } from "@/lib/enem-essay-analysis";
import { getEnemEssayForDay } from "@/lib/enem-essay-data";
import { createClient } from "@/lib/supabase/client";

function paragraphLabel(index: number, total: number) {
  if (index === 0) return "INTRODUÇÃO";
  if (index === total - 1) return "CONCLUSÃO";
  return `DESENVOLVIMENTO ${index}`;
}

const highlightStyle: Record<EssayHighlightKind, { label: string; className: string; dot: string }> = {
  thesis: {
    label: "TESE",
    className: "rounded-[3px] bg-violet-400/[.08] underline decoration-violet-400 decoration-[2px] underline-offset-[5px]",
    dot: "bg-violet-400",
  },
  cause: {
    label: "CAUSA",
    className: "rounded-[3px] bg-amber-400/[.07] underline decoration-amber-400 decoration-[2px] underline-offset-[5px]",
    dot: "bg-amber-400",
  },
  argument: {
    label: "ARGUMENTO-CHAVE",
    className: "rounded-[3px] bg-sky-400/[.07] underline decoration-sky-400 decoration-[2px] underline-offset-[5px]",
    dot: "bg-sky-400",
  },
  intervention: {
    label: "INTERVENÇÃO",
    className: "rounded-[3px] bg-emerald-400/[.07] underline decoration-emerald-400 decoration-[2px] underline-offset-[5px]",
    dot: "bg-emerald-400",
  },
};

function renderHighlightedParagraph(paragraph: string, highlights: EssayHighlight[]) {
  const matches = highlights
    .map((highlight) => ({ highlight, start: paragraph.indexOf(highlight.text) }))
    .filter((item) => item.start >= 0)
    .sort((a, b) => a.start - b.start);

  if (!matches.length) return paragraph;

  const parts: Array<string | React.ReactNode> = [];
  let cursor = 0;

  matches.forEach(({ highlight, start }, index) => {
    if (start < cursor) return;
    if (start > cursor) parts.push(paragraph.slice(cursor, start));
    const style = highlightStyle[highlight.kind];
    parts.push(
      <span key={`${highlight.kind}-${start}-${index}`} className={style.className} title={`${style.label}: ${highlight.note}`}>
        {highlight.text}
      </span>,
    );
    cursor = start + highlight.text.length;
  });

  if (cursor < paragraph.length) parts.push(paragraph.slice(cursor));
  return parts;
}

export function EnemEssayReader({ day }: { day: number }) {
  const essay = getEnemEssayForDay(day);
  const analysis = getEnemEssayAnalysis(day);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data, error: loadError } = await supabase
          .from("user_enem_daily_checkpoints")
          .select("completed_at")
          .eq("user_id", auth.user.id)
          .eq("study_day", day)
          .eq("checkpoint", "essay_note_mil")
          .maybeSingle();
        if (loadError) throw loadError;
        if (alive) setCompleted(Boolean(data?.completed_at));
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Não foi possível carregar o progresso da redação.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [day]);

  async function markCompleted() {
    if (!essay || busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const now = new Date().toISOString();
      const { error: saveError } = await supabase
        .from("user_enem_daily_checkpoints")
        .upsert({
          user_id: auth.user.id,
          study_day: day,
          checkpoint: "essay_note_mil",
          completed_at: now,
          updated_at: now,
        }, { onConflict: "user_id,study_day,checkpoint" });
      if (saveError) throw saveError;
      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível marcar a redação como concluída.");
    } finally {
      setBusy(false);
    }
  }

  async function undoCompleted() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { error: deleteError } = await supabase
        .from("user_enem_daily_checkpoints")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("study_day", day)
        .eq("checkpoint", "essay_note_mil");
      if (deleteError) throw deleteError;
      setCompleted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível desfazer a conclusão.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="mx-auto grid min-h-80 max-w-5xl place-items-center px-4"><LoaderCircle className="animate-spin text-amber-300" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-[9px] font-black tracking-[.08em] text-[var(--muted)]">
        <ArrowLeft size={15} /> VOLTAR À TRILHA
      </Link>

      {error ? <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-300">{error}</div> : null}

      {!essay ? (
        <section className="mt-4 rounded-[30px] border border-dashed border-white/10 bg-white/[.02] p-8 text-center">
          <FileText className="mx-auto text-white/30" size={28} />
          <h1 className="mt-4 font-serif text-3xl text-[var(--ink)]">Redação do Dia {day}</h1>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[var(--muted)]">A leitura desse dia ainda não foi cadastrada. Ela não será marcada como concluída até existir conteúdo real para você ler.</p>
        </section>
      ) : (
        <>
          <section className="mt-3 overflow-hidden rounded-[30px] border border-amber-400/20 bg-[radial-gradient(circle_at_82%_0%,rgba(245,158,11,.14),transparent_38%),#0b0907] text-white shadow-[0_28px_90px_rgba(0,0,0,.35)]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-[8px] font-black tracking-[.12em]">
                <span className="rounded-full border border-amber-300/20 bg-amber-300/[.07] px-3 py-1.5 text-amber-100">DIA {day} · REDAÇÃO NOTA MIL</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5 text-white/45">ENEM {essay.year}</span>
              </div>
              <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{essay.title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/55"><strong className="text-white/80">Tema:</strong> {essay.theme}</p>
              <div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-4 text-[10px] leading-5 text-white/45">
                Leia a redação inteira e acompanhe as marcações. As partes sublinhadas mostram a engenharia do texto: tese, causas, argumentos-chave e intervenção. Passe o mouse sobre uma marcação para ver por que ela importa.
              </div>
            </div>
          </section>

          {analysis ? (
            <section className="mt-5 rounded-[28px] border border-violet-400/15 bg-[linear-gradient(145deg,rgba(124,58,237,.07),rgba(14,165,233,.025))] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[.05] text-violet-300"><Sparkles size={17} /></span>
                <div>
                  <span className="text-[8px] font-black tracking-[.14em] text-violet-400">RAIO-X DA REDAÇÃO</span>
                  <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">O que você precisa enxergar antes de copiar a estrutura.</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[.035] p-4">
                  <span className="text-[8px] font-black tracking-[.12em] text-violet-400">TESE CENTRAL</span>
                  <p className="mt-2 text-xs leading-6 text-[var(--ink)]/80">{analysis.thesis}</p>
                </div>
                <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[.03] p-4">
                  <span className="text-[8px] font-black tracking-[.12em] text-amber-500">CAUSAS / EIXOS</span>
                  <div className="mt-2 space-y-1.5">{analysis.causes.map((cause) => <p key={cause} className="text-xs leading-5 text-[var(--ink)]/75">• {cause}</p>)}</div>
                </div>
                <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[.03] p-4">
                  <span className="text-[8px] font-black tracking-[.12em] text-sky-500">PONTOS-CHAVE DA ARGUMENTAÇÃO</span>
                  <div className="mt-2 space-y-1.5">{analysis.argumentKeys.map((item) => <p key={item} className="text-xs leading-5 text-[var(--ink)]/75">• {item}</p>)}</div>
                </div>
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.03] p-4">
                  <span className="text-[8px] font-black tracking-[.12em] text-emerald-500">O QUE LEVAR PARA A SUA REDAÇÃO</span>
                  <p className="mt-2 text-xs leading-6 text-[var(--ink)]/80">{analysis.takeaway}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[8px] font-black tracking-[.08em]">
                {(Object.keys(highlightStyle) as EssayHighlightKind[]).map((kind) => {
                  const style = highlightStyle[kind];
                  return <span key={kind} className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[var(--muted)]"><span className={`h-2 w-2 rounded-full ${style.dot}`} /> {style.label}</span>;
                })}
              </div>
            </section>
          ) : null}

          <section className="mt-5 rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-8">
            <div className="space-y-5">
              {essay.paragraphs.map((paragraph, index) => {
                const paragraphHighlights = analysis?.highlights.filter((item) => item.paragraph === index) ?? [];
                return (
                  <article key={`${essay.day}-${index}`} className="rounded-[22px] border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
                    <span className="text-[8px] font-black tracking-[.14em] text-amber-500">{paragraphLabel(index, essay.paragraphs.length)}</span>
                    <p className="mt-3 font-serif text-[18px] leading-[1.9] text-[var(--ink)] sm:text-[20px]">{renderHighlightedParagraph(paragraph, paragraphHighlights)}</p>
                    {paragraphHighlights.length ? (
                      <div className="mt-5 border-t border-[var(--border)] pt-4">
                        <span className="text-[7px] font-black tracking-[.12em] text-[var(--muted)]">POR QUE EU SUBLINHEI ISSO</span>
                        <div className="mt-2 grid gap-2">
                          {paragraphHighlights.map((highlight) => {
                            const style = highlightStyle[highlight.kind];
                            return (
                              <div key={`${highlight.kind}-${highlight.text}`} className="flex items-start gap-2 rounded-xl border border-white/[.06] bg-white/[.018] px-3 py-2.5">
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                                <p className="text-[9px] leading-5 text-[var(--muted)]"><strong className="mr-1 text-[var(--ink)]/70">{style.label}:</strong>{highlight.note}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <span className="text-[8px] font-black tracking-[.12em] text-[var(--muted)]">FONTE DA LEITURA</span>
              <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{essay.sourceLabel}</p>
            </div>

            <div className="mt-6 border-t border-[var(--border)] pt-6">
              {completed ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[.07] px-4 py-2 text-[9px] font-black text-violet-400">
                    <CheckCircle2 size={14} /> REDAÇÃO LIDA · CONCLUÍDA
                  </div>
                  <button type="button" disabled={busy} onClick={() => void undoCompleted()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[.09] bg-white/[.025] px-4 text-[8px] font-black tracking-[.08em] text-white/45 transition hover:text-white/70 disabled:opacity-50">
                    {busy ? <LoaderCircle size={13} className="animate-spin" /> : <RotateCcw size={13} />} DESMARCAR
                  </button>
                </div>
              ) : (
                <button type="button" disabled={busy} onClick={() => void markCompleted()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-[10px] font-black tracking-[.09em] text-black shadow-[0_14px_40px_rgba(245,158,11,.18)] transition hover:bg-amber-400 disabled:opacity-50">
                  {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} LI A REDAÇÃO INTEIRA · MARCAR COMO CONCLUÍDA
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
