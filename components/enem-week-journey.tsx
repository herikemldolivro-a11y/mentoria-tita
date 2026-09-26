"use client";

import { ArrowRight, Check, CircleDot, LockKeyhole, Play } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { EnemDailySideQuests } from "@/components/enem-daily-side-quests";
import type { WeekJourneyMission } from "@/components/week-journey";

export type EnemWeekJourneyMission = WeekJourneyMission & {
  studyDay?: number;
};

function missionPlanDate(mission: EnemWeekJourneyMission) {
  try {
    return new URL(mission.href, "https://mentoriatita.local").searchParams.get("planoDia");
  } catch {
    return null;
  }
}

function todayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function buildPath(count: number) {
  if (!count) return "";
  const leftX = 235;
  const rightX = 765;
  const firstY = 74;
  const stepY = 310;

  let path = `M ${leftX} ${firstY}`;

  for (let index = 1; index < count; index += 1) {
    const fromX = (index - 1) % 2 === 0 ? leftX : rightX;
    const toX = index % 2 === 0 ? leftX : rightX;
    const fromY = firstY + (index - 1) * stepY;
    const toY = firstY + index * stepY;
    const middleY = (fromY + toY) / 2;
    path += ` C ${fromX} ${middleY}, ${toX} ${middleY}, ${toX} ${toY}`;
  }

  return path;
}

