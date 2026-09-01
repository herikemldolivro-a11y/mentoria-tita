"use client";

import { AlertCircle, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveLoginEmail } from "@/lib/login-identity";

export function LoginForm() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const email = resolveLoginEmail(identity);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage("Não foi possível entrar. Verifique seu usuário e sua senha.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message === "Usuário inválido"
        ? "Digite um nome de usuário válido."
        : "O acesso está indisponível no momento. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="login-field">
        <span>Usuário</span>
        <span className="login-input-wrap">
          <UserRound size={18} aria-hidden="true" />
          <input
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identity}
            onChange={(event) => setIdentity(event.target.value)}
            placeholder="Digite seu usuário"
            required
            disabled={isLoading}
          />
        </span>
        <small>Contas antigas também podem entrar usando o e-mail.</small>
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
