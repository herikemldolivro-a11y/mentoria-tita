"use client";

import { useId } from "react";
import type { RankInfo } from "@/lib/xp-system";

type TierVisual = {
  edgeA: string;
  edgeB: string;
  edgeC: string;
  coreA: string;
  coreB: string;
  starA: string;
  starB: string;
  glow: string;
  wings?: boolean;
  spikes?: boolean;
  crystal?: boolean;
  prism?: boolean;
};

const tierVisuals: Record<number, TierVisual> = {
  1: {
    edgeA: "#efb568",
    edgeB: "#8b542a",
    edgeC: "#3f2719",
    coreA: "#3b2a1d",
    coreB: "#17100b",
    starA: "#f5c278",
    starB: "#8a5124",
    glow: "rgba(216,143,64,.30)",
  },
  2: {
    edgeA: "#ffb25b",
    edgeB: "#c15c20",
    edgeC: "#57230c",
    coreA: "#55240f",
    coreB: "#190a05",
    starA: "#ffc874",
    starB: "#b84e17",
    glow: "rgba(255,126,40,.34)",
    spikes: true,
  },
  3: {
    edgeA: "#f4f8fc",
    edgeB: "#9aa8b7",
    edgeC: "#44505e",
    coreA: "#303b47",
    coreB: "#0f151b",
    starA: "#f7fbff",
    starB: "#8394a5",
    glow: "rgba(187,211,235,.30)",
  },
  4: {
    edgeA: "#fbfdff",
    edgeB: "#9caec1",
    edgeC: "#465463",
    coreA: "#34414e",
    coreB: "#10161c",
    starA: "#ffffff",
    starB: "#8ba0b3",
    glow: "rgba(205,226,244,.36)",
    wings: true,
  },
  5: {
    edgeA: "#fff0a0",
    edgeB: "#e8a514",
    edgeC: "#764500",
    coreA: "#85520a",
    coreB: "#241500",
    starA: "#fff6b7",
    starB: "#d88700",
    glow: "rgba(255,190,42,.42)",
    wings: true,
    spikes: true,
  },
  6: {
    edgeA: "#f7feff",
    edgeB: "#8adfff",
    edgeC: "#327ca4",
    coreA: "#21485e",
    coreB: "#07151f",
    starA: "#effdff",
    starB: "#5cccf2",
    glow: "rgba(89,211,255,.46)",
    wings: true,
    crystal: true,
  },
  7: {
    edgeA: "#ffb1c0",
    edgeB: "#e52d58",
    edgeC: "#64091e",
    coreA: "#5a1022",
    coreB: "#1b050b",
    starA: "#ffd2dc",
    starB: "#d51f4c",
    glow: "rgba(240,50,91,.48)",
    wings: true,
    spikes: true,
    crystal: true,
  },
  8: {
    edgeA: "#ffffff",
    edgeB: "#77eaff",
    edgeC: "#7f55ff",
    coreA: "#25104b",
    coreB: "#080412",
    starA: "#f3ffff",
    starB: "#80e8ff",
    glow: "rgba(141,91,255,.58)",
    wings: true,
    spikes: true,
    crystal: true,
    prism: true,
  },
};

const starPoints = "60,27 68,48 91,49 73,63 80,86 60,73 40,86 47,63 29,49 52,48";
const shieldPoints = "60,7 100,29 96,82 60,112 24,82 20,29";
const innerShieldPoints = "60,18 91,36 88,77 60,100 32,77 29,36";

