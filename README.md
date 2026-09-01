# Mentoria Titã — Foco 95+

Interface inicial da plataforma de preparação Mentoria Titã, desenvolvida com Next.js, TypeScript e Tailwind CSS.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Usuários devem ser cadastrados previamente no Supabase. Não existe cadastro público na aplicação.

O dashboard usa um placeholder visual para a marca. Para adicionar a logo oficial futuramente, inclua o arquivo `public/logo-tita.png`.
