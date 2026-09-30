"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Fila de un sitemap: «Abrir» lleva al fichero y «Ver estructura de URLs»
 * despliega debajo la ramificación de sus URL (renderizada en el servidor).
 */
export function SitemapDisclosure({ head, href, children, disabled }: { head: ReactNode; href: string; children: ReactNode; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div className="sm-row">
        {head}
        <div className="sm-actions">
          <a className="button button-small" href={href} target="_blank" rel="noopener noreferrer">
            Abrir
          </a>
          <button type="button" className="button button-small" aria-expanded={open} aria-controls={id} disabled={disabled} onClick={() => setOpen((value) => !value)}>
            {open ? "Ocultar estructura" : "Ver estructura de URLs"}
          </button>
        </div>
      </div>
      <div id={id} className="sm-structure" hidden={!open}>
        {open ? children : null}
      </div>
    </>
  );
}
