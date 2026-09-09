import type { QuestionChoiceMap, QuestionType } from "@/lib/question-bank";

export type QuestionImportContext = {
  plan_id: string;
  subject_id: string;
  lesson_id: string;
};

export type QuestionImportPayload = QuestionImportContext & {
  statement: string;
  question_type: QuestionType;
  choices: QuestionChoiceMap | null;
  level: number;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  source_code: string | null;
  correct_answer: string;
  explanation: string | null;
  active: boolean;
};

export type QuestionImportParseResult = {
  questions: QuestionImportPayload[];
  errors: string[];
};

const aliases: Record<string, string> = {
  ENUNCIADO: "statement",
  "ENUNCIADO DA QUESTAO": "statement",
  "ENUNCIADO DO ITEM": "statement",
  QUESTAO: "statement",
  ITEM: "statement",
  TEXTO: "statement",

  TIPO: "question_type",
  "TIPO DE QUESTAO": "question_type",

  NIVEL: "level",
  DIFICULDADE: "level",

  BANCA: "banca",
  ANO: "ano",
  PROVA: "exam_name",
  CARGO: "exam_name",
  "CARGO/PROVA": "exam_name",
  "CARGO - PROVA": "exam_name",

  FONTE: "source_code",
  CODIGO: "source_code",
  "CODIGO/FONTE": "source_code",

  GABARITO: "correct_answer",
  RESPOSTA: "correct_answer",
  "RESPOSTA CORRETA": "correct_answer",

  COMENTARIO: "explanation",
  "COMENTARIO DO GABARITO": "explanation",
  EXPLICACAO: "explanation",
  JUSTIFICATIVA: "explanation",

  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
};

