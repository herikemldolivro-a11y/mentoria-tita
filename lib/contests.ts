export interface ContestOption {
  slug: string;
  sigla: string;
  nome: string;
  instituicao: string;
  logoPath: string | null;
}

export const contestOptions: ContestOption[] = [
  {
    slug: "pprn",
    sigla: "PPRN",
    nome: "Polícia Penal RN 2026",
    instituicao: "Polícia Penal do Rio Grande do Norte",
    logoPath: null,
  },
  {
    slug: "pcal",
    sigla: "PCAL",
    nome: "Polícia Civil de Alagoas",
    instituicao: "Polícia Civil do Estado de Alagoas",
    logoPath: "/concursos/pcal/logo.png",
  },
  {
    slug: "cfo-pmal",
    sigla: "CFO PMAL",
    nome: "CFO PMAL",
    instituicao: "Polícia Militar de Alagoas",
    logoPath: "/concursos/cfo-pmal/logo.png",
  },
  {
    slug: "cfo-pmsp",
    sigla: "CFO PMSP",
    nome: "CFO PMSP",
    instituicao: "Polícia Militar do Estado de São Paulo",
    logoPath: "/concursos/cfo-pmsp/logo.png",
  },
  {
    slug: "soldado-pmsp",
    sigla: "PMSP",
    nome: "Soldado PMSP",
    instituicao: "Polícia Militar do Estado de São Paulo",
    logoPath: "/concursos/soldado-pmsp/logo.png",
  },
  {
    slug: "pmpe",
    sigla: "PMPE",
    nome: "Polícia Militar de Pernambuco",
    instituicao: "Polícia Militar de Pernambuco",
    logoPath: "/concursos/pmpe/logo.png",
  },
  {
    slug: "pcba",
    sigla: "PCBA",
    nome: "Polícia Civil da Bahia",
    instituicao: "Polícia Civil do Estado da Bahia",
    logoPath: "/concursos/pcba/logo.png",
  },
  {
    slug: "pcma",
    sigla: "PCMA",
    nome: "Polícia Civil do Maranhão",
    instituicao: "Polícia Civil do Estado do Maranhão",
    logoPath: "/concursos/pcma/logo.png",
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
