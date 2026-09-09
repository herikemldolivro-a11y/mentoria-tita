"use client";

import { Crown, Diamond, Gem, Shield, Sparkles, Star } from "lucide-react";
import type { CSSProperties } from "react";
import type { RankInfo } from "@/lib/xp-system";

type TierStyle = {
  frame: string;
  core: string;
  icon: typeof Shield;
  clip: string;
};

const tierStyles: Record<number, TierStyle> = {
  1: { frame: "from-[#5f3a22] via-[#a66031] to-[#3b2318]", core: "bg-[#20150f]", icon: Shield, clip: "polygon(50% 0, 92% 22%, 92% 72%, 50% 100%, 8% 72%, 8% 22%)" },
  2: { frame: "from-[#7e4d2a] via-[#c67a3b] to-[#5e371f]", core: "bg-[#23160e]", icon: Star, clip: "polygon(50% 0, 88% 14%, 100% 50%, 82% 90%, 50% 100%, 18% 90%, 0 50%, 12% 14%)" },
  3: { frame: "from-[#68717d] via-[#c7ced8] to-[#4c5561]", core: "bg-[#15191f]", icon: Sparkles, clip: "polygon(50% 0, 82% 10%, 100% 38%, 92% 75%, 70% 100%, 30% 100%, 8% 75%, 0 38%, 18% 10%)" },
  4: { frame: "from-[#8b651e] via-[#f2c34b] to-[#5d3f0f]", core: "bg-[#211a0b]", icon: Crown, clip: "polygon(50% 0, 67% 18%, 92% 14%, 82% 48%, 96% 78%, 50% 100%, 4% 78%, 18% 48%, 8% 14%, 33% 18%)" },
  5: { frame: "from-[#8f7c2a] via-[#ffe06c] to-[#6d5915]", core: "bg-[#201b09]", icon: Crown, clip: "polygon(50% 0, 62% 18%, 84% 8%, 80% 31%, 100% 40%, 82% 58%, 90% 86%, 62% 82%, 50% 100%, 38% 82%, 10% 86%, 18% 58%, 0 40%, 20% 31%, 16% 8%, 38% 18%)" },
  6: { frame: "from-[#b9d7ee] via-white to-[#7eb3d5]", core: "bg-[#101922]", icon: Diamond, clip: "polygon(50% 0, 88% 27%, 72% 100%, 28% 100%, 12% 27%)" },
  7: { frame: "from-[#7f1324] via-[#ef3f5b] to-[#4a0812]", core: "bg-[#24070d]", icon: Gem, clip: "polygon(50% 0, 88% 18%, 100% 55%, 72% 100%, 28% 100%, 0 55%, 12% 18%)" },
  8: { frame: "from-[#492080] via-[#c879ff] to-[#281044]", core: "bg-[#12051f]", icon: Crown, clip: "polygon(50% 0, 61% 17%, 82% 8%, 79% 29%, 100% 41%, 83% 57%, 91% 83%, 66% 78%, 50% 100%, 34% 78%, 9% 83%, 17% 57%, 0 41%, 21% 29%, 18% 8%, 39% 17%)" },
};

export function XpRankInsignia({ rank, level, size = "md" }: { rank: RankInfo; level: number; size?: "sm" | "md" | "lg" }) {
  const style = tierStyles[rank.tier] ?? tierStyles[1];
  const Icon = style.icon;
  const dimensions = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-24 w-24" : "h-16 w-16";
  const iconSize = size === "sm" ? 18 : size === "lg" ? 39 : 27;
  const clipStyle: CSSProperties = { clipPath: style.clip };

  return (
    <div
      className={`relative ${dimensions} shrink-0 overflow-visible bg-transparent`}
      title={`${rank.title} · Nível ${level}`}
      data-rank-insignia="shape-only"
    >
      {/*
        IMPORTANTE: o wrapper externo e totalmente transparente.
        O brilho externo e outra copia RECORTADA da propria insignia, sem blur, box-shadow ou drop-shadow.
        Assim nenhum efeito pode formar um quadrado em volta do desenho.
      */}
      {rank.tier >= 4 ? <div className={`pointer-events-none absolute inset-[-2px] bg-gradient-to-br ${style.frame} opacity-25`} style={{ ...clipStyle, transform: "scale(1.035)" }} /> : null}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.frame}`} style={clipStyle} />
      <div className={`absolute inset-[4px] ${style.core}`} style={clipStyle} />
      <div className="absolute inset-[4px] border border-white/20 bg-transparent" style={clipStyle} />

      {rank.tier === 8 ? (
        <>
          <Sparkles className="pointer-events-none absolute -right-1 top-0 z-20 text-violet-200/90" size={size === "lg" ? 17 : 11} />
          <Sparkles className="pointer-events-none absolute -left-1 bottom-1 z-20 text-fuchsia-200/70" size={size === "lg" ? 14 : 9} />
        </>
      ) : null}

      <div className={`absolute inset-0 z-10 grid place-items-center bg-transparent ${rank.tier === 8 ? "text-violet-100" : "text-white"}`} style={clipStyle}>
        <div className="grid place-items-center bg-transparent">
          <Icon size={iconSize} strokeWidth={rank.tier === 8 ? 2.05 : 1.8} />
          {size !== "sm" ? <span className="mt-0.5 text-[8px] font-black tracking-[.08em] text-white/78">LV {level}</span> : null}
        </div>
      </div>

      {rank.tier >= 6 ? <span className="pointer-events-none absolute -right-1 -top-1 z-20 h-2.5 w-2.5 animate-pulse rounded-full bg-white/80 blur-[1px]" /> : null}
    </div>
  );
}
