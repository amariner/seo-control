import type { ReactNode } from "react";
import { WorkbenchShell } from "./workbench-shell";

/**
 * Marco de página del workbench (D-077): shell del visor (barra lateral,
 * cabecera fija) y la misma cabecera de página que el visor (D-049): «Título │
 * ámbito» en una línea, descripción gris debajo y contexto a la derecha.
 * El destino activo lo deduce la barra lateral de la ruta.
 */
export function WorkbenchFrame({
  eyebrow,
  title,
  description,
  crumb,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  /** Último nivel de la ruta de la cabecera en las fichas de detalle. */
  crumb?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <WorkbenchShell crumb={crumb} viewerUrl={process.env.VIEWER_URL ?? "http://localhost:3000"}>
      <main className="page wb-page" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lede">{description}</p>
          </div>
          {aside}
        </header>
        {children}
      </main>
    </WorkbenchShell>
  );
}
