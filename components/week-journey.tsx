"use client";

import { ArrowRight, BookOpenCheck, Check, CircleDot, Flag, LockKeyhole, Play, RotateCcw, Sparkles } from "lucide-react";
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
};

function MissionStages({ theoryCompleted, listCompleted }: Pick<WeekJourneyMission, "theoryCompleted" | "listCompleted">) {
  const stages = [
    { label: "AULA", done: Boolean(theoryCompleted), active: !theoryCompleted },
    { label: "QUESTÕES", done: Boolean(listCompleted), active: Boolean(theoryCompleted) && !listCompleted },
    { label: "REVISÃO", done: false, active: Boolean(listCompleted) },
    { label: "NIVELAMENTO", done: false, active: false },
  ];

  return (
    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex shrink-0 items-center gap-1.5">
          <span className={`grid h-6 min-w-6 place-items-center rounded-full border px-1 ${stage.done ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200" : stage.active ? "border-white/25 bg-white/[.08] text-white" : "border-white/[.08] bg-black/20 text-white/28"}`}>
            {stage.done ? <Check size={11} strokeWidth={3} /> : stage.active ? <CircleDot size={10} /> : <LockKeyhole size={9} />}
          </span>
          <span className={`text-[7px] font-black tracking-[.11em] ${stage.done ? "text-emerald-200/75" : stage.active ? "text-white/78" : "text-white/24"}`}>{stage.label}</span>
          {index < stages.length - 1 ? <span className="h-px w-4 bg-white/[.09]" /> : null}
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

  if (!missions.length) return null;

  if (!hydrated || !started) {
    return (
      <section id="trilha-semana" className="relative mt-8 overflow-hidden rounded-[32px] border border-white/[.11] bg-[#08090b] p-6 shadow-[0_28px_100px_rgba(0,0,0,.38)] sm:p-8">
        <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/[.055] blur-[100px]" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_330px] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[.11] bg-white/[.045] px-3 py-1.5 text-[8px] font-black tracking-[.16em] text-white/65">
              <Flag size={13} /> SEMANA {String(weekNumber).padStart(2, "0")}
            </span>
            <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[.95] tracking-[-.04em] text-white sm:text-5xl">Sua Semana {weekNumber} está pronta.</h2>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-white/42">{title || "A plataforma já organizou a sequência da semana."} Ao iniciar, as matérias viram uma trilha conectada com aula, questões, revisão e nivelamento.</p>
            <div className="mt-6 flex flex-wrap gap-3 text-[8px] font-black tracking-[.11em] text-white/38">
              <span>{missions.length} MISSÕES</span><span>•</span><span>{missions.reduce((sum, mission) => sum + (mission.questionCount ?? 0), 0)} QUESTÕES PREVISTAS</span>
            </div>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(storageKey, "1");
                setStarted(true);
              }}
              className="tita-primary-button mt-7 min-w-[210px]"
            >
              <Play size={15} fill="currentColor" /> INICIAR SEMANA {weekNumber}
            </button>
          </div>

          <div className="relative h-[230px] overflow-hidden rounded-[26px] border border-white/[.08] bg-black/25">
            <div className="absolute left-1/2 top-5 h-[190px] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,.34),transparent)]" />
            {[0, 1, 2].map((index) => {
              const mission = missions[index];
              if (!mission) return null;
              const top = 28 + index * 72;
              const left = index % 2 === 0 ? "24%" : "64%";
              return (
                <div key={mission.id} className="absolute -translate-x-1/2" style={{ top, left }}>
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-white/[.18] bg-[#15171a] shadow-[0_0_0_7px_rgba(255,255,255,.025),0_14px_38px_rgba(0,0,0,.35)]">
                    <Sparkles size={15} className="text-white/64" />
                  </span>
                  <span className="mt-2 block max-w-[90px] truncate text-center text-[7px] font-black tracking-[.08em] text-white/38">{mission.shortName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="trilha-semana" className="relative mt-8 overflow-hidden rounded-[32px] border border-white/[.11] bg-[#07080a] px-4 py-7 shadow-[0_28px_100px_rgba(0,0,0,.36)] sm:px-7 sm:py-8">
      <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-[.13]" />
      <div className="relative flex flex-col gap-4 border-b border-white/[.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="tita-kicker">SEMANA {String(weekNumber).padStart(2, "0")} · EM ANDAMENTO</span>
          <h2 className="mt-2 font-serif text-4xl tracking-[-.035em] text-white">Trilha da semana</h2>
          <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/34">Siga os pontos conectados. Cada matéria abre sua missão com aula, questões, revisão e nivelamento.</p>
        </div>
        <div className="min-w-[210px]">
          <div className="flex items-center justify-between text-[8px] font-black tracking-[.1em] text-white/35"><span>{completed}/{missions.length} MISSÕES</span><span>{progress}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#777d84,#e3e6e9)]" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="relative mx-auto mt-8 max-w-5xl pb-4">
        <div className="absolute bottom-8 left-[22px] top-4 w-[2px] bg-[linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.28)_16%,rgba(255,255,255,.16)_84%,rgba(255,255,255,.03))] md:left-1/2 md:-translate-x-1/2" />

        <div className="relative space-y-7 md:space-y-9">
          {missions.map((mission, index) => {
            const done = Boolean(mission.theoryCompleted && mission.listCompleted);
            const active = !done && (index === 0 || missions.slice(0, index).every((item) => item.theoryCompleted && item.listCompleted));
            const image = mission.imagePath;
            return (
              <div key={mission.id} className="relative grid grid-cols-[46px_1fr] items-center gap-3 md:grid-cols-[1fr_76px_1fr] md:gap-5">
                <div className={`${index % 2 === 0 ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"} col-start-2`}>
                  <Link href={mission.href} className={`group relative block min-h-[205px] overflow-hidden rounded-[24px] border transition duration-300 ${active ? "border-white/[.20] shadow-[0_18px_60px_rgba(0,0,0,.36)]" : "border-white/[.08] hover:border-white/[.16]"}`}>
                    {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-78 transition duration-500 group-hover:scale-[1.025] group-hover:opacity-90" /> : <div className="absolute inset-0 tita-soft-grid bg-[#0d0f12]" />}
                    <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(5,6,7,.96)_0%,rgba(5,6,7,.78)_48%,rgba(5,6,7,.28)_100%)]" />
                    <div className="relative flex min-h-[205px] flex-col justify-end p-5 sm:p-6">
                      <div className="mb-auto flex items-start justify-between gap-3">
                        <span className="rounded-full border border-white/[.12] bg-black/35 px-2.5 py-1 text-[7px] font-black tracking-[.13em] text-white/68 backdrop-blur-md">{mission.shortName}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.1em] ${done ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : active ? "border-white/[.18] bg-white/[.07] text-white/70" : "border-white/[.08] bg-black/20 text-white/28"}`}>{done ? "CONCLUÍDA" : active ? "AGORA" : "NA SEQUÊNCIA"}</span>
                      </div>
                      <span className="text-[8px] font-black tracking-[.13em] text-white/32">MISSÃO {String(index + 1).padStart(2, "0")}{mission.dayLabel ? ` · ${mission.dayLabel}` : ""}</span>
                      <h3 className="mt-1.5 font-serif text-2xl leading-[1.02] text-white">{mission.subject}</h3>
                      <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-white/48">{mission.lessonTitle}</p>
                      <MissionStages theoryCompleted={mission.theoryCompleted} listCompleted={mission.listCompleted} />
                      <span className="mt-4 inline-flex items-center gap-2 text-[8px] font-black tracking-[.1em] text-white/72">ABRIR MISSÃO <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
                    </div>
                  </Link>
                </div>

                <div className="col-start-1 row-start-1 grid place-items-center md:col-start-2">
                  <span className={`relative z-10 grid h-11 w-11 place-items-center rounded-full border shadow-[0_0_0_7px_#07080a] ${done ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-200" : active ? "border-white/[.32] bg-[#202328] text-white shadow-[0_0_0_7px_#07080a,0_0_28px_rgba(220,223,227,.18)]" : "border-white/[.1] bg-[#101216] text-white/28"}`}>
                    {done ? <Check size={16} strokeWidth={3} /> : active ? <Play size={13} fill="currentColor" /> : <span className="font-serif text-sm">{index + 1}</span>}
                  </span>
                </div>

                <div className={`hidden md:block ${index % 2 === 0 ? "col-start-3" : "col-start-1"}`}>
                  <div className={`flex items-center gap-2 text-[8px] font-black tracking-[.11em] text-white/22 ${index % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <span className="h-px w-8 bg-white/[.08]" />
                    <span>{mission.questionCount ?? 0} QUESTÕES</span>
                    <BookOpenCheck size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[.1] bg-white/[.035] px-4 py-2 text-[8px] font-black tracking-[.12em] text-white/48"><Flag size={13} /> FIM DA SEMANA {weekNumber}</span>
        </div>
      </div>

      <div className="relative mt-2 flex justify-end">
        <button type="button" onClick={() => { window.localStorage.removeItem(storageKey); setStarted(false); }} className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.1em] text-white/24 transition hover:text-white/55"><RotateCcw size={12} /> REVER TELA DE INÍCIO DA SEMANA</button>
      </div>
    </section>
  );
}
