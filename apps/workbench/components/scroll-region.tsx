import type { ReactNode } from "react";

/**
 * Contenedor con desplazamiento horizontal para tablas anchas (D-077). Es
 * enfocable y tiene nombre para que el teclado pueda desplazarlo (WCAG 2.1.1,
 * regla axe `scrollable-region-focusable`), como las tablas del visor.
 */
export function ScrollRegion({ label, children, className = "rp-table-wrap" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
