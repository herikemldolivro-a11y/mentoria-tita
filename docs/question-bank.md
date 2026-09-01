# Banco de Questões — Mentoria Titã

## Visão geral

O banco de questões usa o plano ativo do aluno como limite de acesso. A hierarquia já existente continua sendo a fonte de verdade:

`study_plans → study_subjects → study_lessons → questions`

Não há conteúdo acadêmico hardcoded no formulário administrativo. Planos, matérias e aulas são carregados de `study_lesson_catalog`.

## Migration

Execute `supabase/migrations/004_question_bank.sql` no SQL Editor do Supabase depois das migrations `002_study_system.sql` e `003_content_library.sql`.

A migration é aditiva e idempotente: cria estruturas novas, índices, políticas e RPCs sem apagar tabelas ou histórico existente.

## Tabelas

### `questions`

Contém apenas o conteúdo que pode ser entregue ao aluno:

- plano, matéria e aula;
- enunciado;
- tipo (`true_false` ou `multiple_choice`);
- alternativas em `jsonb`;
- nível de 1 a 4;
- banca, ano, cargo/prova e código da fonte;
- status ativo/inativo e auditoria de criação.

Um trigger valida que plano, matéria e aula pertencem à mesma trilha. Questões são desativadas por soft-delete para preservar o histórico.

### `question_keys`

Contém o gabarito e a explicação. O aluno não possui política de `SELECT` nessa tabela. Somente administradores podem consultá-la diretamente.

O gabarito é revelado ao aluno somente após uma resposta, pelas RPCs seguras de correção.

### `user_question_answers`

Histórico append-only de respostas. Registra usuário, questão, resposta, acerto/erro, data e origem:

- `bank`;
- `lesson_list`;
- `leveling`.

Responder novamente cria um novo registro; respostas antigas nunca são sobrescritas.

### `question_attempts`

Representa uma tentativa própria do aluno. Aceita `lesson_list` e já está preparada para `leveling`.

### `question_attempt_items`

Congela as questões e posições de cada tentativa. Armazena a resposta atual daquele item, resultado e horário da resposta.

## Segurança e RLS

- Admin: cria e altera questões e gabaritos.
- Aluno: lê somente questões ativas do próprio `active_study_plan_id`.
- Aluno: nunca recebe livre acesso a `question_keys`.
- Histórico, tentativas e itens são visíveis somente para o próprio usuário; admin pode auditar.
- Inserções de histórico e mudanças nas tentativas acontecem por funções `security definer` que verificam `auth.uid()`.
- Não há política de exclusão física de questões.

## RPCs principais

- `admin_upsert_question(payload)`: cria ou edita questão e gabarito atomicamente.
- `admin_import_questions(array)`: valida e importa até 500 questões por transação; informa o índice do registro inválido.
- `get_question_bank_page(...)`: filtros combináveis e paginação de 20 questões sem expor gabaritos antecipados.
- `submit_question_answer(...)`: corrige a resposta livre, registra histórico e só então retorna gabarito/comentário.
- `get_lesson_question_status(lesson_id)`: quantidade disponível e tentativa atual da aula.
- `start_lesson_question_attempt(lesson_id)`: cria ou retoma a lista congelada.
- `get_question_attempt(attempt_id)`: entrega a tentativa do próprio usuário; gabaritos aparecem apenas nos itens já respondidos.
- `submit_attempt_answer(...)`: salva e corrige cada resposta imediatamente.
- `finalize_question_attempt(...)`: fecha a tentativa, calcula o resultado e marca `user_lesson_progress.list_completed_at`.
- `admin_question_overview()`: contagem ativa/total por aula para o painel administrativo.

## Como adicionar uma questão

1. Entre com um perfil cujo `role` seja `admin`.
2. Abra `Admin → Questões → Adicionar questão`.
3. Selecione plano, matéria e aula vindos do banco.
4. Preencha tipo, nível, metadados, enunciado, alternativas, gabarito e comentário.
5. Salve. A questão fica disponível apenas aos alunos daquele plano.

## Importação JSON

O painel mostra um exemplo com UUIDs válidos do catálogo atual. Formato resumido:

```json
[
  {
    "plan_id": "uuid",
    "subject_id": "uuid",
    "lesson_id": "uuid",
    "statement": "Enunciado",
    "question_type": "multiple_choice",
    "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "level": 2,
    "banca": "Cebraspe",
    "ano": 2025,
    "exam_name": "PRF",
    "source_code": "PRF-2025-001",
    "correct_answer": "B",
    "explanation": "Comentário",
    "active": true
  }
]
```

Para certo/errado, use `question_type: "true_false"`, `choices: null` e gabarito `TRUE` ou `FALSE`.

## Lista de 35 questões

Ao iniciar a lista da aula:

1. a função procura uma tentativa `in_progress` do mesmo usuário e aula;
2. se existir, devolve a tentativa existente;
3. conta as questões ativas; com menos de 35, não cria a tentativa;
4. prioriza questões que o usuário ainda não respondeu;
5. separa candidatas por níveis 1–4;
6. quando os quatro níveis existem, inclui ao menos uma questão de cada;
7. preenche o restante com balanceamento suave, usando disponibilidade, quantidade já escolhida e pequena variação aleatória;
8. aplica Fisher–Yates e salva os 35 IDs/posições em `question_attempt_items`.

Depois disso, atualizar a página ou trocar de dispositivo não sorteia novamente.

Ao finalizar, a RPC calcula acertos, erros e percentual e reutiliza `save_lesson_progress` para liberar a sequência já existente.

## Preparação para nivelamento

`question_attempts.kind` já aceita `leveling`, e o histórico aceita origem `leveling`. A futura etapa poderá criar tentativas de 10 questões e aplicar prioridade por erros, assuntos fracos e dificuldade sem mudar a estrutura base. O algoritmo definitivo de nivelamento não faz parte desta migration.

## Favoritos e fila de revisão

A migration `005_question_marks.sql` cria `user_question_marks`. Cada aluno pode destacar uma questão com estrela e/ou salvá-la na fila “Para revisar”. A RPC `set_question_mark` valida que a questão pertence ao plano ativo. Os filtros `DESTACADAS` e `PARA REVISAR` usam esses marcadores sem expor dados de outros alunos.

## Importação por formulário de texto

Em **Admin → Questões → Importar em lote**, selecione concurso, matéria e assunto. Depois use o formato simples com campos como `ENUNCIADO:`, `TIPO:`, `NÍVEL:`, alternativas, `GABARITO:` e `COMENTÁRIO:`. Separe questões com uma linha contendo `---`. A tela mostra a quantidade organizada, uma prévia e eventuais erros antes de enviar o lote para a importação transacional.
