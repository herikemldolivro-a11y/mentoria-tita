export type EnemQuestionSnapshot = {
  id: string;
  number: number;
  section: string;
  lessonKey: string;
  textPreview?: string;
  x?: number;
  y: number;
  h: number;
  w: number;
  sheet: string;
  sheetW: number;
  sheetH: number;
};

export type EnemQuestionSourceInfo = {
  source: "razao" | "separacao" | "cinematica-i" | "unknown" | "citologia" | "proporcao-grandezas" | "dinamica-i-p1" | "geografia-economica";
  label: string;
  total: number;
  position: number;
};

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveEnemSnapshotLessonKey(subjectSlug: string, lessonTitle: string) {
  const subject = normalized(subjectSlug);
  const title = normalized(lessonTitle);

  if (subject === "quimica") {
    if (title.includes("separacao de misturas p1")) return "quimica:separacao-misturas-p1";
    if (title.includes("separacao de misturas p2")) return "quimica:separacao-misturas-p2";
  }

  if (subject === "fisica") {
    if (title.includes("dinamica i p1")) return "fisica:dinamica-i-p1";
    if (title.includes("cinematica i p1")) return "fisica:cinematica-i-p1";
    if (title.includes("cinematica i p2")) return "fisica:cinematica-i-p2";
  }

  if (subject === "matematica") {
    if (title === "razao" || (title.includes("razao") && title.includes("proporcao"))) return "matematica:razao";
    if (title === "razao" || (title.includes("razao") && title.includes("proporcao"))) {
      return "matematica:razao";
    }
    if (title.includes("proporcao") && title.includes("grandezas")) return "matematica:proporcao-grandezas";
    if (title.includes("regra de tres simples")) return "matematica:regra-tres-simples";
    if (title.includes("escalas") || title.includes("vazao")) return "matematica:escalas-vazao";
    if (title.includes("porcentagem p1")) return "matematica:porcentagem-p1";
    if (title.includes("graficos") && title.includes("tabelas")) return "matematica:graficos-tabelas";
    if (title.includes("equacoes do 1") || title.includes("equacao do 1")) return "matematica:equacoes-1-sistemas";
    if (title.includes("funcao exponencial")) return "matematica:funcao-exponencial";
    if (title.includes("geometria plana")) return "matematica:geometria-plana";
    if (title.includes("geometria espacial")) return "matematica:geometria-espacial";
  }

  if (subject === "biologia") {
    const citologia =
      title.includes("citologia") ||
      (title.includes("celula") && title.includes("membrana"));

    if (citologia) return "biologia:citologia-celulas-membrana";
  }

  if (subject === "geografia") {
    const economica =
      title.includes("economica") &&
      title.includes("industrializacao") &&
      title.includes("globalizacao");

    if (economica) {
      return "geografia:economica-industrializacao-globalizacao";
    }
  }

  return null;
}

const counts: Record<string, number> = {
  "quimica:separacao-misturas-p1": 40,
  "quimica:separacao-misturas-p2": 110,
  "fisica:cinematica-i-p1": 60,
  "fisica:cinematica-i-p2": 70,
  "matematica:razao": 80,
  "biologia:citologia-celulas-membrana": 171,
  "matematica:proporcao-grandezas": 64,
  "fisica:dinamica-i-p1": 106,
  "geografia:economica-industrializacao-globalizacao": 56,
};

export function getEnemSnapshotCount(subjectSlug: string, lessonTitle: string) {
  const key = resolveEnemSnapshotLessonKey(subjectSlug, lessonTitle);
  return key ? counts[key] ?? 0 : 0;
}

