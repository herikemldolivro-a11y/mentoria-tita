"use client";

import Image from "next/image";
import { useState } from "react";

interface ContestLogoProps {
  logoPath?: string | null;
  sigla: string;
  nome: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-11 w-11 text-[9px]",
  md: "h-16 w-16 text-[10px]",
  lg: "h-24 w-24 text-xs",
};

export function ContestLogo({
  logoPath,
  sigla,
  nome,
  size = "md",
  className = "",
}: ContestLogoProps) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const showImage = Boolean(logoPath) && failedPath !== logoPath;

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-sm ${sizeClasses[size]} ${className}`}
      aria-label={nome}
    >
      {showImage ? (
        <Image
          src={logoPath ?? ""}
          alt={`Símbolo de ${nome}`}
          className="h-full w-full object-contain"
          width={96}
          height={96}
          unoptimized
          onError={() => setFailedPath(logoPath ?? null)}
        />
      ) : (
        <strong className="max-w-full text-center font-black tracking-[0.08em] text-[var(--gold-bright)]">
          {sigla}
        </strong>
      )}
    </span>
  );
}
