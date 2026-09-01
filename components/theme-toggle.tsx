"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function subscribe(callback: () => void) {
  window.addEventListener("tita-theme-change", callback);
  return () => window.removeEventListener("tita-theme-change", callback);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark");
  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("tita-theme", nextTheme);
    window.dispatchEvent(new Event("tita-theme-change"));
  }
  const isDark = theme === "dark";
  return <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"} title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}>{isDark ? <Sun size={19} /> : <Moon size={19} />}</button>;
}
