import { ArrowRight, CalendarDays, ClipboardList, Clock3, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";
import { PageShell } from "@/components/page-shell";
import { SubjectArtCard } from "@/components/subject-art-card";
import { UpcomingRevisions } from "@/components/upcoming-revisions";
import { dashboardNavigationItems } from "@/lib/navigation";
import { requireAuthenticatedUser } from "@/lib/auth";
import { QuestionPerformanceDashboard } from "@/components/question-performance-dashboard";
import { loadMySchedule, type ScheduleWeek } from "@/lib/schedule-server";
import { loadPersonalSchedule, personalLessonHref, type PersonalScheduleItem } from "@/lib/personal-schedule-server";
import { XpCommandCenter } from "@/components/xp-command-center";

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

function groupPersonalSubjects(items: PersonalScheduleItem[]) {
  const groups = new Map<string, PersonalScheduleItem[]>();
  for (const item of items) {
    const current = groups.get(item.subject.id) ?? [];
    current.push(item);
    groups.set(item.subject.id, current);
  }
  return Array.from(groups.values());
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
  const personalSubjects = groupPersonalSubjects(personal.items);

  const fallbackCompleted = fallbackLessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;
  const fallbackProgress = fallbackLessons.length ? Math.round((fallbackCompleted / fallbackLessons.length) * 100) : 0;
  const fallbackQuestionTotal = fallbackLessons.reduce((sum, lesson) => sum + lesson.questionCount, 0);

  const progress = personal.items.length ? personalProgress : fallbackProgress;
  const completed = personal.items.length ? personalCompleted : fallbackCompleted;
  const total = personal.items.length || fallbackLessons.length;

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
              : "O painel mantém seu plano atual enquanto a trilha personalizada não for gerada."}
          </p>
        </div>

        <XpCommandCenter />

        <section className="tita-panel-strong relative overflow-hidden rounded-[30px] text-white">
          <div className="tita-soft-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="pointer-events-none absolute -right-12 -top-20 text-[14rem] font-black leading-none text-white/[.018] sm:text-[19rem]">95+</div>
          <div className="relative grid lg:grid-cols-[1fr_315px]">
            <div className="min-h-[330px] p-6 sm:p-8 lg:p-9">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-3 py-1.5 text-[9px] font-black tracking-[0.16em] text-[var(--tita-accent)]">
                <ShieldCheck size={14} /> MISSÃO ATUAL
              </span>

              {currentMission ? (
                <>
                  <div className="mt-6 flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[.13em] text-white/36">
                    <span>{currentMission.subject.shortName}</span><span>•</span><span>DIA {currentMission.studyDay}</span><span>•</span><span>{currentMission.estimatedMinutes} MIN</span>
                  </div>
                  <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{currentMission.lesson.title}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
                    {currentMission.visual.tagline || `Continue sua sequência em ${currentMission.subject.name}.`}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link href={personalLessonHref(currentMission)} className="tita-primary-button">CONTINUAR ESTUDO <ArrowRight size={16} /></Link>
                    <Link href="/cronograma" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-5 text-[10px] font-black tracking-[.09em] text-white/72 transition hover:bg-white/[.065]">VER CRONOGRAMA <CalendarDays size={15} /></Link>
                  </div>
                </>
              ) : currentWeek ? (
                <>
                  <span className="mt-6 block text-[9px] font-black tracking-[.13em] text-white/36">SEMANA {currentWeek.weekNumber}</span>
                  <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{currentWeek.title}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">{currentWeek.subjects.length} matérias · {fallbackLessons.length} aulas · {fallbackQuestionTotal} questões previstas.</p>
                  <Link href={`/cronograma/semana-${currentWeek.weekNumber}`} className="tita-primary-button mt-8">ABRIR SEMANA {currentWeek.weekNumber} <ArrowRight size={16} /></Link>
                </>
              ) : (
                <>
                  <h2 className="mt-6 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">Sua trilha está pronta para ser configurada.</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">Defina concurso, carga diária e prioridade das matérias para gerar um cronograma individual.</p>
                  <Link href="/onboarding" className="tita-primary-button mt-8">CONFIGURAR TRILHA <ArrowRight size={16} /></Link>
                </>
              )}

              <div className="mt-9 max-w-2xl">
                <div className="flex items-center justify-between gap-3 text-[9px] font-black tracking-[.11em] text-white/38">
                  <span>PROGRESSO DA TRILHA</span><span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.08]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#83888f,#e5e7e9)]" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>

            <aside className="border-t border-white/[.08] bg-white/[.018] p-5 lg:border-l lg:border-t-0 lg:p-6">
              <span className="tita-kicker">RESUMO</span>
              <h3 className="mt-2 font-serif text-3xl">{personal.items.length ? "Plano individual" : currentWeek ? `Semana ${currentWeek.weekNumber}` : "Preparação"}</h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/34">CONCLUÍDAS</span><strong className="mt-1 block font-serif text-2xl">{completed}/{total}</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/34">HOJE</span><strong className="mt-1 block font-serif text-2xl">{personal.items.length ? `${todayItems.length} aulas` : `${currentWeek?.subjects.length ?? 0} matérias`}</strong></div>
                <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><span className="text-[8px] font-black tracking-[.13em] text-white/34">CARGA DIÁRIA</span><strong className="mt-1 block font-serif text-2xl">{personal.dailyStudyMinutes ? `${Math.round(personal.dailyStudyMinutes / 60 * 10) / 10}h` : "—"}</strong></div>
              </div>
            </aside>
          </div>
        </section>

        {(personalSubjects.length || currentWeek?.subjects.length) ? (
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><span className="tita-kicker">MATÉRIAS</span><h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">Sua trilha visual</h2></div>
              <span className="hidden text-[9px] font-bold tracking-[.09em] text-[var(--muted)] sm:inline">A ARTE MUDA COM A MATÉRIA</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personalSubjects.length ? personalSubjects.slice(0, 6).map((subjectItems) => {
                const first = subjectItems[0];
                const done = subjectItems.filter((item) => item.theoryCompleted && item.listCompleted).length;
                const subjectProgress = subjectItems.length ? (done / subjectItems.length) * 100 : 0;
                const next = subjectItems.find((item) => !(item.theoryCompleted && item.listCompleted)) ?? first;
                return <SubjectArtCard key={first.subject.id} href={personalLessonHref(next)} title={first.subject.name} shortName={first.subject.shortName} subtitle={first.visual.tagline} imagePath={first.visual.imagePath} accent={first.visual.accent} progress={subjectProgress} completed={done === subjectItems.length} />;
              }) : currentWeek?.subjects.slice(0, 6).map((subject) => {
                const done = subject.lessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;
                const next = subject.lessons.find((lesson) => !(lesson.theoryCompleted && lesson.listCompleted)) ?? subject.lessons[0];
                if (!next) return null;
                return <SubjectArtCard key={subject.id} href={`/cronograma/semana-${currentWeek.weekNumber}/${subject.slug}/${next.slug}`} title={subject.name} shortName={subject.shortName} imagePath={fallbackImage(subject.slug)} progress={subject.lessons.length ? (done / subject.lessons.length) * 100 : 0} completed={done === subject.lessons.length} />;
              })}
            </div>
          </section>
        ) : null}

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

        {personal.items.length ? (
          <div className="mt-6 flex items-center gap-2 text-[9px] leading-5 text-[var(--muted)]"><Clock3 size={14} className="text-[var(--tita-accent-dim)]" /> Cronograma gerado em blocos estimados; o aluno pode avançar no próprio ritmo sem perder o progresso.</div>
        ) : null}
      </div>
    </PageShell>
  );
}
