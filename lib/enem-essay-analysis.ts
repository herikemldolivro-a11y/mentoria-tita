export type EssayHighlightKind = "thesis" | "cause" | "argument" | "intervention";

export type EssayHighlight = {
  paragraph: number;
  text: string;
  kind: EssayHighlightKind;
  note: string;
};

export type EnemEssayAnalysis = {
  thesis: string;
  causes: string[];
  argumentKeys: string[];
  takeaway: string;
  highlights: EssayHighlight[];
};

export const essayAnalysisByDay: Record<number, EnemEssayAnalysis> = {
  2: {
    thesis: "A passividade social diante da crise ética precisa ser substituída por participação cidadã e defesa ativa dos direitos e valores humanos.",
    causes: ["Sensação de que o Brasil atual é melhor, gerando acomodação", "Alienação e banalização dos problemas éticos"],
    argumentKeys: ["Contraste histórico com a mobilização durante a ditadura", "Paradoxo entre direitos conquistados e silêncio contemporâneo", "Mudança de mentalidade como condição para a ação cívica"],
    takeaway: "Boa estrutura para temas em que você pode contrastar uma conquista histórica com a passividade atual e, depois, propor mobilização social + mudança cultural.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "Em um cenário marcado pela passividade, é preciso que a sociedade se posicione frente à ética nacional, de forma a honrar seus direitos e valores humanos e, assim, evitar o pior.", note: "Tese central: o problema é a passividade e a saída é a atuação cidadã." },
      { paragraph: 1, kind: "cause", text: "Talvez a sensação de um Brasil melhor hoje ajude a explicar a inércia da sociedade diante da atual crise de valores na política e em todas as camadas da população.", note: "Causa explicativa da inércia social." },
      { paragraph: 2, kind: "argument", text: "depois de tanto sangue derramado pelo direto de expressar opiniões e participar das decisões políticas, o indivíduo se cala diante da crise moral contemporânea.", note: "Núcleo do argumento: contradição entre direitos conquistados e falta de participação." },
      { paragraph: 3, kind: "intervention", text: "o povo deve ir às ruas, de modo pacífico, para exigir uma mudança de postura do poder público.", note: "Ação concreta de intervenção." },
      { paragraph: 3, kind: "intervention", text: "é preciso uma mudança prévia de mentalidade, uma retomada de valores humanos esquecidos, que só será possível com a ajuda da família, das escolas e até mesmo da mídia.", note: "Intervenção cultural com agentes definidos." },
    ],
  },
  3: {
    thesis: "O trabalho pode dignificar, mas a desigualdade leva parte da população a aceitar ocupações desumanas; o Estado deve enfrentar essa contradição.",
    causes: ["Concentração de terras", "Desigualdade social"],
    argumentKeys: ["Trabalho como fonte de identidade e dignidade", "Contraste entre crescimento econômico e permanência de exploração", "Educação e reforma agrária como caminhos estruturais"],
    takeaway: "Estrutura útil para temas de desigualdade: apresente o valor ideal de algo, mostre como a realidade impede esse ideal e ataque duas causas estruturais.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "Há, porém, aquelas pessoas que, sem ter escolha, aceitam qualquer trabalho como forma de sobrevivência, submetendo-se, assim, à desvalorização da sua humanidade.", note: "Problema central que rompe o ideal de dignidade pelo trabalho." },
      { paragraph: 1, kind: "argument", text: "o trabalho ganhou um valor de dignificação, já que, hoje, o fato de ter um emprego gera condições para uma boa vida.", note: "Ideia-base positiva usada para criar contraste." },
      { paragraph: 2, kind: "cause", text: "Alguns deles são a concentração de terras nas mãos de poucos e a enorme desigualdade social.", note: "As duas causas estruturais são explicitadas de forma direta." },
      { paragraph: 2, kind: "argument", text: "Ambos favorecem a existência de pessoas que são obrigadas a se submeterem a trabalhos escravos, por exemplo.", note: "Efeito das causas sobre o problema." },
      { paragraph: 3, kind: "intervention", text: "investir mais em educação, buscando, assim, erradicar a miséria e a existência do trabalho desumano.", note: "Primeira frente de intervenção." },
      { paragraph: 3, kind: "intervention", text: "uma reforma agrária contribuiria para diminuir a desigualdade social", note: "Segunda frente, ligada diretamente à causa estrutural." },
    ],
  },
  4: {
    thesis: "As redes sociais são ferramentas úteis, mas a exposição sem limites ameaça a imagem e a privacidade dos usuários.",
    causes: ["Perda de controle sobre o alcance das informações publicadas", "Baixa percepção dos limites entre esfera pública e privada"],
    argumentKeys: ["Reconhece primeiro os benefícios da rede", "Em seguida delimita o risco de exposição", "Conclui com conscientização feita no próprio ambiente digital"],
    takeaway: "Ótimo modelo de concessão: reconheça o lado positivo do fenômeno antes de mostrar o problema. Isso deixa a argumentação mais equilibrada.",
    highlights: [
      { paragraph: 1, kind: "thesis", text: "Nesse momento é que nos convém cautela e reflexão para saber até que ponto se expor nas redes sociais representa uma vantagem.", note: "A tese nasce como limite: usar a rede, mas com cautela." },
      { paragraph: 2, kind: "cause", text: "a partir do momento em que colocamos informações na rede, foge do nosso controle a consciência das dimensões de até onde elas podem chegar.", note: "Causa do risco: perda de controle sobre a circulação da informação." },
      { paragraph: 3, kind: "argument", text: "traz seus riscos e revela sua faceta perversa àqueles que não bem distinguem os limites entre as esferas públicas e privadas", note: "Síntese do núcleo argumentativo." },
      { paragraph: 4, kind: "intervention", text: "os usuários da rede tenham plena consciência de que tornar pública determinadas informações requer cuidado e, acima de tudo, bom senso", note: "Comportamento esperado do usuário." },
      { paragraph: 4, kind: "intervention", text: "pelos próprios governos de cada país, e pelas próprias comunidades virtuais através das redes sociais", note: "Agentes da conscientização." },
    ],
  },
  5: {
    thesis: "A imigração pode favorecer o crescimento do país, desde que o Estado administre a chegada e promova a integração dos imigrantes.",
    causes: ["Sobrecarga de serviços públicos sem planejamento", "Falta de inserção social e profissional dos imigrantes"],
    argumentKeys: ["Apresenta oportunidade e risco no mesmo tema", "Primeiro argumento é capacidade de absorção", "Segundo argumento é integração produtiva"],
    takeaway: "Modelo forte para temas complexos: não trate o fenômeno como totalmente bom ou ruim; mostre oportunidade + dois gargalos concretos.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "é preciso enxergar a oportunidade de crescimento que tal fenômeno representa e propor medidas que maximizem os benefícios e minimizem os problemas.", note: "Tese equilibrada: aproveitar benefícios e reduzir efeitos negativos." },
      { paragraph: 1, kind: "cause", text: "o aumento do contingente populacional gera uma série de problemas para o local de destino.", note: "Primeiro eixo causal: pressão sobre a estrutura local." },
      { paragraph: 1, kind: "argument", text: "a qualidade dos sistemas de saúde, segurança e educação que já não é ideal, no país, torna-se ainda mais precária", note: "Concretização do primeiro argumento." },
      { paragraph: 2, kind: "cause", text: "aqueles que aqui se estabelecem não são inseridos na sociedade e acabam por incrementar o setor informal da economia", note: "Segundo eixo: exclusão e informalidade." },
      { paragraph: 2, kind: "intervention", text: "as ONG’s poderiam oferecer cursos de profissionalização aos imigrantes, aproximando-os da dinâmica social do país.", note: "Intervenção diretamente ligada à integração." },
      { paragraph: 3, kind: "intervention", text: "a criação de uma “cartilha do imigrante” ajudaria no estabelecimento desses indivíduos", note: "Ação informativa final." },
    ],
  },
  6: {
    thesis: "A Lei Seca é necessária porque dirigir alcoolizado ameaça a segurança coletiva e a preservação da vida.",
    causes: ["Efeito do álcool sobre o controle do motorista", "Priorização do prazer individual em detrimento da segurança coletiva"],
    argumentKeys: ["Compara direção a prática que exige coordenação", "Usa redução de acidentes como validação da lei", "Enfrenta explicitamente o contra-argumento de quem critica a restrição"],
    takeaway: "Boa referência de argumentação com contra-argumento: apresente a objeção do outro lado e mostre por que um valor maior deve prevalecer.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "A Lei Seca, atual medida adotada pelo Governo brasileiro, coloca em evidência a necessidade de se discutir sobre a segurança o trânsito.", note: "Direciona a discussão para segurança coletiva." },
      { paragraph: 1, kind: "cause", text: "a bebida afeta negativamente o controle do homem sobre si.", note: "Causa objetiva do risco ao volante." },
      { paragraph: 1, kind: "argument", text: "A criação da Lei Seca foi de grande importância para organizar esse quadro, e vem apontando estatísticas gradualmente satisfatórias na redução de vítimas de acidentes de trânsito.", note: "Evidência usada para validar a medida." },
      { paragraph: 2, kind: "argument", text: "prezar pela vida de seus semelhantes é mais importante do que atingir um prazer pessoa", note: "Resposta ao contra-argumento: hierarquia de valores." },
      { paragraph: 3, kind: "intervention", text: "É obrigação do Governo cobrar da Polícia Rodoviária Federal a intensificação da fiscalização da Lei Seca", note: "Agente + ação." },
      { paragraph: 3, kind: "intervention", text: "A mídia também pode colaborar, com campanhas e propagandas", note: "Segundo agente e segundo meio de intervenção." },
    ],
  },
  7: {
    thesis: "A publicidade infantil explora a baixa capacidade de discernimento das crianças e, por isso, precisa ser limitada e acompanhada de educação para o consumo.",
    causes: ["Grande poder de convencimento da publicidade", "Uso da necessidade de aceitação social da criança como gatilho de consumo"],
    argumentKeys: ["Primeiro comprova que comunicação influencia comportamentos", "Depois aplica esse poder persuasivo ao público infantil", "Fecha com regulação + educação"],
    takeaway: "Estrutura didática: prove primeiro que o mecanismo existe, depois mostre por que ele é especialmente perigoso para o grupo vulnerável.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "as crianças estariam preparadas para o bombardeio de consumo que as propagandas veiculam?", note: "Pergunta-problema que orienta toda a redação." },
      { paragraph: 1, kind: "argument", text: "É impossível negar o impacto provocado por um anúncio ou uma retórica bem estruturada.", note: "Premissa que sustenta o restante da argumentação." },
      { paragraph: 2, kind: "cause", text: "a aceitação em seu grupo de amigos está condicionada ao fato dela possuir ou não os mesmos brinquedos que seus colegas.", note: "Mecanismo psicológico explorado pela publicidade." },
      { paragraph: 2, kind: "argument", text: "Uma estratégia como essa gera um ciclo interminável de consumo que abusa da pouca capacidade de discernimento infantil.", note: "Consequência central do mecanismo." },
      { paragraph: 3, kind: "intervention", text: "uma ampliação da legislação atual a fim de limitar", note: "Intervenção regulatória." },
      { paragraph: 3, kind: "intervention", text: "focar na conscientização dessa faixa etária em escolas", note: "Intervenção educativa complementar." },
    ],
  },
  8: {
    thesis: "A violência contra a mulher persiste por uma herança social machista que precisa ser enfrentada pelo Estado, pela escola e pela sociedade.",
    causes: ["Estereótipos históricos de inferiorização feminina", "Persistência de ideologias machistas e agressivas"],
    argumentKeys: ["Mostra origem histórica do problema", "Usa dados da Lei Maria da Penha como prova de permanência", "Propõe resposta jurídica, educacional e social"],
    takeaway: "Modelo clássico de causa histórica + evidência atual + intervenção multissetorial. É uma estrutura muito reaproveitável no ENEM.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "deve-se discutir a persistência da violência contra a mulher na sociedade brasileira.", note: "Delimitação direta do problema." },
      { paragraph: 1, kind: "cause", text: "foi criado um estereótipo que reservava às mulheres apenas as funções domésticas e de procriação", note: "Raiz histórica da desigualdade." },
      { paragraph: 2, kind: "cause", text: "ideologias preconceituosas e agressivas ainda são inerentes à sociedade brasileira", note: "Persistência cultural do problema." },
      { paragraph: 2, kind: "argument", text: "mais de 330 mil processos com base na Lei Maria da Penha foram instaurados", note: "Dado concreto usado como evidência." },
      { paragraph: 3, kind: "intervention", text: "cabe ao Governo tornar mais rígida a legislação concernente ao bem-estar do sexo feminino", note: "Ação estatal." },
      { paragraph: 3, kind: "intervention", text: "às escolas, cabe o dever de instruir as gerações futuras quanto à igualdade", note: "Ação educacional." },
    ],
  },
  9: {
    thesis: "A intolerância religiosa no Brasil é um problema sociocultural negligenciado, sustentado por preconceitos históricos e estruturas sociais internalizadas.",
    causes: ["Preconceito velado associado à formação histórica brasileira", "Internalização social do eurocentrismo e da rejeição à diversidade religiosa"],
    argumentKeys: ["Usa repertório filosófico já na introdução", "Conecta formação histórica e comportamento atual", "Amplia a análise do indivíduo para as estruturas sociais"],
    takeaway: "Boa estrutura para temas culturais: repertório → raiz histórica → estrutura social → resposta estatal e educativa.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "Essa problemática revela inúmeras facetas (insultos, violências simbólica e física, e até mortes), exigindo atenção a seu panorama sociocultural – grandemente negligenciado.", note: "Tese: problema amplo e negligenciado." },
      { paragraph: 1, kind: "cause", text: "Isso permite que preconceitos como a intolerância religiosa sejam tratados de forma velada.", note: "Primeira causa: preconceito oculto/normalizado." },
      { paragraph: 1, kind: "argument", text: "foi construída desde os colonizadores europeus.", note: "Raiz histórica do comportamento atual." },
      { paragraph: 2, kind: "cause", text: "as estruturas sociais são internalizadas pelos indivíduos.", note: "Mecanismo sociológico usado para explicar a permanência." },
      { paragraph: 2, kind: "argument", text: "religiões de matrizes africanas ou asiáticas são desvalorizadas para darem voz ao eurocentrismo", note: "Aplicação concreta do argumento." },
      { paragraph: 3, kind: "intervention", text: "Políticas públicas educacionais devem ser engendradas em escolas e universidades", note: "Resposta educativa." },
      { paragraph: 3, kind: "intervention", text: "debates necessitam ser promovidos em meios virtuais (redes sociais) e físicos (instituições públicas)", note: "Ampliação da intervenção para espaços sociais diversos." },
    ],
  },
  10: {
    thesis: "A formação educacional de surdos é dificultada principalmente pela estereotipação social e pela passividade governamental.",
    causes: ["Discriminação e estereótipos sociais", "Falta de fiscalização, políticas públicas e professores preparados"],
    argumentKeys: ["A introdução já anuncia os dois eixos", "D1 trabalha preconceito social", "D2 trabalha omissão estatal e estrutura escolar"],
    takeaway: "Esse é um ótimo padrão ENEM: introdução anuncia exatamente os dois argumentos e cada desenvolvimento cumpre um deles sem fugir da tese.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "notam-se desafios ligados à formação educacional das pessoas com dificuldade auditiva, seja por estereotipação da sociedade civil, seja por passividade governamental.", note: "Tese com dois eixos já explicitados." },
      { paragraph: 1, kind: "cause", text: "a discriminação enraizada em parte da sociedade", note: "Causa 1: preconceito social." },
      { paragraph: 1, kind: "argument", text: "o preconceito por parte de muitos pais dificulta o acesso à educação pelos surdos.", note: "Aplicação concreta da causa social." },
      { paragraph: 2, kind: "cause", text: "devido à falta de fiscalização e de políticas públicas ostensivas por parte de algumas gestões, isso não é bem efetivado.", note: "Causa 2: ineficiência estatal." },
      { paragraph: 2, kind: "argument", text: "à inexistência ou à incipiência de professores que dominem a Libras e à carência de aulas proficientes, inclusivas e proativas", note: "Efeito prático da omissão estatal." },
      { paragraph: 3, kind: "intervention", text: "cabe às instituições de ensino com proatividade o papel de deliberar acerca dessa limitação em palestras elucidativas", note: "Intervenção educacional." },
      { paragraph: 3, kind: "intervention", text: "pressionando os demiurgos indiferentes a problemática abordada, com o fito de incentivá-los a profissionalizarem adequadamente os professores", note: "Intervenção voltada à qualificação e cobrança do poder público." },
    ],
  },
  11: {
    thesis: "A manipulação do comportamento na internet decorre de fatores educacionais e econômicos: baixo senso crítico e interesses do capitalismo digital.",
    causes: ["Baixo senso crítico decorrente de educação pouco reflexiva", "Interesse econômico em ampliar consumo por meio da personalização algorítmica"],
    argumentKeys: ["A introdução anuncia os dois eixos", "D1 desenvolve a vulnerabilidade educacional", "D2 desenvolve o interesse econômico"],
    takeaway: "Mais um modelo forte de tese bipartida: anuncie dois fatores na introdução e dedique um desenvolvimento inteiro a cada um.",
    highlights: [
      { paragraph: 0, kind: "thesis", text: "é necessário analisar tal quadro, intrinsecamente ligado a aspectos educacionais e econômicos.", note: "Tese bipartida: educação + economia." },
      { paragraph: 1, kind: "cause", text: "devido ao baixo senso crítico da população, fruto de uma educação tecnicista, na qual não há estímulo ao questionamento.", note: "Causa 1: fragilidade educacional." },
      { paragraph: 1, kind: "argument", text: "modela o modo de pensar dos cidadãos.", note: "Efeito do filtro algorítmico sobre o comportamento." },
      { paragraph: 2, kind: "cause", text: "Essa questão ocorre devido ao capitalismo, modelo econômico vigente desde o fim da Guerra Fria, em 1991, o qual estimula o consumo em massa.", note: "Causa 2: incentivo econômico ao consumo." },
      { paragraph: 2, kind: "argument", text: "trata-se de uma manipulação que tem a finalidade de ampliar o consumo.", note: "Finalidade econômica da manipulação." },
      { paragraph: 3, kind: "intervention", text: "o MEC, que deve, por meio da oferta de debates e seminários nas escolas, ensinar os alunos a buscarem informações de fontes confiáveis", note: "Agente + ação + meio." },
      { paragraph: 3, kind: "intervention", text: "oferecer a disciplina de educação tecnológica por meio de sua inclusão na Base Comum Curricular", note: "Segunda ação educativa estrutural." },
    ],
  },
};

export function getEnemEssayAnalysis(day: number) {
  return essayAnalysisByDay[day] ?? null;
}
