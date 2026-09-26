"use client";

import { Moon } from "lucide-react";

export function ThemeToggle() {
  return (
    <span
      className="theme-toggle !cursor-default !text-[var(--tita-accent)]"
      aria-label="Tema BLACK ativo"
      title="Tema BLACK ativo"
    >
      <Moon size={18} />
    </span>
  );
}
