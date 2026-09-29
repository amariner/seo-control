"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Botón de envío que se desactiva mientras la acción corre: congelar un
 * informe tarda ~15 s y un segundo clic lanzaría otra petición a Google.
 */
export function SubmitButton({ children, pending, className = "button", title }: { children: ReactNode; pending: string; className?: string; title?: string }) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending} aria-busy={status.pending} title={title}>
      {status.pending ? pending : children}
    </button>
  );
}
