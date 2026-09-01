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
  QUESTAO: "statement",
  TIPO: "question_type",
  NIVEL: "level",
  BANCA: "banca",
  ANO: "ano",
  PROVA: "exam_name",
  CARGO: "exam_name",
  "CARGO/PROVA": "exam_name",
  FONTE: "source_code",
  CODIGO: "source_code",
  GABARITO: "correct_answer",
  RESPOSTA: "correct_answer",
  COMENTARIO: "explanation",
  EXPLICACAO: "explanation",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
};

function normalizeLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function normalizeType(value: string, hasChoices: boolean): QuestionType {
  const normalized = normalizeLabel(value).replace(/[ _-]+/g, " ");
  if (!normalized) return hasChoices ? "multiple_choice" : "true_false";
  if (["CERTO ERRADO", "CERTO/ERRADO", "TRUE FALSE", "TRUE/FALSE"].includes(normalized)) return "true_false";
  if (["MULTIPLA ESCOLHA", "MULTIPLE CHOICE", "ALTERNATIVAS"].includes(normalized)) return "multiple_choice";
  throw new Error(`tipo “${value}” não reconhecido`);
}

function normalizeAnswer(value: string, type: QuestionType) {
  const answer = normalizeLabel(value);
  if (type === "true_false") {
    if (["CERTO", "C", "TRUE", "VERDADEIRO"].includes(answer)) return "TRUE";
    if (["ERRADO", "E", "FALSE", "FALSO"].includes(answer)) return "FALSE";
    throw new Error("gabarito deve ser CERTO ou ERRADO");
  }
  if (!/^[A-E]$/.test(answer)) throw new Error("gabarito deve ser uma letra de A até E");
  return answer;
}

function splitBlocks(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .split(/^[ \t]*-{3,}[ \t]*$/m)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function parseFriendlyQuestionImport(
  input: string,
  context: QuestionImportContext,
): QuestionImportParseResult {
  const questions: QuestionImportPayload[] = [];
  const errors: string[] = [];

  splitBlocks(input).forEach((block, blockIndex) => {
    const fields: Record<string, string> = {};
    let currentField = "";

    for (const rawLine of block.split("\n")) {
      const match = rawLine.match(/^\s*([^:]{1,24})\s*:\s*(.*)$/);
      const normalized = match ? normalizeLabel(match[1]) : "";
      const field = aliases[normalized];
      if (match && field) {
        currentField = field;
        fields[field] = match[2].trim();
      } else if (currentField && rawLine.trim()) {
        fields[currentField] = `${fields[currentField]}\n${rawLine.trim()}`.trim();
      }
    }

    try {
      if (!context.plan_id || !context.subject_id || !context.lesson_id) {
        throw new Error("selecione concurso, matéria e assunto antes de organizar");
      }
      if (!fields.statement?.trim()) throw new Error("ENUNCIADO está vazio");
      const level = Number(fields.level);
      if (![1, 2, 3, 4].includes(level)) throw new Error("NÍVEL deve ser 1, 2, 3 ou 4");

      const choices = Object.fromEntries(
        ["A", "B", "C", "D", "E"]
          .filter((key) => fields[key]?.trim())
          .map((key) => [key, fields[key].trim()]),
      );
      const questionType = normalizeType(fields.question_type ?? "", Object.keys(choices).length > 0);
      if (questionType === "multiple_choice" && Object.keys(choices).length < 2) {
        throw new Error("múltipla escolha precisa de pelo menos duas alternativas");
      }
      const correctAnswer = normalizeAnswer(fields.correct_answer ?? "", questionType);
      if (questionType === "multiple_choice" && !choices[correctAnswer]) {
        throw new Error(`a alternativa do gabarito ${correctAnswer} não foi preenchida`);
      }

      const year = fields.ano ? Number(fields.ano) : null;
      if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
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
      errors.push(`Questão ${blockIndex + 1}: ${error instanceof Error ? error.message : "formato inválido"}.`);
    }
  });

  if (!input.trim()) errors.push("Cole pelo menos uma questão para organizar.");
  return { questions, errors };
}

export const friendlyQuestionTemplate = `ENUNCIADO:
Digite aqui todo o enunciado da questão. Pode ocupar várias linhas.

TIPO: MULTIPLA ESCOLHA
NÍVEL: 2
BANCA: Cebraspe
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
BANCA: Cebraspe
ANO: 2025
PROVA: PRF
GABARITO: CERTO
COMENTÁRIO:
Comentário completo da correção.`;
