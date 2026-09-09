"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const DAY_RE = /\bDIA\s*(\d{1,3})\b/i;
const DATE_ONLY_RE = /^\s*(?:\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?|(?:seg|ter|qua|qui|sex|s[aá]b|dom)(?:unda|ça|rta|nta|xta|ado|ingo)?(?:-feira)?\s*,?\s*\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?)\s*$/i;

function stripInlineDate(text: string) {
  return text
    .replace(/\s*[•·|]\s*\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?/g, "")
    .replace(/\s+[—–-]\s+\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?/g, "")
    .replace(/\s+\(\s*\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function ScheduleDayLabelNormalizer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/cronograma")) return;

    let frame = 0;
    const normalize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const main = document.querySelector("main");
        if (!main) return;

        const leaves = Array.from(main.querySelectorAll<HTMLElement>("*"))
          .filter((element) => element.children.length === 0 && Boolean(element.textContent?.trim()));

        const mapping = new Map<number, number>();
        let nextDay = 1;

        for (const element of leaves) {
          const text = element.textContent?.trim() ?? "";
          const match = text.match(DAY_RE);
          if (!match) continue;

          const original = Number(match[1]);
          if (!mapping.has(original)) {
            mapping.set(original, nextDay);
            nextDay += 1;
          }
          const normalizedDay = mapping.get(original) ?? 1;
          const nextText = stripInlineDate(text.replace(DAY_RE, `DIA ${normalizedDay}`));
          if (nextText !== text) element.textContent = nextText;
          element.dataset.mtDayNormalized = "1";
        }

        for (const element of leaves) {
          if (element.dataset.mtDayNormalized === "1" || element.dataset.mtDateHidden === "1") continue;
          const text = element.textContent?.trim() ?? "";
          if (!DATE_ONLY_RE.test(text)) continue;

          let parent = element.parentElement;
          let depth = 0;
          let belongsToDayCard = false;
          while (parent && parent !== main && depth < 5) {
            if (DAY_RE.test(parent.textContent ?? "")) {
              belongsToDayCard = true;
              break;
            }
            parent = parent.parentElement;
            depth += 1;
          }
          if (belongsToDayCard) {
            element.style.display = "none";
            element.dataset.mtDateHidden = "1";
          }
        }
      });
    };

    normalize();
    const observer = new MutationObserver(normalize);
    const main = document.querySelector("main");
    if (main) observer.observe(main, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
