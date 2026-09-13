import { EnemEnglishReader } from "@/components/enem-english-reader";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EnemEnglishReadingPage({ params }:{ params:Promise<{ readingId:string }> }) {
  await requireAuthenticatedUser();
  const { readingId } = await params;
  return <PageShell><EnemEnglishReader readingId={readingId}/></PageShell>;
}
