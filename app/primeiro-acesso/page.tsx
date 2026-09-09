import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { FirstAccessNameForm } from "@/components/first-access-name-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function FirstAccessPage() {
  const { profile, isAdmin, focusContest } = await requireAuthenticatedUser();
  const currentName = profile?.nome?.trim() ?? "";

  if (isAdmin) redirect("/");
  if (currentName && currentName.toLowerCase() !== "aluno") {
    redirect(focusContest ? "/" : "/onboarding");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--ink)] sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
          <Brand />
          <ThemeToggle />
        </header>

        <section className="mt-10 overflow-hidden rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-10">
          <span className="text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]">PRIMEIRO ACESSO</span>
          <h1 className="mt-4 font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-6xl">Bem-vindo à Mentoria Titã.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
            Antes de abrir sua preparação, informe seu nome. Ele aparecerá no seu painel e na área administrativa da mentoria.
          </p>
          <FirstAccessNameForm hasFocusContest={Boolean(focusContest)} />
        </section>
      </div>
    </main>
  );
}
