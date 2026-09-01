# Mentoria Titã - Biblioteca de Conteúdos V5

## Objetivo

Depois desta versão, um PDF novo não exige programação.

Fluxo do administrador:

1. Acessar `/admin/conteudos`.
2. Selecionar a aula.
3. Arrastar um PDF ou imagem.
4. Definir se o aluno pode baixar.
5. Clicar em **PUBLICAR MATERIAL**.

O arquivo vai para o bucket privado `lesson-materials` do Supabase Storage e o metadado vai para `public.lesson_materials`.

## Fluxo do aluno

Na opção **PDF da plataforma**, o componente busca o material ativo da aula e gera uma URL assinada temporária.

O aluno pode:

- ler o PDF dentro da Mentoria Titã;
- abrir o PDF em nova aba;
- baixar o PDF quando `allow_download = true`.

## Substituição

Ao publicar outra versão para a mesma aula, a anterior é desativada e a nova passa a ser a versão ativa. Isso não exige alteração de rota nem de código.

## Segurança

- Bucket privado.
- Apenas perfis com `role = admin` podem enviar, substituir ou apagar.
- Alunos só leem materiais pertencentes ao `active_study_plan_id` da própria conta.
