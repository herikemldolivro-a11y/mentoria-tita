import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  FileText,
  NotebookPen,
} from "lucide-react";

export const navigationItems = [
  {
    href: "/cronograma/semana-1",
    title: "Cronograma — Semana 1",
    description: "Escolha a matéria e siga a sequência da Semana 1.",
    icon: CalendarDays,
  },
  {
    href: "/revisoes",
    title: "Revisões",
    description: "Organize sua agenda, mova revisões e acompanhe os nivelamentos.",
    icon: CalendarClock,
  },
  {
    href: "/questoes",
    title: "Banco de Questões",
    description: "Treine por matéria, assunto e nível.",
    icon: BookOpenCheck,
  },
  {
    href: "/materiais",
    title: "Materiais",
    description: "PDFs, resumos e materiais selecionados para sua preparação.",
    icon: FileText,
  },
  {
    href: "/desempenho",
    title: "Desempenho",
    description: "Acompanhe sua evolução e seus pontos prioritários.",
    icon: BarChart3,
  },
  {
    href: "/erros",
    title: "Caderno de Erros",
    description: "Transforme seus erros em pontos na prova.",
    icon: NotebookPen,
  },
] as const;

export const dashboardNavigationItems = navigationItems;
export type NavigationItem = (typeof navigationItems)[number];
