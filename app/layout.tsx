import type { Metadata, Viewport } from "next";
import "./globals.css";

const themeScript = `try { const saved = localStorage.getItem('tita-theme'); document.documentElement.dataset.theme = saved === 'light' ? 'light' : 'dark'; } catch (_) { document.documentElement.dataset.theme = 'dark'; }`;

export const metadata: Metadata = { title: "Mentoria Titã — Foco 95+", description: "Sua preparação. Seu desempenho. Sua aprovação." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#090a0c" }, { media: "(prefers-color-scheme: light)", color: "#f4f1e9" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth"><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>;
}
