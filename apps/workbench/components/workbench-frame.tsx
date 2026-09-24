import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Cabecera y navegación del workbench.
 *
 * Se extrae al añadir la tercera sección (P2.3): con dos páginas la lista de
 * enlaces duplicada era tolerable; con tres, cada nueva sección obligaría a
 * tocar todos los ficheros y alguno se quedaría sin el enlace.
 */
const SECTIONS = [
  { href: "/", label: "Preparación" },
  { href: "/editorial", label: "Editorial" },
  { href: "/herramientas", label: "Herramientas" },
] as const;

export type WorkbenchSection = (typeof SECTIONS)[number]["href"];

export function WorkbenchNav({ current }: { current: WorkbenchSection }) {
  return (
    <nav className="wb-nav" aria-label="Secciones del workbench">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          aria-current={section.href === current ? "page" : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}

export function WorkbenchFrame({
  eyebrow,
  title,
  description,
  subtitle = "Utilidades locales",
  current = "/herramientas",
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  subtitle?: string;
  current?: WorkbenchSection;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="wb-shell">
      <a href="#contenido" className="ds-skip-link">Ir al contenido</a>
      <header className="wb-top">
        <div className="wb-brand"><span className="wb-mark">P</span><div><strong>SEO Workbench</strong><span>{subtitle}</span></div></div>
        <WorkbenchNav current={current} />
        <span className="local-pill">Entorno local</span>
      </header>
      <main className="wb-main" id="contenido">
        <header className="wb-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lede">{description}</p>
          </div>
          {aside}
        </header>
        {children}
      </main>
    </div>
  );
}
