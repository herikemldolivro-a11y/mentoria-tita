import { EnemEnglishVocabulary } from "@/components/enem-english-vocabulary";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EnemEnglishVocabularyPage() {
  await requireAuthenticatedUser();
  return <PageShell><EnemEnglishVocabulary/></PageShell>;
}
