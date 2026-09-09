export type CfoPmalRoadmapLesson = {
  order: number;
  subject: string;
  lessonNumber: number | null;
  title: string;
  pdfPath?: string;
};

export type CfoPmalRoadmapDay = {
  day: number;
  lessons: CfoPmalRoadmapLesson[];
};

export const cfoPmalAdvancedSociology = [
  "Sociologia 02 — Metodologia das ciências sociais e pesquisa social",
  "Sociologia 03 — Estrutura, organização e instituições sociais",
  "Sociologia 04 — Classes sociais, estratificação e desigualdade: Marx e Weber",
] as const;

export const cfoPmalRoadmap: CfoPmalRoadmapDay[] = [
  {
    "day": 1,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 1,
        "title": "Generalidades e conceituação"
      },
      {
        "order": 2,
        "subject": "Legislação PMAL",
        "lessonNumber": 2,
        "title": "Ingresso, hierarquia e disciplina"
      },
      {
        "order": 3,
        "subject": "Português",
        "lessonNumber": 2,
        "title": "Tipologia e gêneros textuais"
      },
      {
        "order": 4,
        "subject": "Português",
        "lessonNumber": 3,
        "title": "Ortografia oficial"
      }
    ]
  },
  {
    "day": 2,
    "lessons": [
      {
        "order": 1,
        "subject": "DPPM",
        "lessonNumber": 1,
        "title": "Processo penal militar e aplicação do CPPM"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 2,
        "title": "Polícia judiciária militar"
      },
      {
        "order": 3,
        "subject": "Informática",
        "lessonNumber": 1,
        "title": "Windows: ambiente, interface e operações básicas"
      },
      {
        "order": 4,
        "subject": "Informática",
        "lessonNumber": 2,
        "title": "Arquivos, pastas, extensões e organização da informação"
      }
    ]
  },
  {
    "day": 3,
    "lessons": [
      {
        "order": 1,
        "subject": "Direito Penal",
        "lessonNumber": 1,
        "title": "Aplicação da lei penal"
      },
      {
        "order": 2,
        "subject": "Direito Penal",
        "lessonNumber": 2,
        "title": "Teoria do crime: fato típico e conduta"
      },
      {
        "order": 3,
        "subject": "Alagoas",
        "lessonNumber": 1,
        "title": "Formação histórica e colonização portuguesa"
      },
      {
        "order": 4,
        "subject": "Alagoas",
        "lessonNumber": 2,
        "title": "Economia açucareira e formação social"
      }
    ]
  },
  {
    "day": 4,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 3,
        "title": "Cargo, função, comando e subordinação"
      },
      {
        "order": 2,
        "subject": "Legislação PMAL",
        "lessonNumber": 4,
        "title": "Direitos e prerrogativas"
      },
      {
        "order": 3,
        "subject": "Português",
        "lessonNumber": 4,
        "title": "Coesão textual, referenciação e conectores"
      },
      {
        "order": 4,
        "subject": "Português",
        "lessonNumber": 5,
        "title": "Verbos: tempos, modos e emprego no texto"
      },
      {
        "order": 5,
        "subject": "Alagoas",
        "lessonNumber": 3,
        "title": "Emancipação de Pernambuco e elevação à Província"
      }
    ]
  },
  {
    "day": 5,
    "lessons": [
      {
        "order": 1,
        "subject": "Informática",
        "lessonNumber": 3,
        "title": "Microsoft Word"
      },
      {
        "order": 2,
        "subject": "Informática",
        "lessonNumber": 4,
        "title": "Microsoft Excel: estrutura e referências"
      },
      {
        "order": 3,
        "subject": "Alagoas",
        "lessonNumber": 4,
        "title": "Quilombo dos Palmares"
      },
      {
        "order": 4,
        "subject": "Alagoas",
        "lessonNumber": 5,
        "title": "Regionalização geográfica"
      }
    ]
  },
  {
    "day": 6,
    "lessons": [
      {
        "order": 1,
        "subject": "DPPM",
        "lessonNumber": 3,
        "title": "IPM: instauração e desenvolvimento",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d06-01-dppm-ipm-instauracao-desenvolvimento.pdf"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 4,
        "title": "IPM: encerramento, arquivamento e valor probatório",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d06-02-dppm-ipm-encerramento-arquivamento-valor-probatorio.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Penal",
        "lessonNumber": 3,
        "title": "Dolo, culpa, erro e resultado agravador",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d06-03-direito-penal-dolo-culpa-erro-resultado-agravador.pdf"
      },
      {
        "order": 4,
        "subject": "Direito Penal",
        "lessonNumber": 4,
        "title": "Iter criminis e tentativa",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d06-04-direito-penal-iter-criminis-tentativa.pdf"
      }
    ]
  },
  {
    "day": 7,
    "lessons": [
      {
        "order": 1,
        "subject": "Direito Penal",
        "lessonNumber": 5,
        "title": "Ilicitude e excludentes",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d07-01-direito-penal-ilicitude-excludentes.pdf"
      },
      {
        "order": 2,
        "subject": "Direito Penal",
        "lessonNumber": 6,
        "title": "Imputabilidade penal",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d07-02-direito-penal-imputabilidade-penal.pdf"
      },
      {
        "order": 3,
        "subject": "Legislação PMAL",
        "lessonNumber": 5,
        "title": "Deveres, obrigações e ética",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d07-03-legislacao-deveres-obrigacoes-etica.pdf"
      },
      {
        "order": 4,
        "subject": "Legislação PMAL",
        "lessonNumber": 6,
        "title": "Violação de deveres e conselhos",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d07-04-legislacao-violacao-deveres-conselhos.pdf"
      },
      {
        "order": 5,
        "subject": "Legislação PMAL",
        "lessonNumber": 7,
        "title": "Ausente, desertor, desaparecido e extraviado",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d07-05-legislacao-ausente-desertor-desaparecido-extraviado.pdf"
      }
    ]
  },
  {
    "day": 8,
    "lessons": [
      {
        "order": 1,
        "subject": "Informática",
        "lessonNumber": 5,
        "title": "Excel: fórmulas, funções, gráficos e análise",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d08-01-informatica-excel-formulas-funcoes-graficos-analise.pdf"
      },
      {
        "order": 2,
        "subject": "Informática",
        "lessonNumber": 6,
        "title": "Microsoft PowerPoint",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d08-02-informatica-microsoft-powerpoint.pdf"
      },
      {
        "order": 3,
        "subject": "DPPM",
        "lessonNumber": 5,
        "title": "Ação penal militar",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d08-03-dppm-acao-penal-militar.pdf"
      },
      {
        "order": 4,
        "subject": "DPPM",
        "lessonNumber": 6,
        "title": "Processo, juiz, auxiliares e partes",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d08-04-dppm-processo-juiz-auxiliares-partes.pdf"
      },
      {
        "order": 5,
        "subject": "Alagoas",
        "lessonNumber": 6,
        "title": "Rio São Francisco e território alagoano",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d08-05-alagoas-rio-sao-francisco-territorio-alagoano.pdf"
      }
    ]
  },
  {
    "day": 9,
    "lessons": [
      {
        "order": 1,
        "subject": "Alagoas",
        "lessonNumber": 7,
        "title": "Organização político-administrativa",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d09-01-alagoas-organizacao-politico-administrativa.pdf"
      },
      {
        "order": 2,
        "subject": "Alagoas",
        "lessonNumber": 8,
        "title": "Economia estadual",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d09-02-alagoas-economia-estadual.pdf"
      },
      {
        "order": 3,
        "subject": "Alagoas",
        "lessonNumber": 9,
        "title": "Manifestações culturais populares",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d09-03-alagoas-manifestacoes-culturais-populares.pdf"
      },
      {
        "order": 4,
        "subject": "Alagoas",
        "lessonNumber": 10,
        "title": "Patrimônio histórico-cultural alagoano",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d09-04-alagoas-patrimonio-historico-cultural-alagoano.pdf"
      },
      {
        "order": 5,
        "subject": "Sociologia",
        "lessonNumber": 1,
        "title": "Constituição do saber sociológico",
        "pdfPath": "/materials/cfo-pmal/dias-01-39/d09-05-sociologia-constituicao-saber-sociologico.pdf"
      }
    ]
  },
  {
    "day": 10,
    "lessons": [
      {
        "order": 1,
        "subject": "Português",
        "lessonNumber": 1,
        "title": "Compreensão e interpretação de textos"
      },
      {
        "order": 2,
        "subject": "Legislação PMAL",
        "lessonNumber": 8,
        "title": "Exclusão do serviço ativo e inatividade"
      },
      {
        "order": 3,
        "subject": "DPPM",
        "lessonNumber": 7,
        "title": "Questões prejudiciais e exceções"
      },
      {
        "order": 4,
        "subject": "Informática",
        "lessonNumber": 7,
        "title": "Redes de computadores: fundamentos"
      },
      {
        "order": 5,
        "subject": "Direito Penal",
        "lessonNumber": 7,
        "title": "Crimes contra a vida"
      },
      {
        "order": 6,
        "subject": "Português",
        "lessonNumber": 6,
        "title": "Classes de palavras"
      }
    ]
  },
  {
    "day": 11,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 9,
        "title": "Remuneração, promoção e uniformes"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 8,
        "title": "Incidentes de sanidade mental e falsidade documental"
      },
      {
        "order": 3,
        "subject": "Informática",
        "lessonNumber": 8,
        "title": "Internet, intranet e serviços"
      },
      {
        "order": 4,
        "subject": "Direito Penal",
        "lessonNumber": 8,
        "title": "Lesões, perigo, honra e liberdade individual"
      },
      {
        "order": 5,
        "subject": "Português",
        "lessonNumber": 7,
        "title": "Sintaxe da oração e termos da oração"
      },
      {
        "order": 6,
        "subject": "Legislação PMAL",
        "lessonNumber": 10,
        "title": "Agregação, reversão e excedente"
      }
    ]
  },
  {
    "day": 12,
    "lessons": [
      {
        "order": 1,
        "subject": "DPPM",
        "lessonNumber": 9,
        "title": "Medidas preventivas e assecuratórias sobre coisas"
      },
      {
        "order": 2,
        "subject": "Informática",
        "lessonNumber": 9,
        "title": "Navegadores, busca e pesquisa na Internet"
      },
      {
        "order": 3,
        "subject": "Direito Penal",
        "lessonNumber": 9,
        "title": "Crimes contra o patrimônio I"
      },
      {
        "order": 4,
        "subject": "Legislação PMAL",
        "lessonNumber": 11,
        "title": "Afastamentos, licenças e recompensas"
      },
      {
        "order": 5,
        "subject": "DPPM",
        "lessonNumber": 10,
        "title": "Prisão em flagrante militar"
      },
      {
        "order": 6,
        "subject": "Legislação PMAL",
        "lessonNumber": 12,
        "title": "Tempo de serviço e disposições finais"
      }
    ]
  },
  {
    "day": 13,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 13,
        "title": "RDPMAL: disposições gerais, hierarquia, disciplina e ética"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 11,
        "title": "Prisão preventiva militar"
      },
      {
        "order": 3,
        "subject": "Português",
        "lessonNumber": 8,
        "title": "Coordenação"
      },
      {
        "order": 4,
        "subject": "Informática",
        "lessonNumber": 10,
        "title": "Correio eletrônico, grupos de discussão e redes sociais"
      },
      {
        "order": 5,
        "subject": "Direito Constitucional",
        "lessonNumber": 1,
        "title": "Teoria da Constituição"
      },
      {
        "order": 6,
        "subject": "Direito Penal",
        "lessonNumber": 10,
        "title": "Crimes contra o patrimônio II"
      }
    ]
  },
  {
    "day": 14,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 14,
        "title": "RDPMAL: transgressões disciplinares"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 12,
        "title": "Liberdade provisória e outras providências sobre pessoas"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 2,
        "title": "Supremacia e aplicabilidade das normas constitucionais"
      },
      {
        "order": 4,
        "subject": "Português",
        "lessonNumber": 9,
        "title": "Subordinação"
      },
      {
        "order": 5,
        "subject": "Informática",
        "lessonNumber": 11,
        "title": "Computação e armazenamento em nuvem"
      },
      {
        "order": 6,
        "subject": "Direito Constitucional",
        "lessonNumber": 3,
        "title": "Interpretação constitucional"
      }
    ]
  },
  {
    "day": 15,
    "lessons": [
      {
        "order": 1,
        "subject": "Direito Penal",
        "lessonNumber": 11,
        "title": "Crimes praticados por funcionário público contra a Administração"
      },
      {
        "order": 2,
        "subject": "Legislação PMAL",
        "lessonNumber": 15,
        "title": "RDPMAL: punições, aplicação e competência"
      },
      {
        "order": 3,
        "subject": "DPPM",
        "lessonNumber": 13,
        "title": "Citação, intimação e notificação"
      },
      {
        "order": 4,
        "subject": "Direito Constitucional",
        "lessonNumber": 4,
        "title": "Princípios fundamentais"
      },
      {
        "order": 5,
        "subject": "Português",
        "lessonNumber": 10,
        "title": "Pontuação"
      },
      {
        "order": 6,
        "subject": "Informática",
        "lessonNumber": 12,
        "title": "Segurança da informação, malware e backup"
      }
    ]
  },
  {
    "day": 16,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 16,
        "title": "RDPMAL: comportamento, cancelamento, recursos e recompensas"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 14,
        "title": "Interrogatório e confissão"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 5,
        "title": "Direitos e deveres individuais e coletivos I"
      },
      {
        "order": 4,
        "subject": "Direito Penal",
        "lessonNumber": 12,
        "title": "Crimes praticados por particular e contra a Administração da Justiça"
      },
      {
        "order": 5,
        "subject": "Direito Constitucional",
        "lessonNumber": 6,
        "title": "Direitos e deveres individuais e coletivos II"
      },
      {
        "order": 6,
        "subject": "Legislação PMAL",
        "lessonNumber": 17,
        "title": "Crimes de racismo e discriminação"
      }
    ]
  },
  {
    "day": 17,
    "lessons": [
      {
        "order": 1,
        "subject": "DPPM",
        "lessonNumber": 15,
        "title": "Perícias, exames e cadeia probatória"
      },
      {
        "order": 2,
        "subject": "Direito Constitucional",
        "lessonNumber": 7,
        "title": "Remédios constitucionais"
      },
      {
        "order": 3,
        "subject": "Legislação PMAL",
        "lessonNumber": 18,
        "title": "Crimes hediondos"
      },
      {
        "order": 4,
        "subject": "Direito Constitucional",
        "lessonNumber": 8,
        "title": "Direitos sociais"
      },
      {
        "order": 5,
        "subject": "Legislação PMAL",
        "lessonNumber": 19,
        "title": "Organização criminosa e crimes correlatos"
      },
      {
        "order": 6,
        "subject": "DPPM",
        "lessonNumber": 16,
        "title": "Testemunhas e acareação"
      }
    ]
  },
  {
    "day": 18,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 20,
        "title": "Organização criminosa: meios de obtenção da prova"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 17,
        "title": "Reconhecimento, documentos e indícios"
      },
      {
        "order": 3,
        "subject": "Português",
        "lessonNumber": 11,
        "title": "Concordância verbal e nominal"
      },
      {
        "order": 4,
        "subject": "Direito Constitucional",
        "lessonNumber": 9,
        "title": "Nacionalidade"
      },
      {
        "order": 5,
        "subject": "Direito Administrativo",
        "lessonNumber": 1,
        "title": "Estado, governo e Administração Pública"
      },
      {
        "order": 6,
        "subject": "Direito Penal Militar",
        "lessonNumber": 1,
        "title": "Aplicação da lei penal militar"
      }
    ]
  },
  {
    "day": 19,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 21,
        "title": "Crimes de tortura"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 18,
        "title": "Processo ordinário"
      },
      {
        "order": 3,
        "subject": "Português",
        "lessonNumber": 12,
        "title": "Regência verbal e nominal"
      },
      {
        "order": 4,
        "subject": "Direito Constitucional",
        "lessonNumber": 10,
        "title": "Direitos políticos e partidos políticos"
      },
      {
        "order": 5,
        "subject": "Direito Administrativo",
        "lessonNumber": 2,
        "title": "Conceito, objeto e fontes"
      },
      {
        "order": 6,
        "subject": "Direito Penal Militar",
        "lessonNumber": 2,
        "title": "Crime militar: conceito e estrutura"
      }
    ]
  },
  {
    "day": 20,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 22,
        "title": "Lei de Crimes Ambientais: parte geral e responsabilidade"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 19,
        "title": "Processos especiais: visão geral"
      },
      {
        "order": 3,
        "subject": "Português",
        "lessonNumber": 13,
        "title": "Crase"
      },
      {
        "order": 4,
        "subject": "Direito Constitucional",
        "lessonNumber": 11,
        "title": "Organização político-administrativa e entes federativos"
      },
      {
        "order": 5,
        "subject": "Direito Administrativo",
        "lessonNumber": 3,
        "title": "Ato administrativo: conceito, requisitos e atributos"
      },
      {
        "order": 6,
        "subject": "Direito Penal Militar",
        "lessonNumber": 3,
        "title": "Crime militar em tempo de paz"
      }
    ]
  },
  {
    "day": 21,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 23,
        "title": "Crimes ambientais",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_21_Aula_01_Legislacao_PMAL_23_Crimes_Ambientais.pdf"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 20,
        "title": "Deserção de oficial e de praça",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_21_Aula_02_DPPM_20_Desercao_Oficial_Praca.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 12,
        "title": "Intervenções e estado de sítio",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_21_Aula_03_Direito_Constitucional_12_Intervencoes_Estado_de_Sitio.pdf"
      },
      {
        "order": 4,
        "subject": "Direito Administrativo",
        "lessonNumber": 4,
        "title": "Classificação e espécies de atos administrativos",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_21_Aula_04_Direito_Administrativo_04_Classificacao_Especies_Atos.pdf"
      },
      {
        "order": 5,
        "subject": "Direito Penal Militar",
        "lessonNumber": 4,
        "title": "Imputabilidade penal militar",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_21_Aula_05_Direito_Penal_Militar_04_Imputabilidade_Penal_Militar.pdf"
      },
      {
        "order": 6,
        "subject": "Direito Constitucional",
        "lessonNumber": 13,
        "title": "Administração Pública constitucional",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_21_Aula_06_Direito_Constitucional_13_Administracao_Publica_Constitucional.pdf"
      }
    ]
  },
  {
    "day": 22,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 24,
        "title": "Sinarm, registro, posse e porte",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_22_Aula_01_Legislacao_PMAL_24_SINARM_Registro_Posse_Porte.pdf"
      },
      {
        "order": 2,
        "subject": "Direito Administrativo",
        "lessonNumber": 5,
        "title": "Extinção, anulação, revogação, cassação e convalidação",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_22_Aula_02_Direito_Administrativo_05_Extincao_Anulacao_Revogacao_Cassacao_Convalidacao.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Penal Militar",
        "lessonNumber": 5,
        "title": "Concurso de agentes",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_22_Aula_03_Direito_Penal_Militar_05_Concurso_de_Agentes.pdf"
      },
      {
        "order": 4,
        "subject": "Direito Constitucional",
        "lessonNumber": 14,
        "title": "Militares dos Estados, DF e Territórios",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_22_Aula_04_Direito_Constitucional_14_Militares_Estados_DF_Territorios.pdf"
      },
      {
        "order": 5,
        "subject": "Legislação PMAL",
        "lessonNumber": 25,
        "title": "Crimes do Estatuto do Desarmamento",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_22_Aula_05_Legislacao_PMAL_25_Crimes_Estatuto_Desarmamento.pdf"
      },
      {
        "order": 6,
        "subject": "DPPM",
        "lessonNumber": 21,
        "title": "Insubmissão",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_22_Aula_06_DPPM_21_Insubmissao.pdf"
      }
    ]
  },
  {
    "day": 23,
    "lessons": [
      {
        "order": 1,
        "subject": "Português",
        "lessonNumber": 14,
        "title": "Colocação pronominal",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_23_Aula_01_Portugues_14_Colocacao_Pronominal.pdf"
      },
      {
        "order": 2,
        "subject": "Direito Constitucional",
        "lessonNumber": 15,
        "title": "Separação de poderes e freios e contrapesos",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_23_Aula_02_Direito_Constitucional_15_Separacao_Poderes_Freios_Contrapesos.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Administrativo",
        "lessonNumber": 6,
        "title": "Decadência administrativa",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_23_Aula_03_Direito_Administrativo_06_Decadencia_Administrativa.pdf"
      },
      {
        "order": 4,
        "subject": "Direito Penal Militar",
        "lessonNumber": 6,
        "title": "Penas no CPM",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_23_Aula_04_Direito_Penal_Militar_06_Penas_no_CPM.pdf"
      },
      {
        "order": 5,
        "subject": "Legislação PMAL",
        "lessonNumber": 26,
        "title": "Sisnad, prevenção e usuário",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_23_Aula_05_Legislacao_PMAL_26_Sisnad_Prevencao_Usuario.pdf"
      },
      {
        "order": 6,
        "subject": "DPPM",
        "lessonNumber": 22,
        "title": "Nulidades",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_23_Aula_06_DPPM_22_Nulidades.pdf"
      }
    ]
  },
  {
    "day": 24,
    "lessons": [
      {
        "order": 1,
        "subject": "Português",
        "lessonNumber": 15,
        "title": "Semântica e significação das palavras",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_24_Aula_01_Portugues_15_Semantica_Significacao.pdf"
      },
      {
        "order": 2,
        "subject": "Direito Constitucional",
        "lessonNumber": 16,
        "title": "Poder Legislativo e prerrogativas parlamentares",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_24_Aula_02_Direito_Constitucional_16_Poder_Legislativo_Prerrogativas.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Administrativo",
        "lessonNumber": 7,
        "title": "Poder hierárquico e poder disciplinar",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_24_Aula_03_Direito_Administrativo_07_Poder_Hierarquico_Disciplinar.pdf"
      },
      {
        "order": 4,
        "subject": "Direito Penal Militar",
        "lessonNumber": 7,
        "title": "Aplicação da pena",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_24_Aula_04_Direito_Penal_Militar_07_Aplicacao_da_Pena.pdf"
      },
      {
        "order": 5,
        "subject": "Legislação PMAL",
        "lessonNumber": 27,
        "title": "Tráfico e crimes da Lei de Drogas",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_24_Aula_05_Legislacao_PMAL_27_Trafico_Crimes_Lei_Drogas.pdf"
      },
      {
        "order": 6,
        "subject": "DPPM",
        "lessonNumber": 23,
        "title": "Teoria geral dos recursos militares",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_24_Aula_06_DPPM_23_Teoria_Geral_Recursos_Militares.pdf"
      }
    ]
  },
  {
    "day": 25,
    "lessons": [
      {
        "order": 1,
        "subject": "Direito Constitucional",
        "lessonNumber": 17,
        "title": "Conselho da República e Conselho de Defesa Nacional",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_25_Aula_01_Direito_Constitucional_17_Conselho_da_Republica_Conselho_de_Defesa_Nacional.pdf"
      },
      {
        "order": 2,
        "subject": "Direito Administrativo",
        "lessonNumber": 8,
        "title": "Poder regulamentar e poder de polícia",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_25_Aula_02_Direito_Administrativo_08_Poder_Regulamentar_Poder_de_Policia.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Penal Militar",
        "lessonNumber": 8,
        "title": "Suspensão condicional e livramento condicional",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_25_Aula_03_Direito_Penal_Militar_08_Suspensao_Condicional_Livramento_Condicional.pdf"
      },
      {
        "order": 4,
        "subject": "Legislação PMAL",
        "lessonNumber": 28,
        "title": "Investigação e procedimento da Lei de Drogas",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_25_Aula_04_Legislacao_PMAL_28_Investigacao_Procedimento_Lei_de_Drogas.pdf"
      },
      {
        "order": 5,
        "subject": "DPPM",
        "lessonNumber": 24,
        "title": "Recurso em sentido estrito e correição parcial",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_25_Aula_05_DPPM_24_Recurso_em_Sentido_Estrito_Correicao_Parcial.pdf"
      },
      {
        "order": 6,
        "subject": "Direito Constitucional",
        "lessonNumber": 18,
        "title": "Poder Judiciário: disposições gerais",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_25_Aula_06_Direito_Constitucional_18_Poder_Judiciario_Disposicoes_Gerais.pdf"
      }
    ]
  },
  {
    "day": 26,
    "lessons": [
      {
        "order": 1,
        "subject": "Direito Administrativo",
        "lessonNumber": 9,
        "title": "Uso e abuso do poder",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_26_Aula_01_Direito_Administrativo_09_Uso_e_Abuso_do_Poder.pdf"
      },
      {
        "order": 2,
        "subject": "Direito Penal Militar",
        "lessonNumber": 9,
        "title": "Efeitos da condenação e medidas de segurança",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_26_Aula_02_Direito_Penal_Militar_09_Efeitos_da_Condenacao_Medidas_de_Seguranca.pdf"
      },
      {
        "order": 3,
        "subject": "Legislação PMAL",
        "lessonNumber": 29,
        "title": "Lei Maria da Penha: conceito, formas e assistência",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_26_Aula_03_Legislacao_PMAL_29_Lei_Maria_da_Penha_Conceito_Formas_Assistencia.pdf"
      },
      {
        "order": 4,
        "subject": "DPPM",
        "lessonNumber": 25,
        "title": "Apelação e embargos",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_26_Aula_04_DPPM_25_Apelacao_e_Embargos.pdf"
      },
      {
        "order": 5,
        "subject": "Direito Constitucional",
        "lessonNumber": 19,
        "title": "Justiça Militar da União e dos Estados",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_26_Aula_05_Direito_Constitucional_19_Justica_Militar_Uniao_Estados.pdf"
      },
      {
        "order": 6,
        "subject": "Direito Administrativo",
        "lessonNumber": 10,
        "title": "Regime jurídico-administrativo e princípios",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_26_Aula_06_Direito_Administrativo_10_Regime_Juridico_Administrativo_Principios.pdf"
      }
    ]
  },
  {
    "day": 27,
    "lessons": [
      {
        "order": 1,
        "subject": "Direito Penal Militar",
        "lessonNumber": 10,
        "title": "Ação penal militar e extinção da punibilidade",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_27_Aula_01_Direito_Penal_Militar_10_Acao_Penal_Militar_Extincao_Punibilidade.pdf"
      },
      {
        "order": 2,
        "subject": "Legislação PMAL",
        "lessonNumber": 30,
        "title": "Medidas protetivas e procedimento da Lei Maria da Penha",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_27_Aula_02_Legislacao_PMAL_30_Medidas_Protetivas_Procedimento_Lei_Maria_da_Penha.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Administrativo",
        "lessonNumber": 11,
        "title": "Responsabilidade civil do Estado",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_27_Aula_03_Direito_Administrativo_11_Responsabilidade_Civil_do_Estado.pdf"
      },
      {
        "order": 4,
        "subject": "Direito Penal Militar",
        "lessonNumber": 11,
        "title": "Crimes contra a autoridade ou disciplina militar",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_27_Aula_04_Direito_Penal_Militar_11_Crimes_Contra_Autoridade_Disciplina_Militar.pdf"
      },
      {
        "order": 5,
        "subject": "Direito Administrativo",
        "lessonNumber": 12,
        "title": "Omissão, excludentes e direito de regresso",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_27_Aula_05_Direito_Administrativo_12_Omissao_Excludentes_Direito_de_Regresso.pdf"
      },
      {
        "order": 6,
        "subject": "Legislação PMAL",
        "lessonNumber": 31,
        "title": "CTB: Sistema Nacional de Trânsito e normas de circulação",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_27_Aula_06_Legislacao_PMAL_31_CTB_Sistema_Nacional_Transito_Normas_Circulacao.pdf"
      }
    ]
  },
  {
    "day": 28,
    "lessons": [
      {
        "order": 1,
        "subject": "DPPM",
        "lessonNumber": 26,
        "title": "Revisão, recurso extraordinário e reclamação",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_28_Aula_01_DPPM_26_Revisao_Recurso_Extraordinario_Reclamacao.pdf"
      },
      {
        "order": 2,
        "subject": "Português",
        "lessonNumber": 16,
        "title": "Reescrita, substituição e equivalência de estruturas",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_28_Aula_02_Portugues_16_Reescrita_Substituicao_Equivalencia_Estruturas.pdf"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 20,
        "title": "Defesa do Estado e instituições democráticas",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_28_Aula_03_Direito_Constitucional_20_Defesa_Estado_Instituicoes_Democraticas.pdf"
      },
      {
        "order": 4,
        "subject": "Direito Administrativo",
        "lessonNumber": 13,
        "title": "Controle administrativo",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_28_Aula_04_Direito_Administrativo_13_Controle_Administrativo.pdf"
      },
      {
        "order": 5,
        "subject": "Direito Penal Militar",
        "lessonNumber": 12,
        "title": "Crimes contra o serviço e o dever militar",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_28_Aula_05_Direito_Penal_Militar_12_Crimes_Contra_Servico_Dever_Militar.pdf"
      },
      {
        "order": 6,
        "subject": "Legislação PMAL",
        "lessonNumber": 32,
        "title": "CTB: veículos, condutores, infrações e penalidades",
        pdfPath: "/materials/cfo-pmal/dias-01-39/Mentoria_Tita_CFO_PMAL_2026_Dia_28_Aula_06_Legislacao_PMAL_32_CTB_Veiculos_Condutores_Infracoes_Penalidades.pdf"
      }
    ]
  },
  {
    "day": 29,
    "lessons": [
      {
        "order": 1,
        "subject": "DPPM",
        "lessonNumber": 27,
        "title": "Execução penal militar: fundamentos e incidentes"
      },
      {
        "order": 2,
        "subject": "Português",
        "lessonNumber": 17,
        "title": "Reescrita, gêneros e níveis de formalidade"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 21,
        "title": "Segurança pública"
      },
      {
        "order": 4,
        "subject": "Direito Administrativo",
        "lessonNumber": 14,
        "title": "Controle judicial e legislativo"
      },
      {
        "order": 5,
        "subject": "Processo Penal",
        "lessonNumber": 1,
        "title": "Inquérito policial: conceito, natureza e características"
      },
      {
        "order": 6,
        "subject": "Direito Penal Militar",
        "lessonNumber": 13,
        "title": "Crimes militares contra a pessoa e o patrimônio"
      }
    ]
  },
  {
    "day": 30,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 33,
        "title": "CTB: crimes de trânsito"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 28,
        "title": "Sursis e livramento na execução"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 22,
        "title": "Jurisprudência constitucional aplicada"
      },
      {
        "order": 4,
        "subject": "Direito Administrativo",
        "lessonNumber": 15,
        "title": "Improbidade administrativa"
      },
      {
        "order": 5,
        "subject": "Processo Penal",
        "lessonNumber": 2,
        "title": "Inquérito policial: instauração e diligências"
      },
      {
        "order": 6,
        "subject": "Direito Penal Militar",
        "lessonNumber": 14,
        "title": "Crimes contra a Administração Militar"
      }
    ]
  },
  {
    "day": 31,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 34,
        "title": "ECA: princípios, direitos fundamentais e prevenção"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 29,
        "title": "Indulto, comutação, anistia, reabilitação e medidas de segurança"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 23,
        "title": "Constituição do Estado de Alagoas: princípios e organização"
      },
      {
        "order": 4,
        "subject": "Direito Administrativo",
        "lessonNumber": 16,
        "title": "Lei 14.133: princípios, agentes e planejamento"
      },
      {
        "order": 5,
        "subject": "Processo Penal",
        "lessonNumber": 3,
        "title": "Inquérito: prazos, encerramento e arquivamento"
      },
      {
        "order": 6,
        "subject": "Direito Penal Militar",
        "lessonNumber": 15,
        "title": "Princípios constitucionais penais com reflexos no CPM"
      }
    ]
  },
  {
    "day": 32,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 35,
        "title": "ECA: ato infracional e medidas"
      },
      {
        "order": 2,
        "subject": "DPPM",
        "lessonNumber": 30,
        "title": "Princípios constitucionais processuais no processo militar"
      },
      {
        "order": 3,
        "subject": "Direito Constitucional",
        "lessonNumber": 24,
        "title": "Constituição de Alagoas: Administração, servidores, militares e segurança"
      },
      {
        "order": 4,
        "subject": "Direito Administrativo",
        "lessonNumber": 17,
        "title": "Lei 14.133: modalidades, critérios e contratação direta"
      },
      {
        "order": 5,
        "subject": "Processo Penal",
        "lessonNumber": 4,
        "title": "Ação penal: fundamentos e condições"
      },
      {
        "order": 6,
        "subject": "Legislação PMAL",
        "lessonNumber": 36,
        "title": "ECA: crimes e infrações administrativas"
      }
    ]
  },
  {
    "day": 33,
    "lessons": [
      {
        "order": 1,
        "subject": "Direito Administrativo",
        "lessonNumber": 18,
        "title": "Lei 14.133: contratos administrativos"
      },
      {
        "order": 2,
        "subject": "Processo Penal",
        "lessonNumber": 5,
        "title": "Ação penal pública"
      },
      {
        "order": 3,
        "subject": "Direito Administrativo",
        "lessonNumber": 19,
        "title": "Decreto 11.531/2023 e Portaria Conjunta 33/2023"
      },
      {
        "order": 4,
        "subject": "Processo Penal",
        "lessonNumber": 6,
        "title": "Ação penal privada e causas relacionadas"
      },
      {
        "order": 5,
        "subject": "Legislação PMAL",
        "lessonNumber": 37,
        "title": "Abuso de autoridade: teoria geral"
      },
      {
        "order": 6,
        "subject": "Sociologia",
        "lessonNumber": 5,
        "title": "Classes, estilos de vida, desigualdade e exclusão"
      }
    ]
  },
  {
    "day": 34,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 38,
        "title": "Crimes de abuso de autoridade"
      },
      {
        "order": 2,
        "subject": "Sociologia",
        "lessonNumber": 6,
        "title": "Preconceito, discriminação e diversidade"
      },
      {
        "order": 3,
        "subject": "Filosofia",
        "lessonNumber": 1,
        "title": "Pré-socráticos e nascimento da filosofia"
      },
      {
        "order": 4,
        "subject": "Direitos Humanos",
        "lessonNumber": 1,
        "title": "Conceito e fundamentos"
      },
      {
        "order": 5,
        "subject": "Filosofia",
        "lessonNumber": 2,
        "title": "Sofistas e Sócrates"
      },
      {
        "order": 6,
        "subject": "Legislação PMAL",
        "lessonNumber": 39,
        "title": "Prisão temporária"
      }
    ]
  },
  {
    "day": 35,
    "lessons": [
      {
        "order": 1,
        "subject": "Filosofia",
        "lessonNumber": 3,
        "title": "Platão e Aristóteles"
      },
      {
        "order": 2,
        "subject": "Direitos Humanos",
        "lessonNumber": 2,
        "title": "Evolução histórica"
      },
      {
        "order": 3,
        "subject": "Legislação PMAL",
        "lessonNumber": 40,
        "title": "Lei 9.099/1995: princípios, competência e fase preliminar"
      },
      {
        "order": 4,
        "subject": "Filosofia",
        "lessonNumber": 4,
        "title": "Patrística e Escolástica"
      },
      {
        "order": 5,
        "subject": "Direitos Humanos",
        "lessonNumber": 3,
        "title": "Abrangência e dimensões de proteção"
      },
      {
        "order": 6,
        "subject": "Filosofia",
        "lessonNumber": 5,
        "title": "Racionalismo e empirismo"
      }
    ]
  },
  {
    "day": 36,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 41,
        "title": "Lei 9.099/1995: procedimento criminal e suspensão condicional"
      },
      {
        "order": 2,
        "subject": "Filosofia",
        "lessonNumber": 6,
        "title": "Kant e criticismo"
      },
      {
        "order": 3,
        "subject": "Direitos Humanos",
        "lessonNumber": 4,
        "title": "Sistemas de proteção dos Direitos Humanos"
      },
      {
        "order": 4,
        "subject": "Filosofia",
        "lessonNumber": 7,
        "title": "Hegel e Marx"
      },
      {
        "order": 5,
        "subject": "Legislação PMAL",
        "lessonNumber": 42,
        "title": "Lei 10.259/2001: Juizados Especiais Federais"
      },
      {
        "order": 6,
        "subject": "Sociologia",
        "lessonNumber": 7,
        "title": "Movimentos sociais, gênero, envelhecimento e violência"
      }
    ]
  },
  {
    "day": 37,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 43,
        "title": "Lei 14.751/2023: disposições gerais, competências e princípios"
      },
      {
        "order": 2,
        "subject": "Sociologia",
        "lessonNumber": 8,
        "title": "Cultura, consumo, mídia, ideologia e religião"
      },
      {
        "order": 3,
        "subject": "Filosofia",
        "lessonNumber": 8,
        "title": "Fenomenologia, Escola de Frankfurt e Teoria Crítica"
      },
      {
        "order": 4,
        "subject": "Direitos Humanos",
        "lessonNumber": 5,
        "title": "Convenção Americana: estrutura, deveres e direitos"
      },
      {
        "order": 5,
        "subject": "Filosofia",
        "lessonNumber": 9,
        "title": "Filosofia da ciência: Popper, Bachelard, Kuhn e Feyerabend"
      },
      {
        "order": 6,
        "subject": "Sociologia",
        "lessonNumber": 9,
        "title": "Migrações, trabalho e transformações sociais"
      }
    ]
  },
  {
    "day": 38,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 44,
        "title": "Lei 14.751/2023: organização, quadros, efetivos e carreira"
      },
      {
        "order": 2,
        "subject": "Filosofia",
        "lessonNumber": 10,
        "title": "Ética: fundamentos e teorias normativas"
      },
      {
        "order": 3,
        "subject": "Direitos Humanos",
        "lessonNumber": 6,
        "title": "CADH: proteção judicial, suspensão e interpretação"
      },
      {
        "order": 4,
        "subject": "Sociologia",
        "lessonNumber": 10,
        "title": "Ética, cidadania, globalização, Estado e tecnologia"
      },
      {
        "order": 5,
        "subject": "Filosofia",
        "lessonNumber": 11,
        "title": "Ética contemporânea, tecnologia e bioética"
      },
      {
        "order": 6,
        "subject": "Direitos Humanos",
        "lessonNumber": 7,
        "title": "Sistema Interamericano: órgãos e procedimentos"
      }
    ]
  },
  {
    "day": 39,
    "lessons": [
      {
        "order": 1,
        "subject": "Legislação PMAL",
        "lessonNumber": 45,
        "title": "Lei 14.751/2023: direitos, garantias, deveres e disposições finais"
      },
      {
        "order": 2,
        "subject": "Sociologia",
        "lessonNumber": 11,
        "title": "Metodologia de ensino de Sociologia"
      },
      {
        "order": 3,
        "subject": "Filosofia",
        "lessonNumber": 12,
        "title": "Filosofia política antiga e moderna"
      },
      {
        "order": 4,
        "subject": "Direitos Humanos",
        "lessonNumber": 8,
        "title": "Pacto de São José e atividade policial"
      },
      {
        "order": 5,
        "subject": "Filosofia",
        "lessonNumber": 13,
        "title": "Filosofia política contemporânea: Habermas"
      },
      {
        "order": 6,
        "subject": "Filosofia",
        "lessonNumber": 14,
        "title": "Filosofia da linguagem"
      }
    ]
  }
] as CfoPmalRoadmapDay[];
