"use client";

import { ArrowRight, Check, CircleDot, Flag, LockKeyhole, Play, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type WeekJourneyMission = {
  id: string;
  subject: string;
  shortName: string;
  lessonTitle: string;
  href: string;
  imagePath?: string | null;
  accent?: string | null;
  dayLabel?: string | null;
  questionCount?: number;
  theoryCompleted?: boolean;
  listCompleted?: boolean;
  isToday?: boolean;
};

function todayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function missionPlanDate(mission: WeekJourneyMission) {
  try {
    return new URL(mission.href, "https://mentoriatita.local").searchParams.get("planoDia");
  } catch {
    return null;
  }
}

function buildSerpentinePath(count: number, mobile = false) {
  if (count <= 0) return "";
  const leftX = mobile ? 380 : 230;
  const rightX = mobile ? 620 : 770;
  const stepY = 235;
  const firstY = 38;
  let d = `M ${leftX} ${firstY}`;
  for (let index = 1; index < count; index += 1) {
    const previousX = (index - 1) % 2 === 0 ? leftX : rightX;
    const nextX = index % 2 === 0 ? leftX : rightX;
    const previousY = firstY + (index - 1) * stepY;
    const nextY = firstY + index * stepY;
    const midY = (previousY + nextY) / 2;
    d += ` C ${previousX} ${midY}, ${nextX} ${midY}, ${nextX} ${nextY}`;
  }
  return d;
}

function MissionStages({
  theoryCompleted,
  listCompleted,
  isDueNow,
}: Pick<WeekJourneyMission, "theoryCompleted" | "listCompleted"> & { isDueNow: boolean }) {
  const stages = [
    { label: "AULA", done: Boolean(theoryCompleted), active: isDueNow && !theoryCompleted },
    { label: "QUESTÕES", done: Boolean(listCompleted), active: isDueNow && Boolean(theoryCompleted) && !listCompleted },
    { label: "REVISÃO", done: false, active: false },
    { label: "NIVELAMENTO", done: false, active: false },
  ];

  return (
    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex shrink-0 items-center gap-1.5">
          <span className={`grid h-6 min-w-6 place-items-center rounded-full border px-1 ${stage.active ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,.14)]" : stage.done ? "border-violet-300/35 bg-violet-300/10 text-violet-100 shadow-[0_0_16px_rgba(139,92,246,.18)]" : "border-white/[.08] bg-black/20 text-white/28"}`}>
            {stage.done ? <Check size={11} strokeWidth={3} /> : stage.active ? <CircleDot size={10} /> : <LockKeyhole size={9} />}
          </span>
          <span className={`text-[7px] font-black tracking-[.11em] ${stage.active ? "text-emerald-200/85" : stage.done ? "text-violet-200/80" : "text-white/24"}`}>{stage.label}</span>
          {index < stages.length - 1 ? <span className={`h-px w-4 ${stage.active ? "bg-emerald-300/22" : stage.done ? "bg-violet-300/24" : "bg-white/[.09]"}`} /> : null}
        </div>
      ))}
    </div>
  );
}

