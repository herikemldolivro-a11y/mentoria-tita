import { ArrowRight, CheckCircle2, ClipboardList, Crown, Settings2 } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";
import { PageShell } from "@/components/page-shell";
import { PmalPerformanceReport } from "@/components/pmal-performance-report";
import { UpcomingRevisions } from "@/components/upcoming-revisions";
import { XpCommandCenter } from "@/components/xp-command-center";
import { dashboardNavigationItems } from "@/lib/navigation";
import { personalLessonHref, type PersonalScheduleItem } from "@/lib/personal-schedule-server";

const PMAL_DAY_ONE = "2026-09-16";

function todayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function visualDayFromDate(value: string | null) {
  if (!value || value < PMAL_DAY_ONE) return null;
  const diff = Math.round(
    (utcDate(value).getTime() - utcDate(PMAL_DAY_ONE).getTime()) / 86_400_000,
  );
  return diff + 1;
}

function displayDay(item: PersonalScheduleItem, contestSlug: string | null) {
  if (contestSlug === "cfo-pmal") {
    return visualDayFromDate(item.scheduledFor)
      ?? (item.studyDay && item.studyDay > 0 ? item.studyDay : null);
  }
  return item.studyDay && item.studyDay > 0 ? item.studyDay : null;
}

function directHref(item: PersonalScheduleItem, contestSlug: string | null) {
  return contestSlug === "cfo-pmal"
    ? `/cronograma/pmal/aula/${item.lesson.id}`
    : personalLessonHref(item);
}

function formatDate(value: string | null) {
  if (!value) return "SEM DATA";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(year, month - 1, day));
}

function scheduleSort(a: PersonalScheduleItem, b: PersonalScheduleItem) {
  const aDate = a.scheduledFor ?? "9999-12-31";
  const bDate = b.scheduledFor ?? "9999-12-31";
  const byDate = aDate.localeCompare(bDate);
  return byDate !== 0 ? byDate : a.position - b.position;
}

