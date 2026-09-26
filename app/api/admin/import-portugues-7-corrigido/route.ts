import { NextResponse } from "next/server";
import questionPack from "@/data/pmal-portugues-7-corrigido-v1.json";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PackItem = {
  id: string;
  lesson_slug: string;
  statement: string;
  question_type: "true_false" | "multiple_choice";
  choices: Record<string, string> | null;
  level: number;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  source_code: string | null;
  source_type: "real" | "authorial";
  correct_answer: string;
  explanation: string | null;
};

const ORDER = [
  "compreensao-interpretacao-textos",
  "tipologia-generos-textuais",
  "fonetica",
  "acentuacao-grafica",
  "ortografia-oficial",
  "uso-dos-porques",
  "sintaxe-oracao-termos-oracao",
] as const;

export async function POST() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ ok: false, error: "Faça login novamente." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ ok: false, error: "Acesso restrito ao administrador." }, { status: 403 });

  const items = questionPack as PackItem[];
  const details: Array<{ lesson_slug: string; imported: number }> = [];
  let imported = 0;

  for (const lessonSlug of ORDER) {
    const questions = items.filter((item) => item.lesson_slug === lessonSlug).map(({ lesson_slug: _slug, ...item }) => item);
    const { data, error } = await supabase.rpc("mt_import_portuguese_7_corrected_v1", { p_lesson_slug: lessonSlug, p_items: questions });
    if (error) return NextResponse.json({ ok: false, imported, error: `${lessonSlug}: ${error.message}`, details }, { status: 500 });
    const count = Number((data as { imported?: number } | null)?.imported ?? questions.length);
    imported += count;
    details.push({ lesson_slug: lessonSlug, imported: count });
  }

  return NextResponse.json({ ok: true, imported, lessons: details.length, details });
}