function stripDecorations(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^\s*(?:[-*•▪◦]+\s*)+/, "")
    .replace(/^\s*\d+\s*[.)-]\s*/, "")
    .replace(/^\s*#{1,6}\s*/, "")
    .replace(/^\s*\[(.*?)\]\s*$/, "$1")
    .replace(/^\s*\((.*?)\)\s*$/, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function normalizeLabel(value: string) {
  return stripDecorations(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function aliasFor(rawLabel: string) {
  const normalized = normalizeLabel(rawLabel);

  if (aliases[normalized]) return aliases[normalized];

  const withoutTrailingPunctuation = normalized.replace(/[.:;,-]+$/g, "").trim();
  if (aliases[withoutTrailingPunctuation]) return aliases[withoutTrailingPunctuation];

  return "";
}

function normalizeType(value: string, hasChoices: boolean): QuestionType {
  const normalized = normalizeLabel(value).replace(/[ _-]+/g, " ");

  if (!normalized) return hasChoices ? "multiple_choice" : "true_false";

  if (
    [
      "CERTO ERRADO",
      "CERTO/ERRADO",
      "C/E",
      "CE",
      "TRUE FALSE",
      "TRUE/FALSE",
      "VERDADEIRO FALSO",
      "VERDADEIRO/FALSO",
    ].includes(normalized)
  ) {
    return "true_false";
  }

  if (
    [
      "MULTIPLA ESCOLHA",
      "MULTIPLE CHOICE",
      "ALTERNATIVAS",
      "OBJETIVA",
    ].includes(normalized)
  ) {
    return "multiple_choice";
  }

  throw new Error(`tipo “${value}” não reconhecido`);
}

function normalizeAnswer(value: string, type: QuestionType) {
  const answer = normalizeLabel(value);

  if (type === "true_false") {
    if (["CERTO", "C", "TRUE", "VERDADEIRO", "V"].includes(answer)) return "TRUE";
    if (["ERRADO", "E", "FALSE", "FALSO", "F"].includes(answer)) return "FALSE";
    throw new Error("gabarito deve ser CERTO ou ERRADO");
  }

  const letter = answer.match(/[A-E]/)?.[0] ?? "";
  if (!/^[A-E]$/.test(letter)) {
    throw new Error("gabarito deve ser uma letra de A até E");
  }

  return letter;
}

type ParsedFieldLine = {
  field: string;
  value: string;
};

function parseFieldLine(rawLine: string): ParsedFieldLine | null {
  const line = rawLine.replace(/^\uFEFF/, "").trim();
  if (!line) return null;

  // Alternativas: aceita A:, A), A., (A), A -, **A:** etc.
  const optionMatch = line.match(
    /^\s*(?:[-*•]\s*)?(?:\*\*)?\(?([A-Ea-e])\)?(?:\*\*)?\s*(?:[:.)\-–—=])\s*(.*)$/u,
  );

  if (optionMatch) {
    return {
      field: optionMatch[1].toUpperCase(),
      value: optionMatch[2].replace(/\*\*$/g, "").trim(),
    };
  }

  // Campo com separador: ENUNCIADO:, **ENUNCIADO:**, ENUNCIADO -, ENUNCIADO = ...
  const separatorMatch = line.match(
    /^\s*(?:[-*•]\s*)?(?:#{1,6}\s*)?(.*?)\s*(?::|=|[–—]|-\s+)\s*(.*)$/u,
  );

  if (separatorMatch) {
    const field = aliasFor(separatorMatch[1]);
    if (field) {
      return {
        field,
        value: separatorMatch[2].replace(/\*\*$/g, "").trim(),
      };
    }
  }

  // Campo sozinho em uma linha: ENUNCIADO / **ENUNCIADO** / ## ENUNCIADO
  const standaloneField = aliasFor(line);
  if (standaloneField) {
    return { field: standaloneField, value: "" };
  }

  return null;
}

function splitBlocks(input: string) {
  const normalized = input
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    .trim();

  if (!normalized) return [];

  const explicitBlocks = normalized
    .split(/^[ \t]*(?:-{3,}|={3,})[ \t]*$/m)
    .map((block) => block.trim())
    .filter(Boolean);

  if (explicitBlocks.length > 1) return explicitBlocks;

  // Se não houver ---, quebra automaticamente quando encontra um novo ENUNCIADO
  // depois que a questão anterior já começou.
  const blocks: string[] = [];
  let current: string[] = [];
  let statementHeaders = 0;

  for (const line of normalized.split("\n")) {
    const parsed = parseFieldLine(line);

    if (parsed?.field === "statement") {
      statementHeaders += 1;

      if (statementHeaders > 1 && current.some((item) => item.trim())) {
        blocks.push(current.join("\n").trim());
        current = [];
      }
    }

    current.push(line);
  }

  if (current.some((item) => item.trim())) {
    blocks.push(current.join("\n").trim());
  }

  return blocks.filter(Boolean);
}

function parseBlock(block: string) {
  const fields: Record<string, string> = {};
  let currentField = "";

  for (const rawLine of block.split("\n")) {
    const parsed = parseFieldLine(rawLine);

    if (parsed) {
      currentField = parsed.field;

      if (
        currentField === "statement" &&
        fields.statement?.trim() &&
        parsed.value.trim()
      ) {
        fields.statement = `${fields.statement}\n${parsed.value}`.trim();
      } else {
        fields[currentField] = parsed.value.trim();
      }

      continue;
    }

    if (currentField && rawLine.trim()) {
      fields[currentField] = `${fields[currentField] ?? ""}\n${rawLine.trim()}`.trim();
    }
  }

  return fields;
}

function recoverShortStatement(block: string) {
  const lines = block.replace(/\r\n?/g, "\n").split("\n");
  let sawStatementHeader = false;
  const parts: string[] = [];

  for (const rawLine of lines) {
    const parsed = parseFieldLine(rawLine);

    if (!sawStatementHeader) {
      if (parsed?.field === "statement") {
        sawStatementHeader = true;
        if (parsed.value.trim()) parts.push(parsed.value.trim());
      }
      continue;
    }

    if (parsed) {
      if (parsed.field === "statement") {
        if (parsed.value.trim()) parts.push(parsed.value.trim());
        continue;
      }

      // A primeira alternativa ou qualquer outro campo encerra o enunciado.
      break;
    }

    const cleaned = rawLine
      .replace(/^\s*>\s?/, "")
      .replace(/^\s*(?:[-*•▪◦]+\s*)/, "")
      .trim();

    if (cleaned) parts.push(cleaned);
  }

  return parts.join("\n").trim();
}

function genericStatementFor(
  questionType: QuestionType,
  choiceCount: number,
) {
  if (questionType === "multiple_choice" && choiceCount >= 2) {
    return "Assinale a alternativa correta.";
  }

  return "";
}

export function parseFriendlyQuestionImport(
  input: string,
  context: QuestionImportContext,
): QuestionImportParseResult {
  const questions: QuestionImportPayload[] = [];
  const errors: string[] = [];

  splitBlocks(input).forEach((block, blockIndex) => {
    const fields = parseBlock(block);

    try {
      if (!context.plan_id || !context.subject_id || !context.lesson_id) {
        throw new Error("selecione concurso, matéria e assunto antes de organizar");
      }

      if (!fields.statement?.trim()) {
        const recovered = recoverShortStatement(block);
        if (recovered) fields.statement = recovered;
      }

      const level = Number(fields.level);
      if (![1, 2, 3, 4].includes(level)) {
        throw new Error("NÍVEL deve ser 1, 2, 3 ou 4");
      }

      const choices = Object.fromEntries(
        ["A", "B", "C", "D", "E"]
          .filter((key) => fields[key]?.trim())
          .map((key) => [key, fields[key].trim()]),
      );

      const questionType = normalizeType(
        fields.question_type ?? "",
        Object.keys(choices).length > 0,
      );

      if (!fields.statement?.trim()) {
        const generic = genericStatementFor(
          questionType,
          Object.keys(choices).length,
        );

        if (generic) {
          fields.statement = generic;
        } else {
          const firstUsefulLine =
            block
              .split("\n")
              .map((line) => line.trim())
              .find(Boolean)
              ?.slice(0, 80) ?? "";

          throw new Error(
            firstUsefulLine
              ? `ENUNCIADO vazio ou não recuperável. Primeira linha: “${firstUsefulLine}”`
              : "ENUNCIADO está vazio",
          );
        }
      }

      if (
        questionType === "multiple_choice" &&
        Object.keys(choices).length < 2
      ) {
        throw new Error("múltipla escolha precisa de pelo menos duas alternativas");
      }

      const correctAnswer = normalizeAnswer(
        fields.correct_answer ?? "",
        questionType,
      );

      if (
        questionType === "multiple_choice" &&
        !choices[correctAnswer]
      ) {
        throw new Error(
          `a alternativa do gabarito ${correctAnswer} não foi preenchida`,
        );
      }

      const year = fields.ano ? Number(fields.ano) : null;

      if (
        year !== null &&
        (!Number.isInteger(year) || year < 1900 || year > 2200)
      ) {
        throw new Error("ANO inválido");
      }

      questions.push({
        ...context,
        statement: fields.statement.trim(),
        question_type: questionType,
        choices: questionType === "multiple_choice" ? choices : null,
        level,
        banca: fields.banca?.trim() || null,
        ano: year,
        exam_name: fields.exam_name?.trim() || null,
        source_code: fields.source_code?.trim() || null,
        correct_answer: correctAnswer,
        explanation: fields.explanation?.trim() || null,
        active: true,
      });
    } catch (error) {
      errors.push(
        `Questão ${blockIndex + 1}: ${
          error instanceof Error ? error.message : "formato inválido"
        }.`,
      );
    }
  });

  if (!input.trim()) {
    errors.push("Cole pelo menos uma questão para organizar.");
  }

  return { questions, errors };
}

export const friendlyQuestionTemplate = `ENUNCIADO:
Digite o enunciado. Pode ser curto, ter uma única palavra ou ocupar várias linhas.

TIPO: MULTIPLA ESCOLHA
NÍVEL: 2
BANCA: CEBRASPE
ANO: 2025
PROVA: PRF — Policial Rodoviário Federal
FONTE: PRF-2025-001

A: Primeira alternativa
B: Segunda alternativa
C: Terceira alternativa
D: Quarta alternativa
E: Quinta alternativa opcional

GABARITO: B
COMENTÁRIO:
Explique aqui por que a alternativa correta é a letra B.

---

ENUNCIADO:
Digite aqui uma questão de certo ou errado.

TIPO: CERTO ERRADO
NÍVEL: 1
BANCA: CEBRASPE
ANO: 2025
PROVA: PRF
GABARITO: CERTO
COMENTÁRIO:
Comentário completo da correção.`;

// TITAN_MULTI_LESSON_IMPORT_V1
export type MultiLessonCatalogRow = {
  plan_id: string;
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  lesson_position: number;
};

function normalizeRouteValue(value: string) {
  return normalizeLabel(value)
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const multiSubjectAliases: Record<string, string> = {
  "PORTUGUES": "LINGUA PORTUGUESA",
  "LINGUA PORTUGUESA": "LINGUA PORTUGUESA",
  "DPPM": "PROCESSO PENAL MILITAR",
  "PPM": "PROCESSO PENAL MILITAR",
  "PROCESSO PENAL MILITAR": "PROCESSO PENAL MILITAR",
  "DPM": "DIREITO PENAL MILITAR",
  "PENAL MILITAR": "DIREITO PENAL MILITAR",
  "DIREITO PENAL MILITAR": "DIREITO PENAL MILITAR",
  "CONST": "DIREITO CONSTITUCIONAL",
  "CONSTITUCIONAL": "DIREITO CONSTITUCIONAL",
  "DIREITO CONSTITUCIONAL": "DIREITO CONSTITUCIONAL",
  "D ADM": "DIREITO ADMINISTRATIVO",
  "ADMINISTRATIVO": "DIREITO ADMINISTRATIVO",
  "DIREITO ADMINISTRATIVO": "DIREITO ADMINISTRATIVO",
  "LEGISLACAO": "LEGISLACAO PMAL",
  "LEGISLACAO PMAL": "LEGISLACAO PMAL",
  "ALAGOAS": "CONHECIMENTOS DO ESTADO DE ALAGOAS",
  "CONHECIMENTOS DE ALAGOAS": "CONHECIMENTOS DO ESTADO DE ALAGOAS",
  "DH": "DIREITOS HUMANOS",
  "DIREITOS HUMANOS": "DIREITOS HUMANOS",
  "PROC PENAL": "PROCESSO PENAL",
  "PROCESSO PENAL": "PROCESSO PENAL",
};

function resolveMultiSubject(
  catalog: MultiLessonCatalogRow[],
  planId: string,
  rawSubject: string,
) {
  const rows = catalog.filter((row) => row.plan_id === planId);
  const wantedRaw = normalizeRouteValue(rawSubject);
  const wanted = multiSubjectAliases[wantedRaw] ?? wantedRaw;
  const byId = new Map<string, MultiLessonCatalogRow>();

  rows.forEach((row) => {
    const name = normalizeRouteValue(row.subject_name);
    const slug = normalizeRouteValue(row.subject_slug);
    if (name === wanted || slug === wanted || multiSubjectAliases[name] === wanted) {
      byId.set(row.subject_id, row);
    }
  });

  if (byId.size === 1) return [...byId.values()][0];

  if (byId.size === 0) {
    const loose = new Map<string, MultiLessonCatalogRow>();
    rows.forEach((row) => {
      const name = normalizeRouteValue(row.subject_name);
      if (name.includes(wanted) || wanted.includes(name)) loose.set(row.subject_id, row);
    });
    if (loose.size === 1) return [...loose.values()][0];
  }

  return null;
}

function multiLessonTokensV5(value: string) {
  const stop = new Set([
    "A", "AS", "O", "OS", "DE", "DA", "DAS", "DO", "DOS", "E", "EM", "NA", "NAS", "NO", "NOS",
    "PARA", "POR", "COM", "SEM", "SOBRE", "AULA", "N", "NR", "NUMERO",
  ]);
  return normalizeRouteValue(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && !stop.has(token));
}

function multiLessonSimilarityV5(wanted: string, candidate: string) {
  const a = [...new Set(multiLessonTokensV5(wanted))];
  const b = [...new Set(multiLessonTokensV5(candidate))];
  if (!a.length || !b.length) return { score: 0, coverage: 0, jaccard: 0, overlap: 0 };

  const bSet = new Set(b);
  const overlap = a.filter((token) => bSet.has(token)).length;
  const union = new Set([...a, ...b]).size;
  const coverage = overlap / a.length;
  const jaccard = union ? overlap / union : 0;

  // A cobertura do texto informado pesa mais que o tamanho do titulo oficial.
  // Isso permite, por exemplo:
  // "Lei 14.133/2021 e contratos administrativos"
  // -> "Licitacoes e contratos administrativos - Lei nº 14.133/2021 e legislacao pertinente".
  const score = coverage * 0.72 + jaccard * 0.28;
  return { score, coverage, jaccard, overlap };
}

function resolveMultiLesson(
  catalog: MultiLessonCatalogRow[],
  subjectId: string,
  rawLesson: string,
) {
  const rows = catalog.filter((row) => row.subject_id === subjectId);
  const wanted = normalizeRouteValue(rawLesson);
  const numeric = wanted.match(/^(?:AULA\s*)?0*(\d{1,3})(?:\s|$)/);
  const stripped = wanted.replace(/^(?:AULA\s*)?0*\d{1,3}\s*/, "").trim();

  // 1) Se houver numero + titulo, o titulo continua tendo prioridade.
  // Isso preserva a correcao V4 para numeracoes antigas.
  if (numeric && stripped) {
    const exactByTitle = rows.filter((row) => normalizeRouteValue(row.lesson_title) === stripped);
    if (exactByTitle.length === 1) return exactByTitle[0];

    const exactBySlug = rows.filter((row) => normalizeRouteValue(row.lesson_slug) === stripped);
    if (exactBySlug.length === 1) return exactBySlug[0];

    const looseByTitle = rows.filter((row) => {
      const title = normalizeRouteValue(row.lesson_title);
      return title.includes(stripped) || stripped.includes(title);
    });
    if (looseByTitle.length === 1) return looseByTitle[0];

    // 2) Correspondencia por palavras-chave/numeros, tolerando nomes resumidos.
    const ranked = rows
      .map((row) => {
        const titleScore = multiLessonSimilarityV5(stripped, row.lesson_title);
        const slugScore = multiLessonSimilarityV5(stripped, row.lesson_slug);
        const best = titleScore.score >= slugScore.score ? titleScore : slugScore;
        return { row, ...best };
      })
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    const second = ranked[1];
    if (
      best &&
      best.overlap >= 2 &&
      (best.coverage >= 0.72 || best.jaccard >= 0.52) &&
      (!second || best.score - second.score >= 0.08)
    ) {
      return best.row;
    }

    // 3) O numero pode confirmar a aula, mas somente se o titulo informado
    // tiver compatibilidade minima com o titulo oficial. Assim nao voltamos
    // ao bug de mandar uma numeracao antiga para a aula errada.
    const position = Number(numeric[1]);
    const byPosition = rows.filter((row) => Number(row.lesson_position) === position);
    if (byPosition.length === 1) {
      const posScore = multiLessonSimilarityV5(stripped, byPosition[0].lesson_title);
      if (posScore.overlap >= 1 && (posScore.coverage >= 0.45 || posScore.jaccard >= 0.32)) {
        return byPosition[0];
      }
    }

    // 4) Se houver uma correspondencia semantica muito forte e unica,
    // aceita mesmo que o titulo oficial tenha prefixos/sufixos extras.
    if (
      best &&
      best.overlap >= 2 &&
      best.coverage >= 0.64 &&
      (!second || best.score - second.score >= 0.14)
    ) {
      return best.row;
    }

    return null;
  }

  // Somente numero: usa a posicao exata.
  if (numeric) {
    const position = Number(numeric[1]);
    const byPosition = rows.filter((row) => Number(row.lesson_position) === position);
    if (byPosition.length === 1) return byPosition[0];
  }

  // Somente titulo/slug.
  const exact = rows.filter((row) => {
    const title = normalizeRouteValue(row.lesson_title);
    const slug = normalizeRouteValue(row.lesson_slug);
    return title === wanted || slug === wanted;
  });
  if (exact.length === 1) return exact[0];

  const loose = rows.filter((row) => {
    const title = normalizeRouteValue(row.lesson_title);
    return title.includes(wanted) || wanted.includes(title);
  });
  if (loose.length === 1) return loose[0];

  const ranked = rows
    .map((row) => ({ row, ...multiLessonSimilarityV5(wanted, row.lesson_title) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  if (
    best &&
    best.overlap >= 2 &&
    best.coverage >= 0.72 &&
    (!second || best.score - second.score >= 0.08)
  ) {
    return best.row;
  }

  return null;
}

function parseMultiRouting(block: string) {
  let subject = "";
  let lesson = "";
  const body: string[] = [];

  for (const line of block.split("\n")) {
    const match = line.match(/^\s*([^:]{1,30})\s*:\s*(.*)$/);
    const label = match ? normalizeLabel(match[1]) : "";

    if (match && ["MATERIA", "DISCIPLINA"].includes(label)) {
      subject = match[2].trim();
      continue;
    }
    if (match && ["AULA", "ASSUNTO", "TOPICO"].includes(label)) {
      lesson = match[2].trim();
      continue;
    }
    body.push(line);
  }

  return { subject, lesson, body: body.join("\n").trim() };
}

function normalizeMultiTypeV4(value: string, hasChoices: boolean): QuestionType {
  const normalized = normalizeLabel(value).replace(/[ _-]+/g, " ");
  if (!normalized) return hasChoices ? "multiple_choice" : "true_false";
  if (["CERTO ERRADO", "CERTO/ERRADO", "TRUE FALSE", "TRUE/FALSE", "C E", "C/E"].includes(normalized)) {
    return "true_false";
  }
  if (["MULTIPLA ESCOLHA", "MULTIPLE CHOICE", "ALTERNATIVAS", "OBJETIVA"].includes(normalized)) {
    return "multiple_choice";
  }
  throw new Error(`tipo “${value}” nao reconhecido`);
}

function normalizeMultiAnswerV4(value: string, type: QuestionType) {
  const answer = normalizeLabel(value).replace(/\s+/g, " ").trim();

  if (type === "true_false") {
    if (/^(?:CERTO|TRUE|VERDADEIRO)(?:\b|[.,;:!\-])/i.test(answer) || answer === "C") return "TRUE";
    if (/^(?:ERRADO|FALSE|FALSO)(?:\b|[.,;:!\-])/i.test(answer) || answer === "E") return "FALSE";
    throw new Error("gabarito deve ser CERTO ou ERRADO");
  }

  if (/^[A-E]$/.test(answer)) return answer;
  const match = answer.match(/^(?:ALTERNATIVA|LETRA|OPCAO)?\s*([A-E])(?:\b|[.,;:!\-]|$)/i);
  if (match) return match[1].toUpperCase();
  throw new Error("gabarito deve ser uma letra de A ate E");
}

function parseMultiQuestionBodyV4(
  body: string,
  context: QuestionImportContext,
): QuestionImportParseResult {
  const questions: QuestionImportPayload[] = [];
  const errors: string[] = [];
  const fields: Record<string, string> = {};
  let currentField = "";
  let commentTerminal = false;

  for (const rawLine of body.replace(/\r\n/g, "\n").split("\n")) {
    // TITAN_COMMENT_TERMINAL_FIX_V4
    // Depois de COMENTARIO/EXPLICACAO, tudo e comentario. Uma frase como
    // "Gabarito: CERTO. ..." nao pode reabrir/sobrescrever o campo GABARITO.
    if (commentTerminal) {
      if (rawLine.trim()) {
        fields.explanation = `${fields.explanation ?? ""}\n${rawLine.trim()}`.trim();
      }
      continue;
    }

    const match = rawLine.match(/^\s*([^:]{1,24})\s*:\s*(.*)$/);
    const normalized = match ? normalizeLabel(match[1]) : "";
    const field = aliases[normalized];

    if (match && field) {
      currentField = field;
      fields[field] = match[2].trim();
      if (field === "explanation") commentTerminal = true;
      continue;
    }

    if (currentField && rawLine.trim()) {
      fields[currentField] = `${fields[currentField] ?? ""}\n${rawLine.trim()}`.trim();
    }
  }

  try {
    if (!context.plan_id || !context.subject_id || !context.lesson_id) {
      throw new Error("selecione concurso, materia e assunto antes de organizar");
    }
    if (!fields.statement?.trim()) throw new Error("ENUNCIADO esta vazio");

    const level = Number(fields.level);
    if (![1, 2, 3, 4].includes(level)) throw new Error("NIVEL deve ser 1, 2, 3 ou 4");

    const choices = Object.fromEntries(
      ["A", "B", "C", "D", "E"]
        .filter((key) => fields[key]?.trim())
        .map((key) => [key, fields[key].trim()]),
    );

    const questionType = normalizeMultiTypeV4(fields.question_type ?? "", Object.keys(choices).length > 0);
    if (questionType === "multiple_choice" && Object.keys(choices).length < 2) {
      throw new Error("multipla escolha precisa de pelo menos duas alternativas");
    }

    const correctAnswer = normalizeMultiAnswerV4(fields.correct_answer ?? "", questionType);
    if (questionType === "multiple_choice" && !choices[correctAnswer]) {
      throw new Error(`a alternativa do gabarito ${correctAnswer} nao foi preenchida`);
    }

    const year = fields.ano ? Number(fields.ano) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
      throw new Error("ANO invalido");
    }

    questions.push({
      ...context,
      statement: fields.statement.trim(),
      question_type: questionType,
      choices: questionType === "multiple_choice" ? choices : null,
      level,
      banca: fields.banca?.trim() || null,
      ano: year,
      exam_name: fields.exam_name?.trim() || null,
      source_code: fields.source_code?.trim() || null,
      correct_answer: correctAnswer,
      explanation: fields.explanation?.trim() || null,
      active: true,
    });
  } catch (error) {
    errors.push(`Questao 1: ${error instanceof Error ? error.message : "formato invalido"}.`);
  }

  return { questions, errors };
}

export function parseMultiLessonQuestionImport(
  input: string,
  catalog: MultiLessonCatalogRow[],
  planId: string,
): QuestionImportParseResult {
  const questions: QuestionImportPayload[] = [];
  const errors: string[] = [];

  if (!planId) {
    return { questions, errors: ["Selecione o concurso/plano antes de importar varias aulas."] };
  }

  const blocks = splitBlocks(input);
  blocks.forEach((block, index) => {
    const routing = parseMultiRouting(block);

    if (!routing.subject) {
      errors.push("Questao " + (index + 1) + ": informe MATERIA.");
      return;
    }
    if (!routing.lesson) {
      errors.push("Questao " + (index + 1) + ": informe AULA.");
      return;
    }

    const subject = resolveMultiSubject(catalog, planId, routing.subject);
    if (!subject) {
      errors.push(
        "Questao " + (index + 1) + ': materia "' + routing.subject + '" nao encontrada no plano selecionado.',
      );
      return;
    }

    const lesson = resolveMultiLesson(catalog, subject.subject_id, routing.lesson);
    if (!lesson) {
      const suggestions = catalog
        .filter((row) => row.subject_id === subject.subject_id)
        .slice(0, 12)
        .map((row) => "Aula " + row.lesson_position + " - " + row.lesson_title)
        .join("; ");
      errors.push(
        "Questao " +
          (index + 1) +
          ': aula "' +
          routing.lesson +
          '" nao encontrada em ' +
          subject.subject_name +
          (suggestions ? ". Exemplos validos: " + suggestions : "."),
      );
      return;
    }

    // V4 nao depende mais do parser amigavel antigo para interpretar o corpo.
    // Isso isola o modo multiaulas do bug que confundia "Gabarito:" dentro do comentario.
    const parsed = parseMultiQuestionBodyV4(routing.body, {
      plan_id: planId,
      subject_id: subject.subject_id,
      lesson_id: lesson.lesson_id,
    });

    if (parsed.errors.length) {
      parsed.errors.forEach((error) => {
        errors.push(
          "Questao " +
            (index + 1) +
            " (" +
            subject.subject_name +
            " / Aula " +
            lesson.lesson_position +
            "): " +
            error.replace(/^Quest(?:ao|ão)\s+\d+:\s*/i, ""),
        );
      });
      return;
    }

    questions.push(...parsed.questions);
  });

  if (!input.trim()) errors.push("Cole pelo menos uma questao para organizar.");
  return { questions, errors };
}

export const multiLessonQuestionTemplate = [
  "MATÉRIA: Direito Administrativo",
  "AULA: 13 - Controle administrativo",
  "ENUNCIADO:",
  "Digite aqui o enunciado completo da questão.",
  "",
  "TIPO: CERTO ERRADO",
  "NÍVEL: 2",
  "BANCA: Cebraspe",
  "ANO: 2026",
  "PROVA: CFO PMAL",
  "FONTE: CODIGO-OU-ORIGEM",
  "GABARITO: CERTO",
  "COMENTÁRIO:",
  "Explique o fundamento e a pegadinha.",
  "",
  "---",
  "",
  "MATÉRIA: Filosofia",
  "AULA: 2 - Ética",
  "ENUNCIADO:",
  "Cole aqui outra questão, agora destinada a outra aula.",
  "",
  "TIPO: MULTIPLA ESCOLHA",
  "NÍVEL: 3",
  "BANCA: Cebraspe",
  "ANO: 2026",
  "PROVA: CFO PMAL",
  "A: Alternativa A",
  "B: Alternativa B",
  "C: Alternativa C",
  "D: Alternativa D",
  "E: Alternativa E",
  "GABARITO: B",
  "COMENTÁRIO:",
  "Comentário da correção.",
].join("\n");

// TITAN_MULTI_PARSER_FIX_V4

// TITAN_LESSON_ROUTER_FIX_V5
