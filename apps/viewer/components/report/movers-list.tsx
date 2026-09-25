"use client";

import { useId, useState, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

/**
 * Lista con interruptor «Suben / Bajan» para keywords y URLs en tendencia y en
 * decadencia. Las filas llegan ya renderizadas desde el servidor.
 */
export function MoversList({
  up,
  down,
  head,
  empty,
}: {
  up: ReactNode[];
  down: ReactNode[];
  head: ReactNode;
  empty: string;
}) {
  const [view, setView] = useState<"up" | "down">("up");
  const id = useId();
  const rows = view === "up" ? up : down;
  return (
    <>
      <div className="brand-movers-switch" role="group" aria-label="Dirección">
        <button
          type="button"
          aria-pressed={view === "up"}
          aria-controls={id}
          onClick={() => setView("up")}
        >
          <TrendingUp size={14} aria-hidden />
          En tendencia
        </button>
        <button
          type="button"
          aria-pressed={view === "down"}
          aria-controls={id}
          onClick={() => setView("down")}
        >
          <TrendingDown size={14} aria-hidden />
          En decadencia
        </button>
      </div>
      {head}
      <div className="brand-list" id={id} aria-live="polite">
        {rows.length ? rows : <p className="brand-movers-empty">{empty}</p>}
      </div>
    </>
  );
}
