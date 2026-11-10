"use strict";
// MT_SIMULADO_NEXT_QUESTION_V155 · focused patch; never replaces the whole runner.
function patch(source) {
  if (source.includes("MT_SIMULADO_NEXT_QUESTION_V155")) return source;
  if (!source.includes("MT_SIMULADO_MANUAL_SELECTION_V153") ||
      !source.includes("async function move(delta:number)") ||
      !source.includes("onClick={saveForRevision}"))
    throw Error("O componente de simulado local difere da V15.3. Nenhum arquivo alterado.");
  const anchor = '<span className="text-xs font-semibold text-white/60">Próxima revisão: {savedCount} questão(ões) marcadas por você · Rodada {roundNumber===0?"inicial":roundNumber}</span>';
  const occurrences = source.split(anchor).length - 1;
  if (occurrences !== 1) throw Error("Barra de navegação do simulado não identificada unicamente ("+occurrences+"). Nenhum arquivo alterado.");
  const button = [
    '      {/* MT_SIMULADO_NEXT_QUESTION_V155 · somente navegação, sem marcar revisão */}',
    '      <button',
    '        type="button"',
    '        onClick={() => void move(1)}',
    '        disabled={saving || index >= ordered.length - 1}',
    '        title={index >= ordered.length - 1 ? "Última questão deste simulado" : "Ir para a próxima questão"}',
    '        aria-label="Próxima questão"',
    '        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-35"',
    '      >',
    '        Próxima questão <ArrowRight size={16} />',
    '      </button>',
  ].join("\n");
  return source.replace(anchor,anchor+"\n"+button);
}
module.exports={patch};
