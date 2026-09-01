import { SiteHeader } from "@/components/site-header";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function PageShell({ children }: { children: React.ReactNode }) {
  const { displayName, role } = await requireAuthenticatedUser();
  return <div className="app-shell"><SiteHeader displayName={displayName} role={role} /><main>{children}</main><footer><span>MENTORIA TITÃ</span><span>DISCIPLINA · CONSTÂNCIA · RESULTADO</span></footer></div>;
}
