import { ArrowLeft, BookOpenText, Link2, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EnglishConnectivesPage() {
  await requireAuthenticatedUser();

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[960px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <Link href="/ingles" className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]">
          <ArrowLeft size={14} /> VOLTAR AO INGLÊS
        </Link>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-sky-300/15 bg-[radial-gradient(circle_at_85%_0%,rgba(56,189,248,.15),transparent_34%),linear-gradient(145deg,#0b1117,#07090c_72%)] p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-sky-300">
            <Link2 size={15} /> CONECTIVOS
          </span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-white sm:text-5xl">Banco de conectivos.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/48">
            A aba já está preparada. Por enquanto o foco do CFO PMAL continua sendo leitura e aquisição de repertório; mais perto dos simulados você adiciona aqui os conectivos que quiser treinar.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
              <BookOpenText size={19} className="text-sky-300" />
              <strong className="mt-3 block font-serif text-xl text-white">Agora</strong>
              <p className="mt-2 text-[11px] leading-5 text-white/40">2 textos de Inglês por dia para aumentar repertório e familiaridade com leitura.</p>
            </div>
            <div className="rounded-2xl border border-violet-300/[.12] bg-violet-300/[.025] p-5">
              <Sparkles size={19} className="text-violet-300" />
              <strong className="mt-3 block font-serif text-xl text-white">Depois</strong>
              <p className="mt-2 text-[11px] leading-5 text-white/40">Conectivos, questões e treino direcionado quando a fase de simulados começar.</p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
