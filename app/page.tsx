import { ArrowRight, ClipboardList, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";
import { PageShell } from "@/components/page-shell";
import { UpcomingRevisions } from "@/components/upcoming-revisions";
import { dashboardNavigationItems } from "@/lib/navigation";
import { requireAuthenticatedUser } from "@/lib/auth";
import { QuestionPerformanceDashboard } from "@/components/question-performance-dashboard";
import { loadMySchedule, type ScheduleWeek } from "@/lib/schedule-server";
import { XpCommandCenter } from "@/components/xp-command-center";

function formatPeriod(start: string | null, end: string | null) {
  if (!start || !end) return null;
  return `${start.split("-").reverse().join("/")} a ${end.split("-").reverse().join("/")}`;
}

function chooseCurrentWeek(weeks: ScheduleWeek[]) {
  if (!weeks.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  return weeks.find((week) => week.startsOn && week.endsOn && week.startsOn <= today && today <= week.endsOn)
    ?? weeks.find((week) => week.subjects.some((subject) => subject.lessons.some((lesson) => !(lesson.theoryCompleted && lesson.listCompleted))))
    ?? weeks[0];
}

export default async function Home() {
  const { focusContest, isAdmin } = await requireAuthenticatedUser();
  let weeks: ScheduleWeek[] = [];
  try {
    weeks = await loadMySchedule();
  } catch {
    weeks = [];
  }

  const currentWeek = chooseCurrentWeek(weeks);
  const lessons = currentWeek?.subjects.flatMap((subject) => subject.lessons) ?? [];
  const completed = lessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;
  const questionTotal = lessons.reduce((sum, lesson) => sum + lesson.questionCount, 0);
  const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  const period = currentWeek ? formatPeriod(currentWeek.startsOn, currentWeek.endsOn) : null;

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <XpCommandCenter />
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[9px] font-black tracking-[0.22em] text-[#8f73ff]">CENTRAL DO ALUNO</span>
            <h1 className="mt-1 font-serif text-3xl tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">Sua missão de hoje.</h1>
          </div>
          <p className="max-w-md text-xs leading-6 text-[var(--muted)] sm:text-right">Seu painel acompanha o concurso e o cronograma atribuídos à sua conta.</p>
        </div>

        <QuestionPerformanceDashboard />
<section className="overflow-hidden rounded-[26px]] text-white shadow-[0_24px_70px_rgba(0,0,0,.24)]">
          <div className="grid lg:grid-cols-[1fr_310px]">
            <div className="relative min-h-[320px] overflow-hidden p-6 sm:p-8 lg:p-9">
              {focusContest?.slug === "cfo-pmal" ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/cfo-pmal-hero.png')" }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,10,.96)_0%,rgba(7,8,10,.82)_45%,rgba(7,8,10,.48)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090a0c]/90 via-transparent to-[#090a0c]/25" />
                </>
              ) : null}
              <div className="pointer-events-none absolute -right-12 -top-16 text-[13rem] font-black leading-none text-white/[0.025] sm:text-[18rem]">95+</div>
              <div className="relative z-10 flex h-full flex-col justify-between gap-10">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#8067ff]/25 bg-[#8067ff]/10 px-3 py-1.5 text-[9px] font-black tracking-[0.16em] text-[#b8a8ff]"><ShieldCheck size={14} /> MISSÃO ATUAL</span>
                  <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{currentWeek ? currentWeek.title : "Cronograma em preparação"}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52">
                    {currentWeek
                      ? `${period ? `${period} · ` : ""}${currentWeek.subjects.length} matérias, ${lessons.length} aulas-mãe e ${questionTotal} questões principais previstas.`
                      : `Ainda não há uma semana ativa no plano ${focusContest?.slug ? focusContest.slug.toUpperCase() : "selecionado"}.`}
                  </p>
                </div>

                {currentWeek ? (
                  <div className="space-y-4">
                    <div className="h-2 max-w-2xl overflow-hidden rounded-full bg-white/10"><span className="block h-full bg-[#8067ff]" style={{ width: `${progress}%` }} /></div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/cronograma/semana-${currentWeek.weekNumber}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#8067ff] px-5 text-xs font-black tracking-[0.1em] text-[#111]">ABRIR SEMANA {currentWeek.weekNumber} <ArrowRight size={17} /></Link>
                      <span className="text-[10px] font-black tracking-[.1em] text-white/45">{completed}/{lessons.length} AULAS CONCLUÍDAS</span>
                    </div>
                  </div>
                ) : (
                  <Link href="/cronograma" className="inline-flex w-fit min-h-12 items-center gap-2 rounded-xl bg-[#8067ff] px-5 text-xs font-black tracking-[0.1em] text-[#111]">ABRIR CRONOGRAMA <ArrowRight size={17} /></Link>
                )}
              </div>
            </div>

            <aside className="border-t border-white/10 bg-white/[0.025] p-5 lg:border-l lg:border-t-0 lg:p-6">
              <span className="text-[9px] font-black tracking-[0.18em] text-[#a996ff]">RESUMO DA SEMANA</span>
              <h3 className="mt-2 font-serif text-3xl">{currentWeek ? `Semana ${currentWeek.weekNumber}` : "Sem semana ativa"}</h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="text-[9px] font-black tracking-[.13em] text-white/40">AULAS-MÃE</span><strong className="mt-1 block font-serif text-2xl">{lessons.length}</strong></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="text-[9px] font-black tracking-[.13em] text-white/40">MATÉRIAS</span><strong className="mt-1 block font-serif text-2xl">{currentWeek?.subjects.length ?? 0}</strong></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="text-[9px] font-black tracking-[.13em] text-white/40">QUESTÕES PREVISTAS</span><strong className="mt-1 block font-serif text-2xl">{questionTotal}</strong></div>
              </div>
            </aside>
          </div>
        </section>

        {currentWeek ? <div className="mt-7"><UpcomingRevisions /></div> : null}

        {isAdmin ? (
          <section className="mt-8 rounded-[24px] border border-[var(--border-strong)] bg-[color-mix(in_srgb,#795cff_5%,var(--surface))] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] text-[#8f73ff]"><Settings2 size={19} /></span>
                <div>
                  <span className="text-[9px] font-black tracking-[.16em] text-[#8f73ff]">ÁREA ADMINISTRATIVA</span>
                  <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">Central administrativa</h2>
                  <p className="mt-1 text-xs leading-6 text-[var(--muted)]">Gerencie alunos, cronogramas, semanas, PDFs, questões e nivelamentos.</p>
                </div>
              </div>
              <Link href="/admin" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#795cff] px-4 text-[10px] font-black tracking-[.1em] text-[#111] transition hover:bg-[#8f73ff]">ABRIR ADMIN <ArrowRight size={15} /></Link>
            </div>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="quick-links-title">
          <div className="mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-[#8f73ff]" /><h2 id="quick-links-title" className="font-serif text-2xl text-[var(--ink)]">Atalhos da plataforma</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{dashboardNavigationItems.map((item, index) => <DashboardCard key={item.href} item={item} index={index} />)}</div>
        </section>
      </div>
    </PageShell>
  );
}
