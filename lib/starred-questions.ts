"use client";

import { createClient } from "@/lib/supabase/client";
import type { QuestionChoiceMap, QuestionResult, QuestionType } from "@/lib/question-bank";

export type StarPriority = 1 | 2 | 3;

export type StarMarkState = {
  starred: boolean;
  saved_for_review: boolean;
  star_priority: StarPriority | null;
  star_hidden: boolean;
  star_correct_streak: number;
  star_has_error: boolean;
};

export type StarredSummary = {
  visible: number;
  one: number;
  two: number;
  three: number;
  with_error: number;
  hidden: number;
};

export type StarredQuestion = {
  id: string;
  statement: string;
  question_type: QuestionType;
  choices: QuestionChoiceMap | null;
  level: 1 | 2 | 3 | 4;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  subject_name: string;
  lesson_title: string;
  star_priority: StarPriority;
  star_hidden: boolean;
  star_correct_streak: number;
  star_has_error: boolean;
  star_added_at: string | null;
  star_last_reviewed_at: string | null;
};

export type StarredQueue = {
  items: StarredQuestion[];
  total: number;
  priority: StarPriority | null;
  random: boolean;
  hidden: boolean;
};

export type StarredAnswerResult = QuestionResult & {
  star_correct_streak: number;
  star_hidden: boolean;
  star_priority: StarPriority;
};

export async function setQuestionStarPriority(questionId: string, priority: StarPriority | null) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_question_star_priority", {
    p_question_id: questionId,
    p_priority: priority,
  });
  if (error) throw error;
  return data as StarMarkState;
}

export async function loadStarredQuestionSummary() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_starred_question_summary");
  if (error) throw error;
  return data as StarredSummary;
}

export async function loadStarredQuestionQueue(input: {
  priority?: StarPriority | null;
  random?: boolean;
  includeHidden?: boolean;
  limit?: number;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_starred_question_queue", {
    p_priority: input.priority ?? null,
    p_random: Boolean(input.random),
    p_include_hidden: Boolean(input.includeHidden),
    p_limit: input.limit ?? 500,
  });
  if (error) throw error;
  return data as StarredQueue;
}

export async function submitStarredQuestionAnswer(questionId: string, answer: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_starred_question_answer", {
    p_question_id: questionId,
    p_answer: answer,
  });
  if (error) throw error;
  return data as StarredAnswerResult;
}

export async function unhideStarredQuestion(questionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("unhide_starred_question", {
    p_question_id: questionId,
  });
  if (error) throw error;
  return data as { ok: boolean; question_id: string };
}

export async function unhideAllStarredQuestions() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("unhide_all_starred_questions");
  if (error) throw error;
  return data as { ok: boolean; unhidden: number };
}
