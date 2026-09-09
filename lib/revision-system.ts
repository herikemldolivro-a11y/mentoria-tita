export type RevisionStatus = "scheduled" | "completed";

export type LevelingAttempt = {
  round: number;
  score: number;
  completedAt: string;
};

export type RevisionEvent = {
  id: string;
  subjectSlug: string;
  subjectName: string;
  lessonSlug: string;
  lessonTitle: string;
  revisionNumber: number;
  date: string;
  status: RevisionStatus;
  createdAt: string;
  completedAt?: string;
  rereadConfirmed?: boolean;
  studyMode?: "platform-pdf" | "external-course" | null;
  levelingRound?: number;
  levelingAttempts?: LevelingAttempt[];
};

export type RevisionDraft = {
  id: string;
  subjectSlug: RevisionEvent["subjectSlug"];
  subjectName: string;
  lessonSlug: string;
  lessonTitle: string;
  revisionNumber: number;
  recommendedDate: string;
  createdAt: string;
};

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToDateKey(base: string | Date, days: number) {
  const date = typeof base === "string" ? parseDateKey(base) : new Date(base);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatDatePtBr(value: string) {
  const date = parseDateKey(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatShortDatePtBr(value: string) {
  const date = parseDateKey(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function isRevisionDue(event: RevisionEvent) {
  return event.status !== "completed" && event.date <= todayKey();
}