function suffixNumber(id: string) {
  const value = Number(id.match(/(\d+)$/)?.[1] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function getEnemQuestionSourceInfo(question: EnemQuestionSnapshot): EnemQuestionSourceInfo {
  if (question.id.startsWith("dinamica-p1-")) {
    return {
      source: "dinamica-i-p1",
      label: "Dinâmica I P1 · Leis de Newton, Forças Particulares e Atrito",
      total: 106,
      position: question.number,
    };
  }

  if (question.id.startsWith("geo-capitalismo-")) {
    return {
      source: "geografia-economica",
      label: "Geografia Econômica · Capitalismo",
      total: 56,
      position: question.number,
    };
  }

  if (question.id.startsWith("geo-industrializacao-")) {
    return {
      source: "geografia-economica",
      label: "Geografia Econômica · Industrialização",
      total: 56,
      position: 20 + question.number,
    };
  }

  if (question.id.startsWith("geo-globalizacao-")) {
    return {
      source: "geografia-economica",
      label: "Geografia Econômica · Globalização",
      total: 56,
      position: 40 + question.number,
    };
  }

  if (question.id.startsWith("prop-grandezas-")) {
    return {
      source: "proporcao-grandezas",
      label: "Proporção + Grandezas Proporcionais",
      total: 64,
      position: question.number,
    };
  }

  if (question.id.startsWith("citologia-")) {
    return {
      source: "citologia",
      label: "Citologia: Células + Membrana",
      total: 171,
      position: question.number,
    };
  }

  if (question.id.startsWith("razao-")) {
    return { source: "razao", label: "Razão e Proporção", total: 80, position: question.number };
  }

  if (question.id.startsWith("sep-desafio-")) {
    return {
      source: "separacao",
      label: "Separação de Misturas",
      total: 150,
      position: 135 + question.number,
    };
  }

  if (question.id.startsWith("sep-")) {
    return {
      source: "separacao",
      label: "Separação de Misturas",
      total: 150,
      position: question.number,
    };
  }

  if (question.id.startsWith("cin1-fund-")) {
    return {
      source: "cinematica-i",
      label: "Cinemática I · P1/P2",
      total: 130,
      position: suffixNumber(question.id),
    };
  }

  if (question.id.startsWith("cin1-mu-")) {
    return {
      source: "cinematica-i",
      label: "Cinemática I · P1/P2",
      total: 130,
      position: 20 + suffixNumber(question.id),
    };
  }

  if (question.id.startsWith("cin1-muv-")) {
    return {
      source: "cinematica-i",
      label: "Cinemática I · P1/P2",
      total: 130,
      position: 60 + suffixNumber(question.id),
    };
  }

  if (question.id.startsWith("cin1-queda-")) {
    return {
      source: "cinematica-i",
      label: "Cinemática I · P1/P2",
      total: 130,
      position: 110 + suffixNumber(question.id),
    };
  }

  return {
    source: "unknown",
    label: "Lista original",
    total: 0,
    position: question.number,
  };
}

export function sortEnemQuestionSnapshots(items: EnemQuestionSnapshot[]) {
  return [...items].sort((a, b) => {
    const sourceA = getEnemQuestionSourceInfo(a);
    const sourceB = getEnemQuestionSourceInfo(b);
    if (sourceA.source !== sourceB.source) return sourceA.source.localeCompare(sourceB.source);
    return sourceA.position - sourceB.position;
  });
}

function assertExactSequence(items: EnemQuestionSnapshot[], expected: number[], label: string) {
  const numbers = items.map((item) => item.number).sort((a, b) => a - b);
  const valid =
    numbers.length === expected.length &&
    numbers.every((value, index) => value === expected[index]);

  if (!valid) {
    throw new Error(
      `Pacote de ${label} incompleto ou fora de ordem. Atualize os arquivos das questões.`,
    );
  }
}

function assertPrintedNumberMatchesManifest(items: EnemQuestionSnapshot[]) {
  for (const item of items) {
    const preview = String(item.textPreview ?? "").trim();
    if (!preview) continue;

    const match = preview.match(/Quest(?:ão|ao)\s*0*(\d+)/i);
    if (!match) continue;

    const printedNumber = Number(match[1]);
    if (printedNumber !== item.number) {
      throw new Error(
        `Numeração inconsistente em ${item.id}: a imagem/texto indica Questão ${printedNumber}, mas o manifesto aponta ${item.number}. A lista foi bloqueada para evitar questão trocada.`,
      );
    }
  }
}

function assertRazaoGrouping(items: EnemQuestionSnapshot[]) {
  const razao = items.filter((item) => item.id.startsWith("razao-"));

  for (const item of razao) {
    const expectedSection =
      item.number <= 20
        ? "Fixação"
        : item.number <= 40
          ? "Treinamento"
          : item.number <= 65
            ? "Aprofundamento"
            : "Desafios";

    if (item.lessonKey !== "matematica:razao" || item.section !== expectedSection) {
      throw new Error(
        `Lista de Razão e Proporção inconsistente na Questão ${item.number}. Atualize o pacote antes de estudar.`,
      );
    }
  }
}

function normalizeLessonAssignments(items: EnemQuestionSnapshot[]) {
  return items.map((item) => {
    if (item.id.startsWith("razao-")) {
      return {
        ...item,
        lessonKey: "matematica:razao",
      };
    }

    if (/^sep-\d+$/.test(item.id)) {
      return {
        ...item,
        lessonKey:
          item.number <= 40
            ? "quimica:separacao-misturas-p1"
            : "quimica:separacao-misturas-p2",
      };
    }

    if (item.id.startsWith("sep-desafio-")) {
      return {
        ...item,
        lessonKey: "quimica:separacao-misturas-p2",
      };
    }

    return item;
  });
}

function assertSeparationSplit(items: EnemQuestionSnapshot[]) {
  const p1Main = items.filter(
    (item) => /^sep-\d+$/.test(item.id) && item.lessonKey === "quimica:separacao-misturas-p1",
  );
  const p2Main = items.filter(
    (item) => /^sep-\d+$/.test(item.id) && item.lessonKey === "quimica:separacao-misturas-p2",
  );
  const p2Challenges = items.filter(
    (item) => item.id.startsWith("sep-desafio-") && item.lessonKey === "quimica:separacao-misturas-p2",
  );

  if (p1Main.length || p2Main.length || p2Challenges.length) {
    assertExactSequence(
      p1Main,
      Array.from({ length: 40 }, (_, index) => index + 1),
      "Separação de Misturas P1 (Questões 1–40)",
    );
    assertExactSequence(
      p2Main,
      Array.from({ length: 95 }, (_, index) => index + 41),
      "Separação de Misturas P2 (Questões 41–135)",
    );
    assertExactSequence(
      p2Challenges,
      Array.from({ length: 15 }, (_, index) => index + 1),
      "Desafios de Separação de Misturas P2 (1–15)",
    );
  }
}

export function validateEnemQuestionSnapshotManifest(items: EnemQuestionSnapshot[]) {
  const dinamicaP1 = items.filter((item) =>
    item.id.startsWith("dinamica-p1-"),
  );
  const geoCapitalismo = items.filter((item) =>
    item.id.startsWith("geo-capitalismo-"),
  );
  const geoIndustrializacao = items.filter((item) =>
    item.id.startsWith("geo-industrializacao-"),
  );
  const geoGlobalizacao = items.filter((item) =>
    item.id.startsWith("geo-globalizacao-"),
  );
  const proporcaoGrandezas = items.filter((item) =>
    item.id.startsWith("prop-grandezas-"),
  );
  const citologia = items.filter((item) => item.id.startsWith("citologia-"));
  const razao = items.filter((item) => item.id.startsWith("razao-"));
  const separacaoMain = items.filter((item) => /^sep-\d+$/.test(item.id));
  const separacaoDesafios = items.filter((item) => item.id.startsWith("sep-desafio-"));
  const cinematicaFund = items.filter((item) => item.id.startsWith("cin1-fund-"));
  const cinematicaMu = items.filter((item) => item.id.startsWith("cin1-mu-"));
  const cinematicaMuv = items.filter((item) => item.id.startsWith("cin1-muv-"));
  const cinematicaQueda = items.filter((item) => item.id.startsWith("cin1-queda-"));

  if (razao.length) {
    assertExactSequence(
      razao,
      Array.from({ length: 80 }, (_, index) => index + 1),
      "Razão",
    );
  }

  if (separacaoMain.length || separacaoDesafios.length) {
    assertExactSequence(
      separacaoMain,
      Array.from({ length: 135 }, (_, index) => index + 1),
      "Separação de Misturas",
    );
    assertExactSequence(
      separacaoDesafios,
      Array.from({ length: 15 }, (_, index) => index + 1),
      "Desafios de Separação de Misturas",
    );
  }

  if (cinematicaFund.length || cinematicaMu.length || cinematicaMuv.length || cinematicaQueda.length) {
    assertExactSequence(
      cinematicaFund,
      Array.from({ length: 20 }, (_, index) => index + 1),
      "Cinemática I · Fundamentos",
    );
    assertExactSequence(
      cinematicaMu,
      Array.from({ length: 40 }, (_, index) => index + 1),
      "Cinemática I · Movimento Uniforme",
    );
    assertExactSequence(
      cinematicaMuv,
      Array.from({ length: 50 }, (_, index) => index + 1),
      "Cinemática I · MUV",
    );
    assertExactSequence(
      cinematicaQueda,
      Array.from({ length: 20 }, (_, index) => index + 1),
      "Cinemática I · Queda Livre/Lançamento Vertical",
    );
  }

  if (citologia.length) {
    assertExactSequence(
      citologia,
      Array.from({ length: 171 }, (_, index) => index + 1),
      "Citologia: Células + Membrana (1–171)",
    );
  }

  if (proporcaoGrandezas.length) {
    assertExactSequence(
      proporcaoGrandezas,
      Array.from({ length: 64 }, (_, index) => index + 1),
      "Proporção + Grandezas Proporcionais (Questões 1–64)",
    );
  }

  if (dinamicaP1.length) {
    assertExactSequence(
      dinamicaP1,
      Array.from({ length: 106 }, (_, index) => index + 1),
      "Dinâmica I P1 (Questões 1–106)",
    );
  }

  if (geoCapitalismo.length) {
    assertExactSequence(
      geoCapitalismo,
      Array.from({ length: 20 }, (_, index) => index + 1),
      "Geografia Econômica · Capitalismo (Questões 1–20)",
    );
  }

  if (geoIndustrializacao.length) {
    assertExactSequence(
      geoIndustrializacao,
      Array.from({ length: 20 }, (_, index) => index + 1),
      "Geografia Econômica · Industrialização (Questões 1–20)",
    );
  }

  if (geoGlobalizacao.length) {
    assertExactSequence(
      geoGlobalizacao,
      Array.from({ length: 16 }, (_, index) => index + 1),
      "Geografia Econômica · Globalização (Questões 1–16 presentes no PDF)",
    );
  }

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) {
    throw new Error(
      "Pacote de questões contém imagens duplicadas. Atualize os arquivos das questões.",
    );
  }

  assertPrintedNumberMatchesManifest(items);
  assertRazaoGrouping(items);
  assertSeparationSplit(items);
  return true;
}

async function loadManifest(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) return [] as EnemQuestionSnapshot[];
  return (await response.json()) as EnemQuestionSnapshot[];
}

