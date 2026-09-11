import { BookOpenCheck, CalendarRange, FileText, KeyRound, ShieldCheck, Target, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  const cards = [
    { href: "/admin/alunos", title: "Alunos", description: "Mentorados, nomes, concurso foco e cronogramas atribuídos.", icon: UsersRound },
    { href: "/admin/codigos", title: "Códigos de Acesso", description: "Gere convites seguros para novos alunos criarem a própria conta.", icon: KeyRound },
    { href: "/admin/cronograma", title: "Cronograma e Semanas", description: "Criar semanas, matérias, aulas, tópicos e importar matrizes semanais.", icon: CalendarRange },
    { href: "/admin/conteudos", title: "Conteúdos", description: "Gerenciar PDFs e materiais das aulas.", icon: FileText },
    { href: "/admin/questoes", title: "Questões", description: "Adicionar, importar e administrar o banco de questões.", icon: BookOpenCheck },
    { href: "/admin/nivelamentos", title: "Nivelamentos", description: "Definir quantidade de questões e meta de aprovação por aula.", icon: Target },
  ];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="border-b border-white/[.07] pb-8">
          <span className="inline-flex items-center gap-2 tita-kicker"><ShieldCheck size={16} /> ACESSO ADMINISTRATIVO</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Central Administrativa.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Gerencie a estrutura da mentoria com a mesma identidade BLACK da área do aluno.</p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="tita-panel group flex min-h-56 flex-col justify-between rounded-[26px] p-6 transition hover:-translate-y-1 hover:border-white/[.16] hover:bg-white/[.035] sm:p-7">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[.1] bg-white/[.035] text-[var(--tita-accent)]"><Icon size={25} strokeWidth={1.6} /></span>
              <div><span className="tita-kicker">ADMIN</span><h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">{title}</h2><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{description}</p></div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
