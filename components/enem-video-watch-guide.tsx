"use client";

import { PlayCircle } from "lucide-react";
import type { MatrixLesson, PrfSubject } from "@/lib/prf-week-one";

function cleanTopic(value: string) {
  return value.replace(/^(🟢\/🟠|🟠\/🟢|🟢|🟠|🔴)\s*/u, "").trim();
}

function watchGuide(subjectSlug: string, title: string, topics: string[]) {
  const low = title.toLocaleLowerCase("pt-BR");

  if (subjectSlug === "quimica" && low.includes("separação de misturas p1")) {
    return {
      module: "Processos de Separação de Misturas",
      part: "PARTE 1 · métodos + identificação/classificação das misturas",
      focus: ["Misturas homogêneas e heterogêneas", "Fases/componentes", "Métodos básicos de separação e identificação do processo adequado"],
    };
  }

  if (subjectSlug === "quimica" && low.includes("separação de misturas p2")) {
    return {
      module: "Processos de Separação de Misturas",
      part: "PARTE 2 · continuação do módulo",
      focus: ["Processos restantes de separação", "Tratamento de água e esgoto", "Aplicações em mineração/indústria e sequências de separação"],
    };
  }

  if (subjectSlug === "matematica" && low === "razão") {
    return {
      module: "Razão e Proporção",
      part: "AULA/TRECHO · RAZÃO",
      focus: ["Conceito de razão", "Razões equivalentes e inversas", "Razões entre grandezas e aplicações"],
    };
  }

  if (subjectSlug === "matematica" && low.includes("proporção") && low.includes("grandezas")) {
    return {
      module: "Razão e Proporção",
      part: "AULA/TRECHO · PROPORÇÃO + GRANDEZAS PROPORCIONAIS",
      focus: ["Proporção", "Grandezas direta e inversamente proporcionais", "Aplicações de proporcionalidade"],
    };
  }

  if (subjectSlug === "matematica" && low.includes("regra de três simples")) {
    return {
      module: "Razão e Proporção",
      part: "AULA/TRECHO · REGRA DE TRÊS SIMPLES",
      focus: ["Regra de três direta", "Regra de três inversa", "Modelagem de problemas"],
    };
  }

  const clean = topics.map(cleanTopic).filter(Boolean);
  return {
    module: title.replace(/\s+P\d+[A-Z]?$/i, ""),
    part: /\sP\d/i.test(title) ? `TRECHO DESTA PARTE · ${title}` : `AULA/TRECHO · ${title}`,
    focus: clean.length ? clean.slice(0, 5) : [title],
  };
}

export function EnemVideoWatchGuide({ subject, lesson }: { subject: PrfSubject; lesson: MatrixLesson }) {
  const guide = watchGuide(subject.slug, lesson.title, lesson.topics);
  return (
    <section className="mb-6 rounded-[24px] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_0%,rgba(34,211,238,.10),transparent_35%),rgba(34,211,238,.025)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.07] text-cyan-200"><PlayCircle size={18} /></span>
        <div className="min-w-0 flex-1">
          <span className="text-[8px] font-black tracking-[.14em] text-cyan-300">NO CURSO EXTERNO · QUAL AULA/VÍDEO VER</span>
          <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">{guide.module}</h2>
          <strong className="mt-2 block text-[10px] font-black tracking-[.08em] text-cyan-100/80">{guide.part}</strong>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.focus.map((item) => <span key={item} className="rounded-full border border-white/[.08] bg-black/15 px-3 py-1.5 text-[9px] text-white/55">{item}</span>)}
          </div>
          <p className="mt-3 text-[9px] leading-5 text-white/30">Quando a fonte não informa o número exato do vídeo, a Titã não inventa “vídeo 1/2/3”: ela mostra o módulo, a parte e o conteúdo exato que você deve localizar no cursinho.</p>
        </div>
      </div>
    </section>
  );
}
