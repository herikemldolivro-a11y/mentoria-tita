"use client";
import { Shield } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function Brand() {
  const [logoAvailable, setLogoAvailable] = useState(false);

  useEffect(() => {
    const logo = new window.Image();
    logo.onload = () => setLogoAvailable(true);
    logo.onerror = () => setLogoAvailable(false);
    logo.src = "/logo-tita.png";
  }, []);

  return <div className="brand" aria-label="Mentoria Titã — Foco 95+">
    <div className="brand-mark">{logoAvailable ? <Image src="/logo-tita.png" alt="Logo Mentoria Titã" width={108} height={84} /> : <span className="brand-placeholder" aria-hidden="true"><Shield size={18} strokeWidth={1.7} /><strong>TITÃ</strong></span>}</div>
    <div className="brand-copy"><strong>MENTORIA TITÃ</strong><span>FOCO 95+</span></div>
  </div>;
}
