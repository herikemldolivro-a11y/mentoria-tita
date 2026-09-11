import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { AdminRegistrationCodes } from "@/components/admin-registration-codes";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminCodesPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-8 border-b border-white/[.07] pb-7">
          <span className="inline-flex items-center gap-2 tita-kicker"><KeyRound size={15} /> ACESSO DE ALUNOS</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-5xl">Códigos de cadastro.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">Gere convites com limite de uso e validade. O aluno usa o código na tela de cadastro e entra direto no onboarding.</p>
        </header>
        <AdminRegistrationCodes />
      </div>
    </PageShell>
  );
}
