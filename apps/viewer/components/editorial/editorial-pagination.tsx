"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function EditorialPagination({ total, page, pageSize, pageCount, label = "piezas" }: { total: number; page: number; pageSize: number; pageCount: number; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  function update(nextPage: number, nextSize = pageSize) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(nextPage));
    next.set("rows", String(nextSize));
    next.delete("piece");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return <div className="editorial-pagination">
    <p role="status">{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total.toLocaleString("es-ES")}` : "0 resultados"} <span>{label}</span></p>
    <label>Filas <select aria-label={`Filas por página de ${label}`} value={pageSize} onChange={(event) => update(1, Number(event.target.value))}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
    <nav aria-label={`Paginación de ${label}`}>
      <button type="button" aria-label="Primera página" disabled={page === 1} onClick={() => update(1)}><ChevronsLeft size={18} aria-hidden /></button>
      <button type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => update(page - 1)}><ChevronLeft size={18} aria-hidden /></button>
      <span>{page} / {pageCount}</span>
      <button type="button" aria-label="Página siguiente" disabled={page === pageCount} onClick={() => update(page + 1)}><ChevronRight size={18} aria-hidden /></button>
      <button type="button" aria-label="Última página" disabled={page === pageCount} onClick={() => update(pageCount)}><ChevronsRight size={18} aria-hidden /></button>
    </nav>
  </div>;
}
