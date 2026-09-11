import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function SubjectArtCard({
  href,
  title,
  shortName,
  subtitle,
  imagePath,
  accent = "#c5c8cc",
  progress = 0,
  completed = false,
}: {
  href: string;
  title: string;
  shortName?: string | null;
  subtitle?: string | null;
  imagePath?: string | null;
  accent?: string | null;
  progress?: number;
  completed?: boolean;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <Link href={href} className="tita-subject-card group block">
      {imagePath ? (
        <Image
          src={imagePath}
          alt={`Arte de ${title}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"
          className="object-cover object-center transition duration-500 group-hover:scale-[1.035]"
        />
      ) : (
        <div className="absolute inset-0 tita-soft-grid bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.08),transparent_36%),#0c0d0f]" />
      )}

      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <span
          className="rounded-full border px-2.5 py-1 text-[8px] font-black tracking-[.13em] backdrop-blur-md"
          style={{ borderColor: `${accent}45`, color: accent ?? "#c5c8cc", background: "rgba(6,7,8,.58)" }}
        >
          {shortName || "MATÉRIA"}
        </span>
        {completed ? <CheckCircle2 size={19} className="text-emerald-300 drop-shadow" /> : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-5">
        <h3 className="font-serif text-2xl leading-none tracking-[-.025em] text-white">{title}</h3>
        {subtitle ? <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-white/54">{subtitle}</p> : null}
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full" style={{ width: `${safeProgress}%`, backgroundColor: accent ?? "#c5c8cc" }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[8px] font-black tracking-[.11em] text-white/48">
          <span>{safeProgress}% CONCLUÍDO</span>
          <span className="inline-flex items-center gap-1.5 text-white/80">ABRIR <ArrowRight size={13} /></span>
        </div>
      </div>
    </Link>
  );
}
