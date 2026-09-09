export const commonEnglishTranslations: Record<string, string> = {
  a:"um/uma", an:"um/uma", the:"o/a/os/as", and:"e", or:"ou", but:"mas",
  because:"porque", if:"se", when:"quando", after:"depois", before:"antes",
  later:"mais tarde", now:"agora", this:"isto/este", that:"isso/que",
  it:"isso/ele/ela", its:"seu/sua", he:"ele", his:"dele/seu", him:"ele",
  she:"ela", her:"dela/sua", they:"eles/elas", their:"deles/delas",
  them:"eles/elas", we:"nós", our:"nosso/nossa", you:"você/vocês",
  your:"seu/sua", people:"pessoas", some:"alguns/algumas", many:"muitos/muitas",
  more:"mais", less:"menos", all:"todos", one:"um", two:"dois", few:"poucos",
  same:"mesmo/mesma", different:"diferente", new:"novo/nova", good:"bom/boa",
  better:"melhor", big:"grande", small:"pequeno/pequena", large:"grande",
  important:"importante", serious:"grave/sério", simple:"simples", regular:"regular",
  only:"apenas", also:"também", still:"ainda", very:"muito", often:"frequentemente",
  can:"pode", may:"pode/poderia", will:"vai/irá", must:"deve", need:"precisar",
  have:"ter", has:"tem", had:"teve/tinha", do:"fazer", does:"faz", did:"fez",
  use:"usar", using:"usando", make:"fazer/tornar", makes:"faz/torna",
  become:"tornar-se", became:"tornou-se", help:"ajudar", helps:"ajuda",
  helped:"ajudou", learn:"aprender", say:"dizer", says:"diz", show:"mostrar",
  shows:"mostra", work:"trabalho/funcionar", works:"funciona", change:"mudar",
  changed:"mudou", create:"criar", reduce:"reduzir", support:"apoiar",
  want:"querer", wants:"quer", study:"estudar", understand:"entender",
  read:"ler", reading:"leitura", sleep:"sono/dormir", get:"obter/ficar",
  find:"encontrar", found:"encontrou", call:"ligar/chamar", calling:"ligando",
  check:"verificar", look:"parecer/olhar", live:"viver", lived:"viveu/sobreviveu",
  feel:"sentir/parecer", mean:"significar", means:"significa", know:"saber/conhecer",
  in:"em", on:"em/sobre", at:"em", to:"para/a", from:"de", for:"para/por",
  with:"com", without:"sem", of:"de", over:"sobre", through:"através",
  between:"entre", during:"durante", into:"para dentro de", about:"sobre",
  as:"como", than:"do que", not:"não", no:"não/nenhum", yes:"sim",
  is:"é", are:"são/estão", was:"era/estava", were:"eram/estavam",
  be:"ser/estar", been:"sido/estado"
};

export function normalizeEnglishWord(value: string) {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^[^a-z]+|[^a-z'-]+$/g, "");
}

export function getEnglishTranslation(
  word: string,
  wordMap: Record<string, string>,
  sentenceTranslation: string,
) {
  const key = normalizeEnglishWord(word);
  return wordMap[key] ?? commonEnglishTranslations[key] ?? `Contexto: ${sentenceTranslation}`;
}
