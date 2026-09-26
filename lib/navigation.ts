import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Target,
  Languages,
} from "lucide-react";

export const navigationItems = [
  {
    href: "/cronograma",
    title: "Plano de Estudos",
    description: "Veja suas semanas, missões e ajuste a carga de estudo.",
    icon: CalendarDays,
  },
  {
    href: "/ingles",
    title: "Inglês — Reading Lab",
    description: "12 textos por semana, tradução no hover e vocabulário pessoal.",
    icon: Languages,
  },
  {
    href: "/calendario",
    title: "Calendário Principal",
    description: "Revisões e nivelamentos em uma agenda conectada.",
    icon: CalendarDays,
  },
  {
    href: "/nivelamentos",
    title: "Nivelamentos",
    description: "Acompanhe as metas de domínio ligadas às suas revisões.",
    icon: Target,
  },
  {
    href: "/questoes",
    title: "Banco de Questões",
    description: "Treine por matéria, assunto e nível.",
    icon: BookOpenCheck,
  },
  {
    href: "/desempenho",
    title: "Desempenho",
    description: "Acompanhe sua evolução e seus pontos prioritários.",
    icon: BarChart3,
  },
] as const;

export const dashboardNavigationItems = navigationItems;
export type NavigationItem = (typeof navigationItems)[number];
