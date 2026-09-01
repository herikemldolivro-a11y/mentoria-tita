import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Mentoria Titã — Foco 95+">
      <div
        className={`relative shrink-0 overflow-hidden rounded-2xl border border-[#8f6a2c]/70 bg-black shadow-[0_8px_24px_rgba(0,0,0,.25)] ${
          compact ? "h-14 w-14 sm:h-16 sm:w-16" : "h-16 w-16 sm:h-[72px] sm:w-[72px]"
        }`}
      >
        <Image
          src="/logo-tita.png"
          alt="Logo Mentoria Titã"
          fill
          sizes={compact ? "64px" : "72px"}
          className="object-contain"
          priority
        />
      </div>
      <div className={compact ? "hidden min-[500px]:block" : "block"}>
        <strong className="block font-serif text-[14px] font-semibold tracking-[0.12em] text-white">
          MENTORIA TITÃ
        </strong>
        <span className="mt-0.5 block text-[8px] font-black tracking-[0.3em] text-[#dfb457]">
          FOCO 95+
        </span>
      </div>
    </div>
  );
}
