"use client";

import { LevelingLimitToast } from "@/components/leveling-limit-toast";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  LockKeyhole,
  Medal,
  NotebookPen,
  Plus,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPrincipalRevision,
  loadPrincipalCalendarHub,
  reschedulePrincipalRevision,
  startPrincipalLeveling,
  type PrincipalCalendarHub,
  type PrincipalLeveling,
  type PrincipalNotebookReview,
  type PrincipalRevision,
} from "@/lib/principal-calendar-system";
import { listenStudyUpdated } from "@/lib/study-database";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

type CalendarActivity =
  | {
      kind: "revision";
      id: string;
      date: string;
      completed: boolean;
      subject: string;
      title: string;
      eyebrow: string;
      revision: PrincipalRevision;
    }
  | {
      kind: "notebook";
      id: string;
      date: string;
      completed: boolean;
      subject: string;
      title: string;
      eyebrow: string;
      notebook: PrincipalNotebookReview;
    }
  | {
      kind: "leveling";
      id: string;
      date: string;
      completed: boolean;
      subject: string;
      title: string;
      eyebrow: string;
      leveling: PrincipalLeveling;
    };

export function PrincipalCalendar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledPrefill = useRef(false);
  const [hub, setHub] = useState<PrincipalCalendarHub | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [prefillLessonId, setPrefillLessonId] = useState<string | null>(null);
  const [prefillRevisionNumber, setPrefillRevisionNumber] = useState(1);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [edit, setEdit] = useState<PrincipalRevision | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const data = await loadPrincipalCalendarHub();
    setHub(data);
  }

  useEffect(() => {
    let alive = true;
    const run = () =>
      refresh().catch((error) =>
        alive &&
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o calendário.",
        ),
      );
    void run();
    const unlisten = listenStudyUpdated(() => void run());
    return () => {
      alive = false;
      unlisten();
    };
  }, []);

  useEffect(() => {
    if (!hub || handledPrefill.current) return;

    const subjectSlug = searchParams.get("subject");
    const lessonSlug = searchParams.get("lesson");
    if (!subjectSlug || !lessonSlug) return;

    handledPrefill.current = true;
    const lesson = hub.taxonomy.find(
      (row) => row.subject_slug === subjectSlug && row.lesson_slug === lessonSlug,
    );
    if (!lesson) {
      setMessage("A aula enviada pela trilha não foi encontrada no calendário ativo.");
      return;
    }

    const revisionNumber = Math.max(
      1,
      Math.min(4, Number(searchParams.get("revision") ?? 1) || 1),
    );
    const recommendedDate = searchParams.get("date");
    setPrefillLessonId(lesson.lesson_id);
    setPrefillRevisionNumber(revisionNumber);
    setPrefillDate(recommendedDate);
    if (recommendedDate) {
      const parsed = new Date(`${recommendedDate}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) setMonth(parsed);
    }
    setMessage(
      `${lesson.subject_name} · ${lesson.lesson_title} já está preenchida. Escolha o dia e, se quiser, registre uma observação.`,
    );
    setAddOpen(true);
  }, [hub, searchParams]);

  function openManualRevision() {
    setPrefillLessonId(null);
    setPrefillRevisionNumber(1);
    setPrefillDate(selectedDate);
    setAddOpen(true);
  }

  function closeAddRevision() {
    setAddOpen(false);
    if (prefillLessonId) router.replace("/revisoes");
    setPrefillLessonId(null);
    setPrefillRevisionNumber(1);
    setPrefillDate(null);
  }

  async function openLeveling(leveling: PrincipalLeveling) {
    if (busy) return;
    if (!leveling.source_completed) {
      setMessage(
        `O Nivelamento ${leveling.leveling_number} libera depois que a Revisão ${leveling.leveling_number} desta aula for concluída.`,
      );
      return;
    }
    if (leveling.status === "completed" && leveling.attempt_id) {
      router.push(`/questoes/banco/nivelamento/${leveling.attempt_id}`);
      return;
    }
    setBusy(leveling.id);
    setMessage(null);
    try {
      if (leveling.status === "in_progress" && leveling.attempt_id) {
        router.push(`/questoes/banco/nivelamento/${leveling.attempt_id}`);
        return;
      }
      const result = await startPrincipalLeveling(leveling.id);

      if (result.attempt_id) {
        router.push(`/questoes/banco/nivelamento/${result.attempt_id}`);
        return;
      }

      if (result.reason === "revision_required") {
        throw new Error(
          `Conclua a Revisão ${result.required_revision ?? leveling.leveling_number} desta aula primeiro.`,
        );
      }

      if (result.reason === "no_questions" || result.reason === "insufficient_questions") {
        throw new Error("Ainda não há 10 questões disponíveis neste nível.");
      }

      throw new Error("Não foi possível iniciar este nivelamento agora.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o nivelamento.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!hub) {
    return (
      <div className="mx-auto grid min-h-72 w-full max-w-[1460px] place-items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
        Carregando calendário...
      </div>
    );
  }

  const activities = buildActivities(hub);
  const activitiesByDate = groupActivitiesByDate(activities);
  const cells = monthCells(month);
  const currentMonth = month.getMonth();
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const monthActivities = activities.filter((item) => item.date.startsWith(monthPrefix));
  const completedTotal = activities.filter((item) => item.completed).length;
  const pendingRevisions = hub.revisions.filter(
    (item) => item.scheduled_for && item.status !== "completed",
  ).length;
  const activeDays = new Set(monthActivities.map((item) => item.date)).size;
  const selectedActivities = selectedDate
    ? activitiesByDate.get(selectedDate) ?? []
    : [];

  function openActivity(activity: CalendarActivity) {
    setSelectedDate(null);

    if (activity.kind === "revision") {
      if (activity.revision.status === "completed") {
        router.push(`/revisoes/${activity.revision.id}`);
        return;
      }
      setEdit(activity.revision);
      return;
    }

    if (activity.kind === "notebook") {
      router.push(`/caderno/${activity.notebook.notebook_id}`);
      return;
    }

    void openLeveling(activity.leveling);
  }

  return (
    <div
      data-mt-calendar-v52="1" data-mt-calendar-v52-fix="scroll" data-mt-calendar-v56-modal="expanded"
      className={`mx-auto w-full max-w-[1460px] ${compact ? "" : "pb-20"}`}
    >
      {!compact ? (
        <CalendarHero
          completedTotal={completedTotal}
          monthActivities={monthActivities.length}
          pendingRevisions={pendingRevisions}
          activeDays={activeDays}
        />
      ) : null}

      <LevelingLimitToast hub={hub} />

      {message ? (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/[.07] p-4 text-xs text-amber-300">
          <CircleAlert className="mr-2 inline" size={15} />
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-[#253044] bg-[#070b12] shadow-[0_26px_70px_rgba(0,0,0,.34)]">
        <header className="flex flex-col gap-3 border-b border-[#202a39] bg-[linear-gradient(180deg,rgba(15,20,31,.98),rgba(9,13,20,.98))] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-[#263247] bg-[#0b1019]">
              <button
                type="button"
                onClick={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() - 1,
                      1,
                      12,
                    ),
                  )
                }
                className="grid h-11 w-11 place-items-center border-r border-[#263247] text-white/70 transition hover:text-white"
                aria-label="Mês anterior"
              >
                <ArrowLeft size={17} />
              </button>
              <div className="min-w-[185px] px-4 text-center">
                <span className="text-[8px] font-black tracking-[.16em] text-white/35">
                  AGENDA MENSAL
                </span>
                <strong className="mt-0.5 block text-sm text-white">
                  {monthTitle(month)}
                </strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() + 1,
                      1,
                      12,
                    ),
                  )
                }
                className="grid h-11 w-11 place-items-center border-l border-[#263247] text-white/70 transition hover:text-white"
                aria-label="Próximo mês"
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-amber-300/30 bg-amber-300/[.08] px-5 py-3 text-[9px] font-black tracking-[.13em] text-amber-200">
              MÊS
            </span>
            <button
              type="button"
              onClick={() => setMonth(new Date())}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[.03] px-4 text-[9px] font-black tracking-[.1em] text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <CalendarDays size={15} /> HOJE
            </button>
            <button
              type="button"
              onClick={openManualRevision}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 text-[9px] font-black tracking-[.1em] text-violet-200 transition hover:bg-violet-400/15"
            >
              <Plus size={15} /> REVISÃO
            </button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-7 border-b border-[#202a39] bg-[#080d15]">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="px-2 py-3 text-center text-[9px] font-black tracking-[.14em] text-[#9eb1d3]"
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((date) => {
                const key = dateKey(date);
                const dayActivities = activitiesByDate.get(key) ?? [];
                const hasActivities = dayActivities.length > 0;
                const dayCompleted =
                  hasActivities && dayActivities.every((item) => item.completed);
                const primary = dayActivities[0] ?? null;
                const extra = Math.max(0, dayActivities.length - 1);
                const isToday = key === dateKey(new Date());

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!hasActivities}
                    onClick={() => hasActivities && setSelectedDate(key)}
                    className={`group relative min-h-[128px] border-b border-r border-[#1d2634] p-2.5 text-left transition ${
                      date.getMonth() === currentMonth ? "" : "opacity-35"
                    } ${
                      hasActivities
                        ? dayCompleted
                          ? "bg-[linear-gradient(180deg,rgba(16,185,129,.035),rgba(7,11,18,.98))] hover:bg-emerald-400/[.06]"
                          : "bg-[linear-gradient(180deg,rgba(124,58,237,.035),rgba(7,11,18,.98))] hover:bg-violet-400/[.06]"
                        : "bg-[#070b12]"
                    } disabled:cursor-default`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-lg text-[10px] font-black ${
                          isToday
                            ? "bg-amber-300 text-[#1d1200] shadow-[0_0_20px_rgba(251,191,36,.28)]"
                            : dayCompleted
                              ? "text-emerald-200"
                              : hasActivities
                                ? "text-violet-200"
                                : "text-white/38"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {hasActivities ? (
                        <span
                          className={`text-[7px] font-black tracking-[.12em] ${
                            dayCompleted ? "text-emerald-300" : "text-violet-300"
                          }`}
                        >
                          {dayCompleted ? "CONCLUÍDO" : "EM ANDAMENTO"}
                        </span>
                      ) : null}
                    </div>

                    {primary ? (
                      <div className="relative mt-3 h-[72px]">
                        {extra >= 2 ? (
                          <span
                            className={`absolute inset-x-2 top-2 h-[56px] translate-y-2 rounded-xl border ${
                              dayCompleted
                                ? "border-emerald-300/15 bg-emerald-300/[.035]"
                                : "border-violet-300/15 bg-violet-300/[.04]"
                            }`}
                          />
                        ) : null}
                        {extra >= 1 ? (
                          <span
                            className={`absolute inset-x-1 top-1 h-[58px] translate-y-1 rounded-xl border ${
                              dayCompleted
                                ? "border-emerald-300/20 bg-emerald-300/[.05]"
                                : "border-violet-300/20 bg-violet-300/[.055]"
                            }`}
                          />
                        ) : null}

                        <div
                          className={`relative z-10 flex h-[58px] items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-2 shadow-[0_8px_18px_rgba(0,0,0,.24)] ${
                            dayCompleted
                              ? "border-emerald-300/40 bg-[linear-gradient(90deg,rgba(16,185,129,.22),rgba(5,46,36,.55))]"
                              : "border-violet-300/45 bg-[linear-gradient(90deg,rgba(124,58,237,.22),rgba(38,18,66,.58))]"
                          }`}
                        >
                          <ActivityIcon
                            activity={primary}
                            className={
                              dayCompleted ? "text-emerald-200" : "text-violet-200"
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-[8px] font-black text-white">
                              {primary.eyebrow}
                            </strong>
                            <span className="mt-0.5 block truncate text-[7px] text-white/55">
                              {primary.title}
                            </span>
                          </div>
                          {primary.completed ? (
                            <CheckCircle2 size={14} className="shrink-0 text-emerald-300" />
                          ) : (
                            <ChevronRight size={14} className="shrink-0 text-white/50" />
                          )}
                        </div>

                        {extra > 0 ? (
                          <span className="absolute -bottom-1 right-1 z-20 grid min-h-6 min-w-7 place-items-center rounded-full border border-white/20 bg-[#111827] px-1.5 text-[8px] font-black text-white shadow-[0_4px_12px_rgba(0,0,0,.4)]">
                            +{extra}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-6 text-center text-[8px] text-white/18">—</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {selectedDate ? (
        <DayActivitiesModal
          date={selectedDate}
          activities={selectedActivities}
          onClose={() => setSelectedDate(null)}
          onOpenActivity={openActivity}
          onAddRevision={() => {
            setPrefillDate(selectedDate);
            setSelectedDate(null);
            setAddOpen(true);
          }}
        />
      ) : null}

      {addOpen ? (
        <AddRevisionModal
          hub={hub}
          prefillLessonId={prefillLessonId}
          prefillRevisionNumber={prefillRevisionNumber}
          prefillDate={prefillDate}
          lockLesson={Boolean(prefillLessonId)}
          onClose={closeAddRevision}
          onSaved={async () => {
            setAddOpen(false);
            if (prefillLessonId) router.replace("/revisoes");
            setPrefillLessonId(null);
            setPrefillRevisionNumber(1);
            setPrefillDate(null);
            await refresh();
          }}
        />
      ) : null}

      {edit ? (
        <EditRevisionModal
          revision={edit}
          onClose={() => setEdit(null)}
          onOpen={() => router.push(`/revisoes/${edit.id}`)}
          onSaved={async (date) => {
            setBusy(edit.id);
            try {
              await reschedulePrincipalRevision(edit.id, date);
              setEdit(null);
              await refresh();
            } finally {
              setBusy(null);
            }
          }}
          busy={busy === edit.id}
        />
      ) : null}
    </div>
  );
}

function CalendarHero({
  completedTotal,
  monthActivities,
  pendingRevisions,
  activeDays,
}: {
  completedTotal: number;
  monthActivities: number;
  pendingRevisions: number;
  activeDays: number;
}) {
  return (
    <section className="relative mb-4 overflow-hidden rounded-[30px] border border-[#172235] bg-[#060911] text-white shadow-[0_28px_80px_rgba(0,0,0,.34)]">
      <div className="absolute inset-0 bg-[url('/cfo-pmal-hero.png')] bg-cover bg-right-top bg-no-repeat opacity-80" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#050810_0%,rgba(5,8,16,.98)_38%,rgba(5,8,16,.72)_68%,rgba(5,8,16,.18)_100%)]" />
      <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-6 lg:px-8">
        <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.22em] text-violet-300">
          <BookOpenText size={15} /> ESTUDO E DISCIPLINA
        </span>
        <h1 className="mt-2 font-serif text-4xl leading-none tracking-[-.055em] sm:text-5xl lg:text-[62px]">
          Calendário de <span className="text-amber-200">Estudos</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72 sm:text-[15px]">
          Visualize sua programação, acompanhe sua evolução e mantenha a consistência.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HeroStat
            accent="emerald"
            icon={<TargetIcon />}
            value={completedTotal}
            label="atividades concluídas"
          />
          <HeroStat
            accent="violet"
            icon={<Trophy size={20} />}
            value={monthActivities}
            label="atividades neste mês"
          />
          <HeroStat
            accent="amber"
            icon={<CalendarDays size={20} />}
            value={pendingRevisions}
            label="revisões pendentes"
          />
          <HeroStat
            accent="cyan"
            icon={<Sparkles size={20} />}
            value={activeDays}
            label="dias programados"
          />
        </div>
      </div>
    </section>
  );
}

function TargetIcon() {
  return <CheckCircle2 size={20} />;
}

function HeroStat({
  accent,
  icon,
  value,
  label,
}: {
  accent: "emerald" | "violet" | "amber" | "cyan";
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  const style =
    accent === "emerald"
      ? "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-200"
      : accent === "violet"
        ? "border-violet-300/25 bg-violet-300/[.08] text-violet-200"
        : accent === "amber"
          ? "border-amber-300/30 bg-amber-300/[.08] text-amber-200"
          : "border-cyan-300/25 bg-cyan-300/[.07] text-cyan-200";

  return (
    <div className={`flex min-h-[78px] items-center gap-3 rounded-[18px] border px-4 ${style}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-current/20 bg-black/20">
        {icon}
      </span>
      <div>
        <strong className="block text-2xl font-black text-white">{value}</strong>
        <span className="text-[11px] text-white/65">{label}</span>
      </div>
    </div>
  );
}

function DayActivitiesModal({
  date,
  activities,
  onClose,
  onOpenActivity,
  onAddRevision,
}: {
  date: string;
  activities: CalendarActivity[];
  onClose: () => void;
  onOpenActivity: (activity: CalendarActivity) => void;
  onAddRevision: () => void;
}) {
  const completed = activities.filter((item) => item.completed).length;
  const pending = activities.length - completed;
  const revisions = activities.filter((item) => item.kind === "revision").length;
  const completionPercent = activities.length
    ? Math.round((completed / activities.length) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[150] grid place-items-center bg-black/80 p-3 backdrop-blur-md sm:p-5"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="relative max-h-[94vh] w-full max-w-[920px] overflow-y-auto rounded-[30px] border border-amber-300/55 bg-[#07101c] text-white shadow-[0_35px_110px_rgba(0,0,0,.72),0_0_40px_rgba(245,158,11,.09)] [scrollbar-width:thin]">
        <header className="relative overflow-hidden border-b border-white/10 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
          <div className="absolute inset-0 bg-[url('/cfo-pmal-hero.png')] bg-cover bg-right-center bg-no-repeat opacity-55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#07101c_0%,rgba(7,16,28,.98)_48%,rgba(7,16,28,.44)_100%)]" />
          <img
            src="/mascots/tita-pmal-guardian.png"
            alt=""
            className="pointer-events-none absolute -bottom-10 right-12 hidden h-[190px] w-[190px] object-contain drop-shadow-[0_18px_34px_rgba(0,0,0,.65)] md:block"
            draggable={false}
          />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="max-w-[560px]">
              <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.18em] text-amber-300">
                <CalendarDays size={16} /> ATIVIDADES DO DIA
              </span>
              <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
                {fullDateLabel(date)}
              </h2>
              <p className="mt-1 text-sm text-white/65">
                {activities.length} {activities.length === 1 ? "atividade programada" : "atividades programadas"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="relative z-20 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-black/30 text-white/75 transition hover:border-white/40 hover:text-white"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <ModalStat
              accent="emerald"
              icon={<Check size={21} strokeWidth={3} />}
              value={completed}
              label="concluídas"
              detail={`${completionPercent}% do dia`}
            />
            <ModalStat
              accent="amber"
              icon={<Clock3 size={21} />}
              value={pending}
              label="pendentes"
              detail={`${100 - completionPercent}% do dia`}
            />
            <ModalStat
              accent="violet"
              icon={<Sparkles size={21} />}
              value={revisions}
              label={revisions === 1 ? "revisão" : "revisões"}
              detail="programadas"
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-white">Atividades do dia</h3>
            <span className="text-[10px] text-white/40">
              Clique em uma atividade para continuar
            </span>
          </div>

          <div className="mt-3 min-h-[280px] max-h-[44vh] space-y-2 overflow-y-auto overscroll-contain pb-2 pr-2 [scrollbar-color:rgba(139,92,246,.55)_transparent] [scrollbar-width:thin]">
            {activities.map((activity) => (
              <DayActivityRow
                key={`${activity.kind}-${activity.id}`}
                activity={activity}
                onClick={() => onOpenActivity(activity)}
              />
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-amber-300/15 bg-[linear-gradient(90deg,rgba(245,158,11,.08),rgba(124,58,237,.06))] px-4 py-3">
            <span className="text-[11px] italic text-amber-200/85">
              “A constância transforma esforço em resultado. Hoje é mais um passo para sua aprovação.”
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-white/15 bg-white/[.025] text-sm font-black text-white/75 transition hover:border-white/30 hover:text-white"
            >
              FECHAR
            </button>
            <button
              type="button"
              onClick={onAddRevision}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-200/50 bg-[linear-gradient(180deg,#ffd34c,#f4b316)] text-sm font-black text-[#271700] shadow-[0_12px_28px_rgba(245,158,11,.20)] transition hover:brightness-105"
            >
              <Plus size={17} /> ADICIONAR REVISÃO NESTE DIA
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ModalStat({
  accent,
  icon,
  value,
  label,
  detail,
}: {
  accent: "emerald" | "amber" | "violet";
  icon: React.ReactNode;
  value: number;
  label: string;
  detail: string;
}) {
  const style =
    accent === "emerald"
      ? "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-200"
      : accent === "amber"
        ? "border-amber-300/25 bg-amber-300/[.07] text-amber-200"
        : "border-violet-300/25 bg-violet-300/[.07] text-violet-200";

  return (
    <div className={`flex min-h-[90px] items-center gap-3 rounded-[18px] border px-4 ${style}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-current/25 bg-black/20">
        {icon}
      </span>
      <div>
        <strong className="text-2xl font-black text-white">{value}</strong>
        <span className="ml-2 text-sm font-semibold text-white/85">{label}</span>
        <span className="block text-[10px] text-current/85">{detail}</span>
      </div>
    </div>
  );
}

function DayActivityRow({
  activity,
  onClick,
}: {
  activity: CalendarActivity;
  onClick: () => void;
}) {
  const completed = activity.completed;
  const locked =
    activity.kind === "leveling" && !activity.leveling.source_completed;

  const rowStyle = completed
    ? "border-emerald-300/24 bg-[linear-gradient(90deg,rgba(16,185,129,.11),rgba(7,16,28,.82))]"
    : locked
      ? "border-white/10 bg-white/[.025] opacity-65"
      : "border-violet-300/26 bg-[linear-gradient(90deg,rgba(124,58,237,.13),rgba(7,16,28,.82))]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[72px] w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition hover:-translate-y-0.5 hover:border-white/30 ${rowStyle}`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
          completed
            ? "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-300"
            : locked
              ? "border-white/10 bg-white/[.025] text-white/35"
              : "border-violet-300/25 bg-violet-300/[.08] text-violet-200"
        }`}
      >
        <ActivityIcon activity={activity} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-[13px] font-black text-white">
            {activity.eyebrow}
          </strong>
          <span
            className={`rounded-full border px-2 py-0.5 text-[8px] font-black ${
              completed
                ? "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-300"
                : locked
                  ? "border-white/10 bg-white/[.025] text-white/35"
                  : "border-violet-300/25 bg-violet-300/[.08] text-violet-200"
            }`}
          >
            {completed ? "CONCLUÍDA" : locked ? "BLOQUEADA" : activity.kind === "revision" ? "REVISÃO" : "PENDENTE"}
          </span>
        </div>
        <span className="mt-1 block truncate text-[11px] text-white/62">
          {activity.subject} · {activity.title}
        </span>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-black tracking-[.08em] text-white/48 transition group-hover:text-white/80">
        ABRIR <ChevronRight size={15} />
      </span>
    </button>
  );
}

function ActivityIcon({
  activity,
  className = "",
}: {
  activity: CalendarActivity;
  className?: string;
}) {
  if (activity.kind === "revision") {
    return <Sparkles size={15} className={className} />;
  }
  if (activity.kind === "notebook") {
    return <NotebookPen size={15} className={className} />;
  }
  return <Medal size={15} className={className} />;
}

function buildActivities(hub: PrincipalCalendarHub): CalendarActivity[] {
  const revisions: CalendarActivity[] = hub.revisions
    .filter((item) => item.scheduled_for)
    .map((item) => ({
      kind: "revision" as const,
      id: item.id,
      date: item.scheduled_for as string,
      completed: item.status === "completed",
      subject: item.subject_name,
      title: item.lesson_title,
      eyebrow: `R${item.revision_number} · ${item.subject_name}`,
      revision: item,
    }));

  const notebooks: CalendarActivity[] = hub.notebooks
    .filter((item) => item.scheduled_for)
    .map((item) => ({
      kind: "notebook" as const,
      id: item.id,
      date: item.scheduled_for,
      completed: item.status === "completed",
      subject: item.subject_name,
      title: item.lesson_title,
      eyebrow: `C${item.review_number} · CADERNO`,
      notebook: item,
    }));

  const levelings: CalendarActivity[] = hub.levelings
    .filter((item) => item.scheduled_for)
    .map((item) => ({
      kind: "leveling" as const,
      id: item.id,
      date: item.scheduled_for as string,
      completed: item.status === "completed",
      subject: item.subject_name,
      title: item.lesson_title,
      eyebrow: `N${item.leveling_number} · ${item.subject_name}`,
      leveling: item,
    }));

  const order: Record<CalendarActivity["kind"], number> = {
    revision: 0,
    notebook: 1,
    leveling: 2,
  };

  return [...revisions, ...notebooks, ...levelings].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return order[a.kind] - order[b.kind];
  });
}

function groupActivitiesByDate(activities: CalendarActivity[]) {
  const map = new Map<string, CalendarActivity[]>();
  for (const activity of activities) {
    const current = map.get(activity.date) ?? [];
    current.push(activity);
    map.set(activity.date, current);
  }
  return map;
}

function fullDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function AddRevisionModal({
  hub,
  onClose,
  onSaved,
  prefillLessonId = null,
  prefillRevisionNumber = 1,
  prefillDate = null,
  lockLesson = false,
}: {
  hub: PrincipalCalendarHub;
  onClose: () => void;
  onSaved: () => void;
  prefillLessonId?: string | null;
  prefillRevisionNumber?: number;
  prefillDate?: string | null;
  lockLesson?: boolean;
}) {
  const subjects = useMemo(
    () =>
      [...new Set(hub.taxonomy.map((row) => row.subject_name))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [hub.taxonomy],
  );
  const prefilledLesson = useMemo(
    () => hub.taxonomy.find((row) => row.lesson_id === prefillLessonId) ?? null,
    [hub.taxonomy, prefillLessonId],
  );
  const [subject, setSubject] = useState(
    prefilledLesson?.subject_name ?? subjects[0] ?? "",
  );
  const lessons = useMemo(
    () => hub.taxonomy.filter((row) => row.subject_name === subject),
    [hub.taxonomy, subject],
  );
  const [lessonId, setLessonId] = useState(
    prefilledLesson?.lesson_id ?? lessons[0]?.lesson_id ?? "",
  );
  const [revision, setRevision] = useState(prefillRevisionNumber);
  const [date, setDate] = useState(prefillDate ?? dateKey(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lockLesson && prefilledLesson) {
      setSubject(prefilledLesson.subject_name);
      setLessonId(prefilledLesson.lesson_id);
      setRevision(prefillRevisionNumber);
      if (prefillDate) setDate(prefillDate);
      return;
    }
    setLessonId(lessons[0]?.lesson_id ?? "");
  }, [lessons, lockLesson, prefillDate, prefilledLesson, prefillRevisionNumber]);

  async function save() {
    if (!lessonId || !date || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createPrincipalRevision({ lessonId, revisionNumber: revision, date, notes });
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar a revisão.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[160] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-violet-400/25 bg-[#0d0d13] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-black tracking-[.18em] text-violet-300">
              CALENDÁRIO PRINCIPAL
            </span>
            <h3 className="mt-2 font-serif text-3xl">
              {lockLesson
                ? "Escolha o dia da revisão."
                : "Adicionar revisão de qualquer matéria."}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55"
          >
            <X size={17} />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        {lockLesson && prefilledLesson ? (
          <div className="mt-6 rounded-[20px] border border-emerald-400/25 bg-emerald-400/[.06] p-4">
            <span className="text-[8px] font-black tracking-[.14em] text-emerald-300">
              AULA JÁ PREENCHIDA AUTOMATICAMENTE
            </span>
            <strong className="mt-2 block text-base text-white">
              {prefilledLesson.lesson_title}
            </strong>
            <span className="mt-1 block text-[10px] text-white/45">
              {prefilledLesson.subject_name} · Revisão {revision}
            </span>
            <p className="mt-3 text-[10px] leading-5 text-emerald-100/55">
              A matéria e a aula já vieram da trilha. Você escolhe a data e pode deixar uma observação opcional.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="MATÉRIA">
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className={selectClass}
                >
                  {subjects.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="REVISÃO">
                <select
                  value={revision}
                  onChange={(event) => setRevision(Number(event.target.value))}
                  className={selectClass}
                >
                  {[1, 2, 3, 4].map((number) => (
                    <option key={number} value={number}>
                      Revisão {number}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="AULA">
              <select
                value={lessonId}
                onChange={(event) => setLessonId(event.target.value)}
                className={selectClass}
              >
                {lessons.map((lesson) => (
                  <option key={lesson.lesson_id} value={lesson.lesson_id}>
                    Semana {lesson.week_number} · {lesson.lesson_title}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label={lockLesson ? "ESCOLHA O DIA DA REVISÃO" : "DATA DA REVISÃO"}>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={selectClass}
          />
        </Field>

        <Field label="OBSERVAÇÕES DA REVISÃO · OPCIONAL">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 2000))}
            rows={4}
            maxLength={2000}
            placeholder="Ex.: errei conversão de unidade; revisar regra de três; atenção à pegadinha X..."
            className={`${selectClass} min-h-[112px] resize-y py-3 leading-6`}
          />
          <span className="mt-1 block text-right text-[8px] font-medium tracking-normal text-white/25">
            {notes.length}/2000
          </span>
        </Field>

        <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[.06] p-3 text-[10px] leading-5 text-white/55">
          <Sparkles className="mr-2 inline text-violet-300" size={13} />
          Ao salvar, o Nivelamento {revision} será colocado automaticamente no dia seguinte. A observação ficará visível quando você abrir esta revisão.
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={!lessonId || saving}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 text-[10px] font-black tracking-[.11em] text-white disabled:opacity-45"
        >
          {saving ? (
            "SALVANDO..."
          ) : (
            <>
              <Plus size={16} /> {lockLesson ? "AGENDAR ESTA AULA" : "ADICIONAR À AGENDA"}
            </>
          )}
        </button>
      </section>
    </div>
  );
}

function EditRevisionModal({
  revision,
  onClose,
  onOpen,
  onSaved,
  busy,
}: {
  revision: PrincipalRevision;
  onClose: () => void;
  onOpen: () => void;
  onSaved: (date: string) => void;
  busy: boolean;
}) {
  const [date, setDate] = useState(
    revision.scheduled_for ?? revision.recommended_for,
  );

  return (
    <div
      className="fixed inset-0 z-[170] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="w-full max-w-lg rounded-[28px] border border-violet-400/25 bg-[#0d0d13] p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-black tracking-[.17em] text-violet-300">
              REVISÃO {revision.revision_number}
            </span>
            <h3 className="mt-2 font-serif text-2xl">{revision.lesson_title}</h3>
            <p className="mt-1 text-xs text-white/45">{revision.subject_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
          >
            <X size={16} />
          </button>
        </div>
        <Field label="DATA">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={selectClass}
          />
        </Field>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onOpen}
            className="min-h-11 rounded-xl border border-white/10 text-[9px] font-black"
          >
            ABRIR REVISÃO
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSaved(date)}
            className="min-h-11 rounded-xl bg-violet-500 text-[9px] font-black"
          >
            {busy ? "SALVANDO..." : "SALVAR DATA"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block text-[9px] font-black tracking-[.13em] text-white/45">
      {label}
      {children}
    </label>
  );
}

const selectClass =
  "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-violet-400/45";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthCells(reference: Date) {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1, 12);
  first.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

function monthTitle(date: Date) {
  const value = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return value.charAt(0).toUpperCase() + value.slice(1);
}



