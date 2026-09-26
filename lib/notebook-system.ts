"use client";

import { createClient } from "@/lib/supabase/client";
import { loadStudyTaxonomy, type StudyTaxonomy } from "@/lib/question-bank";

export type LessonNotebook = {
  id: string;
  lesson_id: string;
  status: "draft" | "active";
  activated_at: string | null;
  next_review_on: string | null;
  review_step: number;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonNotebookCard = {
  id: string;
  notebook_id: string;
  front: string;
  back: string;
  position: number;
  last_result: boolean | null;
  consecutive_correct: number;
  correct_total: number;
  incorrect_total: number;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonNotebookSummary = LessonNotebook & {
  lesson_title: string;
  lesson_slug: string;
  subject_name: string;
  subject_slug: string;
  subject_id: string;
  card_count: number;
  incorrect_count: number;
};

export type LessonNotebookDetail = LessonNotebookSummary & {
  cards: LessonNotebookCard[];
};

export type LessonNotebookHub = {
  taxonomy: StudyTaxonomy;
  notebooks: LessonNotebookSummary[];
};

export type NotebookActivationResult = {
  ok: boolean;
  notebook_id: string;
  card_count: number;
  next_review_on: string | null;
  review_step: number;
};

export type NotebookReviewResult = {
  ok: boolean;
  review_id: string;
  score: number;
  total: number;
  schedule_advanced: boolean;
  next_review_on: string | null;
  review_step: number;
};

const NOTEBOOK_UPDATED_EVENT = "mentoria-tita:notebook-updated";
const REQUEST_TIMEOUT_MS = 12000;

function todayKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} demorou mais que o esperado. Tente novamente.`)), ms);
    Promise.resolve(promise).then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

export function notebookTodayKey() {
  return todayKey();
}

export function isNotebookDue(notebook: Pick<LessonNotebook, "status" | "next_review_on">, date = todayKey()) {
  return notebook.status === "active" && Boolean(notebook.next_review_on) && notebook.next_review_on! <= date;
}

export function formatNotebookDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function notifyNotebookUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NOTEBOOK_UPDATED_EVENT));
}

export function listenNotebookUpdated(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => callback();
  window.addEventListener(NOTEBOOK_UPDATED_EVENT, handler);
  return () => window.removeEventListener(NOTEBOOK_UPDATED_EVENT, handler);
}

function taxonomyMap(taxonomy: StudyTaxonomy) {
  const map = new Map<string, {
    subject_id: string;
    subject_name: string;
    subject_slug: string;
    lesson_title: string;
    lesson_slug: string;
  }>();

  for (const subject of taxonomy.subjects) {
    for (const lesson of subject.lessons) {
      map.set(lesson.id, {
        subject_id: subject.id,
        subject_name: subject.name,
        subject_slug: subject.slug,
        lesson_title: lesson.title,
        lesson_slug: lesson.slug,
      });
    }
  }
  return map;
}

function normalizeDetail(value: unknown): LessonNotebookDetail | null {
  if (!value || typeof value !== "object") return null;
  const row = value as LessonNotebookDetail;
  return {
    ...row,
    card_count: Number(row.card_count ?? 0),
    incorrect_count: Number(row.incorrect_count ?? 0),
    review_step: Number(row.review_step ?? 0),
    cards: Array.isArray(row.cards) ? row.cards.map((card) => ({
      ...card,
      position: Number(card.position ?? 0),
      consecutive_correct: Number(card.consecutive_correct ?? 0),
      correct_total: Number(card.correct_total ?? 0),
      incorrect_total: Number(card.incorrect_total ?? 0),
    })) : [],
  };
}

async function loadCardsForNotebooks(notebookIds: string[]) {
  if (!notebookIds.length) return [] as LessonNotebookCard[];
  const supabase = createClient();
  const query = supabase
    .from("user_lesson_notebook_cards")
    .select("id,notebook_id,front,back,position,last_result,consecutive_correct,correct_total,incorrect_total,last_reviewed_at,created_at,updated_at")
    .in("notebook_id", notebookIds)
    .order("position", { ascending: true });
  const { data, error } = await withTimeout(query, "Carregamento dos flashcards");
  if (error) throw error;
  return (data ?? []) as LessonNotebookCard[];
}

export async function loadNotebookHub(): Promise<LessonNotebookHub> {
  const supabase = createClient();
  const [taxonomy, notebookQuery] = await Promise.all([
    withTimeout(loadStudyTaxonomy(), "Carregamento das aulas"),
    withTimeout(
      supabase
        .from("user_lesson_notebooks")
        .select("id,lesson_id,status,activated_at,next_review_on,review_step,last_reviewed_at,created_at,updated_at")
        .order("updated_at", { ascending: false }),
      "Carregamento dos cadernos",
    ),
  ]);

  if (notebookQuery.error) throw notebookQuery.error;
  const rows = (notebookQuery.data ?? []) as LessonNotebook[];
  const cards = await loadCardsForNotebooks(rows.map((row) => row.id));
  const meta = taxonomyMap(taxonomy);

  const notebooks = rows.map((row) => {
    const lessonMeta = meta.get(row.lesson_id);
    const lessonCards = cards.filter((card) => card.notebook_id === row.id);
    return {
      ...row,
      subject_id: lessonMeta?.subject_id ?? "",
      subject_name: lessonMeta?.subject_name ?? "Matéria",
      subject_slug: lessonMeta?.subject_slug ?? "",
      lesson_title: lessonMeta?.lesson_title ?? "Aula",
      lesson_slug: lessonMeta?.lesson_slug ?? "",
      card_count: lessonCards.length,
      incorrect_count: lessonCards.filter((card) => card.last_result === false).length,
    } satisfies LessonNotebookSummary;
  });

  return { taxonomy, notebooks };
}

export async function loadNotebookByLesson(lessonId: string): Promise<LessonNotebookDetail | null> {
  const supabase = createClient();
  const { data, error } = await withTimeout(
    supabase.rpc("get_lesson_notebook_detail", { p_lesson_id: lessonId }),
    "Abertura do caderno",
  );
  if (error) throw error;
  return normalizeDetail(data);
}

export async function loadNotebookById(notebookId: string): Promise<LessonNotebookDetail | null> {
  const supabase = createClient();
  const { data, error } = await withTimeout(
    supabase
      .from("user_lesson_notebooks")
      .select("lesson_id")
      .eq("id", notebookId)
      .maybeSingle(),
    "Localização do caderno",
  );
  if (error) throw error;
  if (!data?.lesson_id) return null;
  return loadNotebookByLesson(data.lesson_id as string);
}

export async function ensureLessonNotebook(lessonId: string): Promise<LessonNotebook> {
  const supabase = createClient();
  const { data, error } = await withTimeout(
    supabase.rpc("get_or_create_lesson_notebook_detail", { p_lesson_id: lessonId }),
    "Criação do caderno",
  );
  if (error) throw error;
  const detail = normalizeDetail(data);
  if (!detail) throw new Error("Não foi possível criar o caderno desta aula.");
  notifyNotebookUpdated();
  return detail;
}

export async function createNotebookCard(lessonId: string, front: string, back: string) {
  const cleanFront = front.trim();
  const cleanBack = back.trim();
  if (!cleanFront || !cleanBack) throw new Error("Preencha a frente e o verso do flashcard.");

  const notebook = await ensureLessonNotebook(lessonId);
  const supabase = createClient();
  const { data: positions, error: positionError } = await withTimeout(
    supabase
      .from("user_lesson_notebook_cards")
      .select("position")
      .eq("notebook_id", notebook.id)
      .order("position", { ascending: false })
      .limit(1),
    "Preparação do flashcard",
  );
  if (positionError) throw positionError;
  const nextPosition = Number(positions?.[0]?.position ?? 0) + 1;

  const { data, error } = await withTimeout(
    supabase
      .from("user_lesson_notebook_cards")
      .insert({ notebook_id: notebook.id, front: cleanFront, back: cleanBack, position: nextPosition })
      .select("id,notebook_id,front,back,position,last_result,consecutive_correct,correct_total,incorrect_total,last_reviewed_at,created_at,updated_at")
      .single(),
    "Salvamento do flashcard",
  );
  if (error) throw error;
  notifyNotebookUpdated();
  return data as LessonNotebookCard;
}

export async function updateNotebookCard(cardId: string, front: string, back: string) {
  const cleanFront = front.trim();
  const cleanBack = back.trim();
  if (!cleanFront || !cleanBack) throw new Error("Preencha a frente e o verso do flashcard.");

  const supabase = createClient();
  const { data, error } = await withTimeout(
    supabase
      .from("user_lesson_notebook_cards")
      .update({ front: cleanFront, back: cleanBack })
      .eq("id", cardId)
      .select("id,notebook_id,front,back,position,last_result,consecutive_correct,correct_total,incorrect_total,last_reviewed_at,created_at,updated_at")
      .single(),
    "Atualização do flashcard",
  );
  if (error) throw error;
  notifyNotebookUpdated();
  return data as LessonNotebookCard;
}

export async function deleteNotebookCard(cardId: string) {
  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.from("user_lesson_notebook_cards").delete().eq("id", cardId),
    "Exclusão do flashcard",
  );
  if (error) throw error;
  notifyNotebookUpdated();
}

export async function deleteLessonNotebook(notebookId: string) {
  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.from("user_lesson_notebooks").delete().eq("id", notebookId),
    "Exclusão do caderno",
  );
  if (error) throw error;
  notifyNotebookUpdated();
}

export async function activateLessonNotebook(notebookId: string) {
  const supabase = createClient();
  const { data, error } = await withTimeout(
    supabase.rpc("activate_lesson_notebook", { p_notebook_id: notebookId }),
    "Finalização do caderno",
  );
  if (error) throw error;
  notifyNotebookUpdated();
  return data as NotebookActivationResult;
}

export async function completeLessonNotebookReview(notebookId: string, results: Record<string, boolean>) {
  const supabase = createClient();
  const { data, error } = await withTimeout(
    supabase.rpc("complete_lesson_notebook_review", { p_notebook_id: notebookId, p_results: results }),
    "Finalização da revisão",
  );
  if (error) throw error;
  notifyNotebookUpdated();
  return data as NotebookReviewResult;
}

export function sortNotebookCardsForReview(cards: LessonNotebookCard[]) {
  return [...cards].sort((a, b) => {
    const aWrong = a.last_result === false ? 0 : 1;
    const bWrong = b.last_result === false ? 0 : 1;
    if (aWrong !== bWrong) return aWrong - bWrong;
    if (aWrong === 0 && a.incorrect_total !== b.incorrect_total) return b.incorrect_total - a.incorrect_total;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
