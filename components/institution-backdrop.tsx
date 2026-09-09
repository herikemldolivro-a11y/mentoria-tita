const marks = [
  { src: "/logo-tita.png", x: "7%", y: "14%", size: 155, rotate: -8 },
  { src: "/concursos/cfo-pmal/logo.png", x: "84%", y: "12%", size: 120, rotate: 8 },
  { src: "/concursos/cfo-pmsp/logo.png", x: "92%", y: "48%", size: 145, rotate: -7 },
  { src: "/concursos/pmpe/logo.png", x: "5%", y: "66%", size: 125, rotate: 8 },
  { src: "/concursos/pcba/logo.png", x: "78%", y: "83%", size: 135, rotate: 5 },
  { src: "/concursos/pcma/logo.png", x: "24%", y: "88%", size: 120, rotate: -6 },
];

export function InstitutionBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(210,166,78,.08),transparent_28rem),radial-gradient(circle_at_90%_70%,rgba(210,166,78,.045),transparent_30rem)]" />
      {marks.map((mark) => (
        <span
          key={mark.src}
          className="absolute bg-contain bg-center bg-no-repeat opacity-[0.035] grayscale"
          style={{
            left: mark.x,
            top: mark.y,
            width: mark.size,
            height: mark.size,
            transform: `translate(-50%, -50%) rotate(${mark.rotate}deg)`,
            backgroundImage: `url("${mark.src}")`,
          }}
        />
      ))}
      <span className="absolute left-[52%] top-[48%] -translate-x-1/2 -translate-y-1/2 font-serif text-[18vw] font-black leading-none text-[var(--ink)] opacity-[0.018]">
        TITÃ
      </span>
      <span className="absolute bottom-[6%] right-[3%] text-[9rem] font-black leading-none text-[var(--ink)] opacity-[0.018] sm:text-[14rem]">
        95+
      </span>
    </div>
  );
}
