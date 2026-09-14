export type EnemQuestionSnapshot = {
  id: string;
  number: number;
  section: string;
  lessonKey: string;
  y: number;
  h: number;
  w: number;
  sheet: string;
  sheetW: number;
  sheetH: number;
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

export async function loadEnemQuestionSnapshotManifest() {
  const response = await fetch("/question-sheets/questions.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Pacote visual das questões ainda não foi instalado.");
  return (await response.json()) as EnemQuestionSnapshot[];
}
