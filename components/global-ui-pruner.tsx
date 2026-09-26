"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { canRunLegacyDomEffect } from "@/lib/legacy-dom-scope";

type RemovalRule = {
  id?: string;
  anchor: string;
  required: string[];
  paths: string[];
};

const RULES: RemovalRule[] = [
  {
    anchor: "Horários da sua rotina",
    required: ["HORÁRIO", "REVISÃO MARCADA HOJE", "ROTINA FIXA DO DIA"],
    paths: ["/"],
  },
  {
    anchor: "Continue exatamente de onde o plano mandou.",
    required: ["PRÓXIMO PASSO", "ESPELHO DO CRONOGRAMA", "Continue exatamente de onde o plano mandou.", "NA SEQUÊNCIA DO CRONOGRAMA"],
    paths: ["/"],
  },
  {
    anchor: "Agenda de domínio",
    required: ["PRÓXIMAS REVISÕES", "Agenda de domínio"],
    paths: ["/"],
  },
];

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function leafElements() {
  return Array.from(document.querySelectorAll<HTMLElement>("*")).filter(
    (element) => element.children.length === 0 && cleanText(element.textContent).length > 0,
  );
}

function findAnchor(anchor: string) {
  const leaves = leafElements();
  return leaves.find((element) => cleanText(element.textContent) === anchor)
    ?? leaves.find((element) => cleanText(element.textContent).includes(anchor))
    ?? null;
}

function smallestContainer(start: HTMLElement, required: string[]) {
  let node: HTMLElement | null = start;
  let depth = 0;

  while (node && depth < 14) {
    const current: HTMLElement = node;
    if (current.tagName === "MAIN" || current.tagName === "BODY" || current.tagName === "HTML") return null;

    const text = cleanText(current.textContent);
    if (required.every((marker) => text.includes(marker))) {
      // MT_V25_NOTEBOOK_SAFETY
      const isNotebookRule = required.some((marker) =>
        marker.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().includes("CADERNO DE ANOTACOES"),
      );

      if (isNotebookRule) {
        const normalized = text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase();

        const containsCalendar =
          normalized.includes("AGENDA MENSAL") ||
          normalized.includes("CALENDARIO PRINCIPAL") ||
          normalized.includes("ADICIONAR REVISAO") ||
          normalized.includes("REVISOES AGENDADAS") ||
          normalized.includes("NIVELAMENTOS PENDENTES");

        // Se o ancestral ja engloba o calendario, NAO remove nada.
        // Isso impede a tela preta causada pelo V23.
        if (containsCalendar) return null;
      }

      return current;
    }

    node = current.parentElement;
    depth += 1;
  }

  return null;
}

function removeStandaloneStarred(pathname: string) {
  if (pathname !== "/" && pathname !== "/questoes") return;

  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href*="/questoes/banco?status=starred"], [data-tita-starred-bank-card="1"]',
  ));

  const priority = findAnchor("PRIORIDADE PESSOAL");
  if (priority) candidates.push(priority);

  for (const candidate of candidates) {
    let node: HTMLElement | null = candidate;
    let depth = 0;

    while (node && depth < 10) {
      const current: HTMLElement = node;
      const text = cleanText(current.textContent);

      if (
        text.includes("PRIORIDADE PESSOAL") &&
        (text.includes("Revise por") || text.includes("Questões erradas vêm primeiro") || text.includes("Questões Estreladas"))
      ) {
        current.remove();
        break;
      }

      if (current.tagName === "MAIN" || current.tagName === "BODY" || current.tagName === "HTML") break;
      node = current.parentElement;
      depth += 1;
    }
  }
}

function removeBarroBranco() {
  document.querySelectorAll<HTMLAnchorElement>(
    'a[href="/barro-branco"], a[href^="/barro-branco?"]',
  ).forEach((link) => {
    const container =
      link.closest("li") ??
      link.closest('[role="menuitem"]') ??
      link.closest("[data-nav-item]") ??
      link;
    container.remove();
  });
}

function apply(pathname: string) {
  // MT_V32_CALENDAR_NO_DOM_MUTATION
  // Nunca remover/reparentear DOM controlado pelo React em /calendario.
  if (
    typeof window !== "undefined" &&
    (window.location.pathname === "/calendario" ||
      window.location.pathname.startsWith("/calendario/"))
  ) {
    return;
  }

  if (!canRunLegacyDomEffect(pathname)) return;

  removeBarroBranco();
  removeStandaloneStarred(pathname);

  for (const rule of RULES) {
    if (!rule.paths.includes(pathname)) continue;
    const anchor = findAnchor(rule.anchor);
    if (!anchor) continue;
    const container = smallestContainer(anchor, rule.required);
    if (container) container.remove();
  }
}

export function GlobalUiPruner() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!pathname || !canRunLegacyDomEffect(pathname)) return;

    let active = true;
    let frame = 0;
    const run = () => {
      if (!active || !canRunLegacyDomEffect(pathname)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Revalidar aqui: a navegacao pode ocorrer depois de agendar o frame.
        if (!active || !canRunLegacyDomEffect(pathname)) return;
        apply(pathname);
      });
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
