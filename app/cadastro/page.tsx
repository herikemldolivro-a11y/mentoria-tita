import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { RegistrationForm } from "@/components/registration-form";

export const metadata: Metadata = {
  title: "Criar conta | Mentoria Titã",
  description: "Cadastro de aluno por código de acesso.",
};

export const dynamic = "force-dynamic";

export default function CadastroPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)] px-4 py-8 text-white sm:px-6">
      <span className="tita-fire-rail fixed left-0 top-0 h-full" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 tita-soft-grid opacity-20" />
      <div className="relative mx-auto w-full max-w-[1040px]">
        <header className="flex items-center justify-between border-b border-white/[.07] pb-5">
          <Brand />
          <Link href="/login" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-[9px] font-black tracking-[.09em] text-white/55 transition hover:bg-white/[.05] hover:text-white"><ArrowLeft size={14} /> VOLTAR</Link>
        </header>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_430px] lg:items-center lg:py-16">
          <section>
            <span className="tita-kicker">ACESSO À MENTORIA</span>
            <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-[.94] tracking-[-.045em] sm:text-6xl">Crie sua conta e monte sua trilha.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/43">O cadastro exige um código liberado pela equipe. Depois, você escolhe o concurso, informa sua carga diária e a plataforma organiza o cronograma individual.</p>
            <div className="mt-7 flex max-w-lg items-start gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] p-4 text-[10px] leading-5 text-white/38"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--tita-accent)]" /> O código é validado no banco e tem limite de uso. Não é possível criar conta pública sem convite válido.</div>
          </section>

          <section className="tita-panel-strong rounded-[28px] p-5 sm:p-7">
            <span className="tita-kicker">NOVO ALUNO</span>
            <h2 className="mt-2 font-serif text-3xl">Cadastro</h2>
            <p className="mt-2 text-xs leading-6 text-white/38">Preencha os dados exatamente como deseja usar na plataforma.</p>
            <RegistrationForm />
          </section>
        </div>
      </div>
    </main>
  );
}
