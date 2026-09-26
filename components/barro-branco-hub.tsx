"use client";

import {
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createBbActivity,
  deleteBbActivity,
  loadBarroBrancoHub,
  scheduleBbD2Revision,
  toggleBbActivity,
  updateBbActivity,
  type BbActivity,
  type BbHub,
  type BbLesson,
} from "@/lib/barro-branco";

type Tab = "hoje" | "cronograma" | "calendario" | "materias";
type CreateType = "lesson" | "revision" | "leveling" | "task";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function addDays(value: string, days: number) {
  const date = localDate(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(localDate(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(localDate(value));
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function monthCells(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const item = new Date(start);
    item.setDate(start.getDate() + index);
    return item;
  });
}

function typeLabel(item: BbActivity) {
  if (item.activity_type === "lesson") return "AULA";
  if (item.activity_type === "revision") return "REVISÃO";
  if (item.activity_type === "task") return "TAREFA";
  return `N${item.leveling_number ?? 1}`;
}

function typeIcon(item: BbActivity) {
  if (item.activity_type === "lesson") return BookOpenText;
  if (item.activity_type === "revision") return RefreshCcw;
  if (item.activity_type === "task") return ClipboardCheck;
  return GraduationCap;
}

function activityStyle(item: BbActivity, overdue: boolean) {
  if (item.status === "completed") return "border-emerald-400/20 bg-emerald-400/[.055]";
  if (overdue) return "border-red-400/20 bg-red-400/[.055]";
  if (item.activity_type === "lesson") return "border-sky-400/20 bg-sky-400/[.055]";
  if (item.activity_type === "revision") return "border-violet-400/20 bg-violet-400/[.055]";
  if (item.activity_type === "leveling") return "border-fuchsia-400/20 bg-fuchsia-400/[.055]";
  return "border-amber-400/20 bg-amber-400/[.055]";
}

export function BarroBrancoHub() {
  const [hub, setHub] = useState<BbHub | null>(null);
  const [tab, setTab] = useState<Tab>("hoje");
  const [month, setMonth] = useState(() => new Date(2026, 8, 1, 12));
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<BbActivity | null>(null);
  const [d2Lesson, setD2Lesson] = useState<BbLesson | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const today = dateKey(new Date());

  async function refresh() {
    const data = await loadBarroBrancoHub();
    setHub(data);
  }

  function flashSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1300);
  }

  useEffect(() => {
    refresh().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar o Barro Branco."),
    );
  }, []);

  async function toggle(item: BbActivity) {
    if (busy) return;
    const willComplete = item.status !== "completed";
    setBusy(item.id);
    setMessage(null);
    try {
      await toggleBbActivity(item.id, willComplete);
      const linkedLesson = item.lesson_id ? hub?.lessons.find((lesson) => lesson.id === item.lesson_id) ?? null : null;
      const alreadyHasRevision = item.lesson_id
        ? hub?.activities.some(
            (activity) => activity.lesson_id === item.lesson_id && activity.activity_type === "revision",
          )
        : true;
      await refresh();
      flashSaved();
      if (willComplete && item.activity_type === "lesson" && linkedLesson && !alreadyHasRevision) {
        setD2Lesson(linkedLesson);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a conclusão.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: BbActivity) {
    if (item.source === "fenix") return;
    if (!window.confirm(`Excluir "${item.title}"?`)) return;
    setBusy(item.id);
    try {
      await deleteBbActivity(item.id);
      await refresh();
      flashSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a atividade.");
    } finally {
      setBusy(null);
    }
  }

  if (!hub) {
    return (
      <div className="mx-auto grid min-h-[60vh] w-full max-w-[1260px] place-items-center px-4 text-sm text-[var(--muted)]">
        Carregando Barro Branco...
      </div>
    );
  }

  const currentWeek =
    hub.weeks.find((week) => today >= week.starts_on && today <= week.ends_on) ?? hub.weeks[0];
  const currentWeekActivities = currentWeek
    ? hub.activities.filter(
        (item) => item.scheduled_for >= currentWeek.starts_on && item.scheduled_for <= currentWeek.ends_on,
      )
    : [];
  const pendingRevisions = hub.activities.filter(
    (item) => item.activity_type === "revision" && item.status !== "completed",
  ).length;
  const pendingLevelings = hub.activities.filter(
    (item) => item.activity_type === "leveling" && item.status !== "completed",
  ).length;
  const completedLessons = hub.activities.filter(
    (item) => item.activity_type === "lesson" && item.status === "completed",
  ).length;
  const weekCompleted = currentWeekActivities.filter((item) => item.status === "completed").length;
  const weekProgress = currentWeekActivities.length
    ? Math.round((weekCompleted / currentWeekActivities.length) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1260px] px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
      {saved ? (
        <div className="fixed right-4 top-20 z-[140] rounded-xl border border-emerald-400/20 bg-[#0b1511] px-3 py-2 text-[9px] font-black tracking-[.08em] text-emerald-300 shadow-xl">
          ✓ SALVO
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[30px] border border-white/[.08] bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,.14),transparent_38%),#080a0f] p-5 text-white sm:p-7">
        <span className="text-[9px] font-black tracking-[.2em] text-sky-300">MÓDULO INDEPENDENTE</span>
        <h1 className="mt-2 font-serif text-4xl tracking-[-.04em] sm:text-6xl">BARRO BRANCO</h1>
        <p className="mt-2 text-[10px] font-black tracking-[.12em] text-white/42">CFO PMESP — CONTROLE DE ESTUDOS</p>
        <p className="mt-4 max-w-3xl text-[10px] leading-5 text-white/38">
          Cronograma, calendário, revisões, N1–N4 e tarefas em uma área separada do CFO PMAL e do banco de questões.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <Metric title="HOJE" value={hub.activities.filter((item) => item.scheduled_for === today).length} />
          <Metric title="SEMANA ATUAL" value={currentWeek?.week_number ?? 1} />
          <Metric title="AULAS CONCLUÍDAS" value={completedLessons} />
          <Metric title="REVISÕES PENDENTES" value={pendingRevisions} />
          <Metric title="NIVELAMENTOS PENDENTES" value={pendingLevelings} />
          <Metric title="PROGRESSO DA SEMANA" value={`${weekProgress}%`} />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {([
          ["hoje", "HOJE"],
          ["cronograma", "CRONOGRAMA"],
          ["calendario", "CALENDÁRIO"],
          ["materias", "MATÉRIAS"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`min-h-10 rounded-xl border px-4 text-[8px] font-black tracking-[.1em] transition ${
              tab === value
                ? "border-sky-300/30 bg-sky-400/[.10] text-sky-100"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-[8px] font-black tracking-[.1em] text-white shadow-[0_12px_35px_rgba(14,165,233,.2)]"
        >
          <Plus size={14} /> ADICIONAR
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4 text-xs text-amber-300">
          <CircleAlert className="mr-2 inline" size={15} /> {message}
        </div>
      ) : null}

      <div className="mt-5">
        {tab === "hoje" ? (
          <TodayView
            hub={hub}
            today={today}
            onToggle={toggle}
            onEdit={setEdit}
            onDelete={remove}
            busy={busy}
          />
        ) : null}

        {tab === "cronograma" ? (
          <RoadmapView hub={hub} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} />
        ) : null}

        {tab === "calendario" ? (
          <CalendarView
            hub={hub}
            month={month}
            setMonth={setMonth}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onToggle={toggle}
            onEdit={setEdit}
            onDelete={remove}
            busy={busy}
          />
        ) : null}

        {tab === "materias" ? <SubjectsView hub={hub} /> : null}
      </div>

      {addOpen ? (
        <AddActivityModal
          hub={hub}
          defaultDate={tab === "calendario" ? selectedDate : today}
          onClose={() => setAddOpen(false)}
          onSaved={async () => {
            setAddOpen(false);
            await refresh();
            flashSaved();
          }}
        />
      ) : null}

      {edit ? (
        <EditActivityModal
          item={edit}
          onClose={() => setEdit(null)}
          onSaved={async () => {
            setEdit(null);
            await refresh();
            flashSaved();
          }}
        />
      ) : null}

      {d2Lesson ? (
        <D2Modal
          lesson={d2Lesson}
          today={today}
          onClose={() => setD2Lesson(null)}
          onSaved={async () => {
            setD2Lesson(null);
            await refresh();
            flashSaved();
          }}
        />
      ) : null}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-3">
      <span className="text-[7px] font-black tracking-[.12em] text-white/28">{title}</span>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}

function TodayView({
  hub,
  today,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  hub: BbHub;
  today: string;
  onToggle: (item: BbActivity) => void;
  onEdit: (item: BbActivity) => void;
  onDelete: (item: BbActivity) => void;
  busy: string | null;
}) {
  const todayItems = hub.activities.filter((item) => item.scheduled_for === today);
  const overdue = hub.activities.filter(
    (item) => item.status !== "completed" && item.scheduled_for < today,
  );
  const tomorrow = hub.activities.filter((item) => item.scheduled_for === addDays(today, 1));
  const next7 = hub.activities.filter(
    (item) => item.scheduled_for > addDays(today, 1) && item.scheduled_for <= addDays(today, 7),
  );
  const done = todayItems.filter((item) => item.status === "completed").length;

  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <span className="text-[8px] font-black tracking-[.14em] text-sky-400">HOJE — {formatDate(today).toUpperCase()}</span>
        <h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">O que preciso fazer hoje?</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <ActivityGroup title="AULAS DE HOJE" items={todayItems.filter((item) => item.activity_type === "lesson")} today={today} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busy={busy} />
          <ActivityGroup title="REVISÕES DE HOJE" items={todayItems.filter((item) => item.activity_type === "revision")} today={today} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busy={busy} />
          <ActivityGroup title="NIVELAMENTOS DE HOJE" items={todayItems.filter((item) => item.activity_type === "leveling")} today={today} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busy={busy} />
          <ActivityGroup title="TAREFAS DE HOJE" items={todayItems.filter((item) => item.activity_type === "task")} today={today} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busy={busy} />
        </div>
        <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/[.04] p-4 text-center text-[10px] font-black tracking-[.08em] text-[var(--muted)]">
          {done} de {todayItems.length} atividades concluídas hoje
        </div>
      </section>

      {overdue.length ? (
        <section className="rounded-[26px] border border-red-400/18 bg-red-400/[.035] p-4 sm:p-5">
          <span className="text-[8px] font-black tracking-[.14em] text-red-400">PENDÊNCIAS</span>
          <div className="mt-3 grid gap-2 md:grid-cols-2">{overdue.map((item) => <ActivityCard key={item.id} item={item} today={today} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busy={busy} />)}</div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <SimpleFuture title="AMANHÃ" date={addDays(today, 1)} items={tomorrow} />
        <SimpleFuture title="PRÓXIMOS 7 DIAS" items={next7} />
      </section>
    </div>
  );
}

function ActivityGroup(props: {
  title: string;
  items: BbActivity[];
  today: string;
  onToggle: (item: BbActivity) => void;
  onEdit: (item: BbActivity) => void;
  onDelete: (item: BbActivity) => void;
  busy: string | null;
}) {
  return (
    <div>
      <div className="mb-2 text-[8px] font-black tracking-[.12em] text-[var(--muted)]">{props.title}</div>
      <div className="space-y-2">
        {props.items.length ? props.items.map((item) => <ActivityCard key={item.id} item={item} today={props.today} onToggle={props.onToggle} onEdit={props.onEdit} onDelete={props.onDelete} busy={props.busy} />) : <EmptyMini />}
      </div>
    </div>
  );
}

function ActivityCard({
  item,
  today,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  item: BbActivity;
  today: string;
  onToggle: (item: BbActivity) => void;
  onEdit: (item: BbActivity) => void;
  onDelete: (item: BbActivity) => void;
  busy: string | null;
}) {
  const Icon = typeIcon(item);
  const overdue = item.status !== "completed" && item.scheduled_for < today;

  return (
    <article className={`rounded-2xl border p-3 ${activityStyle(item, overdue)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[7px] font-black tracking-[.1em] text-[var(--muted)]">
            <Icon size={11} /> {typeLabel(item)}
            {overdue ? <span className="text-red-400">· PENDENTE</span> : null}
          </span>
          {item.subject_name ? <div className="mt-1 text-[7px] font-black tracking-[.08em] text-[var(--muted)]">{item.subject_name}</div> : null}
          <h4 className="mt-1 text-[11px] font-black text-[var(--ink)]">{item.title}</h4>
          {item.notes ? <p className="mt-1 text-[8px] leading-4 text-[var(--muted)]">{item.notes}</p> : null}
          {overdue ? <p className="mt-1 text-[7px] font-bold text-red-400/80">Previsto originalmente: {shortDate(item.original_scheduled_for)}</p> : null}
        </div>
        {item.status === "completed" ? <Check size={15} className="shrink-0 text-emerald-400" /> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy === item.id}
          onClick={() => onToggle(item)}
          className="min-h-8 rounded-lg border border-white/[.08] px-2.5 text-[7px] font-black text-[var(--ink)] disabled:opacity-40"
        >
          {item.status === "completed" ? "DESMARCAR" : overdue ? "CONCLUIR AGORA" : "CONCLUIR"}
        </button>
        <button type="button" onClick={() => onEdit(item)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-white/[.08] px-2.5 text-[7px] font-black text-[var(--muted)]">
          <Pencil size={9} /> REAGENDAR / EDITAR
        </button>
        {item.source !== "fenix" ? (
          <button type="button" onClick={() => onDelete(item)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-red-400/10 px-2.5 text-[7px] font-black text-red-400/70">
            <Trash2 size={9} /> EXCLUIR
          </button>
        ) : null}
      </div>
    </article>
  );
}

function EmptyMini() {
  return <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[8px] text-[var(--muted)]">Nada previsto.</div>;
}

function SimpleFuture({ title, date, items }: { title: string; date?: string; items: BbActivity[] }) {
  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="text-[8px] font-black tracking-[.13em] text-sky-400">{title}{date ? ` · ${shortDate(date)}` : ""}</span>
      <div className="mt-3 space-y-2">
        {items.length ? items.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--border)] px-3 py-2">
            <span className="text-[7px] font-black text-[var(--muted)]">{shortDate(item.scheduled_for)} · {typeLabel(item)}</span>
            <div className="mt-1 text-[9px] font-bold text-[var(--ink)]">{item.subject_name ? `${item.subject_name} — ` : ""}{item.title}</div>
          </div>
        )) : <EmptyMini />}
      </div>
    </section>
  );
}

function RoadmapView({ hub, selectedWeek, setSelectedWeek }: { hub: BbHub; selectedWeek: number; setSelectedWeek: (value: number) => void }) {
  const pageStart = Math.floor((selectedWeek - 1) / 10) * 10;
  const visibleWeeks = hub.weeks.slice(pageStart, pageStart + 10);
  const week = hub.weeks.find((item) => item.week_number === selectedWeek) ?? hub.weeks[0];
  const lessons = week ? hub.lessons.filter((lesson) => lesson.week_id === week.id) : [];

  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <span className="text-[8px] font-black tracking-[.14em] text-sky-400">CRONOGRAMA FÊNIX</span>
      <h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">O que precisa ser estudado.</h2>
      <div className="mt-5 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {visibleWeeks.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedWeek(item.week_number)}
            className={`rounded-xl border py-2 text-center text-[8px] font-black ${selectedWeek === item.week_number ? "border-sky-300/30 bg-sky-400/[.10] text-sky-400" : "border-[var(--border)] text-[var(--muted)]"}`}
          >
            SEM {item.week_number}
          </button>
        ))}
      </div>

      {week ? (
        <div className="mt-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <span className="text-[8px] font-black text-[var(--muted)]">SEMANA {week.week_number} · {shortDate(week.starts_on)} → {shortDate(week.ends_on)}</span>
            <WeekProgress hub={hub} weekStart={week.starts_on} weekEnd={week.ends_on} />
            <div className="mt-3 grid gap-2">
              {lessons.length ? lessons.map((lesson) => {
                const activity = hub.activities.find((item) => item.lesson_id === lesson.id && item.activity_type === "lesson");
                return (
                  <div key={lesson.id} className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-[7px] font-black tracking-[.1em] text-sky-400">{lesson.subject_name}</div>
                    <div className="mt-1 text-[11px] font-black text-[var(--ink)]">{lesson.title}</div>
                    {lesson.notes ? <p className="mt-1 text-[8px] leading-4 text-[var(--muted)]">{lesson.notes}</p> : null}
                    <span className={`mt-2 inline-flex text-[7px] font-black ${activity?.status === "completed" ? "text-emerald-400" : "text-amber-400"}`}>
                      {activity?.status === "completed" ? "✓ CONCLUÍDO" : `PREVISTO · ${activity ? shortDate(activity.scheduled_for) : "SEM DATA"}`}
                    </span>
                  </div>
                );
              }) : (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-[9px] leading-5 text-[var(--muted)]">
                  Esta semana está estruturada, mas o material enviado ainda não trouxe os nomes reais das aulas desta semana. Nada fictício foi criado.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CalendarView({
  hub,
  month,
  setMonth,
  selectedDate,
  setSelectedDate,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  hub: BbHub;
  month: Date;
  setMonth: (value: Date) => void;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  onToggle: (item: BbActivity) => void;
  onEdit: (item: BbActivity) => void;
  onDelete: (item: BbActivity) => void;
  busy: string | null;
}) {
  const cells = monthCells(month);
  const currentMonth = month.getMonth();
  const selectedItems = hub.activities.filter((item) => item.scheduled_for === selectedDate);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] p-4 sm:p-5">
          <div>
            <span className="text-[8px] font-black tracking-[.13em] text-sky-400">CALENDÁRIO</span>
            <h2 className="mt-1 font-serif text-3xl capitalize text-[var(--ink)]">{monthTitle(month)}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"><ChevronLeft size={15} /></button>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"><ChevronRight size={15} /></button>
          </div>
        </header>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-[var(--border)]">{WEEKDAYS.map((day) => <div key={day} className="py-3 text-center text-[7px] font-black tracking-[.12em] text-[var(--muted)]">{day}</div>)}</div>
            <div className="grid grid-cols-7">
              {cells.map((date) => {
                const key = dateKey(date);
                const items = hub.activities.filter((item) => item.scheduled_for === key);
                const aulas = items.filter((item) => item.activity_type === "lesson").length;
                const revisoes = items.filter((item) => item.activity_type === "revision").length;
                const niveis = items.filter((item) => item.activity_type === "leveling").length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-[115px] border-b border-r border-[var(--border)] p-2 text-left ${date.getMonth() === currentMonth ? "" : "opacity-30"} ${selectedDate === key ? "bg-sky-400/[.055]" : ""}`}
                  >
                    <span className="text-[9px] font-black text-[var(--ink)]">{date.getDate()}</span>
                    <div className="mt-2 space-y-1 text-[7px] font-bold text-[var(--muted)]">
                      {aulas ? <div>{aulas} aula{aulas > 1 ? "s" : ""}</div> : null}
                      {revisoes ? <div>{revisoes} revisão{revisoes > 1 ? "ões" : ""}</div> : null}
                      {niveis ? <div>{niveis} nivelamento{niveis > 1 ? "s" : ""}</div> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <span className="text-[8px] font-black tracking-[.13em] text-sky-400">{formatDate(selectedDate).toUpperCase()}</span>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{selectedItems.length ? selectedItems.map((item) => <ActivityCard key={item.id} item={item} today={dateKey(new Date())} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busy={busy} />) : <EmptyMini />}</div>
      </section>
    </div>
  );
}

function WeekProgress({ hub, weekStart, weekEnd }: { hub: BbHub; weekStart: string; weekEnd: string }) {
  const rows = hub.activities.filter((item) => item.scheduled_for >= weekStart && item.scheduled_for <= weekEnd);
  const groups = [
    ["Aulas", rows.filter((item) => item.activity_type === "lesson")],
    ["Revisões", rows.filter((item) => item.activity_type === "revision")],
    ["N1", rows.filter((item) => item.activity_type === "leveling" && item.leveling_number === 1)],
    ["N2", rows.filter((item) => item.activity_type === "leveling" && item.leveling_number === 2)],
  ] as const;
  const percent = (items: BbActivity[]) => items.length ? Math.round(items.filter((item) => item.status === "completed").length / items.length * 100) : 0;
  const total = percent(rows);
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-5">
      {groups.map(([label,items]) => <ProgressMini key={label} label={label} value={percent(items)} />)}
      <ProgressMini label="Geral" value={total} />
    </div>
  );
}

function ProgressMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-2.5">
      <div className="flex items-center justify-between text-[7px] font-black text-[var(--muted)]"><span>{label}</span><span>{value}%</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-sky-400" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function SubjectsView({ hub }: { hub: BbHub }) {
  const subjects = [...new Set(hub.lessons.map((lesson) => lesson.subject_name))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <span className="text-[8px] font-black tracking-[.14em] text-sky-400">MATÉRIAS</span>
      <h2 className="mt-1 font-serif text-3xl text-[var(--ink)]">Histórico por aula.</h2>
      <div className="mt-5 space-y-5">
        {subjects.map((subject) => (
          <div key={subject}>
            <h3 className="font-serif text-2xl text-[var(--ink)]">{subject}</h3>
            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              {hub.lessons.filter((lesson) => lesson.subject_name === subject).map((lesson) => {
                const items = hub.activities.filter((activity) => activity.lesson_id === lesson.id);
                const lessonAct = items.find((item) => item.activity_type === "lesson");
                const revision = items.find((item) => item.activity_type === "revision");
                return (
                  <article key={lesson.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="text-[11px] font-black text-[var(--ink)]">{lesson.title}</div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                      <StateChip label="Aula" done={lessonAct?.status === "completed"} />
                      <StateChip label="Revisão" done={revision?.status === "completed"} />
                      {[1,2,3,4].map((n) => <StateChip key={n} label={`N${n}`} done={items.some((item) => item.activity_type === "leveling" && item.leveling_number === n && item.status === "completed")} />)}
                    </div>
                    <div className="mt-4 border-t border-[var(--border)] pt-3">
                      <div className="text-[7px] font-black tracking-[.1em] text-[var(--muted)]">HISTÓRICO</div>
                      <div className="mt-2 space-y-1">
                        {items.filter((item) => item.status === "completed").sort((a,b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? "")).map((item) => (
                          <div key={item.id} className="text-[8px] text-[var(--muted)]">{item.completed_at ? shortDate(item.completed_at.slice(0,10)) : shortDate(item.scheduled_for)} — {typeLabel(item)} concluído</div>
                        ))}
                        {!items.some((item) => item.status === "completed") ? <div className="text-[8px] text-[var(--muted)]">Sem conclusão registrada ainda.</div> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StateChip({ label, done }: { label: string; done: boolean }) {
  return <div className={`rounded-lg border px-2 py-2 text-center text-[7px] font-black ${done ? "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-400" : "border-[var(--border)] text-[var(--muted)]"}`}>{label}: {done ? "✓" : "pend."}</div>;
}

function AddActivityModal({ hub, defaultDate, onClose, onSaved }: { hub: BbHub; defaultDate: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [type, setType] = useState<CreateType>("lesson");
  const [date, setDate] = useState(defaultDate);
  const [lessonId, setLessonId] = useState(hub.lessons[0]?.id ?? "");
  const [level, setLevel] = useState(1);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [weekNumber, setWeekNumber] = useState(hub.weeks.find((week) => defaultDate >= week.starts_on && defaultDate <= week.ends_on)?.week_number ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedLessons = useMemo(() => [...hub.lessons].sort((a,b) => a.subject_name.localeCompare(b.subject_name,"pt-BR") || a.title.localeCompare(b.title,"pt-BR")), [hub.lessons]);

  async function save() {
    setSaving(true); setError(null);
    try {
      await createBbActivity({
        type,
        date,
        lessonId: type === "revision" || type === "leveling" ? lessonId : null,
        level: type === "leveling" ? level : null,
        subject,
        title,
        notes,
        weekNumber: type === "lesson" ? weekNumber : null,
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível adicionar.");
    } finally { setSaving(false); }
  }

  return (
    <ModalShell title="+ ADICIONAR" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["lesson","revision","leveling","task"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setType(value)} className={`min-h-12 rounded-xl border text-[8px] font-black tracking-[.08em] ${type === value ? "border-sky-300/30 bg-sky-400/[.10] text-sky-100" : "border-white/10 text-white/45"}`}>{value === "lesson" ? "AULA" : value === "revision" ? "REVISÃO" : value === "leveling" ? "NIVELAMENTO" : "TAREFA"}</button>
        ))}
      </div>
      {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.08] p-3 text-xs text-red-300">{error}</div> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(type === "revision" || type === "leveling") ? (
          <label className="sm:col-span-2"><FieldLabel>AULA</FieldLabel><select value={lessonId} onChange={(e)=>setLessonId(e.target.value)} className={inputClass}>{sortedLessons.map((lesson)=><option key={lesson.id} value={lesson.id}>{lesson.subject_name} — {lesson.title}</option>)}</select></label>
        ) : null}
        {type === "lesson" ? (
          <>
            <label><FieldLabel>MATÉRIA</FieldLabel><input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Ex.: Matemática" className={inputClass}/></label>
            <label><FieldLabel>NOME DA AULA</FieldLabel><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Ex.: Funções" className={inputClass}/></label>
            <label><FieldLabel>SEMANA</FieldLabel><select value={weekNumber} onChange={(e)=>setWeekNumber(Number(e.target.value))} className={inputClass}>{hub.weeks.map((week)=><option key={week.id} value={week.week_number}>Semana {week.week_number}</option>)}</select></label>
          </>
        ) : null}
        {type === "task" ? (
          <>
            <label><FieldLabel>MATÉRIA (OPCIONAL)</FieldLabel><input value={subject} onChange={(e)=>setSubject(e.target.value)} className={inputClass}/></label>
            <label><FieldLabel>TAREFA</FieldLabel><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Ex.: assistir aula extra" className={inputClass}/></label>
          </>
        ) : null}
        {type === "leveling" ? <label><FieldLabel>NÍVEL</FieldLabel><select value={level} onChange={(e)=>setLevel(Number(e.target.value))} className={inputClass}>{[1,2,3,4].map((n)=><option key={n} value={n}>N{n}</option>)}</select></label> : null}
        <label><FieldLabel>DATA</FieldLabel><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className={inputClass}/></label>
        <label className="sm:col-span-2"><FieldLabel>OBSERVAÇÃO</FieldLabel><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={4} className={`${inputClass} min-h-[100px] py-3`} placeholder="Opcional"/></label>
      </div>
      <div className="mt-6 flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-sky-500 px-5 text-[9px] font-black tracking-[.08em] text-white disabled:opacity-50">{saving ? "SALVANDO..." : "ADICIONAR"}</button></div>
    </ModalShell>
  );
}

function EditActivityModal({ item, onClose, onSaved }: { item: BbActivity; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [date, setDate] = useState(item.scheduled_for);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setSaving(true); setError(null);
    try { await updateBbActivity(item.id,date,notes); await onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  return (
    <ModalShell title="EDITAR / REAGENDAR" onClose={onClose}>
      {error ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/[.08] p-3 text-xs text-red-300">{error}</div> : null}
      <div className="text-[8px] font-black tracking-[.08em] text-white/45">{typeLabel(item)} · {item.subject_name}</div>
      <h3 className="mt-1 font-serif text-2xl">{item.title}</h3>
      <div className="mt-5 grid gap-4">
        <label><FieldLabel>DATA</FieldLabel><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className={inputClass}/></label>
        <label><FieldLabel>OBSERVAÇÃO</FieldLabel><textarea rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} className={`${inputClass} min-h-[100px] py-3`}/></label>
      </div>
      <div className="mt-6 flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-sky-500 px-5 text-[9px] font-black text-white">{saving ? "SALVANDO..." : "SALVAR"}</button></div>
    </ModalShell>
  );
}

function D2Modal({ lesson, today, onClose, onSaved }: { lesson: BbLesson; today: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [date, setDate] = useState(addDays(today,2));
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); try { await scheduleBbD2Revision(lesson.id,date); await onSaved(); } finally { setSaving(false); } }
  return (
    <ModalShell title="AGENDAR REVISÃO D+2" onClose={onClose}>
      <p className="text-sm leading-6 text-white/60">Você concluiu <strong className="text-white">{lesson.subject_name} — {lesson.title}</strong>. O sistema sugere a revisão para D+2.</p>
      <label className="mt-5 block"><FieldLabel>DATA DA REVISÃO</FieldLabel><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className={inputClass}/></label>
      <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/10 px-4 text-[9px] font-black text-white/50">AGORA NÃO</button><button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-violet-500 px-5 text-[9px] font-black text-white">{saving ? "SALVANDO..." : "CONFIRMAR"}</button></div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="my-6 w-full max-w-2xl rounded-[28px] border border-sky-400/20 bg-[#0d1016] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><span className="text-[8px] font-black tracking-[.16em] text-sky-300">BARRO BRANCO</span><h2 className="mt-1 font-serif text-3xl">{title}</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55"><X size={17}/></button></div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[8px] font-black tracking-[.13em] text-white/38">{children}</span>;
}

const inputClass = "min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-sky-400/45";
