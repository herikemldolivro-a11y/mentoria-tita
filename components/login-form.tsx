"use client";

import { AlertCircle, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage("Não foi possível entrar. Verifique seu e-mail e sua senha.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage("O acesso está indisponível no momento. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="login-field">
        <span>E-mail</span>
        <span className="login-input-wrap">
          <Mail size={18} aria-hidden="true" />
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            required
            disabled={isLoading}
          />
        </span>
      </label>

      <label className="login-field">
        <span>Senha</span>
        <span className="login-input-wrap">
          <LockKeyhole size={18} aria-hidden="true" />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite sua senha"
            required
            disabled={isLoading}
          />
        </span>
      </label>

      {errorMessage ? (
        <div className="login-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <button className="login-submit" type="submit" disabled={isLoading}>
        {isLoading ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : null}
        <span>{isLoading ? "Entrando..." : "Entrar"}</span>
      </button>
    </form>
  );
}
