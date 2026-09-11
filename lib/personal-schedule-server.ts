import { createClient } from "@/lib/supabase/server";

export type PersonalSubjectVisual = {
  imagePath: string | null;
  accent: string;
  tagline: string | null;
};

export type PersonalScheduleItem = {
  id: string;
  scheduledFor: string;
  studyDay: number;
  weekNumber: number;
  position: number;
  estimatedMinutes: number;
  subject: {
    id: string;
    slug: string;
    name: string;
    shortName: string;
  };
  lesson: {
    id: string;
    slug: string;
    title: string;
    questionCount: number;
    pdfPath: string | null;
    sourceWeekNumber: number;
  };
  theoryCompleted: boolean;
  listCompleted: boolean;
  visual: PersonalSubjectVisual;
};

export type PersonalScheduleSnapshot = {
  dailyStudyMinutes: number | null;
  scheduleWeeks: number | null;
  scheduleTargetWeeks: number | null;
  generatedAt: string | null;
  onboardingCompleted: boolean;
  items: PersonalScheduleItem[];
};

const FALLBACK_VISUALS: Record<string, PersonalSubjectVisual> = {
  "lingua-portuguesa": {
    imagePath: "/subjects/lingua-portuguesa.webp",
    accent: "#d4d4d4",
    tagline: "Domine a palavra, a interpretação e a escrita.",
  },
  "direito-penal": {
    imagePath: "/subjects/direito-penal.webp",
    accent: "#b7b8bb",
    tagline: "Lei, tipicidade e estratégia de prova.",
  },
};

const DEFAULT_VISUAL: PersonalSubjectVisual = {
  imagePath: null,
  accent: "#aeb2b7",
  tagline: null,
};

export async function loadPersonalSchedule(): Promise<PersonalScheduleSnapshot> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      dailyStudyMinutes: null,
      scheduleWeeks: null,
      scheduleTargetWeeks: null,
      generatedAt: null,
      onboardingCompleted: false,
      items: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_study_plan_id,daily_study_minutes,schedule_weeks,schedule_target_weeks,schedule_generated_at,onboarding_completed_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  const emptySnapshot: PersonalScheduleSnapshot = {
    dailyStudyMinutes: profile?.daily_study_minutes ?? null,
    scheduleWeeks: profile?.schedule_weeks ?? null,
    scheduleTargetWeeks: profile?.schedule_target_weeks ?? null,
    generatedAt: profile?.schedule_generated_at ?? null,
    onboardingCompleted: Boolean(profile?.onboarding_completed_at && profile?.daily_study_minutes),
    items: [],
  };

  if (!profile?.active_study_plan_id) return emptySnapshot;

  const { data: scheduleRows, error: scheduleError } = await supabase
    .from("user_personal_schedule_items")
    .select("id,plan_id,subject_id,lesson_id,scheduled_for,study_day,week_number,position,estimated_minutes")
    .eq("user_id", authData.user.id)
    .eq("plan_id", profile.active_study_plan_id)
    .order("position", { ascending: true });

  if (scheduleError || !scheduleRows?.length) return emptySnapshot;

  const subjectIds = Array.from(new Set(scheduleRows.map((row) => row.subject_id)));
  const lessonIds = Array.from(new Set(scheduleRows.map((row) => row.lesson_id)));

  const [{ data: subjects }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase
      .from("study_subjects")
      .select("id,slug,name,short_name")
      .in("id", subjectIds),
    supabase
      .from("study_lessons")
      .select("id,slug,title,question_count,pdf_path,week_id")
      .in("id", lessonIds),
    supabase
      .from("user_lesson_progress")
      .select("lesson_id,theory_completed_at,list_completed_at")
      .eq("user_id", authData.user.id)
      .in("lesson_id", lessonIds),
  ]);

  const weekIds = Array.from(new Set((lessons ?? []).map((lesson) => lesson.week_id).filter(Boolean)));
  const subjectSlugs = (subjects ?? []).map((subject) => subject.slug);

  const [{ data: weeks }, { data: visualRows }] = await Promise.all([
    weekIds.length
      ? supabase.from("study_weeks").select("id,week_number").in("id", weekIds)
      : Promise.resolve({ data: [] as Array<{ id: string; week_number: number }> }),
    subjectSlugs.length
      ? supabase.from("subject_visuals").select("subject_slug,image_path,accent,tagline").in("subject_slug", subjectSlugs)
      : Promise.resolve({ data: [] as Array<{ subject_slug: string; image_path: string | null; accent: string; tagline: string | null }> }),
  ]);

  const subjectMap = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
  const lessonMap = new Map((lessons ?? []).map((lesson) => [lesson.id, lesson]));
  const weekMap = new Map((weeks ?? []).map((week) => [week.id, Number(week.week_number)]));
  const progressMap = new Map((progress ?? []).map((item) => [item.lesson_id, item]));
  const visualMap = new Map(
    (visualRows ?? []).map((visual) => [
      visual.subject_slug,
      {
        imagePath: visual.image_path,
        accent: visual.accent || "#aeb2b7",
        tagline: visual.tagline,
      } satisfies PersonalSubjectVisual,
    ]),
  );

  const items = scheduleRows.flatMap<PersonalScheduleItem>((row) => {
    const subject = subjectMap.get(row.subject_id);
    const lesson = lessonMap.get(row.lesson_id);
    if (!subject || !lesson) return [];

    const lessonProgress = progressMap.get(row.lesson_id);
    const visual = visualMap.get(subject.slug) ?? FALLBACK_VISUALS[subject.slug] ?? DEFAULT_VISUAL;

    return [{
      id: row.id,
      scheduledFor: row.scheduled_for,
      studyDay: Number(row.study_day),
      weekNumber: Number(row.week_number),
      position: Number(row.position),
      estimatedMinutes: Number(row.estimated_minutes),
      subject: {
        id: subject.id,
        slug: subject.slug,
        name: subject.name,
        shortName: subject.short_name,
      },
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        questionCount: Number(lesson.question_count ?? 0),
        pdfPath: lesson.pdf_path ?? null,
        sourceWeekNumber: weekMap.get(lesson.week_id) ?? 1,
      },
      theoryCompleted: Boolean(lessonProgress?.theory_completed_at),
      listCompleted: Boolean(lessonProgress?.list_completed_at),
      visual,
    }];
  });

  return { ...emptySnapshot, items };
}

export function personalLessonHref(item: PersonalScheduleItem) {
  const base = `/cronograma/semana-${item.lesson.sourceWeekNumber}/${item.subject.slug}/${item.lesson.slug}`;
  const query = new URLSearchParams({ planoDia: item.scheduledFor, planoSemana: String(item.weekNumber) });
  return `${base}?${query.toString()}`;
}
