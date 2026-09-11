import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, LockKeyhole } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PprnRetaFinalSchedule } from "@/components/pprn-reta-final-schedule";
import { requireAuthenticatedUser } from "@/lib/auth";
import { loadMySchedule } from "@/lib/schedule-server";
import { loadPersonalSchedule, personalLessonHref, type PersonalScheduleItem } from "@/lib/personal-schedule-server";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(year, month - 1, day));
}

function groupWeeks(items: PersonalScheduleItem[]) {
  const weeks = new Map<number, PersonalScheduleItem[]>();
  for (const item of items) {
    const current = weeks.get(item.weekNumber) ?? [];
    current.push(item);
    weeks.set(item.weekNumber, current);
  }
  return Array.from(weeks.entries()).sort((a, b) => a[0] - b[0]);
}

function groupDates(items: PersonalScheduleItem[]) {
  const dates = new Map<string, PersonalScheduleItem[]>();
  for (const item of items) {
    const current = dates.get(item.scheduledFor) ?? [];
    current.push(item);
    dates.set(item.scheduledFor, current);
  }
  return Array.from(dates.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default async function CronogramaPage() {
  const { focusContest } = await requireAuthenticatedUser();

  if (focusContest?.slug === "pprn") {
    return <PageShell><PprnRetaFinalSchedule /></PageShell>;
  }

  const personal = await loadPersonalSchedule().catch(() => null);

  if (personal?.items.length) {
    const weeks = groupWeeks(personal.items);
    const done = personal.items.filter((item) => item.theoryCompleted && item.listCompleted).length;
    const progress = Math.round((done / personal.items.length) * 100);

    return (
      <PageShell>
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
          <section className="tita-panel-strong relative overflow-hidden rounded-[30px] p-6 text-white sm:p-8">
            <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-25" />
            <div className="relative">
              <span className="tita-kicker">CRONOGRAMA INDIVIDUAL · {focusContest?.sigla ?? "MENTORIA TITÃ"}</span>
              <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-none tracking-[-.04em] sm:text-5xl">Uma trilha feita para a sua carga de estudo.</h1>
              <p className="mt-4 max-w-2xl text-xs leading-6 text-white/48">As aulas foram distribuídas conforme tempo diário, peso das matérias e matriz de prioridade. O progresso continua ligado às listas e revisões já existentes.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.12em] text-white/34">CARGA DIÁRIA</span><strong className="mt-1 block font-serif text-2xl">{personal.dailyStudyMinutes ? `${Math.round(personal.dailyStudyMinutes / 60 * 10) / 10}h` : "—"}</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.12em] text-white/34">DURAÇÃO</span><strong className="mt-1 block font-serif text-2xl">{personal.scheduleWeeks ?? weeks.length} semanas</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.12em] text-white/34">PROGRESSO</span><strong className="mt-1 block font-serif text-2xl">{progress}%</strong></div>
              </div>
            </div>
          </section>

          <div className="mt-7 space-y-6">
            {weeks.map(([weekNumber, weekItems]) => {
              const weekDone = weekItems.filter((item) => item.theoryCompleted && item.listCompleted).length;
              const weekProgress = Math.round((weekDone / weekItems.length) * 100);
              return (
                <section key={weekNumber} className="tita-panel overflow-hidden rounded-[28px]">
                  <header className="flex flex-col gap-4 border-b border-white/[.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                      <span className="tita-kicker">SEMANA {String(weekNumber).padStart(2, "0")}</span>
                      <h2 className="mt-1 font-serif text-3xl text-white">Bloco personalizado</h2>
                    </div>
                    <div className="min-w-[190px]">
                      <div className="flex justify-between text-[8px] font-black tracking-[.1em] text-white/35"><span>{weekDone}/{weekItems.length} AULAS</span><span>{weekProgress}%</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#858a91,#e3e5e7)]" style={{ width: `${weekProgress}%` }} /></div>
                    </div>
                  </header>

                  <div className="space-y-0 divide-y divide-white/[.055]">
                    {groupDates(weekItems).map(([date, dayItems]) => (
                      <div key={date} className="grid gap-3 p-5 md:grid-cols-[145px_1fr] sm:p-6">
                        <div>
                          <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.11em] text-[var(--tita-accent)]"><CalendarDays size={14} /> {formatDate(date)}</span>
                          <span className="mt-2 block text-[9px] text-white/30">Dia {dayItems[0]?.studyDay}</span>
                        </div>
                        <div className="grid gap-2">
                          {dayItems.map((item) => {
                            const completed = item.theoryCompleted && item.listCompleted;
                            return (
                              <Link key={item.id} href={personalLessonHref(item)} className="group flex flex-col gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] p-4 transition hover:border-white/[.15] hover:bg-white/[.045] sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <span className="text-[8px] font-black tracking-[.13em]" style={{ color: item.visual.accent }}>{item.subject.shortName}</span>
                                  <h3 className="mt-1 text-sm font-bold text-white/88">{item.lesson.title}</h3>
                                  <span className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/34"><Clock3 size={12} /> {item.estimatedMinutes} min estimados</span>
                                </div>
                                <span className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-[8px] font-black tracking-[.09em] ${completed ? "border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300" : "border-white/[.1] bg-white/[.035] text-white/70"}`}>
                                  {completed ? <><CheckCircle2 size={13} /> CONCLUÍDA</> : <>ABRIR <ArrowRight size={13} /></>}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </PageShell>
    );
  }

  const weeks = await loadMySchedule();
  const byNumber = new Map(weeks.map((week) => [week.weekNumber, week]));
  const firstIncomplete = weeks.find((week) => week.subjects.flatMap((subject) => subject.lessons).some((lesson) => !lesson.theoryCompleted || !lesson.listCompleted));
  const recommended = firstIncomplete?.weekNumber ?? weeks[0]?.weekNumber ?? 1;
  const highestWeek = Math.max(6, ...weeks.map((week) => week.weekNumber));

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <section className="tita-panel-strong relative overflow-hidden rounded-[30px] p-6 text-white sm:p-8">
          <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative">
            <span className="tita-kicker">CRONOGRAMA · {focusContest?.sigla ?? "MENTORIA TITÃ"}</span>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-none tracking-[-.04em] sm:text-5xl">Escolha sua semana e siga o bloco recomendado.</h1>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-white/48">Seu cronograma atual continua disponível. Quando a trilha individual for configurada, esta área passa automaticamente para a distribuição personalizada.</p>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div><span className="tita-kicker">SEMANAS</span><h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">Sua trilha de estudo</h2></div>
            <CalendarDays className="text-[var(--tita-accent)]" size={22} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: highestWeek }, (_, index) => index + 1).map((weekNumber) => {
              const week = byNumber.get(weekNumber);
              const available = Boolean(week);
              const active = available && weekNumber === recommended;
              const lessons = week?.subjects.flatMap((subject) => subject.lessons) ?? [];
              const completed = lessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;
              const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;

              const card = (
                <div className={`relative min-h-[220px] overflow-hidden rounded-[26px] border p-5 transition-all duration-200 ${active ? "border-white/[.2] bg-[linear-gradient(145deg,#1c1f23,#0d0f12)] text-white shadow-[0_22px_60px_rgba(0,0,0,.3)]" : available ? "border-white/[.08] bg-[#0d0f12] text-white/88 hover:-translate-y-1 hover:border-white/[.16]" : "border-white/[.06] bg-[#090a0c] text-white/30 opacity-60"}`}>
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/[.045] blur-2xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-sm font-black">{String(weekNumber).padStart(2, "0")}</span>
                    {active ? <span className="rounded-full border border-white/10 bg-white/[.055] px-2.5 py-1 text-[7px] font-black tracking-[.1em] text-[var(--tita-accent)]">RECOMENDADA</span> : available ? <CheckCircle2 size={17} className="text-white/28" /> : <LockKeyhole size={16} />}
                  </div>
                  <div className="relative mt-7">
                    <span className="text-[8px] font-black tracking-[.14em] opacity-45">MÓDULO {String(weekNumber).padStart(2, "0")}</span>
                    <h3 className="mt-1 font-serif text-2xl">{week?.title ?? `Semana ${weekNumber}`}</h3>
                    <p className="mt-3 text-[10px] leading-5 opacity-45">{available ? `${lessons.length} aulas cadastradas · ${completed} concluídas` : "Conteúdo ainda não liberado"}</p>
                    {available ? <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full bg-[var(--tita-accent)]" style={{ width: `${progress}%` }} /></div> : null}
                  </div>
                  {available ? <span className="relative mt-6 inline-flex items-center gap-2 text-[9px] font-black tracking-[.08em] text-white/70">ABRIR SEMANA <ArrowRight size={14} /></span> : null}
                </div>
              );

              return available ? <Link key={weekNumber} href={`/cronograma/semana-${weekNumber}`}>{card}</Link> : <div key={weekNumber}>{card}</div>;
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
