"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  LevelingAttempt,
  RevisionDraft,
  RevisionEvent,
} from "@/lib/revision-system";

export type LessonStudyMode = "platform-pdf" | "external-video" | null;

export type LessonProgressState = {
  theoryStarted: boolean;
  theoryCompleted: boolean;
  listStarted: boolean;
  listCompleted: boolean;
  studyMode: LessonStudyMode;
};

export type SubjectProgressSummary = {
  started: boolean;
  completedLessons: number;
  totalLessons: number;
  completedSteps: number;
  totalSteps: number;
  percent: number;
};

export type WeekProgressSummary = {
  started: boolean;
  completedLessons: number;
  totalLessons: number;
  completedSteps: number;
  totalSteps: number;
  percent: number;
};

type DbContext = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  activePlanId: string;
};

type CatalogLesson = {
  plan_id: string;
  week_id: string;
  week_number: number;
  subject_id: string;
  subject_slug: string;
  subject_short_name: string;
  subject_name: string;
  lesson_id: string;
  lesson_slug: string;
  lesson_title: string;
  lesson_position: number;
  question_count: number;
};

type DbLessonProgressRow = {
  lesson_id?: string;
  theory_started_at?: string | null;
  theory_completed_at?: string | null;
  theory_mode?: LessonStudyMode;
  list_started_at?: string | null;
  list_completed_at?: string | null;
};

type DbLevelingAttemptRow = {
  round: number;
  score: number;
  completed_at: string;
};

type DbRevisionRow = {
  id: string;
  subject_slug: RevisionEvent["subjectSlug"];
  subject_name: string;
  lesson_slug: string;
  lesson_title: string;
  revision_number: number;
  scheduled_for: string | null;
  recommended_for: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  reread_confirmed_at: string | null;
  study_mode: RevisionEvent["studyMode"];
};

const STUDY_UPDATED_EVENT = "mentoria-tita:study-updated";

export function notifyStudyUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STUDY_UPDATED_EVENT));
  }
}

export function listenStudyUpdated(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(STUDY_UPDATED_EVENT, listener);
  return () => window.removeEventListener(STUDY_UPDATED_EVENT, listener);
}

async function getContext(): Promise<DbContext> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) throw new Error("Usuário não autenticado.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_study_plan_id,focus_contest_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  let activePlanId = profile?.active_study_plan_id as string | null | undefined;

  if (!activePlanId && profile?.focus_contest_id) {
    const { data: defaultPlan, error: planError } = await supabase
      .from("study_plans")
      .select("id")
      .eq("contest_id", profile.focus_contest_id)
      .eq("is_default", true)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    activePlanId = defaultPlan?.id as string | undefined;
  }

  if (!activePlanId) {
    throw new Error("Nenhum cronograma ativo foi atribuído a este usuário.");
  }

  return { supabase, userId: user.id, activePlanId };
}

async function resolveWeek(context: DbContext, weekNumber = 1) {
  const { data, error } = await context.supabase
    .from("study_weeks")
    .select("id")
    .eq("plan_id", context.activePlanId)
    .eq("week_number", weekNumber)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`Semana ${weekNumber} não encontrada no cronograma ativo.`);
  return data.id as string;
}

async function resolveSubject(context: DbContext, subjectSlug: string) {
  const { data, error } = await context.supabase
    .from("study_subjects")
    .select("id")
    .eq("plan_id", context.activePlanId)
    .eq("slug", subjectSlug)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Matéria não encontrada no cronograma ativo.");
  return data.id as string;
}

