"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/**
 * Tabla corta con «Ver más» (D-046): muestra `visible` filas y despliega el
 * resto en la misma tabla, para que las tarjetas mantengan su altura.
 */
export function ExpandableTable({
  caption,
  head,
  rows,
  visible = 3,
}: {
  caption: string;
  /** Fila fija al principio (el total). */
  head?: ReactNode;
  rows: ReactNode[];
  visible?: number;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hidden = rows.length - visible;
  return (
    <>
      <table className="brand-ai-table" id={id}>
        <caption className="ds-sr-only">{caption}</caption>
        <tbody>
          {head}
          {open ? rows : rows.slice(0, visible)}
        </tbody>
      </table>
      {hidden > 0 ? (
        <button
          type="button"
          className="brand-ai-more"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Ver menos" : `Ver más (${hidden})`}
          <ChevronDown size={14} aria-hidden data-open={open || undefined} />
        </button>
      ) : null}
    </>
  );
}

/** Lista con «Ver más» (D-045): mismas reglas que `ExpandableTable`. */
export function ExpandableList({
  rows,
  visible = 5,
  className,
}: {
  rows: ReactNode[];
  visible?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hidden = rows.length - visible;
  return (
    <>
      <div className={className} id={id}>
        {open ? rows : rows.slice(0, visible)}
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          className="brand-ai-more brand-list-more"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Ver menos" : `Ver más (${hidden})`}
          <ChevronDown size={14} aria-hidden data-open={open || undefined} />
        </button>
      ) : null}
    </>
  );
}
