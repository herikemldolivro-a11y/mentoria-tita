import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Entrar | Mentoria Titã — Foco 95+",
  description: "Acesso exclusivo dos alunos da Mentoria Titã.",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-theme"><ThemeToggle /></div>
      <div className="login-grid">
        <section className="login-intro" aria-labelledby="login-title">
          <Brand />
          <div className="login-intro-copy">
            <span className="eyebrow"><span className="eyebrow-line" /> ÁREA RESTRITA</span>
            <h1 id="login-title">Entre para continuar sua jornada.</h1>
            <p>Sua preparação. Seu desempenho. Sua aprovação.</p>
          </div>
          <div className="login-security-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <span>Acesso exclusivo para alunos previamente cadastrados.</span>
          </div>
        </section>

        <section className="login-panel" aria-label="Acesso do aluno">
          <span className="eyebrow">AUTENTICAÇÃO</span>
          <h2>Bem-vindo de volta</h2>
          <p>Use suas credenciais para acessar o painel.</p>
          <LoginForm />
          <small>Em caso de dificuldade, entre em contato com a equipe da mentoria.</small>
        </section>
      </div>
    </main>
  );
}
