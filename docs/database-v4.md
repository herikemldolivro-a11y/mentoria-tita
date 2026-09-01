# Persistência central — PRF Semana 1

Esta versão remove a dependência de `localStorage` para o núcleo acadêmico do piloto PRF.

## O que passa a ser individual por usuário no Supabase

- plano de estudos ativo;
- Semana 1 iniciada/concluída;
- matéria iniciada/concluída;
- teoria iniciada/concluída;
- escolha PDF da plataforma ou videoaula externa;
- lista de 35 iniciada/concluída;
- desbloqueio sequencial das aulas;
- revisões em rascunho, agendadas, arrastadas ou removidas;
- releitura da revisão;
- modo de revisão;
- tentativas de nivelamento e nota de cada bloco;
- conclusão da revisão ao atingir 9/10;
- Revisão 2 recomendada quatro dias após a conclusão real da Revisão 1.

## Estrutura preparada para o futuro

`study_lessons.pdf_path` receberá o PDF de cada aula quando os materiais forem integrados.
`question_count` já guarda 35 para as listas da Semana 1. O banco real de questões será conectado depois.

## Tabelas principais

- `study_plans`
- `study_weeks`
- `study_subjects`
- `study_lessons`
- `study_lesson_topics`
- `user_week_progress`
- `user_subject_progress`
- `user_lesson_progress`
- `user_revisions`
- `user_leveling_attempts`

Todas as tabelas de progresso usam RLS para que um aluno só leia e altere os próprios dados.
