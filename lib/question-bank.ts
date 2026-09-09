"use client";

import { createClient } from "@/lib/supabase/client";

export type QuestionType = "true_false" | "multiple_choice";
export type QuestionOrigin = "bank" | "lesson_list" | "leveling" | "list_review";
export type QuestionStatusFilter = "all" | "resolved" | "unresolved" | "correct" | "incorrect" | "starred" | "review";
export type QuestionChoiceMap = Record<string, string>;

export type BankQuestion = {
  id: string;
  subject_id: string;
  lesson_id: string;
  subject_name: string;
  lesson_title: string;
  statement: string;
  question_type: QuestionType;
  choices: QuestionChoiceMap | null;
  level: 1 | 2 | 3 | 4;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  source_code: string | null;
  selected_answer: string | null;
  is_correct: boolean | null;
  answered_at: string | null;
  correct_answer: string | null;
  explanation: string | null;
  starred: boolean;
  saved_for_review: boolean;
};

export type QuestionResult = {
  is_correct: boolean;
  correct_answer: string;
  explanation: string | null;
};

export type QuestionBankPage = {
  items: BankQuestion[];
  total: number;
  page: number;
  page_size: number;
};

export type StudyTaxonomy = {
  planId: string;
  subjects: Array<{
    id: string;
    name: string;
    slug: string;
    lessons: Array<{ id: string; title: string; slug: string }>;
  }>;
};

export type LessonQuestionStatus = {
  available_count: number;
  required_count: number;
  attempt_id: string | null;
  attempt_status: "in_progress" | "completed" | null;
  can_skip?: boolean;
  reason?: string | null;
};

export type AttemptQuestion = Omit<BankQuestion, "id" | "subject_id" | "lesson_id" | "subject_name" | "lesson_title" | "source_code" | "answered_at"> & {
  question_id: string;
  position: number;
};

export type QuestionAttemptPayload = {
  attempt: {
    id: string;
    kind: "lesson_list" | "leveling" | "list_review";
    status: "in_progress" | "completed";
    total: number;
    score: number | null;
    required_correct: number | null;
    revision_id: string | null;
    lesson_id: string | null;
    lesson_title: string | null;
    lesson_slug: string | null;
    subject_name: string | null;
    subject_slug: string | null;
    started_at: string;
    completed_at: string | null;
  };
  items: AttemptQuestion[];
};

export type LevelingRule = {
  revision_id: string;
  lesson_id: string;
  question_count: number;
  required_correct: number;
  available_questions: number;
};

async function getActivePlanId() {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Usuário não autenticado.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("active_study_plan_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile?.active_study_plan_id) throw new Error("Nenhum plano ativo atribuído.");
  return profile.active_study_plan_id as string;
}

export async function loadStudyTaxonomy(): Promise<StudyTaxonomy> {
  const supabase = createClient();
  const planId = await getActivePlanId();
  const { data, error } = await supabase
    .from("study_lesson_catalog")
    .select("subject_id,subject_name,subject_slug,lesson_id,lesson_title,lesson_slug,lesson_position")
    .eq("plan_id", planId)
    .order("subject_name", { ascending: true })
    .order("lesson_position", { ascending: true });

  if (error) throw error;

  const subjectMap = new Map<string, StudyTaxonomy["subjects"][number]>();
  for (const row of data ?? []) {
    let subject = subjectMap.get(row.subject_id);
    if (!subject) {
      subject = { id: row.subject_id, name: row.subject_name, slug: row.subject_slug, lessons: [] };
      subjectMap.set(row.subject_id, subject);
    }
    if (!subject.lessons.some((lesson) => lesson.id === row.lesson_id)) {
      subject.lessons.push({ id: row.lesson_id, title: row.lesson_title, slug: row.lesson_slug });
    }
  }

  return { planId, subjects: Array.from(subjectMap.values()) };
}

export async function loadQuestionBankPage(input: {
  status: QuestionStatusFilter;
  subjectId?: string;
  lessonId?: string;
  level?: number;
  keyword?: string;
  page: number;
}): Promise<QuestionBankPage> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_question_bank_page", {
    p_status: input.status,
    p_subject_id: input.subjectId || null,
    p_lesson_id: input.lessonId || null,
    p_level: input.level || null,
    p_keyword: input.keyword?.trim() || null,
    p_page: input.page,
    p_page_size: 20,
  });
  if (error) throw error;
  return data as QuestionBankPage;
}

