import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { ContestSelector } from "@/components/contest-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function OnboardingPage() {
  const { focusContest, displayName } = await requireAuthenticatedUser();

  if (focusContest) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
          <Brand />
          <ThemeToggle />
        </header>

        <section className="py-10 sm:py-14">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.24em] text-[var(--gold-bright)]">
            PRIMEIRO ACESSO · FOCO 95+
          </span>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[0.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Qual é a sua <em className="text-[var(--gold-bright)]">missão?</em>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Olá, {displayName}. Selecione seu concurso foco para personalizarmos sua
            preparação, suas semanas e os recursos exibidos no painel.
          </p>
        </section>

        <ContestSelector />

        <p className="mx-auto mt-10 max-w-3xl text-center text-[10px] leading-relaxed text-[var(--muted)]">
          Plataforma independente. Sem vínculo oficial com as instituições exibidas.
          Símbolos institucionais são usados apenas para identificação do concurso e
          permanecem inalterados.
        </p>
      </div>
    </main>
  );
}
