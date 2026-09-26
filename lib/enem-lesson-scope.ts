export type EnemLessonScope = {
  summary: string;
};

const scopes: Record<string, EnemLessonScope> = {
  "1:matematica": { summary: "Sistema decimal, operações fundamentais, números decimais, inteiros negativos e conjuntos numéricos." },
  "1:fisica": { summary: "Energia e suas transformações + ferramental: regra de três, unidades, notação científica e leitura de gráficos aplicada à Física." },
  "1:quimica": { summary: "Estados físicos, mudanças de estado, propriedades gerais e específicas da matéria e densidade." },

  "2:matematica": { summary: "Frações, critérios de divisibilidade, múltiplos e divisores." },
  "2:fisica": { summary: "Cinemática I P1 — fundamentos + MU: referencial, posição/deslocamento, velocidade, função horária e gráficos do movimento uniforme." },
  "2:biologia": { summary: "O que é vida, níveis de organização, noções de célula e metabolismo introdutório." },

  "3:matematica": { summary: "MMC e MDC, potenciação e radiciação." },
  "3:fisica": { summary: "Cinemática I P2 — MUV, aceleração, funções horárias, Torricelli, gráficos, queda livre e lançamento vertical." },
  "3:quimica": { summary: "Separação de Misturas P1 — identificação das misturas e métodos fundamentais de separação." },

  "4:matematica": { summary: "Razão: conceito, comparação entre grandezas, escrita e interpretação de razões em problemas." },
  "4:quimica": { summary: "Separação de Misturas P2 — processos restantes e aplicações em tratamento de água/esgoto e mineração." },
  "4:biologia": { summary: "Procariontes e eucariontes, estrutura celular, membrana plasmática e transportes principais." },

  "5:matematica": { summary: "Proporção, igualdade entre razões e grandezas diretamente e inversamente proporcionais." },
  "5:fisica": { summary: "Dinâmica I P1 — Leis de Newton, forças particulares e força de atrito." },
  "5:geografia": { summary: "Capitalismo e suas fases, industrialização, DIT, globalização e conexões econômicas." },

  "6:matematica": { summary: "Regra de três simples: grandezas direta/inversamente proporcionais e modelagem de problemas." },
  "6:fisica": { summary: "Dinâmica I P2 — força elástica/Lei de Hooke, polias fixas e móveis e dinâmica de elevadores." },
  "6:quimica": { summary: "Modelos atômicos, íons, isótopos/isóbaros/isótonos e leis ponderais." },

  "7:matematica": { summary: "Regra de três composta, divisão proporcional e problemas avançados de razão/proporção." },
  "7:fisica": { summary: "Potência e eficiência: potência média, relação energia-tempo e rendimento/eficiência em situações físicas." },
  "7:biologia": { summary: "Núcleo, ribossomos, principais organelas citoplasmáticas e transportes celulares." },

  "8:matematica": { summary: "Porcentagem P1 — conceito de taxa percentual e cálculos básicos de porcentagem." },
  "8:fisica": { summary: "Eletrodinâmica P1 — corrente elétrica, efeitos da corrente e conceitos fundamentais." },
  "8:quimica": { summary: "Organização da Tabela Periódica, grupos/períodos e propriedades periódicas principais." },

  "9:matematica": { summary: "Porcentagem P2 — aumentos e reduções, porcentagens sucessivas e porcentagem reversa." },
  "9:fisica": { summary: "Eletrodinâmica P2 — 1ª e 2ª Leis de Ohm, resistores e circuitos básicos." },
  "9:biologia": { summary: "Mitose, meiose, ploidia e noções prioritárias de cromossomos e aneuploidias." },

  "10:matematica": { summary: "Conversão de unidades, sistema de medidas, prefixos e notação científica/ordem de grandeza." },
  "10:quimica": { summary: "Ligações Químicas P1 — ligações iônica, covalente e coordenada." },
  "10:historia": { summary: "Plantation, açúcar, sociedade colonial, escravidão, crise colonial, chegada da Corte e Independência." },

  "11:matematica": { summary: "Escalas e vazão: razão de escala, conversões em mapas/plantas e relações entre volume e tempo." },
  "11:fisica": { summary: "Eletrodinâmica P3 — Kirchhoff, geradores, receptores e capacitores; Ponte de Wheatstone só se couber." },
  "11:quimica": { summary: "Ligações P2 + Geometria Molecular — polaridade, geometrias, interações intermoleculares e ligação metálica." },

  "12:matematica": { summary: "Leitura, interpretação e construção de gráficos e tabelas em problemas do ENEM." },
  "12:fisica": { summary: "Eletrostática — eletrização, Lei de Coulomb, campo elétrico, potencial elétrico e Faraday em nível seletivo." },
  "12:biologia": { summary: "Respiração celular e fermentação: glicólise, ciclo de Krebs, fosforilação e tipos de fermentação." },

  "13:matematica": { summary: "Estatística — média, mediana, moda, média ponderada e medidas de dispersão em nível ENEM." },
  "13:fisica": { summary: "Termologia I P1 — termometria, escalas de temperatura, estados físicos e mudanças de fase." },
  "13:quimica": { summary: "Química Inorgânica P1 — NOX, ácidos e bases." },

  "14:matematica": { summary: "Matemática Financeira P1 — aumentos, descontos, inflação, lucro e prejuízo." },
  "14:quimica": { summary: "Química Inorgânica P2 — óxidos, sais, neutralização e reações inorgânicas." },
  "14:biologia": { summary: "Fotossíntese, fase fotoquímica, ciclo de Calvin e quimiossíntese." },

  "15:matematica": { summary: "Matemática Financeira P2 — juros simples, juros compostos e parcelamentos." },
  "15:biologia": { summary: "Bioquímica — enzimas, proteínas, biomoléculas orgânicas e vitaminas." },
  "15:lingua-portuguesa": { summary: "Funções da linguagem, figuras mais cobradas e tipologias: narração, descrição, argumentação, exposição e injunção." },

  "16:matematica": { summary: "Conjuntos e expressões algébricas: operações com conjuntos e manipulação algébrica essencial." },
  "16:fisica": { summary: "Termologia I P2 — calorimetria, calor sensível, capacidade térmica e trocas de calor." },
  "16:quimica": { summary: "Estequiometria P1 — fundamentos, balanceamento necessário e primeiros cálculos estequiométricos." },

  "17:matematica": { summary: "Produtos notáveis e fatoração: identidades algébricas e técnicas de fatoração mais úteis." },
  "17:fisica": { summary: "Termologia I P3 — dilatação térmica, comportamento de líquidos e mecanismos de transmissão/isolamento térmico." },
  "17:biologia": { summary: "Biologia Molecular P1 — bases nitrogenadas, DNA, RNA e suas estruturas." },

  "18:matematica": { summary: "Equações do 1º grau e sistemas: resolução, interpretação e modelagem de problemas." },
  "18:fisica": { summary: "Termologia II P1 — gases e transformações termodinâmicas." },
  "18:biologia": { summary: "Biologia Molecular P2 — replicação, transcrição, tradução, código genético e splicing em nível seletivo." },

  "19:matematica": { summary: "Equação do 2º grau e inequações: raízes, resolução e interpretação de intervalos/condições." },
  "19:quimica": { summary: "Estequiometria P2 — relações mol-massa-volume, proporções estequiométricas e cálculos a partir de equações balanceadas." },
  "19:biologia": { summary: "Ecologia P1 — conceitos ecológicos, ecossistemas, cadeias, teias e pirâmides ecológicas." },

  "20:matematica": { summary: "Função do 1º grau P1 — conceito, coeficientes, raiz/zero da função e gráfico da reta." },
  "20:biologia": { summary: "Ecologia P2 — ciclos biogeoquímicos e fluxo de energia e matéria nos ecossistemas." },
  "20:geografia": { summary: "Urbanização, migração, transição demográfica, estrutura fundiária, reforma agrária, Revolução Verde e impactos ambientais." },

  "21:matematica": { summary: "Função do 1º grau P2 — interpretação, modelagem e aplicações contextualizadas." },
  "21:fisica": { summary: "Termologia II P2 — Leis da Termodinâmica, máquinas térmicas, Carnot e ciclo Otto em nível seletivo." },
  "21:quimica": { summary: "Estequiometria P3 — pureza, rendimento, reagente limitante e problemas integrados." },

  "22:matematica": { summary: "Função do 2º grau P1 — forma geral, coeficientes, discriminante/raízes, concavidade e leitura inicial do gráfico." },
  "22:fisica": { summary: "Ondulatória P1 — natureza das ondas, transversal/longitudinal e relações entre velocidade, frequência e comprimento de onda." },
  "22:biologia": { summary: "Ecologia P3 — dinâmica de populações, relações ecológicas e sucessão ecológica." },

  "23:matematica": { summary: "Função do 2º grau P2 — vértice, máximos/mínimos e aplicações contextualizadas." },
  "23:fisica": { summary: "Ondulatória P2 — reflexão, refração, difração, interferência e ressonância." },
  "23:quimica": { summary: "Soluções P1 — dissolução, concentração e molaridade." },

  "24:matematica": { summary: "Geometria Plana P1 — fundamentos, ângulos e triângulos." },
  "24:quimica": { summary: "Soluções P2 — ppm, diluição, mistura de soluções e titulação em nível seletivo." },
  "24:biologia": { summary: "Ecologia P4 — biomas, impactos antrópicos, problemas ambientais, conservação e leitura de gráficos." },

  "25:matematica": { summary: "Geometria Plana P2 — semelhança, Teorema de Tales, Pitágoras e quadriláteros." },
  "25:fisica": { summary: "Ondulatória P3 + Óptica — acústica, ondas sonoras, cordas/tubos em nível seletivo e óptica geométrica essencial." },
  "25:historia": { summary: "República Velha, Era Vargas, Ditadura de 1964–85, abertura/redemocratização e conexões essenciais com Guerras/Guerra Fria." },

  "26:matematica": { summary: "Geometria Plana P3 — áreas, perímetros, polígonos, circunferência e arcos." },
  "26:fisica": { summary: "Cinemática II P1 — cinemática vetorial, lançamento horizontal e lançamento oblíquo." },
  "26:quimica": { summary: "Termoquímica P1 — entalpia e processos endotérmicos/exotérmicos." },

  "27:matematica": { summary: "Trigonometria — seno, cosseno e tangente no triângulo retângulo; leis trigonométricas em nível seletivo." },
  "27:fisica": { summary: "Cinemática II P2 — movimento circular, MCU e acoplamentos no MCU." },
  "27:biologia": { summary: "Genética P1 — fundamentos, 1ª Lei de Mendel e heredogramas." },

  "28:matematica": { summary: "Função Trigonométrica — seno/cosseno, período, amplitude e leitura de gráficos em nível ENEM." },
  "28:fisica": { summary: "Dinâmica II P1 — plano inclinado, decomposição de forças, normal e atrito." },
  "28:quimica": { summary: "Termoquímica P2 — energia de ligação e cálculos termoquímicos; evite resolução repetitiva." },

  "29:matematica": { summary: "Geometria Espacial P1 — prismas, paralelepípedos e pirâmides." },
  "29:quimica": { summary: "Cinética Química — conceitos, fatores que alteram a velocidade e lei da velocidade." },
  "29:biologia": { summary: "Genética P2 — 2ª Lei de Mendel, interações gênicas e problemas de doenças/probabilidade." },

  "30:matematica": { summary: "Geometria Espacial P2 — cilindro, cone, esfera, sólidos compostos e projeção ortogonal." },
  "30:quimica": { summary: "Equilíbrio Químico P1 — conceito de equilíbrio, constante, equilíbrio dinâmico e Le Chatelier." },
  "30:filosofia": { summary: "Mito e Logos, Filosofia Clássica, racionalismo/empirismo/Kant, Nietzsche/Foucault e núcleos de ética/política." },

  "31:matematica": { summary: "Geometria Analítica — plano cartesiano, reta, distância, ponto médio e circunferência." },
  "31:fisica": { summary: "Dinâmica II P2 — dinâmica do MCU, força centrípeta e aplicações de movimento circular." },
  "31:quimica": { summary: "Equilíbrio Químico P2 — pH, equilíbrio iônico, hidrólise, tampão e Kps em nível seletivo." },

  "32:matematica": { summary: "Progressão Aritmética — razão, termo geral, soma dos termos e aplicações." },
  "32:fisica": { summary: "Dinâmica III — energia cinética e mecânica, potenciais gravitacional/elástica, impulso, quantidade de movimento e colisões." },
  "32:biologia": { summary: "Genética P3 — sistemas ABO/Rh, Biotecnologia e Engenharia Genética." },

  "33:matematica": { summary: "Progressão Geométrica — razão, termo geral, soma e crescimento; sequências lógicas/Fibonacci apenas relance." },
  "33:quimica": { summary: "Eletroquímica P1 — NOX, oxirredução, balanceamento redox e pilhas." },
  "33:biologia": { summary: "Origem da vida, Lamarck/Darwin/Neodarwinismo, especiação, taxonomia e cladogramas." },

  "34:matematica": { summary: "Análise Combinatória P1 — Princípio Fundamental da Contagem e permutações." },
  "34:quimica": { summary: "Eletroquímica P2 — eletrólise, corrosão e formas de proteção." },
  "34:biologia": { summary: "Fisiologia P1 — sistemas digestório e cardiorrespiratório." },

  "35:matematica": { summary: "Análise Combinatória P2 — arranjos e combinações." },
  "35:biologia": { summary: "Fisiologia P2 — sistemas endócrino, nervoso e imunológico." },
  "35:sociologia": { summary: "Cultura/identidade, Comte, Durkheim, Marx, Weber, consciência coletiva, trabalho, política, movimentos sociais e indústria cultural." },

  "36:matematica": { summary: "Probabilidade P1 — espaço amostral, eventos, união, interseção e complementar." },
  "36:fisica": { summary: "Estática + Hidrostática — equilíbrio e torque; pressão, empuxo e princípios fundamentais dos fluidos." },
  "36:quimica": { summary: "Radioatividade + Ambiental — emissões, meia-vida, tratamento de água, poluição, petróleo/energia e sustentabilidade." },

  "37:matematica": { summary: "Probabilidade P2 — independência, probabilidade condicional e integração com combinatória." },
  "37:fisica": { summary: "Magnetismo e Eletromagnetismo — campo magnético, indução eletromagnética e aplicações típicas do ENEM." },
  "37:biologia": { summary: "Botânica — grupos vegetais, vasos, fisiologia, fitormônios e tropismos; reprodução/morfologia em nível seletivo." },

  "38:matematica": { summary: "Função Exponencial — crescimento/decrescimento, gráfico, equações e modelagem em nível ENEM." },
  "38:fisica": { summary: "Fechamento de Física — aplicações finais de Magnetismo/Eletromagnetismo e apenas tópicos residuais ainda não concluídos." },
  "38:quimica": { summary: "Química Orgânica P1 — fundamentos, cadeias carbônicas, nomenclatura e funções orgânicas." },

  "39:matematica": { summary: "Logaritmos e Função Logarítmica — definição, propriedades, equações e leitura de gráficos." },
  "39:quimica": { summary: "Química Orgânica P2/P3 — propriedades e isomeria; depois reações, polímeros, saponificação/detergentes e petróleo." },
  "39:biologia": { summary: "Doenças prioritárias, Histologia com foco em tecido muscular e Zoologia com artrópodes/cordados; demais filos seletivos." },

  "40:matematica": { summary: "Matrizes + Função Racional — operações com matrizes e função racional: domínio, comportamento/gráfico e assíntotas em nível ENEM." },
  "40:biologia": { summary: "Fisiologia P3 — sistemas excretor, hematopoiético e reprodutor." },
  "40:lingua-portuguesa": { summary: "Variações linguísticas, campanhas/charges, coesão e progressão, interpretação crítica e poemas/literatura seletiva." },
};

function normalizeSubjectSlug(subjectSlug: string) {
  const value = subjectSlug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (value === "linguagens" || value === "portugues" || value === "lingua portuguesa") return "lingua-portuguesa";
  return value.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function getEnemLessonScope(day: number | undefined, subjectSlug: string | undefined) {
  if (!day || !subjectSlug) return null;
  return scopes[`${day}:${normalizeSubjectSlug(subjectSlug)}`]?.summary ?? null;
}
