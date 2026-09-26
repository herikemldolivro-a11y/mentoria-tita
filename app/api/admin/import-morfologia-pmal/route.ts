import { NextResponse } from "next/server";
import morphologyPack from "@/data/pmal-portugues-morfologia-pack-v1.json";
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
  active: boolean;
  correct_answer: string;
  explanation: string | null;
};

export async function POST() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: "Faça login novamente." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const items = morphologyPack as PackItem[];
  const groups = new Map<string, PackItem[]>();

  for (const item of items) {
    const current = groups.get(item.lesson_slug) ?? [];
    current.push(item);
    groups.set(item.lesson_slug, current);
  }

  const details: Array<{ lesson_slug: string; imported: number }> = [];
  let imported = 0;

  for (const [lessonSlug, questions] of groups) {
    const { data, error } = await supabase.rpc("mt_import_morphology_pack_v1", {
      p_items: questions,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          imported,
          error: `${lessonSlug}: ${error.message}`,
          details,
        },
        { status: 500 },
      );
    }

    const count = Number((data as { imported?: number } | null)?.imported ?? questions.length);
    imported += count;
    details.push({ lesson_slug: lessonSlug, imported: count });
  }

  return NextResponse.json({
    ok: true,
    imported,
    lessons: details.length,
    details,
  });
}
