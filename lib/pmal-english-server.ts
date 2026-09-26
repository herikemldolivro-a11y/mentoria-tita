import { createClient } from "@/lib/supabase/server";

export type PmalEnglishDailyTask = {
  id: string;
  textId: string;
  title: string;
  slug: string;
  position: number;
  dayNumber: number;
  assignedDate: string;
  slot: 1 | 2;
  completed: boolean;
  isRepeat: boolean;
  cycle: number;
  href: string;
};

type EnglishCatalogItem = {
  id: string;
  slug: string;
  title: string;
  position: number;
};

const PMAL_ENGLISH_START = "2026-09-16";

// Fallback real do próprio banco CFO PMAL.
// Só entra se a leitura Supabase falhar; não inventa textos.
const PMAL_REAL_TEXT_FALLBACK: EnglishCatalogItem[] = [
  { id: "e2822ac3-2297-4242-824d-804ed694dbec", slug: "how-the-brain-can-recover", title: "How the brain can recover", position: 1 },
  { id: "a2007993-5d82-487f-835f-1f978db65677", slug: "new-rules-for-a-large-technology-company", title: "New rules for a large technology company", position: 2 },
  { id: "0663927a-63c7-4481-8e65-5d68fe296f52", slug: "cleaner-ways-to-color-clothes", title: "Cleaner ways to color clothes", position: 3 },
  { id: "a8832a3b-1ebe-4522-9820-521c66e5264d", slug: "why-new-english-words-disappear", title: "Why new English words disappear", position: 4 },
  { id: "c68f477a-3f78-4eaf-a74c-1a5a338afa11", slug: "how-a-music-tour-can-help-a-city", title: "How a music tour can help a city", position: 5 },
  { id: "021acc63-6c59-4b85-b0d0-67de16019ba1", slug: "ai-can-make-online-scams-harder-to-see", title: "AI can make online scams harder to see", position: 6 },
  { id: "c260541b-45d9-4b5f-83e1-fbea56c74962", slug: "dangerous-driving-trends-online", title: "Dangerous driving trends online", position: 7 },
  { id: "bc9c5d11-2f8a-47f0-9acc-d72582244f61", slug: "does-sleep-position-matter", title: "Does sleep position matter?", position: 8 },
  { id: "96cd7f94-9d21-484e-8cda-ef2defbd2223", slug: "reading-changes-the-brain", title: "Reading changes the brain", position: 9 },
  { id: "23baab02-2cdd-4521-83e9-971ca29d5696", slug: "a-shorter-arctic-route-brings-new-risks", title: "A shorter Arctic route brings new risks", position: 10 },
  { id: "0f4b7b51-142e-4ea6-8baf-a0ccb3c3fade", slug: "teenagers-need-more-sleep", title: "Teenagers need more sleep", position: 11 },
  { id: "de41fa3e-29d7-44b6-b597-5961dedde35d", slug: "power-plants-need-reliable-water", title: "Power plants need reliable water", position: 12 },
];

function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function daysBetweenInclusive(start: string, end: string) {
  return Math.max(
    1,
    Math.round((utcDate(end).getTime() - utcDate(start).getTime()) / 86_400_000) + 1,
  );
}

async function loadCatalog(): Promise<EnglishCatalogItem[]> {
  try {
    const supabase = await createClient();

    const { data: plan } = await supabase
      .from("study_plans")
      .select("id")
      .eq("slug", "cfo-pmal-2026")
      .eq("active", true)
      .maybeSingle();

    if (!plan?.id) return PMAL_REAL_TEXT_FALLBACK;

    const { data: texts, error } = await supabase
      .from("english_texts")
      .select("id,slug,title,position")
      .eq("plan_id", plan.id)
      .eq("active", true)
      .order("position", { ascending: true });

    if (error || !texts?.length) return PMAL_REAL_TEXT_FALLBACK;

    return texts.map((item) => ({
      id: String(item.id),
      slug: String(item.slug),
      title: String(item.title),
      position: Number(item.position),
    }));
  } catch {
    return PMAL_REAL_TEXT_FALLBACK;
  }
}

export async function loadPmalEnglishDailyTasks(
  scheduleEnd: string | null | undefined,
): Promise<PmalEnglishDailyTask[]> {
  const catalog = await loadCatalog();
  if (!catalog.length) return [];

  // V12.7: lê o progresso real para permitir que o botão do DIA fique verde
  // somente depois das aulas + 2 textos do dia estarem concluídos.
  const completedTextIds = new Set<string>();
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: progress } = await supabase
        .from("user_english_text_progress")
        .select("text_id,status,completed_at")
        .eq("user_id", authData.user.id)
        .in("text_id", catalog.map((item) => item.id));

      for (const item of progress ?? []) {
        if (item.status === "completed" && item.completed_at) {
          completedTextIds.add(String(item.text_id));
        }
      }
    }
  } catch {
    // O leitor continua funcional mesmo se o status de progresso falhar.
  }

  const end =
    scheduleEnd && scheduleEnd >= PMAL_ENGLISH_START
      ? scheduleEnd
      : addDays(PMAL_ENGLISH_START, 39);

  const totalDays = daysBetweenInclusive(PMAL_ENGLISH_START, end);
  const tasks: PmalEnglishDailyTask[] = [];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const assignedDate = addDays(PMAL_ENGLISH_START, dayIndex);

    for (let slotIndex = 0; slotIndex < 2; slotIndex += 1) {
      const absoluteIndex = dayIndex * 2 + slotIndex;
      const text = catalog[absoluteIndex % catalog.length];
      const cycle = Math.floor(absoluteIndex / catalog.length) + 1;

      tasks.push({
        id: `${assignedDate}:${slotIndex + 1}:${text.id}`,
        textId: text.id,
        title: text.title,
        slug: text.slug,
        position: text.position,
        dayNumber: dayIndex + 1,
        assignedDate,
        slot: (slotIndex + 1) as 1 | 2,
        completed: cycle === 1 && completedTextIds.has(text.id),
        isRepeat: cycle > 1,
        cycle,
        href: `/ingles/texto/${text.id}?return=pmal&pmalDia=${dayIndex + 1}&pmalSlot=${slotIndex + 1}`,
      });
    }
  }

  return tasks;
}
