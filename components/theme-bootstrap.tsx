"use client";

import { useEffect } from "react";

export function ThemeBootstrap() {
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("tita-theme");
      const nextTheme = saved === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      window.dispatchEvent(new Event("tita-theme-change"));
    } catch {
      document.documentElement.dataset.theme = "dark";
    }
  }, []);

  return null;
}