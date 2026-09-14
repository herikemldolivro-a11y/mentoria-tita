export type EnemQuestionSnapshot = {
  id: string;
  number: number;
  section: string;
  lessonKey: string;
  x?: number;
  y: number;
  h: number;
  w: number;
  sheet: string;
  sheetW: number;
  sheetH: number;
};

export type EnemQuestionSourceInfo = {
  source: "razao" | "separacao" | "unknown";
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

  if (subject === "matematica") {
    if (title === "razao") return "matematica:razao";
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

  return null;
}

const counts: Record<string, number> = {
  "quimica:separacao-misturas-p1": 40,
  "quimica:separacao-misturas-p2": 110,
  "matematica:razao": 28,
  "matematica:proporcao-grandezas": 17,
  "matematica:regra-tres-simples": 15,
  "matematica:porcentagem-p1": 8,
  "matematica:escalas-vazao": 6,
  "matematica:graficos-tabelas": 1,
  "matematica:equacoes-1-sistemas": 1,
  "matematica:funcao-exponencial": 1,
  "matematica:geometria-plana": 2,
  "matematica:geometria-espacial": 1,
};

export function getEnemSnapshotCount(subjectSlug: string, lessonTitle: string) {
  const key = resolveEnemSnapshotLessonKey(subjectSlug, lessonTitle);
  return key ? counts[key] ?? 0 : 0;
}

export function getEnemQuestionSourceInfo(question: EnemQuestionSnapshot): EnemQuestionSourceInfo {
  if (question.id.startsWith("razao-")) {
    return {
      source: "razao",
      label: "Lista de Razão",
      total: 80,
      position: question.number,
    };
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
  const valid = numbers.length === expected.length && numbers.every((value, index) => value === expected[index]);
  if (!valid) {
    throw new Error(`Pacote de ${label} incompleto ou fora de ordem. Atualize os arquivos das questões.`);
  }
}

export function validateEnemQuestionSnapshotManifest(items: EnemQuestionSnapshot[]) {
  const razao = items.filter((item) => item.id.startsWith("razao-"));
  const separacaoMain = items.filter((item) => /^sep-\d+$/.test(item.id));
  const separacaoDesafios = items.filter((item) => item.id.startsWith("sep-desafio-"));

  assertExactSequence(razao, Array.from({ length: 80 }, (_, index) => index + 1), "Razão");
  assertExactSequence(separacaoMain, Array.from({ length: 135 }, (_, index) => index + 1), "Separação de Misturas");
  assertExactSequence(separacaoDesafios, Array.from({ length: 15 }, (_, index) => index + 1), "Desafios de Separação de Misturas");

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) {
    throw new Error("Pacote de questões contém imagens duplicadas. Atualize os arquivos das questões.");
  }

  if (razao.length !== 80 || separacaoMain.length + separacaoDesafios.length !== 150) {
    throw new Error("A quantidade de imagens não confere com as listas originais.");
  }

  return true;
}

export async function loadEnemQuestionSnapshotManifest() {
  const response = await fetch("/question-sheets/questions.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Pacote visual das questões ainda não foi instalado.");
  const manifest = (await response.json()) as EnemQuestionSnapshot[];
  validateEnemQuestionSnapshotManifest(manifest);
  return sortEnemQuestionSnapshots(manifest);
}