function MissionStages({
  mission,
  active,
}: {
  mission: EnemWeekJourneyMission;
  active: boolean;
}) {
  const steps = [
    { label: "AULA", done: Boolean(mission.theoryCompleted) },
    { label: "QUESTÕES", done: Boolean(mission.listCompleted) },
    { label: "REVISÃO", done: false },
    { label: "NIVELAMENTO", done: false },
  ];

  return (
    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {steps.map((step, index) => {
        const current =
          active &&
          ((index === 0 && !mission.theoryCompleted) ||
            (index === 1 && Boolean(mission.theoryCompleted) && !mission.listCompleted));

        return (
          <div key={step.label} className="flex shrink-0 items-center gap-1.5">
            <span
              className={`grid h-6 min-w-6 place-items-center rounded-full border px-1 ${
                current
                  ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                  : step.done
                    ? "border-violet-300/35 bg-violet-300/10 text-violet-100"
                    : "border-white/[.08] bg-black/20 text-white/25"
              }`}
            >
              {step.done ? (
                <Check size={11} strokeWidth={3} />
              ) : current ? (
                <CircleDot size={10} />
              ) : (
                <LockKeyhole size={9} />
              )}
            </span>

            <span
              className={`text-[7px] font-black tracking-[.11em] ${
                current
                  ? "text-emerald-200/85"
                  : step.done
                    ? "text-violet-200/80"
                    : "text-white/24"
              }`}
            >
              {step.label}
            </span>

            {index < steps.length - 1 ? (
              <span className={`h-px w-4 ${step.done ? "bg-violet-300/24" : "bg-white/[.09]"}`} />
            ) : null}
          </div>
        );
      })}
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
  const completed = useMemo(
    () => missions.filter((mission) => mission.theoryCompleted && mission.listCompleted).length,
    [missions],
  );

  if (!missions.length) return null;

  const progress = Math.round((completed / missions.length) * 100);
  const today = todayInBrazil();
  const explicitToday = missions.some(
    (mission) => Boolean(mission.isToday) || missionPlanDate(mission) === today,
  );
  const fallbackIndex = missions.findIndex(
    (mission) => !(mission.theoryCompleted && mission.listCompleted),
  );

  const firstMissionIndexForDay = new Map<number, number>();
  missions.forEach((mission, index) => {
    if (mission.studyDay && !firstMissionIndexForDay.has(mission.studyDay)) {
      firstMissionIndexForDay.set(mission.studyDay, index);
    }
  });

  const isActive = (mission: EnemWeekJourneyMission, index: number) => {
    if (mission.theoryCompleted && mission.listCompleted) return false;
    if (explicitToday) {
      return Boolean(mission.isToday) || missionPlanDate(mission) === today;
    }
    return index === fallbackIndex;
  };

  const dayIsActive = (day?: number) => {
    if (!day) return false;
    return missions.some((mission, index) => mission.studyDay === day && isActive(mission, index));
  };

  const rowHeight = 310;
  const trackHeight = Math.max(420, 110 + (missions.length - 1) * rowHeight + 280);
  const path = buildPath(missions.length);

  return (
    <section
      id="trilha-semana"
      className="relative mt-8 overflow-hidden rounded-[32px] border border-white/[.10] bg-[#050608] px-4 py-7 shadow-[0_30px_110px_rgba(0,0,0,.46)] sm:px-7 sm:py-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(109,40,217,.07),transparent_35%)]" />

      <header className="relative z-20 flex flex-col gap-5 border-b border-white/[.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[8px] font-black tracking-[.18em] text-violet-200/65">
            ENEM 40 DIAS · SEMANA {String(weekNumber).padStart(2, "0")}
          </span>
          <h2 className="mt-2 font-serif text-4xl tracking-[-.035em] text-white">
            Trilha da semana
          </h2>
          <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/34">
            {title || "Siga a sequência do dia."} Os nomes e conteúdos continuam vindo do seu
            cronograma. Em cada dia da trilha, o bloco lateral de Inglês fica fixado com 2 textos.
          </p>
        </div>

        <div className="min-w-[210px]">
          <div className="flex items-center justify-between text-[8px] font-black tracking-[.1em] text-white/35">
            <span>{completed}/{missions.length} MISSÕES</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#a855f7,#d8b4fe)] shadow-[0_0_14px_rgba(168,85,247,.28)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div
        className="relative z-0 mx-auto mt-10 max-w-5xl"
        style={{ minHeight: trackHeight }}
      >
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
          viewBox={`0 0 1000 ${trackHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="rgba(255,255,255,.10)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={path}
            fill="none"
            stroke="rgba(109,40,217,.045)"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative">
          {missions.map((mission, index) => {
            const done = Boolean(mission.theoryCompleted && mission.listCompleted);
            const active = isActive(mission, index);
            const leftSide = index % 2 === 0;
            const firstOfDay =
              Boolean(mission.studyDay) &&
              firstMissionIndexForDay.get(mission.studyDay as number) === index;

            return (
              <div
                key={mission.id}
                className="relative flex min-h-[310px] flex-col items-stretch pt-5 sm:block"
              >
                {firstOfDay && mission.studyDay ? (
                  <>
                    <svg
                      className="pointer-events-none absolute inset-0 z-0 hidden h-[235px] w-full sm:block"
                      viewBox="0 0 1000 235"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      {leftSide ? (
                        <>
                          <path
                            d="M455 110 C500 110 515 110 555 110"
                            fill="none"
                            stroke="rgba(125,211,252,.20)"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M555 110 C580 110 580 65 610 65 M555 110 C580 110 580 150 610 150"
                            fill="none"
                            stroke="rgba(125,211,252,.13)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </>
                      ) : (
                        <>
                          <path
                            d="M545 110 C500 110 485 110 445 110"
                            fill="none"
                            stroke="rgba(125,211,252,.20)"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M445 110 C420 110 420 65 390 65 M445 110 C420 110 420 150 390 150"
                            fill="none"
                            stroke="rgba(125,211,252,.13)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </>
                      )}
                    </svg>

                    <div
                      className={`relative z-10 order-2 mt-3 w-full sm:absolute sm:top-4 sm:mt-0 sm:w-[38%] ${
                        leftSide ? "sm:right-0" : "sm:left-0"
                      }`}
                    >
                      <EnemDailySideQuests
                        day={mission.studyDay}
                        side={leftSide ? "right" : "left"}
                        dueNow={dayIsActive(mission.studyDay)}
                      />
                    </div>
                  </>
                ) : null}

                <Link
                  href={mission.href}
                  className={`group relative z-10 order-1 w-full overflow-hidden rounded-[24px] border transition duration-300 sm:absolute sm:top-5 sm:w-[46%] ${
                    leftSide ? "sm:left-0" : "sm:right-0"
                  } ${
                    active
                      ? "border-violet-300/35 shadow-[0_18px_70px_rgba(109,40,217,.20)]"
                      : done
                        ? "border-violet-300/25 shadow-[0_18px_60px_rgba(76,29,149,.15)]"
                        : "border-white/[.08] hover:border-white/[.16]"
                  }`}
                >
                  {mission.imagePath ? (
                    <img
                      src={mission.imagePath}
                      alt=""
                      className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025] ${
                        active ? "opacity-75" : done ? "opacity-54" : "opacity-36"
                      }`}
                    />
                  ) : null}

                  <div
                    className={`absolute inset-0 ${
                      active
                        ? "bg-[linear-gradient(100deg,rgba(16,7,30,.98)_0%,rgba(49,20,83,.88)_55%,rgba(76,29,149,.48)_100%)]"
                        : done
                          ? "bg-[linear-gradient(100deg,rgba(12,7,22,.98)_0%,rgba(42,20,75,.84)_55%,rgba(76,29,149,.34)_100%)]"
                          : "bg-[linear-gradient(100deg,rgba(5,6,7,.98)_0%,rgba(5,6,7,.86)_55%,rgba(5,6,7,.54)_100%)]"
                    }`}
                  />

                  <span
                    className={`absolute -top-[22px] left-1/2 z-20 grid h-[44px] w-[44px] -translate-x-1/2 place-items-center rounded-full border shadow-[0_0_0_7px_#050608] ${
                      active
                        ? "border-violet-200/45 bg-[#3b1c5f] text-violet-100 shadow-[0_0_0_7px_#050608,0_0_28px_rgba(168,85,247,.30)]"
                        : done
                          ? "border-violet-200/40 bg-[#2a163f] text-violet-100"
                          : "border-white/[.12] bg-[#111318] text-white/34"
                    }`}
                  >
                    {done ? (
                      <Check size={15} strokeWidth={3} />
                    ) : active ? (
                      <Play size={12} fill="currentColor" />
                    ) : (
                      <span className="font-serif text-sm">{index + 1}</span>
                    )}
                  </span>

                  <div className="relative flex min-h-[245px] flex-col justify-end p-5 pt-9 sm:p-6 sm:pt-10">
                    <div className="mb-auto flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/[.12] bg-black/35 px-2.5 py-1 text-[7px] font-black tracking-[.13em] text-white/68 backdrop-blur-md">
                        {mission.shortName}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[7px] font-black tracking-[.1em] ${
                          active
                            ? "border-violet-300/30 bg-violet-300/10 text-violet-200"
                            : done
                              ? "border-violet-300/20 bg-violet-300/[.07] text-violet-200/70"
                              : "border-white/[.08] bg-black/20 text-white/30"
                        }`}
                      >
                        {active ? "HOJE" : done ? "CONCLUÍDA" : "OUTRO DIA"}
                      </span>
                    </div>

                    <span className="text-[8px] font-black tracking-[.13em] text-violet-200/45">
                      MISSÃO {String(index + 1).padStart(2, "0")}
                      {mission.studyDay
                        ? ` · DIA ${mission.studyDay}`
                        : mission.dayLabel
                          ? ` · ${mission.dayLabel}`
                          : ""}
                    </span>

                    <h3 className="mt-1 font-serif text-2xl leading-tight text-white sm:text-3xl">
                      {mission.subject}
                    </h3>

                    <p className="mt-2 text-[10px] font-bold leading-5 text-white/58">
                      {mission.lessonTitle}
                    </p>

                    <MissionStages mission={mission} active={active} />

                    <span className="mt-4 inline-flex items-center gap-2 text-[8px] font-black tracking-[.1em] text-violet-200/75">
                      ABRIR MISSÃO <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
