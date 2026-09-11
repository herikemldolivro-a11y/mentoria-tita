import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Entrar | Mentoria Titã — Foco 95+",
  description: "Acesso exclusivo dos alunos da Mentoria Titã.",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="login-page bg-[var(--background)]">
      <span className="tita-fire-rail fixed left-0 top-0 h-full" aria-hidden="true" />
      <div className="login-grid overflow-hidden rounded-[30px] border-white/[.1] bg-[#0b0c0e]">
        <section className="login-intro !border-white/[.07] !bg-[radial-gradient(circle_at_18%_15%,rgba(210,214,219,.08),transparent_24rem),linear-gradient(145deg,#0d0f12,#07080a_68%)]" aria-labelledby="login-title">
          <Brand />
          <div className="login-intro-copy">
            <span className="eyebrow !text-[var(--tita-accent)]"><span className="eyebrow-line !bg-[var(--tita-accent-dim)]" /> ÁREA RESTRITA</span>
            <h1 id="login-title">Entre para continuar sua jornada.</h1>
            <p>Sua preparação. Seu desempenho. Sua aprovação.</p>
          </div>
          <div className="login-security-note !border-white/[.08] !bg-white/[.025]">
            <ShieldCheck size={20} aria-hidden="true" />
            <span>Acesso exclusivo para alunos cadastrados.</span>
          </div>
        </section>

        <section className="login-panel !bg-[#0c0d0f]" aria-label="Acesso do aluno">
          <span className="eyebrow !text-[var(--tita-accent)]">AUTENTICAÇÃO</span>
          <h2>Bem-vindo de volta</h2>
          <p>Use suas credenciais para acessar o painel.</p>
          <LoginForm />
          <div className="mt-5 border-t border-white/[.07] pt-5">
            <span className="block text-[9px] leading-5 text-white/32">Recebeu um código de acesso?</span>
            <Link href="/cadastro" className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[.09] bg-white/[.025] px-3 text-[9px] font-black tracking-[.08em] text-white/65 transition hover:bg-white/[.055] hover:text-white"><KeyRound size={14} /> CRIAR CONTA COM CÓDIGO</Link>
          </div>
          <small>Em caso de dificuldade, entre em contato com a equipe da mentoria.</small>
        </section>
      </div>
    </main>
  );
}
