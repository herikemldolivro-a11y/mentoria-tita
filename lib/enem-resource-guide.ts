export type EnemResourceStatus = "confirmed" | "not-confirmed" | "create";

export type EnemResourceGuide = {
  assaadLists: string[];
  assaadListStatus: EnemResourceStatus;
  classMaterial: string[];
  classMaterialStatus: EnemResourceStatus;
  flashcards: string[];
  flashcardStatus: EnemResourceStatus;
  challenges: string[];
  challengeStatus: EnemResourceStatus;
  externalList: string[];
  externalListStatus: EnemResourceStatus;
  note?: string;
};

const nc = "NC · não confirmado no inventário recuperado";
const noExternal = "Nenhuma lista externa específica confirmada para este bloco";

function baseGuide(): EnemResourceGuide {
  return {
    assaadLists: [nc],
    assaadListStatus: "not-confirmed",
    classMaterial: [nc],
    classMaterialStatus: "not-confirmed",
    flashcards: [nc],
    flashcardStatus: "not-confirmed",
    challenges: [nc],
    challengeStatus: "not-confirmed",
    externalList: [noExternal],
    externalListStatus: "not-confirmed",
  };
}

function includes(title: string, value: string) {
  return title.toLocaleLowerCase("pt-BR").includes(value.toLocaleLowerCase("pt-BR"));
}

