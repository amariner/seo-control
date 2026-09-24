import { BRANDS } from "@seo/contracts";
import {
  BarChart3,
  CalendarDays,
  Database,
  FileText,
  History,
  House,
  Layers,
  Lightbulb,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string;
};

/** Menú principal del visor (D-043, D-044), agrupado por tipo de lectura. */
export const NAVIGATION: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Rendimiento",
    items: [
      { href: "/", label: "Inicio", icon: House },
      { href: "/portfolio", label: "Conjunto", icon: Layers },
      { href: "/projects", label: "Proyectos", icon: BarChart3 },
    ],
  },
  {
    label: "Decisiones",
    items: [
      {
        href: "/editorial/calendario",
        label: "Editorial",
        icon: CalendarDays,
        match: "/editorial",
      },
      { href: "/insights", label: "Evidencias", icon: Lightbulb },
      { href: "/reports", label: "Informes", icon: FileText },
      { href: "/actions", label: "Acciones", icon: ListChecks },
      { href: "/cronologia", label: "Cronología", icon: History },
    ],
  },
];

export const SECONDARY_NAVIGATION: NavItem[] = [
  { href: "/data", label: "Datos y cobertura", icon: Database },
];

export const NAVIGATION_ITEMS = [
  ...NAVIGATION.flatMap((group) => group.items),
  ...SECONDARY_NAVIGATION,
];

export function isActive(pathname: string, href: string, match?: string) {
  const base = match ?? href;
  return base === "/" ? pathname === "/" : pathname.startsWith(base);
}

export type Crumb = { label: string; href?: string };

const EDITORIAL_TABS: Record<string, string> = {
  calendario: "Calendario",
  backlog: "Backlog y plan",
  propuestas: "Propuestas",
};

/** Fichas de detalle que no tienen entrada propia en el menú. */
const DETAIL_PARENT: Record<string, string> = {
  issues: "/projects",
  pages: "/projects",
  queries: "/insights",
};

/**
 * Ruta de la cabecera superior. Es la única miga de pan del visor: las vistas
 * no repiten la suya. `detail` es el título de la ficha cuando la URL no basta
 * para nombrarla (informe, incidencia, URL o keyword).
 */
export function buildBreadcrumb(pathname: string, detail?: string): Crumb[] {
  const [root, child] = pathname.split("/").filter(Boolean);
  if (!root) return [{ label: "Inicio" }];

  const parentHref = DETAIL_PARENT[root] ?? `/${root}`;
  const section = NAVIGATION_ITEMS.find((item) =>
    isActive(parentHref, item.href, item.match),
  );
  if (!section) return [{ label: detail ?? "SEO Intelligence" }];

  let last: string | undefined;
  if (root === "editorial") last = child ? EDITORIAL_TABS[child] : undefined;
  else if (root === "projects" && child)
    last = BRANDS.find((brand) => brand.slug === child)?.name ?? child;
  else if (child || DETAIL_PARENT[root]) last = detail;

  if (!last) return [{ label: section.label }];
  return [{ label: section.label, href: section.href }, { label: last }];
}
