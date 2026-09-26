"use client";

import { Crown, Diamond, Gem, Shield, Sparkles, Star, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import type { RankInfo } from "@/lib/xp-system";

type TierStyle = {
  frame: string;
  core: string;
  icon: typeof Shield;
  clip: string;
  glow: string;
  shine: string;
};

const tierStyles: Record<number, TierStyle> = {
  1: {
    frame: "from-[#4f2d1c] via-[#965a32] to-[#2b160d]",
    core: "bg-[#17100b]",
    icon: Shield,
    clip: "polygon(50% 0,88% 16%,92% 66%,50% 100%,8% 66%,12% 16%)",
    glow: "rgba(180,110,64,.18)",
    shine: "rgba(255,218,180,.34)",
  },
  2: {
    frame: "from-[#606a76] via-[#d4dce5] to-[#414955]",
    core: "bg-[#10151b]",
    icon: Star,
    clip: "polygon(50% 0,80% 10%,100% 40%,88% 78%,50% 100%,12% 78%,0 40%,20% 10%)",
    glow: "rgba(196,208,220,.20)",
    shine: "rgba(255,255,255,.38)",
  },
  3: {
    frame: "from-[#8d6517] via-[#ffd05a] to-[#5d3e0e]",
    core: "bg-[#191205]",
    icon: Sparkles,
    clip: "polygon(50% 0,70% 12%,94% 12%,86% 40%,100% 68%,76% 74%,66% 100%,34% 100%,24% 74%,0 68%,14% 40%,6% 12%,30% 12%)",
    glow: "rgba(255,207,78,.24)",
    shine: "rgba(255,244,196,.48)",
  },
  4: {
    frame: "from-[#0b7750] via-[#43df9b] to-[#034a30]",
    core: "bg-[#051810]",
    icon: Zap,
    clip: "polygon(50% 0,82% 10%,100% 36%,92% 72%,66% 100%,34% 100%,8% 72%,0 36%,18% 10%)",
    glow: "rgba(67,223,155,.28)",
    shine: "rgba(211,255,235,.50)",
  },
  5: {
    frame: "from-[#a45a00] via-[#ffd43b] via-[#fff2a8] to-[#a85c00]",
    core: "bg-[#241202]",
    icon: Crown,
    clip: "polygon(50% 0,60% 13%,76% 5%,80% 21%,97% 18%,88% 40%,100% 56%,83% 66%,90% 92%,64% 82%,50% 100%,36% 82%,10% 92%,17% 66%,0 56%,12% 40%,3% 18%,20% 21%,24% 5%,40% 13%)",
    glow: "rgba(255,207,56,.54)",
    shine: "rgba(255,248,200,.76)",
  },
  6: {
    frame: "from-[#32106e] via-[#7c3aed] via-[#d4b4ff] to-[#4c1d95]",
    core: "bg-[#11051d]",
    icon: Diamond,
    clip: "polygon(50% 0,64% 14%,84% 7%,80% 29%,100% 42%,83% 58%,92% 84%,64% 79%,50% 100%,36% 79%,8% 84%,17% 58%,0 42%,20% 29%,16% 7%,36% 14%)",
    glow: "rgba(150,86,255,.72)",
    shine: "rgba(233,216,255,.84)",
  },
  7: {
    frame: "from-[#21003e] via-[#a21caf] via-[#f06cff] to-[#3b0764]",
    core: "bg-[#0d0214]",
    icon: Gem,
    clip: "polygon(50% 0,58% 12%,72% 2%,76% 18%,92% 11%,86% 34%,100% 50%,84% 62%,93% 92%,64% 80%,50% 100%,36% 80%,7% 92%,16% 62%,0 50%,14% 34%,8% 11%,24% 18%,28% 2%,42% 12%)",
    glow: "rgba(217,70,239,.90)",
    shine: "rgba(255,218,252,.94)",
  },
  8: {
    frame: "from-[#250043] via-[#6d28d9] via-[#ec4899] via-[#ffd166] to-[#4c1d95]",
    core: "bg-[#090210]",
    icon: Crown,
    clip: "polygon(50% 0,59% 9%,72% 2%,78% 16%,94% 11%,89% 31%,100% 44%,88% 56%,96% 82%,70% 77%,50% 100%,30% 77%,4% 82%,12% 56%,0 44%,11% 31%,6% 11%,22% 16%,28% 2%,41% 9%)",
    glow: "rgba(196,116,255,1)",
    shine: "rgba(255,241,182,1)",
  },
};

function ShapeGlow({
  clip,
  background,
  scale,
  blur,
  opacity,
  pulse = false,
}: {
  clip: string;
  background: string;
  scale: number;
  blur: number;
  opacity: number;
  pulse?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${pulse ? "animate-pulse" : ""}`}
      style={{
        clipPath: clip,
        background,
        transform: `scale(${scale})`,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
}

export function XpRankInsignia({
  rank,
  level,
  size = "md",
}: {
  rank: RankInfo;
  level: number;
  size?: "sm" | "md" | "lg";
}) {
  const style = tierStyles[rank.tier] ?? tierStyles[1];
  const Icon = style.icon;

  const dimensions =
    size === "sm" ? "h-12 w-12" : size === "lg" ? "h-28 w-28" : "h-[72px] w-[72px]";
  const iconSize = size === "sm" ? 18 : size === "lg" ? 40 : 28;
  const clipStyle: CSSProperties = { clipPath: style.clip };

  const isElite = rank.tier === 5;
  const isMini = rank.tier === 6;
  const isTita = rank.tier === 7;
  const isSupreme = rank.tier === 8;

  const auraScale =
    isSupreme ? 1.54 :
    isTita ? 1.37 :
    isMini ? 1.22 :
    isElite ? 1.14 :
    rank.tier >= 3 ? 1.08 : 1.04;

  const auraOpacity =
    isSupreme ? 1 :
    isTita ? 0.91 :
    isMini ? 0.72 :
    isElite ? 0.54 :
    rank.tier >= 3 ? 0.28 : 0.18;

  const auraBlur =
    isSupreme ? 13 :
    isTita ? 10 :
    isMini ? 7 :
    isElite ? 5 : 4;

  return (
    <div
      className={`relative ${dimensions} shrink-0 overflow-visible bg-transparent`}
      title={`${rank.title} - N\u00edvel ${level}`}
      data-rank-insignia={rank.slug}
    >
      <ShapeGlow
        clip={style.clip}
        background={style.glow}
        scale={auraScale}
        blur={auraBlur}
        opacity={auraOpacity}
        pulse={rank.tier >= 6}
      />

      {isMini ? (
        <>
          <div
            className="pointer-events-none absolute left-[-34%] top-[25%] h-[44%] w-[47%] -rotate-[13deg]"
            style={{
              clipPath: "polygon(100% 20%,64% 0,0 28%,58% 47%,10% 74%,70% 70%,35% 100%,100% 80%)",
              background: "linear-gradient(90deg,rgba(139,92,246,.10),rgba(220,196,255,.82),rgba(91,33,182,.22))",
              filter: "drop-shadow(0 0 8px rgba(139,92,246,.58))",
            }}
          />
          <div
            className="pointer-events-none absolute right-[-34%] top-[25%] h-[44%] w-[47%] rotate-[13deg]"
            style={{
              clipPath: "polygon(0 20%,36% 0,100% 28%,42% 47%,90% 74%,30% 70%,65% 100%,0 80%)",
              background: "linear-gradient(270deg,rgba(139,92,246,.10),rgba(220,196,255,.82),rgba(91,33,182,.22))",
              filter: "drop-shadow(0 0 8px rgba(139,92,246,.58))",
            }}
          />
        </>
      ) : null}

      {isTita ? (
        <>
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[128%] w-[128%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/35"
            style={{
              boxShadow:
                "0 0 16px rgba(217,70,239,.40), 0 0 28px rgba(126,34,206,.28), inset 0 0 12px rgba(168,85,247,.20)",
            }}
          />
          <div
            className="pointer-events-none absolute -left-[29%] top-[15%] h-[67%] w-[35%] -rotate-[8deg]"
            style={{
              clipPath: "polygon(100% 0,52% 12%,6% 34%,48% 50%,0 72%,46% 89%,100% 100%,76% 50%)",
              background: "linear-gradient(90deg,rgba(92,18,123,.10),rgba(247,171,255,.95),rgba(126,34,206,.28))",
              filter: "drop-shadow(0 0 12px rgba(217,70,239,.78))",
            }}
          />
          <div
            className="pointer-events-none absolute -right-[29%] top-[15%] h-[67%] w-[35%] rotate-[8deg]"
            style={{
              clipPath: "polygon(0 0,48% 12%,94% 34%,52% 50%,100% 72%,54% 89%,0 100%,24% 50%)",
              background: "linear-gradient(270deg,rgba(92,18,123,.10),rgba(247,171,255,.95),rgba(126,34,206,.28))",
              filter: "drop-shadow(0 0 12px rgba(217,70,239,.78))",
            }}
          />
          <Sparkles className="pointer-events-none absolute -right-3 top-0 z-40 animate-pulse text-fuchsia-100" size={13} />
          <Sparkles className="pointer-events-none absolute -left-2 bottom-0 z-40 text-violet-100" size={11} />
        </>
      ) : null}

      {isSupreme ? (
        <>
          <div
            className="pointer-events-none absolute left-1/2 top-[-24%] h-[38%] w-[62%] -translate-x-1/2"
            style={{
              clipPath: "polygon(50% 0,61% 40%,88% 14%,81% 70%,100% 100%,0 100%,19% 70%,12% 14%,39% 40%)",
              background: "linear-gradient(180deg,#fff2af 0%,#ff8ad8 42%,#a78bfa 72%,#5b21b6 100%)",
              filter: "drop-shadow(0 0 5px rgba(255,242,175,.9)) drop-shadow(0 0 14px rgba(255,138,216,.85))",
            }}
          />
          <div
            className="pointer-events-none absolute left-[-40%] top-[18%] h-[58%] w-[54%] -rotate-[14deg]"
            style={{
              clipPath: "polygon(100% 18%,66% 0,0 22%,54% 45%,8% 72%,68% 68%,31% 100%,100% 80%)",
              background: "linear-gradient(90deg,rgba(255,209,102,.10),rgba(255,156,228,.98),rgba(124,58,237,.25))",
              filter: "drop-shadow(0 0 15px rgba(255,156,228,.90))",
            }}
          />
          <div
            className="pointer-events-none absolute right-[-40%] top-[18%] h-[58%] w-[54%] rotate-[14deg]"
            style={{
              clipPath: "polygon(0 18%,34% 0,100% 22%,46% 45%,92% 72%,32% 68%,69% 100%,0 80%)",
              background: "linear-gradient(270deg,rgba(255,209,102,.10),rgba(255,156,228,.98),rgba(124,58,237,.25))",
              filter: "drop-shadow(0 0 15px rgba(255,156,228,.90))",
            }}
          />
          <Sparkles className="pointer-events-none absolute -right-3 -top-2 z-40 animate-pulse text-[#fff1b5]" size={14} />
          <Sparkles className="pointer-events-none absolute -left-3 bottom-0 z-40 text-[#ffd0f2]" size={12} />
        </>
      ) : null}

      {isElite ? (
        <>
          <Sparkles className="pointer-events-none absolute -right-2 top-[4%] z-40 text-[#fff1a6]" size={11} />
          <Sparkles className="pointer-events-none absolute -left-2 bottom-[8%] z-40 text-[#ffe58a]" size={9} />
        </>
      ) : null}

      <div
        className={`absolute inset-0 bg-gradient-to-br ${style.frame}`}
        style={{
          ...clipStyle,
          filter:
            isSupreme
              ? "drop-shadow(0 0 5px rgba(255,255,255,.72)) drop-shadow(0 0 18px rgba(236,72,153,.82))"
              : isTita
              ? "drop-shadow(0 0 5px rgba(255,255,255,.66)) drop-shadow(0 0 15px rgba(217,70,239,.82))"
              : isMini
              ? "drop-shadow(0 0 4px rgba(255,255,255,.54)) drop-shadow(0 0 10px rgba(139,92,246,.68))"
              : isElite
              ? "drop-shadow(0 0 4px rgba(255,245,185,.68)) drop-shadow(0 0 9px rgba(255,197,40,.58))"
              : undefined,
        }}
      />
      <div className={`absolute inset-[4px] ${style.core}`} style={clipStyle} />
      <div
        className="absolute inset-[4px] border border-white/24"
        style={{
          ...clipStyle,
          background:
            "linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.03) 44%,rgba(255,255,255,.01))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-[3px]"
        style={{
          ...clipStyle,
          background: `radial-gradient(circle at 50% 18%,${style.shine} 0%,rgba(255,255,255,0) 57%)`,
        }}
      />

      {rank.tier >= 6 ? (
        <div
          className="pointer-events-none absolute left-1/2 top-[42%] z-20 h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 rotate-45 border"
          style={{
            borderColor: isSupreme
              ? "rgba(255,242,175,.95)"
              : isTita
              ? "rgba(255,210,252,.95)"
              : "rgba(242,225,255,.88)",
            background: isSupreme
              ? "linear-gradient(135deg,#fff 0%,#ffd166 32%,#ff82cf 62%,#7c3aed 100%)"
              : isTita
              ? "linear-gradient(135deg,#fff 0%,#f6b8ff 38%,#d946ef 68%,#701a75 100%)"
              : "linear-gradient(135deg,#fff 0%,#d7b6ff 42%,#8b5cf6 70%,#4c1d95 100%)",
            filter: isSupreme
              ? "drop-shadow(0 0 12px rgba(255,209,102,.88)) drop-shadow(0 0 17px rgba(255,130,207,.75))"
              : isTita
              ? "drop-shadow(0 0 14px rgba(217,70,239,.86))"
              : "drop-shadow(0 0 10px rgba(196,140,255,.72))",
          }}
        />
      ) : null}

      <div
        className={`absolute inset-0 z-30 grid place-items-center ${
          isSupreme ? "text-white" : isTita ? "text-fuchsia-50" : isMini ? "text-violet-50" : "text-white"
        }`}
        style={clipStyle}
      >
        <div className="grid place-items-center">
          <Icon size={iconSize} strokeWidth={rank.tier >= 7 ? 2.25 : 1.95} />
          {size !== "sm" ? (
            <span className="mt-0.5 text-[8px] font-black tracking-[.08em] text-white/82">
              LV {level}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}