export function getEnemResourceGuide(subjectSlug: string, lessonTitle: string): EnemResourceGuide {
  const guide = baseGuide();
  const title = lessonTitle.toLocaleLowerCase("pt-BR");

  if (subjectSlug === "matematica") {
    guide.classMaterial = [nc];
    guide.flashcards = [nc];
    guide.challenges = [nc];

    if (includes(title, "matemática básica")) {
      guide.assaadLists = ["Sistema de Numeração Decimal · 30", "Operações Fundamentais · 15", "Números Decimais · 20", "Números Negativos · 10", "Conjuntos Numéricos · 30"];
      guide.externalList = ["EXT ✅ MAT-01 P1 · 10 questões reais completas · filtrar pela habilidade do Dia 1"];
      guide.externalListStatus = "confirmed";
    } else if (includes(title, "frações")) {
      guide.assaadLists = ["Frações · 10", "Critérios de Divisibilidade · 30", "Múltiplos e Divisores · 30"];
      guide.externalList = ["EXT ✅ MAT-01 P1 · 10 questões reais completas · usar apenas itens aderentes ao Dia 2"];
      guide.externalListStatus = "confirmed";
    } else if (includes(title, "mmc/mdc")) guide.assaadLists = ["MMC e MDC · 40", "Potenciação · 10", "Radiciação · 10"];
    else if (title === "razão") guide.assaadLists = ["Razão · 80", "Razão e Proporção · geral 200"];
    else if (includes(title, "proporção + grandezas")) guide.assaadLists = ["Proporção · 80", "Grandezas Proporcionais · 80", "Razão e Proporção · geral 200"];
    else if (includes(title, "regra de três simples")) guide.assaadLists = ["Regra de Três Simples · 50", "Razão e Proporção · geral 200"];
    else if (includes(title, "regra de três composta")) guide.assaadLists = ["Regra de Três Composta · 50", "Divisão Proporcional · 35", "Razão e Proporção Avançada · 50", "Razão e Proporção · geral 200"];
    else if (includes(title, "porcentagem")) guide.assaadLists = ["Conceitos/Cálculos · 50", "Porcentagens Sucessivas · 30", "Porcentagem Reversa · 30", "Porcentagem · geral 80"];
    else if (includes(title, "conversão de unidades")) guide.assaadLists = ["Conversão de Unidades · 60 + 52", "Notação Científica · 26 + 8"];
    else if (includes(title, "escalas")) guide.assaadLists = ["Escalas · 60", "Vazão · 32"];
    else if (includes(title, "gráficos e tabelas")) guide.assaadLists = ["Gráficos e Tabelas · 150"];
    else if (includes(title, "estatística")) guide.assaadLists = ["Estatística · 100"];
    else if (includes(title, "matemática financeira")) guide.assaadLists = ["Matemática Financeira · 120"];
    else if (includes(title, "conjuntos + expressões")) guide.assaadLists = ["Conjuntos · 47", "Álgebra · 20"];
    else if (includes(title, "produtos notáveis")) guide.assaadLists = ["Fatoração · 44", "Álgebra · 20"];
    else if (includes(title, "equações do 1º")) guide.assaadLists = ["Sistemas e Equações · 14"];
    else if (includes(title, "equação do 2º")) {
      guide.assaadLists = ["Sistemas e Equações · 14 (cobertura parcial)", "Inequações · SEM LISTA CONFIRMADA / CRIAR"];
      guide.assaadListStatus = "create";
    } else if (includes(title, "função do 1º")) guide.assaadLists = ["Função do Primeiro Grau · 28"];
    else if (includes(title, "função do 2º")) guide.assaadLists = ["Função do Segundo Grau · 19"];
    else if (includes(title, "geometria plana")) guide.assaadLists = ["Geometria Plana · 198"];
    else if (title === "trigonometria") guide.assaadLists = ["Trigonometria · 40"];
    else if (includes(title, "função trigonométrica")) guide.assaadLists = ["Função Trigonométrica · 20"];
    else if (includes(title, "geometria espacial")) guide.assaadLists = ["Geometria Espacial · 155", "Projeção Ortogonal · 40"];
    else if (includes(title, "geometria analítica")) {
      guide.assaadLists = ["Geometria Analítica · SEM LISTA CONFIRMADA / CRIAR"];
      guide.assaadListStatus = "create";
    } else if (includes(title, "progressão aritmética")) guide.assaadLists = ["Progressão Aritmética · 68"];
    else if (title === "pg") {
      guide.assaadLists = ["PG · SEM LISTA CONFIRMADA / CRIAR"];
      guide.assaadListStatus = "create";
    } else if (includes(title, "análise combinatória")) guide.assaadLists = ["Análise Combinatória · 115"];
    else if (includes(title, "probabilidade")) guide.assaadLists = ["Probabilidade · 83"];
    else if (includes(title, "função exponencial")) guide.assaadLists = ["Função Exponencial · 20"];
    else if (includes(title, "logaritmo")) guide.assaadLists = ["Logaritmo · 90", "Função Logarítmica · 10"];
    else if (includes(title, "matrizes")) {
      guide.assaadLists = ["Matrizes · SEM LISTA CONFIRMADA / CRIAR", "Função Racional · SEM LISTA CONFIRMADA / CRIAR"];
      guide.assaadListStatus = "create";
    }

    if (guide.assaadListStatus !== "create") guide.assaadListStatus = guide.assaadLists[0] === nc ? "not-confirmed" : "confirmed";
    return guide;
  }

  if (subjectSlug === "fisica") {
    guide.flashcards = ["FC Física · NC = não confirmado tópico a tópico"];
    guide.challenges = ["Desafios/Decks · NC"];
    guide.externalList = ["EXT Física · nenhuma lista externa específica confirmada"];

    if (includes(title, "energia")) guide.assaadLists = ["Energia · 30 + 20 + 30", "Ferramental Matemático · 30"];
    else if (includes(title, "cinemática i ")) guide.assaadLists = ["Cinemática I · 150"];
    else if (includes(title, "dinâmica i ")) guide.assaadLists = ["Dinâmica I · 182"];
    else if (includes(title, "potência")) guide.assaadLists = ["Potência · 90"];
    else if (includes(title, "eletrodinâmica")) guide.assaadLists = ["Eletrodinâmica · 267"];
    else if (includes(title, "eletrostática")) guide.assaadLists = ["Eletrostática · 81"];
    else if (includes(title, "termologia i ")) guide.assaadLists = ["Termometria · 35", "Calorimetria · 60", "Estados/Mudanças · 40", "Dilatação · 40", "Termologia I · geral 134"];
    else if (includes(title, "termologia ii")) guide.assaadLists = ["Termologia II · 188"];
    else if (includes(title, "ondulatória")) guide.assaadLists = ["Ondulatória · 154 + 110", ...(includes(title, "óptica") ? ["Óptica · 39"] : [])];
    else if (includes(title, "cinemática ii")) guide.assaadLists = ["Cinemática II · 109"];
    else if (includes(title, "dinâmica ii")) guide.assaadLists = ["Dinâmica II · 100"];
    else if (includes(title, "dinâmica iii")) guide.assaadLists = ["Dinâmica III · 92"];
    else if (includes(title, "estática")) guide.assaadLists = ["Estática · 80", "Hidrostática · 77"];
    else if (includes(title, "magnetismo") || includes(title, "fechamento do núcleo")) guide.assaadLists = ["Eletromagnetismo · 38"];

    guide.assaadListStatus = guide.assaadLists[0] === nc ? "not-confirmed" : "confirmed";
    return guide;
  }

  if (subjectSlug === "quimica") {
    guide.flashcards = ["FC Química · NC = não confirmado no inventário atual"];
    guide.challenges = ["Desafios/Decks · NC"];
    guide.externalList = ["EXT Química · nenhuma lista externa específica confirmada"];

    if (includes(title, "propriedades da matéria")) guide.assaadLists = ["Estados Físicos · 50", "Propriedades da Matéria · 129 + 100"];
    else if (includes(title, "separação de misturas")) guide.assaadLists = ["Separação de Misturas · 145 + 50"];
    else if (includes(title, "atomística")) guide.assaadLists = ["Atomística · 105"];
    else if (includes(title, "tabela periódica")) guide.assaadLists = ["Tabela Periódica e Propriedades · 73"];
    else if (includes(title, "ligações")) guide.assaadLists = ["Ligações/Propriedades/Polaridade · 80", ...(includes(title, "geometria") ? ["Geometria Molecular · 59"] : [])];
    else if (includes(title, "química inorgânica")) guide.assaadLists = ["Química Inorgânica · 138"];
    else if (includes(title, "estequiometria")) guide.assaadLists = ["Estequiometria · 139"];
    else if (includes(title, "soluções")) guide.assaadLists = ["Soluções · 100"];
    else if (includes(title, "termoquímica")) guide.assaadLists = ["Termoquímica · 89"];
    else if (includes(title, "cinética")) guide.assaadLists = ["Cinética Química · 35"];
    else if (includes(title, "equilíbrio")) guide.assaadLists = ["Equilíbrio Químico · 35"];
    else if (includes(title, "eletroquímica")) guide.assaadLists = ["Eletroquímica · 40"];
    else if (includes(title, "radioatividade")) guide.assaadLists = ["Radioatividade · 78", "Química Ambiental · 70"];
    else if (includes(title, "orgânica")) guide.assaadLists = ["Química Orgânica · 185"];

    guide.assaadListStatus = guide.assaadLists[0] === nc ? "not-confirmed" : "confirmed";
    return guide;
  }

  if (subjectSlug === "biologia") {
    if (includes(title, "fundamentos")) guide.assaadLists = ["O Que é Vida · 35", "Níveis de Organização · 35", "Método Científico · 40"];
    else if (includes(title, "citologia") || includes(title, "organelas")) guide.assaadLists = ["Introdução à Célula · 35", "Membrana · 75", "Citoplasma/Organelas · 60", "Citologia · 60"];
    else if (includes(title, "metabolismo i")) guide.assaadLists = ["Metabolismo Energético · 90"];
    else if (includes(title, "metabolismo ii")) guide.assaadLists = ["Noções de Metabolismo e Energia · 30"];
    else if (includes(title, "bioquímica")) {
      guide.assaadLists = ["Biomoléculas Orgânicas · 120"];
      guide.externalList = ["EXT ✅ BIO-11/Bioquímica celular · 44 questões reais completas"];
      guide.externalListStatus = "confirmed";
    } else if (includes(title, "biologia molecular")) guide.assaadLists = ["Moléculas/Nutrientes · 30", "Biologia Molecular · 102"];
    else if (includes(title, "ecologia")) guide.assaadLists = ["Ciclos · 20", "Relações · 19", "Gráficos · 16", "Problemas Ambientais · 69"];
    else if (includes(title, "genética")) guide.assaadLists = ["Genética · 185"];
    else if (includes(title, "evolução")) guide.assaadLists = ["Origem · 25", "Teorias Evolutivas · 60", "Especiação · 15", "Taxonomia · 30", "Cladogramas · 19"];
    else if (includes(title, "fisiologia")) guide.assaadLists = ["Cardiorrespiratório · 25", "Endócrino · 28", "Excretor · 25", "Nervoso · 25", "Imunológico · 25"];
    else if (includes(title, "botânica")) guide.assaadLists = ["Botânica · 119"];
    else if (includes(title, "doenças")) {
      guide.assaadLists = ["Doenças · 60", "Histologia · SEM LISTA CONFIRMADA / CRIAR", "Zoologia · SEM LISTA CONFIRMADA / CRIAR"];
      guide.assaadListStatus = "create";
    }

    if (includes(title, "citologia")) {
      guide.classMaterial = ["Materiais: Lista de Exercícios · Membrana Plasmática"];
      guide.classMaterialStatus = "confirmed";
      guide.flashcards = ["Membrana Plasmática e Transportes Celulares · Memorização", "Membrana Plasmática e Transportes Celulares · Raciocínio", "Organização Celular · Memorização", "Organização Celular · Raciocínio"];
      guide.flashcardStatus = "confirmed";
      guide.challenges = ["Membrana Plasmática e Transportes Celulares · Desafio", "Organização Celular · Desafio"];
      guide.challengeStatus = "confirmed";
    } else if (includes(title, "organelas")) {
      guide.classMaterial = ["Materiais: Lista de Exercícios · Citoplasma e Organelas Celulares"];
      guide.classMaterialStatus = "confirmed";
      guide.flashcards = ["Citoplasma e Organelas · Memorização", "Citoplasma e Organelas · Raciocínio", "Núcleo Celular · Memorização", "Núcleo Celular · Raciocínio"];
      guide.flashcardStatus = "confirmed";
      guide.challenges = ["Citoplasma e Organelas · Desafio", "Núcleo Celular · Desafio"];
      guide.challengeStatus = "confirmed";
    } else if (includes(title, "ecologia")) {
      guide.classMaterial = ["Materiais: Lista de Exercícios · Ecologia", ...(includes(title, "p4") ? ["Materiais: Lista de Exercícios · Problemas Ambientais"] : [])];
      guide.classMaterialStatus = "confirmed";
      if (includes(title, "p1")) {
        guide.flashcards = ["Conceitos Fundamentais · Memorização/Raciocínio", "Cadeia e Teia Alimentar · Memorização/Raciocínio", "Fluxo de Energia e Pirâmides Ecológicas · Memorização/Raciocínio"];
        guide.challenges = ["Conceitos Fundamentais · Desafio", "Cadeia e Teia Alimentar · Desafio", "Fluxo de Energia e Pirâmides Ecológicas · Desafio"];
      } else if (includes(title, "p2")) {
        guide.flashcards = ["Ciclos Biogeoquímicos · Memorização/Raciocínio"];
        guide.challenges = ["Ciclos Biogeoquímicos · Desafio"];
      } else if (includes(title, "p3")) {
        guide.flashcards = ["Relações Ecológicas · Memorização/Raciocínio", "Dinâmica de Populações e Comunidades · Memorização/Raciocínio"];
        guide.challenges = ["Relações Ecológicas · Desafio", "Dinâmica de Populações e Comunidades · Desafio"];
      } else {
        guide.flashcards = ["Biomas Brasileiros e Mundiais · Memorização/Raciocínio", "Problemas Ambientais · decks confirmados"];
        guide.challenges = ["Biomas Brasileiros e Mundiais · Desafio", "Problemas Ambientais · Desafio"];
      }
      guide.flashcardStatus = "confirmed";
      guide.challengeStatus = "confirmed";
    } else if (includes(title, "biologia molecular")) {
      guide.classMaterial = ["Materiais: Lista de Exercícios · Noções de Moléculas e Nutrientes", "Materiais: Lista de Exercícios · Biologia Molecular"];
      guide.classMaterialStatus = "confirmed";
      if (includes(title, "p1")) {
        guide.flashcards = ["Ácidos Nucleicos (DNA e RNA) · Memorização/Raciocínio"];
        guide.challenges = ["Desafio não confirmado para todos os subtópicos de P1"];
        guide.challengeStatus = "not-confirmed";
      } else {
        guide.flashcards = ["Transcrição · Memorização/Raciocínio", "Tradução e Código Genético · Memorização/Raciocínio", "Replicação do DNA · Memorização/Raciocínio", "Mutações · Memorização/Raciocínio"];
        guide.challenges = ["Replicação do DNA · Desafio", "Mutações · Desafio"];
        guide.challengeStatus = "confirmed";
      }
      guide.flashcardStatus = "confirmed";
    } else if (includes(title, "genética")) {
      guide.classMaterial = ["Materiais: Lista de Exercícios · Genética"];
      guide.classMaterialStatus = "confirmed";
      guide.flashcards = includes(title, "p1")
        ? ["Conceitos Fundamentais · Raciocínio", "Primeira Lei de Mendel · Memorização/Raciocínio"]
        : includes(title, "p2")
          ? ["Segunda Lei de Mendel · Memorização/Raciocínio", "Alelos Múltiplos e Codominância · Memorização/Raciocínio", "Herança Ligada ao Sexo · Memorização/Raciocínio", "Interação Gênica e Pleiotropia · Memorização/Raciocínio"]
          : ["Genética de Populações · Memorização/Raciocínio", "Alelos Múltiplos e Codominância · revisar decks aderentes"];
      guide.challenges = includes(title, "p1")
        ? ["Conceitos Fundamentais · Desafio", "Primeira Lei de Mendel · Desafio"]
        : includes(title, "p2")
          ? ["Segunda Lei de Mendel · Desafio", "Alelos Múltiplos e Codominância · Desafio", "Herança Ligada ao Sexo · Desafio", "Interação Gênica e Pleiotropia · Desafio"]
          : ["Genética de Populações · Desafio"];
      guide.flashcardStatus = "confirmed";
      guide.challengeStatus = "confirmed";
    } else if (includes(title, "evolução")) {
      guide.classMaterial = ["Materiais: Lista de Exercícios · Evolução"];
      guide.classMaterialStatus = "confirmed";
      guide.flashcards = ["Origem da Vida · Memorização/Raciocínio", "Teorias Evolutivas · Memorização/Raciocínio", "Mecanismos Evolutivos · Memorização/Raciocínio", "Evidências da Evolução · Memorização/Raciocínio", "Especiação e Isolamento Reprodutivo · Memorização/Raciocínio"];
      guide.challenges = ["Origem da Vida · Desafio", "Teorias Evolutivas · Desafio", "Mecanismos Evolutivos · Desafio", "Evidências da Evolução · Desafio", "Especiação e Isolamento Reprodutivo · Desafio"];
      guide.flashcardStatus = "confirmed";
      guide.challengeStatus = "confirmed";
    }

    if (guide.assaadListStatus !== "create") guide.assaadListStatus = guide.assaadLists[0] === nc ? "not-confirmed" : "confirmed";
    return guide;
  }

  if (subjectSlug === "geografia") {
    guide.assaadLists = includes(title, "econômica")
      ? ["Geografia Econômica · 115", "Listas específicas: capitalismo, indústria, DIT e globalização"]
      : ["Geografia Urbana/Demografia · 109", "Geografia Agrária · 20", "Impactos Ambientais · 43", "Geopolítica · 19", "Geografia Física · 33"];
    guide.assaadListStatus = "confirmed";
    guide.note = "Humanas fica seletiva: priorizar retorno ENEM e evitar treinamento/revisão longa.";
    return guide;
  }

  if (subjectSlug === "historia") {
    guide.assaadLists = includes(title, "colônia")
      ? ["Brasil Colônia · 57 + 52 + 53 + 52", "Brasil Império · 75"]
      : ["Brasil República · 19", "Complementação futura pelo banco próprio"];
    guide.assaadListStatus = "confirmed";
    guide.note = "Foco Brasil. Não zerar Idade Antiga/Média/Moderna neste plano de 40 dias.";
    return guide;
  }

  if (subjectSlug === "filosofia") {
    guide.assaadLists = ["O Que é Filosofia · 30", "Passagem do Mito ao Logos · 30", "Filosofia Clássica · 48", "Filosofia para o ENEM · 120", "Filosofia Moderna · 29", "Filosofia Contemporânea · 26", "Política · 9"];
    guide.assaadListStatus = "confirmed";
    guide.note = "Priorizar a lista geral de Filosofia para o ENEM; não precisa zerar todas as listas específicas antes dela.";
    return guide;
  }

  if (subjectSlug === "sociologia") {
    guide.assaadLists = ["Fundamentos da Sociologia · 30 + 30", "Conceito de Cultura · 30", "Contexto Histórico · 30", "Comte · 30", "Consciência Coletiva · 25", "Participação Política · 10", "Sociologia para o ENEM · 120"];
    guide.assaadListStatus = "confirmed";
    guide.note = "A lista Sociologia para o ENEM — 120 é a principal do bloco.";
    return guide;
  }

  if (subjectSlug === "linguagens") {
    if (includes(title, "funções")) {
      guide.assaadLists = ["Funções da Linguagem · listas específicas de comunicação/funções + listas gerais", "Tipologia Textual · 30", "Figuras de linguagem · trabalhar apenas o núcleo indicado na teoria"];
      guide.flashcards = ["Funções da Linguagem · Memorização", "Funções da Linguagem · Raciocínio", "Gêneros Textuais · decks confirmados"];
      guide.flashcardStatus = "confirmed";
      guide.challenges = ["Desafio · NC para este bloco"];
    } else {
      guide.assaadLists = ["Variações Linguísticas · 30 + 30 + 32 + 30 + 18", "Campanhas · 59", "Progressão · 15", "Coesão/Coerência · 15", "Charges/HQs · 60", "Literatura · lista própria"];
    }
    guide.assaadListStatus = "confirmed";
    guide.note = "Linguagens é seletiva e deve focar interpretação, uso da linguagem e itens de maior retorno.";
    return guide;
  }

  return guide;
}
