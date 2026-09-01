import { BookOpenCheck, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { isAdmin } = await requireAuthenticatedUser();
  if (!isAdmin) redirect("/");

  const cards = [
    { href: "/admin/conteudos", title: "Conteúdos", description: "Gerenciar PDFs e materiais das aulas.", icon: FileText },
    { href: "/admin/questoes", title: "Questões", description: "Adicionar, importar e administrar o banco de questões.", icon: BookOpenCheck },
  ];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="border-b border-[var(--border)] pb-8">
          <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[var(--gold-bright)]"><ShieldCheck size={16} /> ACESSO ADMINISTRATIVO</span>
          <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Central Administrativa.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Gerencie os conteúdos acadêmicos da plataforma sem alterar o código.</p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="group flex min-h-56 flex-col justify-between rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow)] sm:p-7">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] text-[var(--gold-bright)]"><Icon size={25} strokeWidth={1.6} /></span>
              <div><span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">ADMIN</span><h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">{title}</h2><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{description}</p></div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
