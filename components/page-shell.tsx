import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/app-topbar";
import { UserFocusStrip } from "@/components/user-focus-strip";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function PageShell({ children }: { children: React.ReactNode }) {
  const { displayName, focusContest, loginStreak, isAdmin } = await requireAuthenticatedUser();

  if (!focusContest) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <AppTopbar isAdmin={isAdmin} />
      <UserFocusStrip displayName={displayName} focusContest={focusContest} loginStreak={loginStreak} />
      <main>{children}</main>
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-7">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-2 text-center text-[9px] font-bold tracking-[0.12em] text-[var(--muted)] sm:flex-row sm:justify-between sm:text-left">
          <span>MENTORIA TITÃ · FOCO 95+</span>
          <span>PLATAFORMA INDEPENDENTE · SEM VÍNCULO OFICIAL COM AS INSTITUIÇÕES EXIBIDAS</span>
        </div>
      </footer>
    </div>
  );
}