export function WeekJourney({
  weekNumber,
  title,
  missions,
}: {
  weekNumber: number;
  title?: string | null;
  missions: WeekJourneyMission[];
}) {
  const storageKey = `tita-week-${weekNumber}-started-v1`;
  const [started, setStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStarted(window.localStorage.getItem(storageKey) === "1");
    setHydrated(true);
  }, [storageKey]);

  const completed = useMemo(() => missions.filter((mission) => mission.theoryCompleted && mission.listCompleted).length, [missions]);
  const progress = missions.length ? Math.round((completed / missions.length) * 100) : 0;
  const todayKey = todayInBrazil();
  const hasExplicitToday = missions.some((mission) => mission.isToday || missionPlanDate(mission) === todayKey);
  const fallbackActionIndex = missions.findIndex((mission) => !(mission.theoryCompleted && mission.listCompleted));

  function missionDueNow(mission: WeekJourneyMission, index: number) {
    const completedMission = Boolean(mission.theoryCompleted && mission.listCompleted);
    if (completedMission) return false;
    if (hasExplicitToday) return Boolean(mission.isToday) || missionPlanDate(mission) === todayKey;
    return index === fallbackActionIndex;
  }

  if (!missions.length) return null;

  if (!hydrated || !started) {
    const preview = missions.slice(0, 3);
    return (
      <section id="trilha-semana" className="relative mt-8 overflow-hidden rounded-[32px] border border-white/[.11] bg-[#08090b] p-6 shadow-[0_28px_100px_rgba(0,0,0,.38)] sm:p-8">
        <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_350px] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[.11] bg-white/[.045] px-3 py-1.5 text-[8px] font-black tracking-[.16em] text-white/65"><Flag size={13} /> SEMANA {String(weekNumber).padStart(2, "0")}</span>
            <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[.95] tracking-[-.04em] text-white sm:text-5xl">Sua Semana {weekNumber} está pronta.</h2>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-white/42">{title || "A plataforma já organizou a sequência da semana."} Ao iniciar, as missões aparecem ligadas por um caminho. Verde é o que entra hoje; roxo marca o que você já concluiu.</p>
            <div className="mt-6 flex flex-wrap gap-3 text-[8px] font-black tracking-[.11em] text-white/38"><span>{missions.length} MISSÕES</span><span>•</span><span>{missions.reduce((sum, mission) => sum + (mission.questionCount ?? 0), 0)} QUESTÕES PREVISTAS</span></div>
            <button type="button" onClick={() => { window.localStorage.setItem(storageKey, "1"); setStarted(true); }} className="tita-primary-button mt-7 min-w-[210px]"><Play size={15} fill="currentColor" /> INICIAR SEMANA {weekNumber}</button>
          </div>

          <div className="relative h-[250px] overflow-hidden rounded-[26px] border border-white/[.08] bg-black/25">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 270 95 C 270 190, 730 175, 730 350 C 730 500, 270 500, 270 615" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="7" strokeLinecap="round" />
            </svg>
            {preview.map((mission, index) => {
              const dueNow = missionDueNow(mission, index);
              const done = Boolean(mission.theoryCompleted && mission.listCompleted);
              const positions = ["left-[24%] top-[12%]", "left-[68%] top-[43%]", "left-[24%] top-[73%]"];
              return (
                <div key={mission.id} className={`absolute -translate-x-1/2 ${positions[index]}`}>
                  <span className={`grid h-12 w-12 place-items-center rounded-full border shadow-[0_0_0_7px_#0b0c0f] ${dueNow ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-100 shadow-[0_0_0_7px_#0b0c0f,0_0_26px_rgba(52,211,153,.18)]" : done ? "border-violet-300/45 bg-violet-400/15 text-violet-100 shadow-[0_0_0_7px_#0b0c0f,0_0_28px_rgba(139,92,246,.34),0_0_54px_rgba(168,85,247,.14)]" : "border-white/[.16] bg-[#15171a] text-white/45"}`}>{done ? <Check size={15} strokeWidth={3} /> : <Sparkles size={15} />}</span>
                  <span className={`mt-2 block max-w-[90px] truncate text-center text-[7px] font-black tracking-[.08em] ${dueNow ? "text-emerald-200/80" : done ? "text-violet-200/85" : "text-white/36"}`}>{mission.shortName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const trackHeight = Math.max(235, 38 + (missions.length - 1) * 235 + 170);
  const desktopPath = buildSerpentinePath(missions.length, false);
  const mobilePath = buildSerpentinePath(missions.length, true);

  return (
    <section id="trilha-semana" className="relative mt-8 overflow-hidden rounded-[32px] border border-white/[.11] bg-[#07080a] px-4 py-7 shadow-[0_28px_100px_rgba(0,0,0,.36)] sm:px-7 sm:py-8">
      <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-[.11]" />
      <header className="relative z-10 flex flex-col gap-4 border-b border-white/[.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="tita-kicker">SEMANA {String(weekNumber).padStart(2, "0")} · EM ANDAMENTO</span>
          <h2 className="mt-2 font-serif text-4xl tracking-[-.035em] text-white">Trilha da semana</h2>
          <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/34">Verde = missão de hoje. Roxo = aula + lista concluídas. Cinza = futuro ou ainda bloqueado.</p>
        </div>
        <div className="min-w-[210px]">
          <div className="flex items-center justify-between text-[8px] font-black tracking-[.1em] text-white/35"><span>{completed}/{missions.length} MISSÕES</span><span>{progress}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#a855f7,#d8b4fe)] shadow-[0_0_14px_rgba(168,85,247,.28)]" style={{ width: `${progress}%` }} /></div>
        </div>
      </header>

      <div className="relative z-0 mx-auto mt-10 max-w-5xl" style={{ minHeight: trackHeight }}>
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block" viewBox={`0 0 1000 ${trackHeight}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={desktopPath} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" strokeLinecap="round" />
          <path d={desktopPath} fill="none" stroke="rgba(255,255,255,.028)" strokeWidth="15" strokeLinecap="round" />
        </svg>
        <svg className="pointer-events-none absolute inset-0 h-full w-full sm:hidden" viewBox={`0 0 1000 ${trackHeight}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={mobilePath} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" strokeLinecap="round" />
        </svg>

        <div className="relative space-y-0">
          {missions.map((mission, index) => {
            const done = Boolean(mission.theoryCompleted && mission.listCompleted);
            const dueNow = missionDueNow(mission, index);
            const image = mission.imagePath;
            const leftSide = index % 2 === 0;
            return (
              <div key={mission.id} className={`relative flex min-h-[235px] items-start pt-4 ${leftSide ? "justify-start" : "justify-end"}`}>
                <Link href={mission.href} className={`group relative w-[76%] overflow-hidden rounded-[24px] border transition duration-300 sm:w-[46%] ${dueNow ? "border-emerald-300/30 shadow-[0_18px_60px_rgba(16,185,129,.10)]" : done ? "border-violet-300/30 shadow-[0_18px_62px_rgba(124,58,237,.16),0_0_34px_rgba(168,85,247,.08)] hover:border-violet-200/45" : "border-white/[.08] hover:border-white/[.16]"}`}>
                  {image ? <img src={image} alt="" className={`absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.025] ${dueNow ? "opacity-82" : done ? "opacity-58 group-hover:opacity-66" : "opacity-48 group-hover:opacity-62"}`} /> : <div className="absolute inset-0 tita-soft-grid bg-[#0d0f12]" />}
                  <div className={`absolute inset-0 ${dueNow ? "bg-[linear-gradient(100deg,rgba(5,12,9,.97)_0%,rgba(7,28,20,.82)_50%,rgba(10,42,29,.36)_100%)]" : done ? "bg-[linear-gradient(100deg,rgba(12,7,22,.97)_0%,rgba(42,20,75,.82)_52%,rgba(76,29,149,.34)_100%)]" : "bg-[linear-gradient(100deg,rgba(5,6,7,.97)_0%,rgba(5,6,7,.84)_50%,rgba(5,6,7,.42)_100%)]"}`} />
                  {done ? <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-400/20 blur-3xl" /> : null}

                  <span className={`absolute -top-[23px] left-1/2 z-20 grid h-[46px] w-[46px] -translate-x-1/2 place-items-center rounded-full border shadow-[0_0_0_7px_#07080a] ${dueNow ? "border-emerald-200/45 bg-[#123c2e] text-emerald-100 shadow-[0_0_0_7px_#07080a,0_0_30px_rgba(52,211,153,.22)]" : done ? "border-violet-200/50 bg-[#35215f] text-violet-100 shadow-[0_0_0_7px_#07080a,0_0_32px_rgba(139,92,246,.36),0_0_58px_rgba(168,85,247,.14)]" : "border-white/[.12] bg-[#121418] text-white/34"}`}>
                    {done ? <Check size={16} strokeWidth={3} /> : dueNow ? <Play size={13} fill="currentColor" /> : <span className="font-serif text-sm">{index + 1}</span>}
                  </span>

                  <div className="relative flex min-h-[205px] flex-col justify-end p-5 pt-9 sm:p-6 sm:pt-10">
                    <div className="mb-auto flex items-start justify-between gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.13em] backdrop-blur-md ${done ? "border-violet-300/20 bg-violet-400/10 text-violet-100/80" : "border-white/[.12] bg-black/35 text-white/68"}`}>{mission.shortName}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.1em] ${dueNow ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : done ? "border-violet-300/30 bg-violet-300/10 text-violet-200" : "border-white/[.08] bg-black/20 text-white/30"}`}>{dueNow ? "HOJE" : done ? "CONCLUÍDA" : "OUTRO DIA"}</span>
                    </div>
                    <span className={`text-[8px] font-black tracking-[.13em] ${dueNow ? "text-emerald-200/55" : done ? "text-violet-200/62" : "text-white/28"}`}>MISSÃO {String(index + 1).padStart(2, "0")}{mission.dayLabel ? ` · ${mission.dayLabel}` : ""}</span>
                    <h3 className={`mt-1.5 font-serif text-2xl leading-[1.02] ${dueNow || done ? "text-white" : "text-white/68"}`}>{mission.subject}</h3>
                    <p className={`mt-2 line-clamp-2 text-[10px] leading-5 ${dueNow ? "text-white/52" : done ? "text-violet-100/54" : "text-white/34"}`}>{mission.lessonTitle}</p>
                    <MissionStages theoryCompleted={mission.theoryCompleted} listCompleted={mission.listCompleted} isDueNow={dueNow} />
                    <span className={`mt-4 inline-flex items-center gap-2 text-[8px] font-black tracking-[.1em] ${dueNow ? "text-emerald-100/82" : done ? "text-violet-100/82" : "text-white/42"}`}>ABRIR MISSÃO <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="relative mt-2 flex justify-center"><span className="inline-flex items-center gap-2 rounded-full border border-white/[.1] bg-white/[.035] px-4 py-2 text-[8px] font-black tracking-[.12em] text-white/48"><Flag size={13} /> FIM DA SEMANA {weekNumber}</span></div>
      </div>

      <div className="relative mt-5 flex justify-end"><button type="button" onClick={() => { window.localStorage.removeItem(storageKey); setStarted(false); }} className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.1em] text-white/24 transition hover:text-white/55"><RotateCcw size={12} /> REVER TELA DE INÍCIO DA SEMANA</button></div>
    </section>
  );
}
