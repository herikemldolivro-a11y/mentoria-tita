"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AccountActivationForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Sua senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      router.replace("/primeiro-acesso");
      router.refresh();
    } catch {
      setErrorMessage("Não foi possível ativar sua conta. Abra novamente o link enviado para o seu e-mail.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="mt-6 flex min-h-40 items-center justify-center rounded-2xl border border-white/[.07] bg-white/[.02] text-xs text-white/45">
        <LoaderCircle className="mr-2 animate-spin" size={17} />
        Validando seu acesso...
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-xs leading-6 text-amber-100/80">
        <div className="flex items-start gap-2">
          <AlertCircle size={17} className="mt-1 shrink-0" />
          <div>
            <strong className="block text-amber-100">Link de ativação inválido ou expirado.</strong>
            Abra o link de ativação recebido no e-mail usado na compra. Se o problema continuar, entre em contato com o suporte da Mentoria Titã.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <PasswordField
        label="Nova senha"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
      />
      <PasswordField
        label="Confirmar senha"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        placeholder="Repita sua senha"
      />

      {errorMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/[.07] px-4 py-3 text-xs text-red-200" role="alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {errorMessage}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] px-4 py-3 text-[10px] leading-5 text-emerald-100/65">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          Seu acesso foi validado. Defina sua senha para continuar.
        </div>
      )}

      <button type="submit" disabled={loading} className="tita-primary-button w-full">
        {loading ? <LoaderCircle className="animate-spin" size={16} /> : null}
        {loading ? "ATIVANDO..." : "ATIVAR MINHA CONTA"}
      </button>
    </form>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] font-black tracking-[.12em] text-white/42">{label.toUpperCase()}</span>
      <span className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[.09] bg-white/[.025] px-3 text-white/65 focus-within:border-white/[.2] focus-within:bg-white/[.04]">
        <LockKeyhole size={16} className="shrink-0 text-[var(--tita-accent-dim)]" />
        <input
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/22"
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={8}
          required
        />
      </span>
    </label>
  );
}
