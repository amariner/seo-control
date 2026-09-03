"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Download, Search } from "lucide-react";

export type ToolbarSelect = { key: string; label: string; value: string; options: Array<{ value: string; label: string }>; allLabel?: string };

/**
 * Filtros editoriales persistentes en la URL (compartibles). No usa almacenamiento local:
 * las preferencias de columnas, si llegan, serán lo único local.
 */
export function EditorialToolbar({ selects, search, exportHref, exportLabel = "Descargar CSV", children, resetKeys = [] }: { selects: ToolbarSelect[]; search?: { value: string; placeholder: string }; exportHref?: string; exportLabel?: string; children?: ReactNode; resetKeys?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search?.value ?? "");

  useEffect(() => { setQuery(search?.value ?? ""); }, [search?.value]);

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    for (const key of resetKeys) next.delete(key);
    router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    if (!search) return;
    if (query === (search.value ?? "")) return;
    const timer = window.setTimeout(() => apply({ q: query.trim() }), 260);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const active = selects.filter((select) => select.value !== "all").length + (search?.value ? 1 : 0);

  return (
    <form className="editorial-toolbar" role="search" aria-label="Filtros editoriales" onSubmit={(event) => { event.preventDefault(); apply({ q: query.trim() }); }}>
      {search ? <label className="field field-search"><span>Buscar</span><span style={{ position: "relative", display: "block" }}><input className="ds-input" style={{ paddingLeft: 32, width: "100%" }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={search.placeholder} aria-label={search.placeholder} /><Search size={14} aria-hidden style={{ position: "absolute", left: 11, top: 13, color: "var(--ds-muted)" }} /></span></label> : null}
      {selects.map((select) => (
        <label className="field" key={select.key}>
          <span>{select.label}</span>
          <select className="ds-select" value={select.value} onChange={(event) => apply({ [select.key]: event.target.value })}>
            <option value="all">{select.allLabel ?? `Todos`}</option>
            {select.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      {children}
      <div className="toolbar-actions">
        {active > 0 ? <button type="button" className="ds-button ds-button-quiet" onClick={() => apply(Object.fromEntries([...selects.map((select) => [select.key, ""]), ["q", ""]]))}>Limpiar filtros ({active})</button> : null}
        {exportHref ? <a className="ds-button" href={exportHref} download><Download size={14} aria-hidden />{exportLabel}</a> : null}
      </div>
    </form>
  );
}
