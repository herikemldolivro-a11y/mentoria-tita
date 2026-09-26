"use client";

import { startPrincipalLeveling, type PrincipalLeveling } from "@/lib/principal-calendar-system";

export type PrincipalLevelingLaunch = {
  attemptId: string;
  href: string;
  notice: string;
};

type RpcResult = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function levelingErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const details = error as { name?: unknown; message?: unknown; code?: unknown };
    if (details.name === "AbortError") {
      return "A resposta demorou ou foi interrompida. O servidor pode ter iniciado a tentativa; atualize o calendário antes de tentar novamente.";
    }
    const message = nonEmptyText(details.message);
    const code = nonEmptyText(details.code);
    if (message) return code ? `${message} [${code}]` : message;
  }
  return nonEmptyText(error) ?? "Não foi possível iniciar o nivelamento. Tente novamente após atualizar o calendário.";
}

export function levelingAttemptDestination(attemptId: unknown, notice = "Tentativa pronta. Abrindo o nivelamento..."): PrincipalLevelingLaunch {
  const id = nonEmptyText(attemptId);
  if (!id || !UUID.test(id)) {
    throw new Error("O servidor não devolveu um identificador válido da tentativa de nivelamento. Nenhuma outra tentativa foi solicitada.");
  }
  return { attemptId: id, href: `/questoes/lista/${encodeURIComponent(id)}?mode=leveling`, notice };
}

function unwrapResult(value: unknown): RpcResult {
  // RPCs JSON retornam um objeto; RPCs tabulares podem retornar uma linha.
  const candidate = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("O servidor devolveu uma resposta vazia ou inesperada ao iniciar o nivelamento. Nenhuma outra tentativa foi solicitada.");
  }
  return candidate as RpcResult;
}

export function interpretPrincipalLevelingResult(value: unknown, level: number): PrincipalLevelingLaunch {
  const result = unwrapResult(value);
  const reason = nonEmptyText(result.reason);

  // Uma tentativa existente de outro nivel pode ser retomada, como na pagina /nivelamentos.
  if (reason === "other_level_in_progress") {
    const existing = positiveNumber(result.existing_level, level);
    if (result.attempt_id) {
      return levelingAttemptDestination(result.attempt_id, `Já existe um Nivelamento ${existing} em andamento nesta aula. Abrindo essa tentativa...`);
    }
    throw new Error("Já existe outro nivelamento em andamento nesta aula. Abra a área Nivelamentos para continuá-lo.");
  }

  // Nao ignorar uma negativa do servidor, mesmo se vier acompanhada de um id.
  if (reason === "revision_required") {
    throw new Error(`Conclua a Revisão ${positiveNumber(result.required_revision, level)} desta aula antes de iniciar este nivelamento.`);
  }
  if (reason === "no_questions" || reason === "insufficient_questions") {
    const availableValue = result.available_count;
    const availableNumber = typeof availableValue === "number" || typeof availableValue === "string" ? Number(availableValue) : NaN;
    const available = Number.isFinite(availableNumber) && availableNumber >= 0 ? String(availableNumber) : "quantidade não informada";
    const required = positiveNumber(result.required_count, 10);
    throw new Error(`Questões insuficientes neste nível: ${available}/${required} disponíveis.`);
  }
  if (reason === "not_scheduled") {
    throw new Error("Este nivelamento ainda não está agendado. Atualize o calendário e confira o agendamento da revisão desta aula.");
  }
  if (reason === "daily_limit" || reason === "daily_limit_reached" || reason === "daily_limit_exceeded") {
    throw new Error(nonEmptyText(result.message) ?? "O limite diário de nivelamentos foi atingido. Atualize o calendário e confira a data reagendada.");
  }
  if (result.ok === false || reason) {
    const message = nonEmptyText(result.message) ?? "O servidor não autorizou o início deste nivelamento.";
    throw new Error(reason ? `${message} (${reason})` : message);
  }

  return levelingAttemptDestination(result.attempt_id);
}

export async function preparePrincipalLeveling(
  leveling: PrincipalLeveling,
  signal?: AbortSignal,
): Promise<PrincipalLevelingLaunch> {
  if (signal?.aborted) throw new DOMException("Operação interrompida.", "AbortError");

  // Continuar/ver uma tentativa existente nao cria uma nova e nao depende de um
  // source_completed desatualizado no snapshot do calendario.
  if (leveling.attempt_id && (leveling.status === "in_progress" || leveling.status === "completed")) {
    return levelingAttemptDestination(leveling.attempt_id);
  }

  // O servidor do CALENDARIO continua validando revisao, agendamento e limites.
  // Nao trocar por start_manual_leveling_attempt nem tentar outra RPC apos uma negativa.
  const result: unknown = await startPrincipalLeveling(leveling.id, signal);
  if (signal?.aborted) throw new DOMException("Operação interrompida.", "AbortError");
  return interpretPrincipalLevelingResult(result, leveling.leveling_number);
}
