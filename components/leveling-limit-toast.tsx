"use client";

import { CircleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ShiftedLeveling = {
  id: string;
  scheduled_for?: string | null;
  daily_limit_shifted?: boolean;
  daily_limit_shifted_from?: string | null;
};

type HubLike = {
  leveling_daily_limit?: {
    limit?: number;
  } | null;
  levelings?: ShiftedLeveling[];
};

type NoticeState = {
  text: string;
  signature: string;
} | null;

const STORAGE_KEY = "tita:leveling-limit-seen:v56";
const DISMISSED_KEY = "tita:leveling-limit-dismissed:v56";

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function LevelingLimitToast({ hub }: { hub: HubLike }) {
  const [notice, setNotice] = useState<NoticeState>(null);

  const shifted = useMemo(
    () =>
      (hub.levelings ?? [])
        .filter(
          (item) =>
            item.daily_limit_shifted === true &&
            typeof item.daily_limit_shifted_from === "string" &&
            item.daily_limit_shifted_from.length > 0,
        )
        .map((item) => ({
          key: `${item.id}:${item.daily_limit_shifted_from}:${item.scheduled_for ?? ""}`,
          from: item.daily_limit_shifted_from as string,
        })),
    [hub.levelings],
  );

  useEffect(() => {
    let previous: string[] | null = null;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      previous = raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      previous = null;
    }

    const currentKeys = shifted.map((item) => item.key);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentKeys));
    } catch {
      // O calendário continua funcionando mesmo sem localStorage.
    }

    // Primeira carga só memoriza o estado atual.
    if (previous === null) return;

    const previousSet = new Set(previous);
    const added = shifted.filter((item) => !previousSet.has(item.key));
    if (!added.length) return;

    const signature = added
      .map((item) => item.key)
      .sort()
      .join("|");

    try {
      if (window.sessionStorage.getItem(DISMISSED_KEY) === signature) return;
    } catch {
      // Sem sessionStorage, apenas exibe normalmente.
    }

    const dates = [...new Set(added.map((item) => item.from))].map(formatDate);
    const dateText =
      dates.length === 1
        ? ` em ${dates[0]}`
        : dates.length > 1
          ? ` nos dias ${dates.join(", ")}`
          : "";

    const limit = hub.leveling_daily_limit?.limit ?? 5;

    setNotice({
      signature,
      text:
        `Limite diário de ${limit} nivelamentos atingido${dateText}. ` +
        `${added.length} excedente(s) foram movidos automaticamente para os próximos dias, ` +
        `com prioridade para os níveis menores.`,
    });
  }, [hub.leveling_daily_limit?.limit, shifted]);

  // O timer depende apenas do aviso. Atualizações do calendário não cancelam
  // mais o fechamento automático.
  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(DISMISSED_KEY, notice.signature);
      } catch {
        // noop
      }
      setNotice(null);
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  function closeNotice() {
    if (!notice) return;
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, notice.signature);
    } catch {
      // noop
    }
    setNotice(null);
  }

  if (!notice) return null;

  return (
    <div
      data-mt-leveling-toast-v56="1"
      className="fixed right-4 top-20 z-[150] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-amber-400/30 bg-[#17120a]/95 p-4 pr-11 text-xs leading-6 text-amber-100 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur"
    >
      <button
        type="button"
        onClick={closeNotice}
        aria-label="Fechar aviso"
        className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-amber-200/15 bg-white/[.04] text-amber-100/70 transition hover:bg-white/[.09] hover:text-white"
      >
        <X size={15} />
      </button>

      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 shrink-0 text-amber-300" size={17} />
        <div>
          <strong className="block text-[10px] font-black tracking-[.12em] text-amber-300">
            LIMITE DIÁRIO DE NIVELAMENTOS
          </strong>
          <span className="mt-1 block">{notice.text}</span>
          <span className="mt-2 block text-[9px] font-black tracking-[.08em] text-amber-100/40">
            FECHA SOZINHO EM 7 SEGUNDOS
          </span>
        </div>
      </div>
    </div>
  );
}

