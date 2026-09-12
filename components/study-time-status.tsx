"use client";

import { BellRing, BookOpenCheck, Clock3, RefreshCcw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadPrincipalCalendarHub } from "@/lib/principal-calendar-system";
import { listenStudyUpdated } from "@/lib/study-database";

type Mode = "study" | "review" | "pause";

type Phase = {
  key: string;
  mode: Mode;
  title: string;
  subtitle: string;
  next: string;
};

const TZ = "America/Sao_Paulo";

function brazilParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function todayKeyBrazil(date = new Date()) {
  const parts = brazilParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function clockBrazil(date = new Date()) {
  const parts = brazilParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function minutesBrazil(date = new Date()) {
  const parts = brazilParts(date);
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function phaseFor(minute: number, hasMorningRevision: boolean): Phase {
  if (minute < 510) return { key: "pause-before-morning", mode: "pause", title: "Fora do bloco", subtitle: "Próximo bloco começa às 08:30.", next: "08:30" };
  if (minute < 570) {
    return hasMorningRevision
      ? { key: "morning-review", mode: "review", title: "PERÍODO DE REVISÃO", subtitle: "Há revisão marcada hoje. Até 09:30, foco nela.", next: "09:30" }
      : { key: "morning-study", mode: "study", title: "PERÍODO DE ESTUDO", subtitle: "Sem revisão marcada hoje. A manhã fica roxa até 12:00.", next: "09:30" };
  }
  if (minute < 720) return { key: "late-morning-study", mode: "study", title: "PERÍODO DE ESTUDO", subtitle: "Bloco de estudo ativo até 12:00.", next: "12:00" };
  if (minute < 780) return { key: "lunch-pause", mode: "pause", title: "INTERVALO", subtitle: "Próximo bloco de estudo começa às 13:00.", next: "13:00" };
  if (minute < 1050) return { key: "afternoon-study", mode: "study", title: "PERÍODO DE ESTUDO", subtitle: "Bloco de estudo ativo até 17:30.", next: "17:30" };
  if (minute < 1170) return { key: "evening-pause", mode: "pause", title: "INTERVALO", subtitle: "Próximo bloco de estudo começa às 19:30.", next: "19:30" };
  if (minute < 1290) return { key: "night-study", mode: "study", title: "PERÍODO DE ESTUDO", subtitle: "Bloco de estudo ativo até 21:30.", next: "21:30" };
  return { key: "night-review", mode: "review", title: "PERÍODO DE REVISÃO", subtitle: "Faixa azul de revisão ativa até 00:00.", next: "00:00" };
}

function playChime(mode: Mode) {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
  gain.connect(context.destination);

  const frequencies = mode === "review" ? [523.25, 783.99] : mode === "study" ? [659.25, 987.77] : [392, 523.25];
  frequencies.forEach((frequency, index) => {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now + index * 0.08);
    osc.connect(gain);
    osc.start(now + index * 0.08);
    osc.stop(now + 0.42 + index * 0.08);
  });

  window.setTimeout(() => void context.close(), 900);
}

export function StudyTimeStatus() {
  const [now, setNow] = useState(() => new Date());
  const [todayReviews, setTodayReviews] = useState<Array<{ id: string; lesson_title: string; subject_name: string; status: string }>>([]);
  const [soundArmed, setSoundArmed] = useState(false);
  const previousPhase = useRef<string | null>(null);
  const initialized = useRef(false);

  const refreshReviews = useCallback(async () => {
    const hub = await loadPrincipalCalendarHub();
    const today = todayKeyBrazil();
    setTodayReviews(
      hub.revisions
        .filter((revision) => revision.scheduled_for === today && revision.status !== "completed")
        .map((revision) => ({ id: revision.id, lesson_title: revision.lesson_title, subject_name: revision.subject_name, status: revision.status })),
    );
  }, []);

  useEffect(() => {
    void refreshReviews().catch(() => setTodayReviews([]));
    const unlisten = listenStudyUpdated(() => void refreshReviews().catch(() => undefined));
    const timer = window.setInterval(() => {
      setNow(new Date());
      void refreshReviews().catch(() => undefined);
    }, 15000);
    return () => {
      unlisten();
      window.clearInterval(timer);
    };
  }, [refreshReviews]);

  useEffect(() => {
    const arm = () => setSoundArmed(true);
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  const minute = minutesBrazil(now);
  const phase = useMemo(() => phaseFor(minute, todayReviews.length > 0), [minute, todayReviews.length]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      previousPhase.current = phase.key;
      return;
    }
    if (previousPhase.current !== phase.key) {
      previousPhase.current = phase.key;
      if (soundArmed) playChime(phase.mode);
    }
  }, [phase.key, phase.mode, soundArmed]);

  const isStudy = phase.mode === "study";
  const isReview = phase.mode === "review";
  const modeLabel = isStudy ? "ESTUDO" : isReview ? "REVISÃO" : "INTERVALO";
  const currentClass = isStudy
    ? "border-violet-300/30 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.26),transparent_34%),linear-gradient(145deg,rgba(76,29,149,.32),rgba(12,9,22,.96))] shadow-[0_20px_70px_rgba(124,58,237,.14)]"
    : isReview
      ? "border-blue-300/30 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,.28),transparent_34%),linear-gradient(145deg,rgba(30,64,175,.34),rgba(7,15,31,.96))] shadow-[0_20px_70px_rgba(37,99,235,.14)]"
      : "border-white/[.09] bg-[#0b0c10]";
  const accent = isStudy ? "text-violet-200" : isReview ? "text-blue-200" : "text-white/45";
  const Icon = isStudy ? BookOpenCheck : isReview ? RefreshCcw : Clock3;

  const rows = [
    { time: "08:30–09:30", label: todayReviews.length ? "REVISÃO · há revisão hoje" : "ESTUDO · sem revisão hoje", mode: todayReviews.length ? "review" : "study" },
    { time: "09:30–12:00", label: "ESTUDO", mode: "study" },
    { time: "13:00–17:30", label: "ESTUDO", mode: "study" },
    { time: "19:30–21:30", label: "ESTUDO", mode: "study" },
    { time: "21:30–00:00", label: "REVISÃO", mode: "review" },
  ] as const;

  return (
    <section className={`relative mb-6 overflow-hidden rounded-[28px] border p-5 text-white transition-all duration-500 sm:p-6 ${currentClass}`}>
      <div className="pointer-events-none absolute inset-0 tita-soft-grid opacity-[.08]" />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-stretch">
        <div className="flex min-h-[210px] flex-col justify-between rounded-[22px] border border-white/[.08] bg-black/20 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] ${accent}`}><Icon size={15} /> AGORA · {modeLabel}</span>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{phase.title}</h2>
              <p className="mt-2 max-w-xl text-[11px] leading-6 text-white/55">{phase.subtitle}</p>
            </div>
            <div className="text-right">
              <span className="block text-[8px] font-black tracking-[.14em] text-white/35">HORÁRIO</span>
              <strong className="mt-1 block font-serif text-3xl">{clockBrazil(now)}</strong>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black tracking-[.1em] ${isStudy ? "border-violet-300/25 bg-violet-300/10 text-violet-200" : isReview ? "border-blue-300/25 bg-blue-300/10 text-blue-200" : "border-white/10 bg-white/[.03] text-white/45"}`}>PRÓXIMA MUDANÇA · {phase.next}</span>
            <button type="button" onClick={() => { setSoundArmed(true); playChime(phase.mode); }} className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[8px] font-black tracking-[.08em] ${soundArmed ? "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200" : "border-white/10 bg-white/[.035] text-white/60"}`}>
              <Volume2 size={12} /> {soundArmed ? "ALERTA SONORO ATIVO" : "ATIVAR ALERTA SONORO"}
            </button>
          </div>

          {todayReviews.length ? (
            <div className="mt-4 rounded-xl border border-blue-300/15 bg-blue-300/[.045] px-3 py-2.5">
              <span className="text-[8px] font-black tracking-[.12em] text-blue-200/80">REVISÃO MARCADA HOJE</span>
              <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-white/55">{todayReviews.map((item) => `${item.subject_name} · ${item.lesson_title}`).join(" · ")}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[22px] border border-white/[.08] bg-black/20 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><span className="text-[8px] font-black tracking-[.15em] text-white/35">ROTINA FIXA DO DIA</span><h3 className="mt-1 font-serif text-2xl">Horários da sua rotina</h3></div>
            <BellRing size={18} className="text-white/35" />
          </div>
          <div className="mt-4 space-y-2">
            {rows.map((row) => (
              <div key={row.time} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${row.mode === "study" ? "border-violet-300/15 bg-violet-300/[.045]" : "border-blue-300/15 bg-blue-300/[.045]"}`}>
                <strong className="text-[10px] text-white/78">{row.time}</strong>
                <span className={`text-[8px] font-black tracking-[.1em] ${row.mode === "study" ? "text-violet-200/80" : "text-blue-200/80"}`}>{row.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[8px] leading-4 text-white/28">O alerta toca quando a plataforma detecta a troca de faixa enquanto esta página está aberta. Por regra do navegador, o som fica liberado após o primeiro clique/tecla — ou pelo botão de ativação acima.</p>
        </div>
      </div>
    </section>
  );
}
