"use client";

import { ArrowRight, Check, CircleDot, Flag, LockKeyhole, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EnemDailySideQuests } from "@/components/enem-daily-side-quests";
import type { WeekJourneyMission } from "@/components/week-journey";

export type EnemWeekJourneyMission = WeekJourneyMission & {
  studyDay?: number;
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

function missionPlanDate(mission: EnemWeekJourneyMission) {
  try {
    return new URL(mission.href, "https://mentoriatita.local").searchParams.get("planoDia");
  } catch {
    return null;
  }
}

function buildSerpentinePath(count: number, mobile = false) {
  if (count <= 0) return "";
  const leftX = mobile ? 370 : 230;
  const rightX = mobile ? 630 : 770;
  const stepY = 260;
  const firstY = 42;
  let d = `M ${leftX} ${firstY}`;
  for (let index = 1; index < count; index += 1) {
    const fromX = (index - 1) % 2 === 0 ? leftX : rightX;
    const toX = index % 2 === 0 ? leftX : rightX;
    const fromY = firstY + (index - 1) * stepY;
    const toY = firstY + index * stepY;
    const midY = (fromY + toY) / 2;
    d += ` C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
  }
  return d;
}

function MissionStages({ mission, dueNow }: { mission: EnemWeekJourneyMission; dueNow: boolean }) {
  const stages = [
    { label: "AULA", done: Boolean(mission.theoryCompleted), active: dueNow && !mission.theoryCompleted },
    { label: "QUESTÕES", done: Boolean(mission.listCompleted), active: dueNow && Boolean(mission.theoryCompleted) && !mission.listCompleted },
    { label: "REVISÃO", done: false, active: false },
    { label: "NIVELAMENTO", done: false, active: false },
  ];

  return (
    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex shrink-0 items-center gap-1.5">
          <span className={`grid h-6 min-w-6 place-items-center rounded-full border px-1 ${stage.active ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-100" : stage.done ? "border-violet-300/35 bg-violet-300/10 text-violet-100 shadow-[0_0_16px_rgba(139,92,246,.16)]" : "border-white/[.08] bg-black/20 text-white/28"}`}>
            {stage.done ? <Check size={11} strokeWidth={3} /> : stage.active ? <CircleDot size={10} /> : <LockKeyhole size={9} />}
          </span>
          <span className={`text-[7px] font-black tracking-[.11em] ${stage.active ? "text-emerald-200/85" : stage.done ? "text-violet-200/80" : "text-white/24"}`}>{stage.label}</span>
          {index < stages.length - 1 ? <span className={`h-px w-4 ${stage.done ? "bg-violet-300/24" : stage.active ? "bg-emerald-300/22" : "bg-white/[.09]"}`} /> : null}
        </div>
      ))}
    </div>
  );
}

