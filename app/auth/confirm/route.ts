import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/ativar-conta";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/ativar-conta";
  redirectTo.searchParams.set("erro", "link-invalido");
  return NextResponse.redirect(redirectTo);
}
