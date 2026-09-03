"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Panel lateral de solo lectura: Escape cierra, el foco entra al abrir y vuelve al cerrar. */
export function DetailPanel({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") router.replace(closeHref, { scroll: false }); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [closeHref, router]);

  return (
    <aside className="detail-panel" ref={panel} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby="detalle-titulo">
      <div className="detail-panel-head">
        <h2 id="detalle-titulo">{title}</h2>
        <Link className="detail-close" href={closeHref} replace scroll={false} aria-label="Cerrar detalle"><X size={16} /></Link>
      </div>
      {children}
    </aside>
  );
}
