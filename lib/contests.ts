export interface ContestOption {
  slug: string;
  sigla: string;
  nome: string;
  instituicao: string;
  logoPath: string | null;
}

export const contestOptions: ContestOption[] = [
  {
    slug: "cfo-pmal",
    sigla: "CFO PMAL",
    nome: "CFO PMAL",
    instituicao: "Polícia Militar de Alagoas",
    logoPath: "/concursos/cfo-pmal/logo.png",
  },
  {
    slug: "soldado-pmal",
    sigla: "PMAL",
    nome: "PMAL — Soldado",
    instituicao: "Polícia Militar de Alagoas",
    logoPath: "/concursos/cfo-pmal/logo.png",
  },
  {
    slug: "pmpe",
    sigla: "PMPE",
    nome: "PMPE — Soldado",
    instituicao: "Polícia Militar de Pernambuco · Soldado",
    logoPath: "/concursos/pmpe/logo.png",
  },
  {
    slug: "prf",
    sigla: "PRF",
    nome: "Polícia Rodoviária Federal",
    instituicao: "Polícia Rodoviária Federal",
    logoPath: "/concursos/prf/logo.png",
  },
  {
    slug: "pf",
    sigla: "PF",
    nome: "Polícia Federal",
    instituicao: "Polícia Federal",
    logoPath: "/concursos/pf/logo.png",
  },
];

export function getContestOption(slug: string | null | undefined) {
  if (!slug) return null;
  return contestOptions.find((contest) => contest.slug === slug) ?? null;
}
