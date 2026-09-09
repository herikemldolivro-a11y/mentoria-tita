"use client";

import { createClient } from "@/lib/supabase/client";

export type CurriculumPlan = {
  id: string;
  slug: string;
  name: string;
  contest_id: string;
  contest_sigla: string | null;
};

export type CurriculumWeek = {
  id: string;
  plan_id: string;
  week_number: number;
  title: string;
  position: number;
  active: boolean;
};

export type CurriculumSubject = {
  id: string;
  plan_id: string;
  slug: string;
  short_name: string;
  name: string;
  description: string | null;
  position: number;
  active: boolean;
};

export type CurriculumLesson = {
  id: string;
  subject_id: string;
  week_id: string;
  slug: string;
  title: string;
  priority: string | null;
  position: number;
  question_count: number;
  active: boolean;
  topics: string[];
  has_material: boolean;
  active_questions: number;
};

export type CurriculumCatalog = {
  plans: CurriculumPlan[];
  weeks: CurriculumWeek[];
  subjects: CurriculumSubject[];
  lessons: CurriculumLesson[];
};

export const weeklyMatrixTemplate = `{
  "semana": 2,
  "titulo": "Semana 2",
  "materias": [
    {
      "nome": "Contabilidade",
      "sigla": "CONTABILIDADE",
      "slug": "contabilidade",
      "descricao": "Conteúdos da disciplina nesta preparação.",
      "posicao": 1,
      "aulas": [
        {
          "titulo": "Contas Contábeis",
          "slug": "contas-contabeis",
          "prioridade": "Muito alta",
          "posicao": 1,
          "questoes_lista": 35,
          "topicos": [
            "conceito e finalidade",
            "contas patrimoniais e de resultado",
            "natureza devedora e credora"
          ]
        }
      ]
    },
    {
      "nome": "Matemática",
      "sigla": "MATEMÁTICA",
      "slug": "matematica",
      "descricao": "Nova matéria adicionada pelo Admin.",
      "posicao": 2,
      "aulas": [
        {
          "titulo": "Porcentagem",
          "slug": "porcentagem",
          "prioridade": "Alta",
          "posicao": 1,
          "questoes_lista": 30,
          "topicos": [
            "porcentagem básica",
            "aumentos e descontos",
            "variações percentuais"
          ]
        }
      ]
    }
  ]
}`;

export async function loadCurriculumCatalog() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_curriculum_catalog");
  if (error) throw error;
  return data as CurriculumCatalog;
}

export async function saveWeek(input: { planId: string; weekNumber: number; title: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_upsert_study_week", {
    p_plan_id: input.planId,
    p_week_number: input.weekNumber,
    p_title: input.title,
    p_position: input.weekNumber,
  });
  if (error) throw error;
  return data as string;
}

export async function saveSubject(input: {
  planId: string;
  slug: string;
  shortName: string;
  name: string;
  description: string;
  position: number;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_upsert_study_subject", {
    p_plan_id: input.planId,
    p_slug: input.slug,
    p_short_name: input.shortName,
    p_name: input.name,
    p_description: input.description || null,
    p_position: input.position,
  });
  if (error) throw error;
  return data as string;
}

export async function saveLesson(input: {
  subjectId: string;
  weekId: string;
  slug: string;
  title: string;
  priority: string;
  position: number;
  questionCount: number;
  topics: string[];
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_upsert_study_lesson", {
    p_subject_id: input.subjectId,
    p_week_id: input.weekId,
    p_slug: input.slug,
    p_title: input.title,
    p_priority: input.priority || null,
    p_position: input.position,
    p_question_count: input.questionCount,
    p_topics: input.topics,
  });
  if (error) throw error;
  return data as string;
}

export async function importWeeklyMatrix(planId: string, matrix: unknown) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_import_week_matrix", {
    p_plan_id: planId,
    p_matrix: matrix,
  });
  if (error) throw error;
  return data as { week_id: string; week_number: number; subjects: number; lessons: number };
}
