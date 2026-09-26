"use client";

import { AlertCircle, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RegistrationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            nome: name.trim(),
            registration_source: "hotmart_redirect",
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Conta criada sem usuário retornado.");

      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Conta criada. Se o Supabase solicitar confirmação de e-mail, abra a mensagem recebida para concluir o acesso.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (/already registered|already exists|user already registered/i.test(message)) {
        setErrorMessage("Este e-mail já possui uma conta. Entre pela tela de login.");
      } else if (/password/i.test(message)) {
        setErrorMessage("A senha precisa ter pelo menos 8 caracteres.");
      } else {
        setErrorMessage("Não foi possível criar sua conta. Confira os dados e tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <Field icon={UserRound} label="Nome" value={name} onChange={setName} type="text" placeholder="Seu nome" autoComplete="name" disabled={loading} />
      <Field icon={Mail} label="E-mail" value={email} onChange={setEmail} type="email" placeholder="voce@email.com" autoComplete="email" disabled={loading} />
      <Field icon={LockKeyhole} label="Senha" value={password} onChange={setPassword} type="password" placeholder="Mínimo de 8 caracteres" autoComplete="new-password" minLength={8} disabled={loading} />

      {errorMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/[.07] px-4 py-3 text-xs text-red-200" role="alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-4 py-3 text-xs leading-5 text-emerald-100" role="status">
          {successMessage}
        </div>
      ) : null}

      <button type="submit" disabled={loading} className="tita-primary-button w-full">
        {loading ? <LoaderCircle className="animate-spin" size={16} /> : null}
        {loading ? "CRIANDO CONTA..." : "CRIAR CONTA"}
      </button>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  type,
  placeholder,
  autoComplete,
  minLength,
  disabled,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] font-black tracking-[.12em] text-white/42">{label.toUpperCase()}</span>
      <span className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[.09] bg-white/[.025] px-3 text-white/65 focus-within:border-white/[.2] focus-within:bg-white/[.04]">
        <Icon size={16} className="shrink-0 text-[var(--tita-accent-dim)]" />
        <input
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/22"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          disabled={disabled}
        />
      </span>
    </label>
  );
}
