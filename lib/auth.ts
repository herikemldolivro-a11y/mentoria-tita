import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "student" | "admin";

export interface FocusContest {
  id: string;
  nome: string;
  sigla: string;
  slug: string;
  logo_path: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  username?: string | null;
  nome: string | null;
  role: UserRole;
  concurso: string | null;
  teste_inicio: string | null;
  teste_fim: string | null;
  ativo: boolean;
  focus_contest_id: string | null;
  active_study_plan_id?: string | null;
  onboarding_completed_at?: string | null;
  daily_study_minutes?: number | null;
  schedule_target_weeks?: number | null;
  schedule_weeks?: number | null;
  schedule_generated_at?: string | null;
  registration_code_id?: string | null;
  focus_contest: FocusContest | null;
}

export interface AuthenticatedUser {
  user: User;
  profile: Profile | null;
  displayName: string;
  role: UserRole;
  isAdmin: boolean;
  focusContest: FocusContest | null;
  loginStreak: number;
}

type RawProfile = Omit<Profile, "focus_contest"> & {
  focus_contest?: FocusContest | FocusContest[] | null;
};

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect("/login");

  const extendedProfileQuery = await supabase
    .from("profiles")
    .select("id,email,username,nome,role,concurso,teste_inicio,teste_fim,ativo,focus_contest_id,active_study_plan_id,onboarding_completed_at,daily_study_minutes,schedule_target_weeks,schedule_weeks,schedule_generated_at,registration_code_id,focus_contest:contests(id,nome,sigla,slug,logo_path)")
    .eq("id", data.user.id)
    .maybeSingle();

  let rawProfile = extendedProfileQuery.data as RawProfile | null;

  if (extendedProfileQuery.error) {
    const { data: legacyProfile } = await supabase
      .from("profiles")
      .select("id,email,nome,role,concurso,teste_inicio,teste_fim,ativo")
      .eq("id", data.user.id)
      .maybeSingle();

    rawProfile = legacyProfile
      ? ({
          ...legacyProfile,
          focus_contest_id: null,
          active_study_plan_id: null,
          onboarding_completed_at: null,
          daily_study_minutes: null,
          schedule_target_weeks: null,
          schedule_weeks: null,
          schedule_generated_at: null,
          registration_code_id: null,
          focus_contest: null,
        } as RawProfile)
      : null;
  }

  const focusRelation = rawProfile?.focus_contest;
  const focusContest = Array.isArray(focusRelation) ? focusRelation[0] ?? null : focusRelation ?? null;
  const profile: Profile | null = rawProfile ? { ...rawProfile, focus_contest: focusContest } : null;
  const displayName = profile?.nome?.trim() || "Aluno";
  const role: UserRole = profile?.role === "admin" ? "admin" : "student";

  let loginStreak = 1;
  try {
    const { data: streakData, error: streakError } = await supabase.rpc("touch_login_streak");
    if (!streakError && typeof streakData === "number" && streakData > 0) loginStreak = streakData;
  } catch {
    // A interface continua funcionando antes da migration da sequência ser aplicada.
  }

  return {
    user: data.user,
    profile,
    displayName,
    role,
    isAdmin: role === "admin",
    focusContest,
    loginStreak,
  };
}