export async function submitBankAnswer(questionId: string, answer: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_question_answer", {
    p_question_id: questionId,
    p_answer: answer,
    p_origin: "bank",
  });
  if (error) throw error;
  return data as QuestionResult;
}

export async function setQuestionMark(questionId: string, mark: "starred" | "review", value: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_question_mark", {
    p_question_id: questionId,
    p_mark: mark,
    p_value: value,
  });
  if (error) throw error;
  return data as { starred: boolean; saved_for_review: boolean };
}

async function resolveLessonId(subjectSlug: string, lessonSlug: string) {
  const supabase = createClient();
  const planId = await getActivePlanId();
  const { data, error } = await supabase
    .from("study_lesson_catalog")
    .select("lesson_id")
    .eq("plan_id", planId)
    .eq("subject_slug", subjectSlug)
    .eq("lesson_slug", lessonSlug)
    .maybeSingle();

  if (error) throw error;
  if (!data?.lesson_id) throw new Error("Aula não encontrada no plano ativo.");
  return data.lesson_id as string;
}

export async function loadLessonQuestionStatus(subjectSlug: string, lessonSlug: string) {
  const supabase = createClient();
  const lessonId = await resolveLessonId(subjectSlug, lessonSlug);
  const { data, error } = await supabase.rpc("get_lesson_question_status", { p_lesson_id: lessonId });
  if (error) throw error;
  return data as LessonQuestionStatus;
}

export async function startLessonQuestionAttempt(subjectSlug: string, lessonSlug: string) {
  const supabase = createClient();
  const lessonId = await resolveLessonId(subjectSlug, lessonSlug);
  const { data, error } = await supabase.rpc("start_lesson_question_attempt", { p_lesson_id: lessonId });
  if (error) throw error;
  return data as { ok: boolean; attempt_id?: string; continued?: boolean; available_count?: number; required_count?: number };
}

export async function skipPprnLesson(subjectSlug: string, lessonSlug: string) {
  const supabase = createClient();
  const lessonId = await resolveLessonId(subjectSlug, lessonSlug);
  const { data, error } = await supabase.rpc("skip_pprn_lesson", { p_lesson_id: lessonId });
  if (error) throw error;
  return data as { ok: boolean; skipped: boolean; usable_questions: number; required_count: number };
}

export async function loadQuestionAttempt(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_question_attempt", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as QuestionAttemptPayload;
}

export async function submitAttemptAnswer(attemptId: string, questionId: string, answer: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_attempt_answer", {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_answer: answer,
  });
  if (error) throw error;
  return data as QuestionResult;
}

export async function finalizeQuestionAttempt(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("finalize_question_attempt", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as { score: number; total: number; percentage: number };
}

export async function completeLessonListEarly(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("complete_lesson_list_early", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as { score: number; answered: number; total: number; percentage: number };
}

export async function loadLevelingRule(revisionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_leveling_rule", { p_revision_id: revisionId });
  if (error) throw error;
  return data as LevelingRule;
}

export async function startLevelingAttempt(revisionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_leveling_question_attempt", { p_revision_id: revisionId });
  if (error) throw error;
  return data as {
    ok: boolean;
    attempt_id?: string;
    continued?: boolean;
    available_count?: number;
    required_count?: number;
    required_correct?: number;
  };
}

export async function finalizeLevelingAttempt(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("finalize_leveling_attempt", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as {
    score: number;
    total: number;
    required_correct: number;
    passed: boolean;
    round: number;
    percentage: number;
  };
}
