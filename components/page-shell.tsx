import { SiteHeader } from "@/components/site-header";
export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><SiteHeader /><main>{children}</main><footer><span>MENTORIA TITÃ</span><span>DISCIPLINA · CONSTÂNCIA · RESULTADO</span></footer></div>;
}
