import { BackButton } from "@/components/back-button";
import { Brand } from "@/components/brand";
import { ContestSelector } from "@/components/contest-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function ContestPage() {
  const { focusContest, displayName } = await requireAuthenticatedUser();

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-9">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[#0a0b0d] p-3 shadow-sm">
          <Brand />
          <ThemeToggle />
        </header>

        <section className="py-8 sm:py-11">
          <BackButton fallback="/" label="Voltar ao painel" />
          <span className="mt-8 block text-[10px] font-black tracking-[0.24em] text-[var(--gold-bright)]">PERSONALIZAÇÃO · FOCO 95+</span>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[0.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Trocar concurso <em className="text-[var(--gold-bright)]">foco</em>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            {displayName}, escolha a missão que deseja visualizar agora. O cronograma e os recursos passam a seguir o concurso selecionado.
          </p>
        </section>

        <ContestSelector currentSlug={focusContest?.slug ?? null} changing />
      </div>
    </main>
  );
}