function sunburstPoints(spikes = 12) {
  return Array.from({ length: spikes * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * index) / spikes;
    const radius = index % 2 === 0 ? 56 : 45;
    const x = 60 + Math.cos(angle) * radius;
    const y = 60 + Math.sin(angle) * radius;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function Wing({ side, fillId, highlightId }: { side: "left" | "right"; fillId: string; highlightId: string }) {
  const transform = side === "right" ? "translate(120 0) scale(-1 1)" : undefined;
  return (
    <g transform={transform}>
      <path d="M42 39 24 25 5 20 14 39 2 48 24 55 7 72 31 68 38 91 48 63Z" fill={`url(#${fillId})`} stroke="rgba(255,255,255,.34)" strokeWidth="1.1" />
      <path d="M39 45 19 36 9 35 24 49 12 51 31 57 18 67 36 62 41 77 45 59Z" fill={`url(#${highlightId})`} opacity=".72" />
      <path d="M11 34 38 48M12 51 39 56M18 67 41 63" fill="none" stroke="rgba(255,255,255,.34)" strokeWidth="1.15" strokeLinecap="round" />
    </g>
  );
}

export function XpRankInsignia({ rank, level, size = "md" }: { rank: RankInfo; level: number; size?: "sm" | "md" | "lg" }) {
  const visual = tierVisuals[rank.tier] ?? tierVisuals[1];
  const uid = useId().replace(/:/g, "");
  const edgeId = `rank-edge-${uid}`;
  const coreId = `rank-core-${uid}`;
  const starId = `rank-star-${uid}`;
  const wingId = `rank-wing-${uid}`;
  const wingHighlightId = `rank-wing-hi-${uid}`;
  const prismId = `rank-prism-${uid}`;
  const shadowId = `rank-shadow-${uid}`;
  const shineId = `rank-shine-${uid}`;

  const dimensions = size === "sm" ? "h-11 w-11" : size === "lg" ? "h-28 w-28" : "h-[74px] w-[74px]";
  const sparkle = rank.tier >= 6;

  return (
    <div
      className={`relative ${dimensions} shrink-0 overflow-visible bg-transparent`}
      title={`${rank.title} · Nível ${level}`}
      data-rank-insignia={`tier-${rank.tier}`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={edgeId} x1="18" y1="10" x2="102" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={visual.edgeA} />
            <stop offset=".48" stopColor={visual.edgeB} />
            <stop offset="1" stopColor={visual.edgeC} />
          </linearGradient>
          <linearGradient id={coreId} x1="35" y1="25" x2="86" y2="99" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={visual.coreA} />
            <stop offset="1" stopColor={visual.coreB} />
          </linearGradient>
          <linearGradient id={starId} x1="39" y1="35" x2="82" y2="83" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={visual.starA} />
            <stop offset=".52" stopColor={visual.starB} />
            <stop offset="1" stopColor={visual.edgeC} />
          </linearGradient>
          <linearGradient id={wingId} x1="5" y1="22" x2="49" y2="83" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={visual.edgeA} />
            <stop offset=".55" stopColor={visual.edgeB} />
            <stop offset="1" stopColor={visual.edgeC} />
          </linearGradient>
          <linearGradient id={wingHighlightId} x1="10" y1="35" x2="43" y2="67" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".72" />
            <stop offset="1" stopColor={visual.edgeB} stopOpacity=".2" />
          </linearGradient>
          <linearGradient id={prismId} x1="13" y1="16" x2="105" y2="106" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff5ccf" />
            <stop offset=".18" stopColor="#a866ff" />
            <stop offset=".38" stopColor="#45dfff" />
            <stop offset=".58" stopColor="#58ffc7" />
            <stop offset=".77" stopColor="#ffd85b" />
            <stop offset="1" stopColor="#ff6b9d" />
          </linearGradient>
          <linearGradient id={shineId} x1="30" y1="20" x2="78" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".72" />
            <stop offset=".34" stopColor="#ffffff" stopOpacity=".14" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id={shadowId} x="-45%" y="-45%" width="190%" height="190%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={visual.glow} floodOpacity="1" />
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity=".75" />
          </filter>
        </defs>

        <g filter={`url(#${shadowId})`}>
          {visual.wings ? (
            <g opacity=".98">
              <Wing side="left" fillId={visual.prism ? prismId : wingId} highlightId={wingHighlightId} />
              <Wing side="right" fillId={visual.prism ? prismId : wingId} highlightId={wingHighlightId} />
            </g>
          ) : null}

          {visual.spikes ? (
            <polygon
              points={sunburstPoints(rank.tier === 8 ? 14 : 12)}
              fill={visual.prism ? `url(#${prismId})` : `url(#${edgeId})`}
              stroke="rgba(255,255,255,.30)"
              strokeWidth="1"
            />
          ) : rank.tier === 3 ? (
            <polygon points={sunburstPoints(8)} fill={`url(#${edgeId})`} opacity=".82" />
          ) : null}

          <polygon
            points={shieldPoints}
            fill={visual.prism ? `url(#${prismId})` : `url(#${edgeId})`}
            stroke="rgba(255,255,255,.44)"
            strokeWidth="1.35"
          />
          <polygon points={innerShieldPoints} fill={`url(#${coreId})`} stroke="rgba(255,255,255,.18)" strokeWidth="1" />

          <path d="M60 18 91 36 83 40 60 28 37 40 29 36Z" fill={`url(#${shineId})`} opacity=".72" />
          <path d="M29 36 37 40 38 74 60 93 60 100 32 77Z" fill="#ffffff" opacity=".045" />
          <path d="M91 36 83 40 82 74 60 93 60 100 88 77Z" fill="#000000" opacity=".22" />

          {visual.crystal ? (
            <g opacity={visual.prism ? .72 : .48}>
              <polygon points="60,18 83,40 60,50 37,40" fill={visual.prism ? `url(#${prismId})` : visual.edgeA} opacity=".34" />
              <polygon points="37,40 60,50 48,77 32,77" fill="#ffffff" opacity=".13" />
              <polygon points="83,40 60,50 72,77 88,77" fill={visual.prism ? "#59dfff" : visual.edgeB} opacity=".22" />
              <polygon points="48,77 60,50 72,77 60,100" fill="#ffffff" opacity=".08" />
            </g>
          ) : null}

          <polygon points={starPoints} fill={visual.prism ? `url(#${prismId})` : `url(#${starId})`} stroke="rgba(255,255,255,.58)" strokeWidth="1.05" />
          <polygon points="60,27 60,73 52,48 29,49" fill="#ffffff" opacity=".24" />
          <polygon points="60,27 68,48 91,49 60,73" fill="#ffffff" opacity=".08" />
          <polygon points="29,49 47,63 40,86 60,73" fill="#000000" opacity=".16" />
          <polygon points="91,49 73,63 80,86 60,73" fill="#000000" opacity=".28" />

          {rank.tier >= 5 ? <circle cx="60" cy="60" r="31" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.15" /> : null}
        </g>

        {sparkle ? (
          <g fill="#ffffff">
            <circle cx="91" cy="24" r={rank.tier === 8 ? 2.1 : 1.5} opacity=".9" />
            <circle cx="24" cy="79" r="1.25" opacity=".62" />
            {rank.tier === 8 ? <circle cx="102" cy="72" r="1.4" opacity=".8" /> : null}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
