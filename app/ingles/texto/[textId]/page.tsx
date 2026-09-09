import { EnglishReader } from "@/components/english-reader";
import { PageShell } from "@/components/page-shell";

export default async function EnglishReaderPage({ params }: { params: Promise<{ textId: string }> }) {
  const { textId } = await params;
  return <PageShell><EnglishReader textId={textId} /></PageShell>;
}
