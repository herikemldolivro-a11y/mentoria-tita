import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "student" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  nome: string | null;
  role: UserRole;
  concurso: string | null;
  teste_inicio: string | null;
  teste_fim: string | null;
  ativo: boolean;
}

export interface AuthenticatedUser {
  user: User;
  profile: Profile | null;
  displayName: string;
  role: UserRole;
  isAdmin: boolean;
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id,email,nome,role,concurso,teste_inicio,teste_fim,ativo")
    .eq("id", data.user.id)
    .maybeSingle();

  const profile = profileData as Profile | null;
  const displayName = profile?.nome?.trim() || "Aluno";
  const role: UserRole = profile?.role === "admin" ? "admin" : "student";

  return {
    user: data.user,
    profile,
    displayName,
    role,
    isAdmin: role === "admin",
  };
}
