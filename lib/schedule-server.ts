import { createClient } from "@/lib/supabase/server";

export type ScheduleLesson = {
  id: string;
  slug: string;
  title: string;
  priority: string | null;
  position: number;
  questionCount: number;
  pdfPath: string | null;
  topics: string[];
  theoryCompleted: boolean;
  listCompleted: boolean;
  subjectId: string;
  subjectSlug: string;
  subjectShortName: string;
  subjectName: string;
};

export type ScheduleSubject = {
  id: string;
  slug: string;
  shortName: string;
  name: string;
  description: string | null;
  position: number;
  lessons: ScheduleLesson[];
};

export type ScheduleBlock = {
  id: string;
  studyDate: string;
  daypart: "morning" | "afternoon" | "evening";
  startTime: string | null;
  endTime: string | null;
  title: string;
  optional: boolean;
  notes: string | null;
  position: number;
  lessons: ScheduleLesson[];
};

export type ScheduleWeek = {
  id: string;
  weekNumber: number;
  title: string;
  position: number;
  startsOn: string | null;
  endsOn: string | null;
  contestSlug: string | null;
  contestSigla: string | null;
  planId: string;
  planName: string;
  subjects: ScheduleSubject[];
  blocks: ScheduleBlock[];
};

const cp1252Reverse = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

function suspiciousTextScore(value: string) {
  let score = 0;
  const chars = Array.from(value);

  for (let index = 0; index < chars.length; index += 1) {
    const current = chars[index].codePointAt(0) ?? -1;
    const next = chars[index + 1]?.codePointAt(0) ?? -1;

    if (current === 0x00c3 && ((next >= 0x0080 && next <= 0x00bf) || cp1252Reverse.has(next))) score += 4;
    if (current === 0x00c2 && next >= 0x0080 && next <= 0x00bf) score += 4;
    if (current === 0x00e2 && ((next >= 0x0080 && next <= 0x009f) || cp1252Reverse.has(next))) score += 4;
    if (current >= 0x0080 && current <= 0x009f) score += 6;
    if (current === 0xfffd) score += 10;
  }

  return score;
}

function encodeAsCp1252(value: string) {
  const bytes: number[] = [];

  for (const char of Array.from(value)) {
    const code = char.codePointAt(0) ?? -1;
    if (code >= 0 && code <= 0xff) {
      bytes.push(code);
      continue;
    }

    const mapped = cp1252Reverse.get(code);
    if (mapped === undefined) return null;
    bytes.push(mapped);
  }

  return Uint8Array.from(bytes);
}

function repairMojibakeToken(value: string) {
  let current = value;

  for (let pass = 0; pass < 5; pass += 1) {
    const beforeScore = suspiciousTextScore(current);
    if (beforeScore === 0) break;

    const bytes = encodeAsCp1252(current);
    if (!bytes) break;

    let next = current;
    try {
      next = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      break;
    }

    if (suspiciousTextScore(next) >= beforeScore) break;
    current = next;
  }

  return current;
}

