import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./tita-v3.css";
import "./tita-fire-v2.css";
import "./tita-lesson-stage.css";

const themeScript = `try { document.documentElement.dataset.theme = 'dark'; localStorage.setItem('tita-theme', 'dark'); } catch (_) { document.documentElement.dataset.theme = 'dark'; }`;

export const metadata: Metadata = {
  title: "Mentoria Titã — Foco 95+",
  description: "Sua preparação. Seu desempenho. Sua aprovação.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050607",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth">
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
