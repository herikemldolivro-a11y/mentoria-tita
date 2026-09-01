"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="logout-button"
      onClick={handleLogout}
      disabled={isLoading}
      aria-label="Sair da Mentoria Titã"
    >
      {isLoading ? <LoaderCircle className="spin" size={18} /> : <LogOut size={18} />}
      <span className="logout-label">Sair</span>
    </button>
  );
}