export function EnemWeekJourney({
  weekNumber,
  title,
  missions,
}: {
  weekNumber: number;
  title?: string | null;
  missions: EnemWeekJourneyMission[];
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

  function dueNow(mission: EnemWeekJourneyMission, index: number) {
    if (mission.theoryCompleted && mission.listCompleted) return false;
    if (hasExplicitToday) return Boolean(mission.isToday) || missionPlanDate(mission) === todayKey;
    return index === fallbackActionIndex;
  }

  if (!missions.length) return null;

  if (!hydrated || !started) {
    return (
      <section id="trilha-semana" className="relative mt-8 overflow-hidden rounded-[32px] border border-white/[.11] bg-[#08090b] p-6 shadow-[0_28px_100px_rgba(0,0,0,.38)] sm:p-8">
        <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_370px] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[.11] bg-white/[.045] px-3 py-1.5 text-[8px] font-black tracking-[.16em] text-white/65"><Flag size={13} /> ENEM 40 DIAS · SEMANA {String(weekNumber).padStart(2, "0")}</span>
            <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[.95] tracking-[-.04em] text-white sm:text-5xl">Sua Semana {weekNumber} está pronta.</h2>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-white/42">{title || "A plataforma já organizou a sequência da semana."} A partir do Dia 2, cada dia também recebe dois textos obrigatórios de Inglês e uma leitura de Redação Nota Mil.</p>
            <div className="mt-6 flex flex-wrap gap-3 text-[8px] font-black tracking-[.11em] text-white/38"><span>{missions.length} MISSÕES</span><span>•</span><span>3 LEITURAS DIÁRIAS EXTRAS</span></div>
            <button type="button" onClick={() => { window.localStorage.setItem(storageKey, "1"); setStarted(true); }} className="tita-primary-button mt-7 min-w-[210px]"><Play size={15} fill="currentColor" /> INICIAR SEMANA {weekNumber}</button>
          </div>
          <div className="rounded-[26px] border border-white/[.08] bg-black/25 p-5">
            <span className="text-[8px] font-black tracking-[.13em] text-sky-200/70">RAMIFICAÇÕES OBRIGATÓRIAS</span>
            <div className="mt-4 space-y-2">
              {["INGLÊS · TEXTO 1/2", "INGLÊS · TEXTO 2/2", "REDAÇÃO · NOTA MIL"].map((label, index) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-[9px] text-white/45">{index + 1}</span><strong className="text-[9px] tracking-[.08em] text-white/58">{label}</strong></div>)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const rowHeight = 260;
  const trackHeight = Math.max(rowHeight, 42 + (missions.length - 1) * rowHeight + 210);
  const desktopPath = buildSerpentinePath(missions.length, false);
  const mobilePath = buildSerpentinePath(missions.length, true);

  return (
    <section id="trilha-semana" className="relative mt-8 overflow-hidden rounded-[32px] border border-white/[.11] bg-[#07080a] px-4 py-7 shadow-[0_28px_100px_rgba(0,0,0,.36)] sm:px-7 sm:py-8">
      <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-[.11]" />
      <header className="relative z-20 flex flex-col gap-4 border-b border-white/[.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="tita-kicker">ENEM 40 DIAS · SEMANA {String(weekNumber).padStart(2, "0")}</span>
          <h2 className="mt-2 font-serif text-4xl tracking-[-.035em] text-white">Trilha da semana</h2>
          <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/34">As matérias seguem pela trilha principal. Desde o Dia 2, Inglês 1/2, Inglês 2/2 e Redação Nota Mil saem em ramificações menores nas laterais.</p>
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
          <path d={mobilePath} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="5" strokeLinecap="round" />
        </svg>

        <div className="relative">
          {missions.map((mission, index) => {
            const done = Boolean(mission.theoryCompleted && mission.listCompleted);
            const active = dueNow(mission, index);
            const leftSide = index % 2 === 0;
            const previousDay = index > 0 ? missions[index - 1]?.studyDay : undefined;
            const showDailyBranch = Boolean(mission.studyDay && mission.studyDay >= 2 && mission.studyDay !== previousDay);
            const branchSide = leftSide ? "right" : "left";

            return (
              <div key={mission.id} className="relative flex min-h-[260px] flex-col items-stretch pt-4 sm:block">
                {showDailyBranch ? (
                  <>
                    <svg className="pointer-events-none absolute inset-0 z-0 hidden h-[230px] w-full sm:block" viewBox="0 0 1000 230" preserveAspectRatio="none" aria-hidden="true">
                      {leftSide ? (
                        <>
                          <path d="M455 108 C500 108 515 108 555 108" fill="none" stroke="rgba(125,211,252,.20)" strokeWidth="3" strokeLinecap="round" />
                          <path d="M555 108 C575 108 575 45 600 45 M555 108 C575 108 575 108 600 108 M555 108 C575 108 575 171 600 171" fill="none" stroke="rgba(125,211,252,.13)" strokeWidth="2" strokeLinecap="round" />
                        </>
                      ) : (
                        <>
                          <path d="M545 108 C500 108 485 108 445 108" fill="none" stroke="rgba(125,211,252,.20)" strokeWidth="3" strokeLinecap="round" />
                          <path d="M445 108 C425 108 425 45 400 45 M445 108 C425 108 425 108 400 108 M445 108 C425 108 425 171 400 171" fill="none" stroke="rgba(125,211,252,.13)" strokeWidth="2" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                    <div className={`relative z-10 order-2 mt-3 w-full sm:absolute sm:top-2 sm:mt-0 sm:w-[38%] ${leftSide ? "sm:right-0" : "sm:left-0"}`}>
                      <EnemDailySideQuests day={mission.studyDay ?? 2} side={branchSide} dueNow={active} />
                    </div>
                  </>
                ) : null}

                <Link href={mission.href} className={`group relative z-10 order-1 w-full overflow-hidden rounded-[24px] border transition duration-300 sm:absolute sm:top-4 sm:w-[46%] ${leftSide ? "sm:left-0" : "sm:right-0"} ${active ? "border-emerald-300/30 shadow-[0_18px_60px_rgba(16,185,129,.10)]" : done ? "border-violet-300/30 shadow-[0_18px_62px_rgba(124,58,237,.16),0_0_34px_rgba(168,85,247,.08)]" : "border-white/[.08] hover:border-white/[.16]"}`}>
                  {mission.imagePath ? <img src={mission.imagePath} alt="" className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025] ${active ? "opacity-82" : done ? "opacity-58" : "opacity-42"}`} /> : <div className="absolute inset-0 tita-soft-grid bg-[#0d0f12]" />}
                  <div className={`absolute inset-0 ${active ? "bg-[linear-gradient(100deg,rgba(5,12,9,.97)_0%,rgba(7,28,20,.82)_50%,rgba(10,42,29,.36)_100%)]" : done ? "bg-[linear-gradient(100deg,rgba(12,7,22,.97)_0%,rgba(42,20,75,.82)_52%,rgba(76,29,149,.34)_100%)]" : "bg-[linear-gradient(100deg,rgba(5,6,7,.97)_0%,rgba(5,6,7,.84)_50%,rgba(5,6,7,.42)_100%)]"}`} />
                  {done ? <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-400/20 blur-3xl" /> : null}

                  <span className={`absolute -top-[23px] left-1/2 z-20 grid h-[46px] w-[46px] -translate-x-1/2 place-items-center rounded-full border shadow-[0_0_0_7px_#07080a] ${active ? "border-emerald-200/45 bg-[#123c2e] text-emerald-100 shadow-[0_0_0_7px_#07080a,0_0_30px_rgba(52,211,153,.22)]" : done ? "border-violet-200/45 bg-[#2d1748] text-violet-100 shadow-[0_0_0_7px_#07080a,0_0_28px_rgba(139,92,246,.30)]" : "border-white/[.12] bg-[#121418] text-white/34"}`}>
                    {done ? <Check size={16} strokeWidth={3} /> : active ? <Play size={13} fill="currentColor" /> : <span className="font-serif text-sm">{index + 1}</span>}
                  </span>

                  <div className="relative flex min-h-[205px] flex-col justify-end p-5 pt-9 sm:p-6 sm:pt-10">
                    <div className="mb-auto flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/[.12] bg-black/35 px-2.5 py-1 text-[7px] font-black tracking-[.13em] text-white/68 backdrop-blur-md">{mission.shortName}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.1em] ${active ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : done ? "border-violet-300/25 bg-violet-300/[.08] text-violet-200" : "border-white/[.08] bg-black/20 text-white/30"}`}>{active ? "HOJE" : done ? "CONCLUÍDA" : "OUTRO DIA"}</span>
                    </div>
                    <span className={`text-[8px] font-black tracking-[.13em] ${active ? "text-emerald-200/55" : done ? "text-violet-200/55" : "text-white/28"}`}>MISSÃO {String(index + 1).padStart(2, "0")}{mission.studyDay ? ` · DIA ${mission.studyDay}` : mission.dayLabel ? ` · ${mission.dayLabel}` : ""}</span>
                    <h3 className="mt-1 font-serif text-2xl leading-tight text-white sm:text-3xl">{mission.subject}</h3>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-white/45">{mission.lessonTitle}</p>
                    <MissionStages mission={mission} dueNow={active} />
                    <span className={`mt-4 inline-flex items-center gap-2 text-[8px] font-black tracking-[.1em] ${active ? "text-emerald-200" : done ? "text-violet-200/80" : "text-white/50"}`}>ABRIR MISSÃO <ArrowRight size={12} /></span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-20 mt-3 flex justify-end">
        <button type="button" onClick={() => { window.localStorage.removeItem(storageKey); setStarted(false); }} className="inline-flex items-center gap-2 rounded-lg border border-white/[.07] bg-white/[.02] px-3 py-2 text-[7px] font-black tracking-[.08em] text-white/28 transition hover:text-white/55"><RotateCcw size={11} /> REINICIAR VISUALIZAÇÃO</button>
      </div>
    </section>
  );
}
