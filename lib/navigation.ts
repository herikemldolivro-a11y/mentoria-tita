import { BarChart3, BookOpenCheck, CalendarDays, ClipboardCheck, FileText, NotebookPen } from "lucide-react";
export const navigationItems = [
  { href: "/cronograma", title: "Cronograma", description: "Veja sua programação e metas da semana.", icon: CalendarDays },
  { href: "/questoes", title: "Questões", description: "Treine por matéria, assunto e nível.", icon: BookOpenCheck },
  { href: "/materiais", title: "Materiais", description: "PDFs, resumos e materiais selecionados para sua preparação.", icon: FileText },
  { href: "/simulados", title: "Simulados", description: "Faça simulados e acompanhe seus líquidos.", icon: ClipboardCheck },
  { href: "/desempenho", title: "Desempenho", description: "Acompanhe sua evolução e seus pontos prioritários.", icon: BarChart3 },
  { href: "/erros", title: "Caderno de erros", description: "Transforme seus erros em pontos na prova.", icon: NotebookPen }
] as const;
export type NavigationItem = (typeof navigationItems)[number];
