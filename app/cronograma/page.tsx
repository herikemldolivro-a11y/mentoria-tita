import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, LockKeyhole } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PprnRetaFinalSchedule } from "@/components/pprn-reta-final-schedule";
import { requireAuthenticatedUser } from "@/lib/auth";
import { loadMySchedule } from "@/lib/schedule-server";

export const dynamic = "force-dynamic";

export default async function CronogramaPage() {
  const { focusContest } = await requireAuthenticatedUser();

  if (focusContest?.slug === "pprn") {
    return (
      <PageShell>
        <PprnRetaFinalSchedule />
      </PageShell>
    );
  }

  const weeks = await loadMySchedule();
  const byNumber = new Map(weeks.map((week) => [week.weekNumber, week]));

  const firstIncomplete = weeks.find((week) => {
    const lessons = week.subjects.flatMap((subject) => subject.lessons);
    return lessons.some((lesson) => !lesson.theoryCompleted || !lesson.listCompleted);
  });
  const recommended = firstIncomplete?.weekNumber ?? weeks[0]?.weekNumber ?? 1;

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <section className="overflow-hidden rounded-[30px] border border-[#795cff]/20 bg-[#0b0b12] p-6 text-white shadow-[0_28px_80px_rgba(29,20,70,.24)] sm:p-8">
          <span className="text-[9px] font-black tracking-[.18em] text-[#aa98ff]">CRONOGRAMA · CFO PMAL 2026</span>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-none tracking-[-.04em] sm:text-5xl">Escolha sua semana e siga o bloco recomendado.</h1>
          <p className="mt-4 max-w-2xl text-xs leading-6 text-white/48">Visual mais direto: semana, dia recomendado e aulas do dia. Sem sistema de níveis e sem informação de tempo.</p>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-[8px] font-black tracking-[.16em] text-[#8067ff]">SEMANAS</span>
              <h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">Sua trilha de estudo</h2>
            </div>
            <CalendarDays className="text-[#8067ff]" size={22} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => index + 1).map((weekNumber) => {
              const week = byNumber.get(weekNumber);
              const available = Boolean(week);
              const active = available && weekNumber === recommended;
              const lessons = week?.subjects.flatMap((subject) => subject.lessons) ?? [];
              const completed = lessons.filter((lesson) => lesson.theoryCompleted && lesson.listCompleted).length;

              const card = (
                <div className={`relative min-h-[220px] overflow-hidden rounded-[26px] border p-5 transition-all duration-200 ${active ? "border-[#937bff]/55 bg-[linear-gradient(145deg,#7658ff,#4f34c8)] text-white shadow-[0_22px_60px_rgba(83,55,210,.28)]" : available ? "border-[#6f58d8]/18 bg-[#171525] text-white/88 hover:-translate-y-1 hover:border-[#8067ff]/35" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-60"}`}>
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/[.06] blur-2xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl border text-sm font-black ${active ? "border-white/20 bg-white/10" : "border-white/10 bg-white/[.035]"}`}>{String(weekNumber).padStart(2, "0")}</span>
                    {active ? <span className="rounded-full bg-white/12 px-2.5 py-1 text-[7px] font-black tracking-[.1em]">RECOMENDADA</span> : available ? <CheckCircle2 size={17} className="text-white/28" /> : <LockKeyhole size={16} />}
                  </div>
                  <div className="relative mt-7">
                    <span className="text-[8px] font-black tracking-[.14em] opacity-55">MÓDULO {String(weekNumber).padStart(2, "0")}</span>
                    <h3 className="mt-1 font-serif text-2xl">{week?.title ?? `Semana ${weekNumber}`}</h3>
                    <p className="mt-3 text-[10px] leading-5 opacity-55">{available ? `${lessons.length} aulas cadastradas · ${completed} concluídas` : "Conteúdo ainda não liberado"}</p>
                  </div>
                  {available ? <span className="relative mt-6 inline-flex items-center gap-2 text-[9px] font-black tracking-[.08em]">ABRIR SEMANA <ArrowRight size={14} /></span> : null}
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