export function PmalHomeExperience({
  displayName,
  isAdmin,
  items,
  contestSlug,
  contestSigla,
}: {
  displayName: string;
  isAdmin: boolean;
  items: PersonalScheduleItem[];
  contestSlug: string | null;
  contestSigla: string | null;
}) {
  const today = todayInBrazil();

  // IMPORTANTE:
  // a Home NÃO cria uma sequência própria.
  // Ela usa a MESMA fonte e a MESMA ordenação do cronograma padrão.
  const ordered = [...items].sort(scheduleSort);

  // O cronograma visual atual foi reiniciado em 16/09/2026 = DIA 1.
  // Itens anteriores continuam existindo no histórico, mas não comandam o "próximo passo".
  const currentPlan = contestSlug === "cfo-pmal"
    ? ordered.filter((item) => !item.scheduledFor || item.scheduledFor >= PMAL_DAY_ONE)
    : ordered;

  const pending = currentPlan.filter(
    (item) => !(item.theoryCompleted && item.listCompleted),
  );

  // 1) primeiro: o que falta HOJE no cronograma;
  // 2) depois: a próxima aula futura exatamente na ordem configurada;
  // 3) fallback: primeiro pendente da faixa atual.
  const current =
    currentPlan.find(
      (item) =>
        item.scheduledFor === today &&
        !(item.theoryCompleted && item.listCompleted),
    )
    ?? currentPlan.find(
      (item) =>
        Boolean(item.scheduledFor) &&
        item.scheduledFor! > today &&
        !(item.theoryCompleted && item.listCompleted),
    )
    ?? pending[0]
    ?? currentPlan.at(-1)
    ?? ordered.at(-1)
    ?? null;

  const currentIndex = current
    ? currentPlan.findIndex((item) => item.id === current.id)
    : -1;

  // Exibe exatamente os próximos itens do cronograma padrão, sem reordenar por matéria.
  const queue =
    currentIndex >= 0
      ? currentPlan.slice(currentIndex, currentIndex + 4)
      : currentPlan.slice(0, 4);

  const completed = currentPlan.filter(
    (item) => item.theoryCompleted && item.listCompleted,
  ).length;
  const progress = currentPlan.length
    ? Math.round((completed / currentPlan.length) * 100)
    : 0;

  return (
    <PageShell>
      <div data-mt-home-unified-v54="1" className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <PmalPerformanceReport />

        <div className="mt-7">
          <XpCommandCenter />
        </div>

        <section className="relative mt-7 overflow-hidden rounded-[30px] border border-white/[.09] bg-[#07080a] p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,.34)] sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-violet-500/[.11] blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-blue-500/[.07] blur-[90px]" />

          <div className="relative flex flex-col gap-4 border-b border-white/[.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[8px] font-black tracking-[.17em] text-violet-300">
                <Crown size={13} /> PRÓXIMO PASSO · ESPELHO DO CRONOGRAMA
              </span>
              <h2 className="mt-2 font-serif text-3xl tracking-[-.035em] sm:text-4xl">
                Continue exatamente de onde o plano mandou.
              </h2>
              <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/38">
                {contestSlug === "cfo-pmal"
                  ? "Esta área não possui mais ordem própria. Ela apenas recorta o cronograma padrão já configurado, respeitando data, posição e o Dia 1 visual iniciado em 16/09."
                  : `A mesma Home do CFO PMAL agora é usada em ${contestSigla ?? "seu concurso"}. O conteúdo abaixo segue o cronograma, o progresso e as matérias do foco selecionado.`}
              </p>
            </div>

            <div className="min-w-[190px]">
              <div className="flex items-center justify-between text-[7px] font-black tracking-[.1em] text-white/32">
                <span>{completed}/{currentPlan.length} AULAS</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#a855f7,#d8b4fe)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {current ? (
            <div className="relative mt-6 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
              <Link
                href={directHref(current, contestSlug)}
                className={`group relative overflow-hidden rounded-[28px] border p-6 transition hover:-translate-y-0.5 sm:p-7 ${
                  current.theoryCompleted && current.listCompleted
                    ? "border-emerald-300/20 bg-[linear-gradient(145deg,rgba(16,185,129,.10),rgba(255,255,255,.015))]"
                    : "border-violet-300/22 bg-[radial-gradient(circle_at_0%_0%,rgba(124,58,237,.22),transparent_35%),rgba(255,255,255,.018)] hover:border-violet-200/38"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-[8px] font-black tracking-[.12em]">
                  <span className="rounded-full border border-white/[.09] bg-black/20 px-2.5 py-1 text-white/58">
                    {current.subject.shortName}
                  </span>
                  <span className="text-white/30">DIA {displayDay(current, contestSlug) ?? "—"}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-white/30">{formatDate(current.scheduledFor)}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-white/30">{current.estimatedMinutes} MIN</span>
                </div>

                <span className="mt-6 block text-[8px] font-black tracking-[.15em] text-violet-300">
                  AULA ATUAL DO CRONOGRAMA
                </span>

                <h3 className="mt-2 max-w-3xl font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">
                  {current.lesson.title}
                </h3>

                <p className="mt-4 max-w-2xl text-xs leading-6 text-white/40">
                  {current.visual.tagline || current.subject.name}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-500 px-5 text-[9px] font-black tracking-[.1em] text-white transition group-hover:bg-violet-400">
                    ABRIR AULA DIRETAMENTE <ArrowRight size={15} />
                  </span>

                  {current.theoryCompleted && current.listCompleted ? (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.05] px-4 py-3 text-[8px] font-black text-emerald-300">
                      <CheckCircle2 size={14} /> AULA + LISTA CONCLUÍDAS
                    </span>
                  ) : null}
                </div>
              </Link>

              <div className="grid gap-3">
                <div className="rounded-[24px] border border-white/[.07] bg-white/[.018] p-5">
                  <span className="text-[8px] font-black tracking-[.14em] text-white/35">
                    NA SEQUÊNCIA DO CRONOGRAMA
                  </span>

                  <div className="mt-3 grid gap-2">
                    {queue.slice(1).map((item) => (
                      <Link
                        key={item.id}
                        href={directHref(item, contestSlug)}
                        className="group rounded-2xl border border-white/[.07] bg-black/10 p-4 transition hover:border-violet-300/20 hover:bg-violet-300/[.035]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[7px] font-black tracking-[.12em] text-white/30">
                              {item.subject.shortName} · DIA {displayDay(item, contestSlug) ?? "—"} · {formatDate(item.scheduledFor)}
                            </span>
                            <strong className="mt-1 block text-sm leading-5 text-white/82">
                              {item.lesson.title}
                            </strong>
                          </div>
                          <ArrowRight
                            size={14}
                            className="mt-1 shrink-0 text-violet-300/70 transition group-hover:translate-x-1"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  href="/cronograma"
                  className="inline-flex min-h-12 items-center justify-between rounded-2xl border border-white/[.08] bg-white/[.018] px-4 text-[8px] font-black tracking-[.1em] text-white/50 transition hover:border-white/[.15] hover:text-white/75"
                >
                  VER O MESMO PLANO COMPLETO <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative mt-6 rounded-2xl border border-dashed border-white/[.08] p-8 text-center text-xs text-white/35">
              Nenhuma aula disponível no plano.
            </div>
          )}
        </section>

        {ordered.length ? (
          <div className="mt-7">
            <UpcomingRevisions />
          </div>
        ) : null}

        {isAdmin ? (
          <section className="mt-7 rounded-[24px] border border-white/[.08] bg-white/[.018] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.1] bg-white/[.035] text-amber-300">
                  <Settings2 size={19} />
                </span>
                <div>
                  <span className="text-[8px] font-black tracking-[.15em] text-amber-300">
                    ÁREA ADMINISTRATIVA
                  </span>
                  <h2 className="mt-1 font-serif text-2xl text-white">Central administrativa</h2>
                  <p className="mt-1 text-xs leading-6 text-white/35">
                    Gerencie alunos, cronogramas, materiais e questões.
                  </p>
                </div>
              </div>
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-300 px-4 text-[9px] font-black tracking-[.1em] text-[#161006]"
              >
                ABRIR ADMIN <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="pmal-quick-links">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-violet-300" />
            <h2 id="pmal-quick-links" className="font-serif text-2xl text-[var(--ink)]">
              Atalhos da plataforma
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dashboardNavigationItems.slice(0, 6).map((item, index) => (
              <DashboardCard key={item.href} item={item} index={index} />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