async function resolveLesson(
  context: DbContext,
  subjectSlug: string,
  lessonSlug: string,
  weekNumber = 1,
): Promise<CatalogLesson> {
  const { data, error } = await context.supabase
    .from("study_lesson_catalog")
    .select(
      "plan_id,week_id,week_number,subject_id,subject_slug,subject_short_name,subject_name,lesson_id,lesson_slug,lesson_title,lesson_position,question_count",
    )
    .eq("plan_id", context.activePlanId)
    .eq("week_number", weekNumber)
    .eq("subject_slug", subjectSlug)
    .eq("lesson_slug", lessonSlug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Aula não encontrada no cronograma ativo.");
  return data as CatalogLesson;
}

function stateFromRow(row?: DbLessonProgressRow | null): LessonProgressState {
  return {
    theoryStarted: Boolean(row?.theory_started_at),
    theoryCompleted: Boolean(row?.theory_completed_at),
    listStarted: Boolean(row?.list_started_at),
    listCompleted: Boolean(row?.list_completed_at),
    studyMode: (row?.theory_mode as LessonStudyMode) ?? null,
  };
}

export async function startWeek(weekNumber = 1) {
  const context = await getContext();
  const weekId = await resolveWeek(context, weekNumber);
  const { error } = await context.supabase.from("user_week_progress").upsert(
    {
      user_id: context.userId,
      week_id: weekId,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function startSubject(subjectSlug: string) {
  const context = await getContext();
  const subjectId = await resolveSubject(context, subjectSlug);
  const { error } = await context.supabase.from("user_subject_progress").upsert(
    {
      user_id: context.userId,
      subject_id: subjectId,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,subject_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function loadLessonProgress(
  subjectSlug: string,
  lessonSlug: string,
): Promise<LessonProgressState> {
  const context = await getContext();
  const lesson = await resolveLesson(context, subjectSlug, lessonSlug);
  const { data, error } = await context.supabase
    .from("user_lesson_progress")
    .select(
      "theory_started_at,theory_completed_at,theory_mode,list_started_at,list_completed_at",
    )
    .eq("user_id", context.userId)
    .eq("lesson_id", lesson.lesson_id)
    .maybeSingle();
  if (error) throw error;
  return stateFromRow(data);
}

export async function saveLessonProgress(
  subjectSlug: string,
  lessonSlug: string,
  state: LessonProgressState,
) {
  const context = await getContext();
  const lesson = await resolveLesson(context, subjectSlug, lessonSlug);
  const { error } = await context.supabase.rpc("save_lesson_progress", {
    p_lesson_id: lesson.lesson_id,
    p_theory_started: state.theoryStarted,
    p_theory_completed: state.theoryCompleted,
    p_theory_mode: state.studyMode,
    p_list_started: state.listStarted,
    p_list_completed: state.listCompleted,
  });
  if (error) throw error;
  notifyStudyUpdated();
}

export async function loadSubjectLessonStates(subjectSlug: string) {
  const context = await getContext();
  const { data: lessons, error: lessonsError } = await context.supabase
    .from("study_lesson_catalog")
    .select("lesson_id,lesson_slug,lesson_position")
    .eq("plan_id", context.activePlanId)
    .eq("week_number", 1)
    .eq("subject_slug", subjectSlug)
    .order("lesson_position", { ascending: true });
  if (lessonsError) throw lessonsError;

  const lessonRows = (lessons ?? []) as Array<{
    lesson_id: string;
    lesson_slug: string;
    lesson_position: number;
  }>;
  const ids = lessonRows.map((lesson) => lesson.lesson_id);
  if (ids.length === 0) return {} as Record<string, LessonProgressState>;

  const { data: progressRows, error: progressError } = await context.supabase
    .from("user_lesson_progress")
    .select(
      "lesson_id,theory_started_at,theory_completed_at,theory_mode,list_started_at,list_completed_at",
    )
    .eq("user_id", context.userId)
    .in("lesson_id", ids);
  if (progressError) throw progressError;

  const progressById = new Map<string, DbLessonProgressRow>();
  ((progressRows ?? []) as DbLessonProgressRow[]).forEach((row) => {
    if (row.lesson_id) progressById.set(row.lesson_id, row);
  });

  return Object.fromEntries(
    lessonRows.map((lesson) => [lesson.lesson_slug, stateFromRow(progressById.get(lesson.lesson_id))]),
  ) as Record<string, LessonProgressState>;
}

async function buildProgressSummary(subjectSlug?: string): Promise<SubjectProgressSummary | WeekProgressSummary> {
  const context = await getContext();
  let query = context.supabase
    .from("study_lesson_catalog")
    .select("lesson_id,subject_slug")
    .eq("plan_id", context.activePlanId)
    .eq("week_number", 1);

  if (subjectSlug) query = query.eq("subject_slug", subjectSlug);
  const { data: lessons, error: lessonError } = await query;
  if (lessonError) throw lessonError;

  const ids = ((lessons ?? []) as Array<{ lesson_id: string }>).map((row) => row.lesson_id);
  if (ids.length === 0) {
    return { started: false, completedLessons: 0, totalLessons: 0, completedSteps: 0, totalSteps: 0, percent: 0 };
  }

  const { data: progressRows, error: progressError } = await context.supabase
    .from("user_lesson_progress")
    .select("lesson_id,theory_started_at,theory_completed_at,list_started_at,list_completed_at")
    .eq("user_id", context.userId)
    .in("lesson_id", ids);
  if (progressError) throw progressError;

  const rows = (progressRows ?? []) as DbLessonProgressRow[];
  const completedLessons = rows.filter((row) => row.theory_completed_at && row.list_completed_at).length;
  const completedSteps = rows.reduce(
    (total, row) => total + Number(Boolean(row.theory_completed_at)) + Number(Boolean(row.list_completed_at)),
    0,
  );
  const totalSteps = ids.length * 2;
  const percent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const started = rows.some((row) => row.theory_started_at || row.list_started_at);

  return {
    started,
    completedLessons,
    totalLessons: ids.length,
    completedSteps,
    totalSteps,
    percent,
  };
}

export async function loadSubjectProgressSummary(subjectSlug: string): Promise<SubjectProgressSummary> {
  const context = await getContext();
  const subjectId = await resolveSubject(context, subjectSlug);
  const { data: subjectProgress } = await context.supabase
    .from("user_subject_progress")
    .select("started_at")
    .eq("user_id", context.userId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  const summary = (await buildProgressSummary(subjectSlug)) as SubjectProgressSummary;
  return { ...summary, started: Boolean(subjectProgress?.started_at) || summary.started };
}

export async function loadWeekProgressSummary(): Promise<WeekProgressSummary> {
  const context = await getContext();
  const weekId = await resolveWeek(context, 1);
  const { data: weekProgress } = await context.supabase
    .from("user_week_progress")
    .select("started_at")
    .eq("user_id", context.userId)
    .eq("week_id", weekId)
    .maybeSingle();
  const summary = (await buildProgressSummary()) as WeekProgressSummary;
  return { ...summary, started: Boolean(weekProgress?.started_at) || summary.started };
}

function mapAttempt(row: DbLevelingAttemptRow): LevelingAttempt {
  return {
    round: Number(row.round),
    score: Number(row.score),
    completedAt: row.completed_at,
  };
}

function mapRevision(row: DbRevisionRow, attempts: LevelingAttempt[] = []): RevisionEvent {
  return {
    id: row.id,
    subjectSlug: row.subject_slug,
    subjectName: row.subject_name,
    lessonSlug: row.lesson_slug,
    lessonTitle: row.lesson_title,
    revisionNumber: Number(row.revision_number),
    date: row.scheduled_for ?? row.recommended_for,
    status: row.status === "completed" ? "completed" : "scheduled",
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    rereadConfirmed: Boolean(row.reread_confirmed_at),
    studyMode: row.study_mode ?? null,
    levelingRound: attempts.length + 1,
    levelingAttempts: attempts,
  };
}

function mapDraft(row: DbRevisionRow): RevisionDraft {
  return {
    id: row.id,
    subjectSlug: row.subject_slug,
    subjectName: row.subject_name,
    lessonSlug: row.lesson_slug,
    lessonTitle: row.lesson_title,
    revisionNumber: Number(row.revision_number),
    recommendedDate: row.recommended_for,
    createdAt: row.created_at,
  };
}

export async function loadRevisionEvents(): Promise<RevisionEvent[]> {
  const context = await getContext();
  const { data, error } = await context.supabase
    .from("user_revisions")
    .select("*")
    .eq("user_id", context.userId)
    .in("status", ["scheduled", "completed"])
    .order("scheduled_for", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as DbRevisionRow[]).map((row) => mapRevision(row));
}

export async function loadRevisionDrafts(): Promise<RevisionDraft[]> {
  const context = await getContext();
  const { data, error } = await context.supabase
    .from("user_revisions")
    .select("*")
    .eq("user_id", context.userId)
    .eq("status", "draft")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbRevisionRow[]).map(mapDraft);
}

export async function loadLessonRevision(
  subjectSlug: string,
  lessonSlug: string,
  revisionNumber: number,
): Promise<RevisionEvent | null> {
  const context = await getContext();
  const { data, error } = await context.supabase
    .from("user_revisions")
    .select("*")
    .eq("user_id", context.userId)
    .eq("subject_slug", subjectSlug)
    .eq("lesson_slug", lessonSlug)
    .eq("revision_number", revisionNumber)
    .neq("status", "draft")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRevision(data as DbRevisionRow);
}

export async function queueRevisionDraft(input: {
  subjectSlug: RevisionDraft["subjectSlug"];
  subjectName: string;
  lessonSlug: string;
  lessonTitle: string;
  revisionNumber: number;
  recommendedDate: string;
}) {
  const context = await getContext();
  const lesson = await resolveLesson(context, input.subjectSlug, input.lessonSlug);

  const { data: existing, error: existingError } = await context.supabase
    .from("user_revisions")
    .select("*")
    .eq("user_id", context.userId)
    .eq("lesson_id", lesson.lesson_id)
    .eq("revision_number", input.revisionNumber)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (existing.status === "draft") {
      const { data, error } = await context.supabase
        .from("user_revisions")
        .update({ recommended_for: input.recommendedDate, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", context.userId)
        .select("*")
        .single();
      if (error) throw error;
      notifyStudyUpdated();
      return mapDraft(data as DbRevisionRow);
    }
    return mapDraft({ ...existing, recommended_for: existing.recommended_for ?? input.recommendedDate } as DbRevisionRow);
  }

  const { data, error } = await context.supabase
    .from("user_revisions")
    .insert({
      user_id: context.userId,
      lesson_id: lesson.lesson_id,
      subject_slug: input.subjectSlug,
      subject_name: input.subjectName,
      lesson_slug: input.lessonSlug,
      lesson_title: input.lessonTitle,
      revision_number: input.revisionNumber,
      recommended_for: input.recommendedDate,
      scheduled_for: null,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  notifyStudyUpdated();
  return mapDraft(data as DbRevisionRow);
}

export async function scheduleRevisionById(id: string, date: string) {
  const context = await getContext();
  const { data, error } = await context.supabase
    .from("user_revisions")
    .update({
      scheduled_for: date,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", context.userId)
    .select("*")
    .single();
  if (error) throw error;
  notifyStudyUpdated();
  return mapRevision(data as DbRevisionRow);
}

export async function createManualRevision(input: {
  subjectSlug: RevisionEvent["subjectSlug"];
  subjectName: string;
  lessonSlug: string;
  lessonTitle: string;
  revisionNumber: number;
  date: string;
}) {
  const draft = await queueRevisionDraft({
    ...input,
    recommendedDate: input.date,
  });
  return scheduleRevisionById(draft.id, input.date);
}

export async function removeRevision(id: string) {
  const context = await getContext();
  const { error } = await context.supabase
    .from("user_revisions")
    .delete()
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  notifyStudyUpdated();
}

export async function loadRevisionEvent(id: string): Promise<RevisionEvent | null> {
  const context = await getContext();
  const { data, error } = await context.supabase
    .from("user_revisions")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status === "draft") return null;

  const { data: attemptRows, error: attemptError } = await context.supabase
    .from("user_leveling_attempts")
    .select("round,score,completed_at")
    .eq("user_id", context.userId)
    .eq("revision_id", id)
    .order("round", { ascending: true });
  if (attemptError) throw attemptError;
  const attempts = ((attemptRows ?? []) as DbLevelingAttemptRow[]).map(mapAttempt);
  return mapRevision(data as DbRevisionRow, attempts);
}

export async function updateRevisionStudyMode(
  id: string,
  mode: "platform-pdf" | "external-course" | null,
) {
  const context = await getContext();
  const { error } = await context.supabase
    .from("user_revisions")
    .update({ study_mode: mode, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  notifyStudyUpdated();
}

export async function updateRevisionReread(id: string, confirmed: boolean) {
  const context = await getContext();
  const { error } = await context.supabase
    .from("user_revisions")
    .update({
      reread_confirmed_at: confirmed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  notifyStudyUpdated();
}

export async function registerLevelingAttempt(revisionId: string, score: number) {
  const context = await getContext();
  const bounded = Math.max(0, Math.min(10, Math.round(score)));
  const { data: existingAttempts, error: attemptsError } = await context.supabase
    .from("user_leveling_attempts")
    .select("round")
    .eq("user_id", context.userId)
    .eq("revision_id", revisionId)
    .order("round", { ascending: false })
    .limit(1);
  if (attemptsError) throw attemptsError;
  const round = Number(existingAttempts?.[0]?.round ?? 0) + 1;

  const { error: insertError } = await context.supabase.from("user_leveling_attempts").insert({
    user_id: context.userId,
    revision_id: revisionId,
    round,
    score: bounded,
    passed: bounded >= 9,
  });
  if (insertError) throw insertError;

  if (bounded >= 9) {
    const { error: completeError } = await context.supabase
      .from("user_revisions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", revisionId)
      .eq("user_id", context.userId);
    if (completeError) throw completeError;
  }

  notifyStudyUpdated();
  return loadRevisionEvent(revisionId);
}