function cleanDisplayText(value: unknown) {
  if (value === null || value === undefined) return "";

  let text = String(value)
    .replace(/\uFEFF/gu, "")
    .replace(/\u00A0/gu, " ");

  text = text
    .split(/(\s+)/u)
    .map((part) => suspiciousTextScore(part) > 0 ? repairMojibakeToken(part) : part)
    .join("");

  return text
    .replace(/^\s*#{1,6}\s*/u, "")
    .replace(/^\s*[-–—]\s+(?=[A-Za-zÀ-ÖØ-öø-ÿ])/u, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

async function activeContext() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Usuário não autenticado.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_study_plan_id,focus_contest_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  let planId = profile?.active_study_plan_id as string | null | undefined;

  if (profile?.focus_contest_id) {
    const { data: activePlan, error: activePlanError } = await supabase
      .from("study_plans")
      .select("id,contest_id")
      .eq("id", planId ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    if (activePlanError) throw activePlanError;

    if (!activePlan || activePlan.contest_id !== profile.focus_contest_id) {
      const { data: focusPlan, error: focusPlanError } = await supabase
        .from("study_plans")
        .select("id")
        .eq("contest_id", profile.focus_contest_id)
        .eq("is_default", true)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (focusPlanError) throw focusPlanError;
      planId = focusPlan?.id as string | undefined;
    }
  }

  if (!planId) throw new Error("Nenhum cronograma ativo foi atribuído.");

  const { data: planRow, error: planRowError } = await supabase
    .from("study_plans")
    .select("id,name,contest_id,contests(slug,sigla)")
    .eq("id", planId)
    .maybeSingle();
  if (planRowError) throw planRowError;

  const relation = planRow?.contests as { slug?: string; sigla?: string } | Array<{ slug?: string; sigla?: string }> | null;
  const contest = Array.isArray(relation) ? relation[0] : relation;

  return {
    supabase,
    userId: authData.user.id,
    planId,
    planName: cleanDisplayText(planRow?.name ?? "Cronograma"),
    contestSlug: contest?.slug ?? null,
    contestSigla: cleanDisplayText(contest?.sigla ?? "") || null,
  };
}

export async function loadMySchedule(): Promise<ScheduleWeek[]> {
  const context = await activeContext();

  const { data: rows, error } = await context.supabase
    .from("study_lesson_catalog")
    .select("plan_id,plan_name,week_id,week_number,week_title,week_position,subject_id,subject_slug,subject_short_name,subject_name,subject_description,subject_position,lesson_id,lesson_slug,lesson_title,priority,lesson_position,question_count,pdf_path")
    .eq("plan_id", context.planId)
    .order("week_number", { ascending: true })
    .order("subject_position", { ascending: true })
    .order("lesson_position", { ascending: true });
  if (error) throw error;

  const { data: weekRows, error: weekError } = await context.supabase
    .from("study_weeks")
    .select("id,week_number,title,position,starts_on,ends_on")
    .eq("plan_id", context.planId)
    .order("position", { ascending: true });
  if (weekError) throw weekError;

  const lessonIds = (rows ?? []).map((row) => row.lesson_id);
  const topicsByLesson = new Map<string, string[]>();
  const progressByLesson = new Map<string, { theory_completed_at: string | null; list_completed_at: string | null }>();

  if (lessonIds.length) {
    const [{ data: topicRows, error: topicsError }, { data: progressRows, error: progressError }] = await Promise.all([
      context.supabase
        .from("study_lesson_topics")
        .select("lesson_id,topic,position")
        .in("lesson_id", lessonIds)
        .order("position", { ascending: true }),
      context.supabase
        .from("user_lesson_progress")
        .select("lesson_id,theory_completed_at,list_completed_at")
        .eq("user_id", context.userId)
        .in("lesson_id", lessonIds),
    ]);

    if (topicsError) throw topicsError;
    if (progressError) throw progressError;

    for (const topic of topicRows ?? []) {
      const current = topicsByLesson.get(topic.lesson_id) ?? [];
      const clean = cleanDisplayText(topic.topic);
      if (clean) current.push(clean);
      topicsByLesson.set(topic.lesson_id, current);
    }

    for (const item of progressRows ?? []) progressByLesson.set(item.lesson_id, item);
  }

  const weeks = new Map<string, ScheduleWeek>();

  for (const weekRow of weekRows ?? []) {
    weeks.set(weekRow.id, {
      id: weekRow.id,
      weekNumber: Number(weekRow.week_number),
      title: cleanDisplayText(weekRow.title),
      position: Number(weekRow.position ?? weekRow.week_number),
      startsOn: weekRow.starts_on ?? null,
      endsOn: weekRow.ends_on ?? null,
      contestSlug: context.contestSlug,
      contestSigla: context.contestSigla,
      planId: context.planId,
      planName: context.planName,
      subjects: [],
      blocks: [],
    });
  }

  const lessonMap = new Map<string, ScheduleLesson>();

  for (const row of rows ?? []) {
    const week = weeks.get(row.week_id);
    if (!week) continue;

    let subject = week.subjects.find((item) => item.id === row.subject_id);

    if (!subject) {
      subject = {
        id: row.subject_id,
        slug: row.subject_slug,
        shortName: cleanDisplayText(row.subject_short_name),
        name: cleanDisplayText(row.subject_name),
        description: cleanDisplayText(row.subject_description) || null,
        position: Number(row.subject_position ?? 1),
        lessons: [],
      };
      week.subjects.push(subject);
    }

    const progress = progressByLesson.get(row.lesson_id);

    const lesson: ScheduleLesson = {
      id: row.lesson_id,
      slug: row.lesson_slug,
      title: cleanDisplayText(row.lesson_title),
      priority: cleanDisplayText(row.priority) || null,
      position: Number(row.lesson_position),
      questionCount: Number(row.question_count ?? 35),
      pdfPath: row.pdf_path ?? null,
      topics: topicsByLesson.get(row.lesson_id) ?? [],
      theoryCompleted: Boolean(progress?.theory_completed_at),
      listCompleted: Boolean(progress?.list_completed_at),
      subjectId: row.subject_id,
      subjectSlug: row.subject_slug,
      subjectShortName: cleanDisplayText(row.subject_short_name),
      subjectName: cleanDisplayText(row.subject_name),
    };

    subject.lessons.push(lesson);
    lessonMap.set(lesson.id, lesson);
  }

  const weekIds = Array.from(weeks.keys());

  if (weekIds.length) {
    const { data: blockRows, error: blockError } = await context.supabase
      .from("study_schedule_blocks")
      .select("id,week_id,study_date,daypart,start_time,end_time,title,optional,notes,position")
      .in("week_id", weekIds)
      .order("study_date", { ascending: true })
      .order("position", { ascending: true });

    if (blockError && blockError.code !== "42P01") throw blockError;

    const blockIds = (blockRows ?? []).map((block) => block.id);
    const assignmentsByBlock = new Map<string, Array<{ lesson_id: string; position: number }>>();

    if (blockIds.length) {
      const { data: assignmentRows, error: assignmentError } = await context.supabase
        .from("study_schedule_block_lessons")
        .select("block_id,lesson_id,position")
        .in("block_id", blockIds)
        .order("position", { ascending: true });

      if (assignmentError) throw assignmentError;

      for (const item of assignmentRows ?? []) {
        const current = assignmentsByBlock.get(item.block_id) ?? [];
        current.push({ lesson_id: item.lesson_id, position: item.position });
        assignmentsByBlock.set(item.block_id, current);
      }
    }

    for (const block of blockRows ?? []) {
      const week = weeks.get(block.week_id);
      if (!week) continue;

      week.blocks.push({
        id: block.id,
        studyDate: block.study_date,
        daypart: block.daypart,
        startTime: block.start_time,
        endTime: block.end_time,
        title: cleanDisplayText(block.title),
        optional: Boolean(block.optional),
        notes: cleanDisplayText(block.notes) || null,
        position: Number(block.position ?? 1),
        lessons: (assignmentsByBlock.get(block.id) ?? [])
          .sort((a, b) => a.position - b.position)
          .map((item) => lessonMap.get(item.lesson_id))
          .filter((item): item is ScheduleLesson => Boolean(item)),
      });
    }
  }

  for (const week of weeks.values()) {
    week.subjects.sort((a, b) => a.position - b.position);
    for (const subject of week.subjects) subject.lessons.sort((a, b) => a.position - b.position);
  }

  return Array.from(weeks.values()).sort((a, b) => a.position - b.position);
}

export async function loadScheduleWeek(weekNumber: number) {
  return (await loadMySchedule()).find((week) => week.weekNumber === weekNumber) ?? null;
}
