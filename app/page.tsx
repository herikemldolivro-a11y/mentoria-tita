import { ArrowRight, CalendarDays, ClipboardList, Clock3, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";
import { PageShell } from "@/components/page-shell";
import { UpcomingRevisions } from "@/components/upcoming-revisions";
import { dashboardNavigationItems } from "@/lib/navigation";
import { requireAuthenticatedUser } from "@/lib/auth";
import { QuestionPerformanceDashboard } from "@/components/question-performance-dashboard";
import { loadMySchedule, type ScheduleWeek } from "@/lib/schedule-server";
import { loadPersonalSchedule, personalLessonHref, type PersonalScheduleItem } from "@/lib/personal-schedule-server";
import { XpCommandCenter } from "@/components/xp-command-center";
import { WeekJourney, type WeekJourneyMission } from "@/components/week-journey";

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

function chooseCurrentWeek(weeks: ScheduleWeek[]) {
  if (!weeks.length) return null;
  const today = todayInBrazil();
  return weeks.find((week) => week.startsOn && week.endsOn && week.startsOn <= today && today <= week.endsOn)
    ?? weeks.find((week) => week.subjects.some((subject) => subject.lessons.some((lesson) => !(lesson.theoryCompleted && lesson.listCompleted))))
    ?? weeks[0];
}

function fallbackImage(slug: string) {
  if (slug === "lingua-portuguesa") return "/subjects/lingua-portuguesa.webp";
  if (slug === "direito-penal") return "/subjects/direito-penal.webp";
  return null;
}

export default async function Home() {
  const { focusContest, isAdmin, displayName } = await requireAuthenticatedUser();
  const personal = await loadPersonalSchedule().catch(() => ({
    dailyStudyMinutes: null,
    scheduleWeeks: null,
    scheduleTargetWeeks: null,
    generatedAt: null,
    onboardingCompleted: false,
    items: [] as PersonalScheduleItem[],
  }));

  let weeks: ScheduleWeek[] = [];
  if (!personal.items.length) {
    try {
      weeks = await loadMySchedule();
    } catch {
      weeks = [];
    }
  }

  const today = todayInBrazil();
  const currentWeek = chooseCurrentWeek(weeks);
  const fallbackLessons = currentWeek?.subjects.flatMap((subject) => subject.lessons) ?? [];

  const personalCompleted = personal.items.filter((item) => item.theoryCompleted && item.listCompleted).length;
  const personalProgress = personal.items.length ? Math.round((personalCompleted / personal.items.length) * 100) : 0;
  const todayItems = personal.items.filter((item) => item.scheduledFor === today);
  const firstIncomplete = personal.items.find((item) => !(item.theoryCompleted && item.listCompleted));
  const currentMission = todayItems.find((item) => !(item.theoryCompleted && item.listCompleted)) ?? firstIncomplete ?? personal.items[0] ?? null;

  const fallbackCompleted = fallbackLessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;
  const fallbackProgress = fallbackLessons.length ? Math.round((fallbackCompleted / fallbackLessons.length) * 100) : 0;
  const fallbackQuestionTotal = fallbackLessons.reduce((sum, lesson) => sum + lesson.questionCount, 0);

  const progress = personal.items.length ? personalProgress : fallbackProgress;
  const completed = personal.items.length ? personalCompleted : fallbackCompleted;
  const total = personal.items.length || fallbackLessons.length;

  const personalWeekNumber = firstIncomplete?.weekNumber ?? personal.items[0]?.weekNumber ?? 1;
  const personalWeekItems = personal.items.filter((item) => item.weekNumber === personalWeekNumber);
  const journeyWeekNumber = personalWeekItems.length ? personalWeekNumber : currentWeek?.weekNumber ?? 1;
  const journeyTitle = personalWeekItems.length
    ? `Semana ${journeyWeekNumber} do seu cronograma individual`
    : currentWeek?.title ?? `Semana ${journeyWeekNumber}`;

  const journeyMissions: WeekJourneyMission[] = personalWeekItems.length
    ? personalWeekItems.map((item) => ({
        id: item.id,
        subject: item.subject.name,
        shortName: item.subject.shortName,
        lessonTitle: item.lesson.title,
        href: personalLessonHref(item),
        imagePath: item.visual.imagePath ?? fallbackImage(item.subject.slug),
        accent: item.visual.accent,
        dayLabel: `DIA ${item.studyDay}`,
        questionCount: item.lesson.questionCount,
        theoryCompleted: item.theoryCompleted,
        listCompleted: item.listCompleted,
      }))
    : currentWeek?.subjects.flatMap((subject) => subject.lessons.map((lesson) => ({
        id: lesson.id,
        subject: subject.name,
        shortName: subject.shortName,
        lessonTitle: lesson.title,
        href: focusContest?.slug === "pprn"
          ? `/cronograma/pprn/${lesson.id}`
          : `/cronograma/semana-${journeyWeekNumber}/${subject.slug}/${lesson.slug}`,
        imagePath: fallbackImage(subject.slug),
        accent: "#c5c8cc",
        dayLabel: null,
        questionCount: lesson.questionCount,
        theoryCompleted: lesson.theoryCompleted,
        listCompleted: lesson.listCompleted,
      }))) ?? [];

  const journeyHasProgress = journeyMissions.some((mission) => mission.theoryCompleted || mission.listCompleted);

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="tita-kicker">CENTRAL DO ALUNO</span>
            <h1 className="mt-1 font-serif text-3xl tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">Sua missão de hoje, {displayName}.</h1>
          </div>
          <p className="max-w-md text-xs leading-6 text-[var(--muted)] sm:text-right">
            {personal.items.length
              ? "Sua trilha foi organizada conforme sua carga diária e o peso de cada matéria."
              : "Seu plano atual foi convertido para a nova experiência de trilha semanal."}
          </p>
        </div>

        <XpCommandCenter />

        {journeyMissions.length ? (
          <WeekJourney weekNumber={journeyWeekNumber} title={journeyTitle} missions={journeyMissions} />
        ) : null}

        <section className="tita-panel-strong relative mt-8 overflow-hidden rounded-[30px] text-white">
          <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="pointer-events-none absolute -right-12 -top-20 text-[14rem] font-black leading-none text-white/[.018] sm:text-[19rem]">95+</div>
          <div className="relative grid lg:grid-cols-[1fr_315px]">
            <div className="min-h-[330px] p-6 sm:p-8 lg:p-9">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-3 py-1.5 text-[9px] font-black tracking-[0.16em] text-[var(--tita-accent)]">
                <ShieldCheck size={14} /> {journeyHasProgress ? "MISSÃO ATUAL" : `SEMANA ${journeyWeekNumber} PRONTA`}
              </span>

              {journeyMissions.length && !journeyHasProgress ? (
                <>
                  <span className="mt-6 block text-[9px] font-black tracking-[.13em] text-white/36">SEU PLANO FOI MONTADO</span>
                  <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">Comece a Semana {journeyWeekNumber} pela trilha visual.</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">{journeyMissions.length} missões organizadas. Ao iniciar a semana, as matérias aparecem conectadas em sequência com aula, questões, revisão e nivelamento.</p>
                  <a href="#trilha-semana" className="tita-primary-button mt-8">IR PARA SEMANA {journeyWeekNumber} <ArrowRight size={16} /></a>
                </>
              ) : currentMission ? (
                <>
                  <div className="mt-6 flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[.13em] text-white/36">
                    <span>{currentMission.subject.shortName}</span><span>•</span><span>DIA {currentMission.studyDay}</span><span>•</span><span>{currentMission.estimatedMinutes} MIN</span>
                  </div>
                  <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{currentMission.lesson.title}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">{currentMission.visual.tagline || `Continue sua sequência em ${currentMission.subject.name}.`}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link href={personalLessonHref(currentMission)} className="tita-primary-button">CONTINUAR ESTUDO <ArrowRight size={16} /></Link>
                    <a href="#trilha-semana" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-5 text-[10px] font-black tracking-[.09em] text-white/72 transition hover:bg-white/[.065]">VER TRILHA <CalendarDays size={15} /></a>
                  </div>
                </>
              ) : currentWeek ? (
                <>
                  <span className="mt-6 block text-[9px] font-black tracking-[.13em] text-white/36">SEMANA {currentWeek.weekNumber}</span>
                  <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{currentWeek.title}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">{currentWeek.subjects.length} matérias · {fallbackLessons.length} aulas · {fallbackQuestionTotal} questões previstas.</p>
                  <a href="#trilha-semana" className="tita-primary-button mt-8">VER TRILHA DA SEMANA <ArrowRight size={16} /></a>
                </>
              ) : (
                <>
                  <h2 className="mt-6 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">Sua trilha está pronta para ser configurada.</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">Defina concurso, carga diária e prioridade das matérias para gerar um cronograma individual.</p>
                  <Link href="/onboarding" className="tita-primary-button mt-8">CONFIGURAR TRILHA <ArrowRight size={16} /></Link>
                </>
              )}

              <div className="mt-9 max-w-2xl">
                <div className="flex items-center justify-between gap-3 text-[9px] font-black tracking-[.11em] text-white/38"><span>PROGRESSO DA TRILHA</span><span>{progress}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.08]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#83888f,#e5e7e9)]" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>

            <aside className="border-t border-white/[.08] bg-white/[.018] p-5 lg:border-l lg:border-t-0 lg:p-6">
              <span className="tita-kicker">RESUMO</span>
              <h3 className="mt-2 font-serif text-3xl">{personal.items.length ? "Plano individual" : currentWeek ? `Semana ${currentWeek.weekNumber}` : "Preparação"}</h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/34">CONCLUÍDAS</span><strong className="mt-1 block font-serif text-2xl">{completed}/{total}</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/34">SEMANA ATUAL</span><strong className="mt-1 block font-serif text-2xl">Semana {journeyWeekNumber}</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/34">CARGA DIÁRIA</span><strong className="mt-1 block font-serif text-2xl">{personal.dailyStudyMinutes ? `${Math.round(personal.dailyStudyMinutes / 60 * 10) / 10}h` : "Plano atual"}</strong></div>
              </div>
            </aside>
          </div>
        </section>

        <div className="mt-8"><QuestionPerformanceDashboard /></div>
        {(personal.items.length || currentWeek) ? <div className="mt-7"><UpcomingRevisions /></div> : null}

        {isAdmin ? (
          <section className="tita-panel mt-8 rounded-[24px] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.1] bg-white/[.035] text-[var(--tita-accent)]"><Settings2 size={19} /></span>
                <div><span className="tita-kicker">ÁREA ADMINISTRATIVA</span><h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Central administrativa</h2><p className="mt-1 text-xs leading-6 text-[var(--muted)]">Gerencie alunos, cronogramas, materiais, questões e códigos de acesso.</p></div>
              </div>
              <Link href="/admin" className="tita-primary-button">ABRIR ADMIN <ArrowRight size={15} /></Link>
            </div>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="quick-links-title">
          <div className="mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-[var(--tita-accent)]" /><h2 id="quick-links-title" className="font-serif text-2xl text-[var(--ink)]">Atalhos da plataforma</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{dashboardNavigationItems.map((item, index) => <DashboardCard key={item.href} item={item} index={index} />)}</div>
        </section>

        {personal.items.length ? <div className="mt-6 flex items-center gap-2 text-[9px] leading-5 text-[var(--muted)]"><Clock3 size={14} className="text-[var(--tita-accent-dim)]" /> Cronograma gerado em blocos estimados; o aluno pode avançar no próprio ritmo sem perder o progresso.</div> : null}
      </div>
    </PageShell>
  );
}