export async function loadEnemQuestionSnapshotManifest() {
  const manifests = await Promise.all([
    loadManifest("/question-sheets/dinamica-i-p1/dinamica-i-p1.json"),
    loadManifest("/question-sheets/geografia-economica/geografia-economica.json"),
    loadManifest("/question-sheets/proporcao-grandezas/proporcao-grandezas.json"),
    loadManifest("/question-sheets/citologia/citologia.json"),
    loadManifest("/question-sheets/questions.json"),
    loadManifest("/question-sheets/cinematica-i/cinematica-i.json"),
  ]);

  const rawManifest = manifests.flat();
  // MT_PROPORCAO_GRANDEZAS_REPLACE_LEGACY_V1
  const hasProporcaoGrandezasV2 = rawManifest.some((item) =>
    item.id.startsWith("prop-grandezas-"),
  );
  const effectiveRawManifest = hasProporcaoGrandezasV2
    ? rawManifest.filter(
        (item) =>
          item.lessonKey !== "matematica:proporcao-grandezas" ||
          item.id.startsWith("prop-grandezas-"),
      )
    : rawManifest;
  if (!effectiveRawManifest.length) {
    throw new Error("Pacote visual das questões ainda não foi instalado.");
  }

  const manifest = normalizeLessonAssignments(effectiveRawManifest);
  validateEnemQuestionSnapshotManifest(manifest);
  return sortEnemQuestionSnapshots(manifest);
}
