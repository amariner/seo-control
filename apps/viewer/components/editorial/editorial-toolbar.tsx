"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Download, Search } from "lucide-react";

export type ToolbarSelect = {
  key: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
};

/**
 * Filtros editoriales persistentes en la URL (compartibles). No usa almacenamiento local:
 * las preferencias de columnas, si llegan, serán lo único local.
 */
export function EditorialToolbar({
  selects,
  search,
  exportHref,
  exportLabel = "Descargar CSV",
  children,
  resetKeys = [],
}: {
  selects: ToolbarSelect[];
  search?: { value: string; placeholder: string };
  exportHref?: string;
  exportLabel?: string;
  children?: ReactNode;
  resetKeys?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search?.value ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(search?.value ?? "");
  }, [search?.value]);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 720px)");
    const adapt = () => setFiltersOpen(!mobile.matches);
    adapt();
    mobile.addEventListener("change", adapt);
    return () => mobile.removeEventListener("change", adapt);
  }, []);

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    for (const key of resetKeys) next.delete(key);
    router.replace(
      `${pathname}${next.toString() ? `?${next.toString()}` : ""}`,
      { scroll: false },
    );
  }

  useEffect(() => {
    if (!search) return;
    if (query === (search.value ?? "")) return;
    const timer = window.setTimeout(() => apply({ q: query.trim() }), 260);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const activeSelects = selects.filter((select) => select.value !== "all");
  const active = activeSelects.length + (search?.value ? 1 : 0);

  return (
    <form
      className="editorial-toolbar"
      role="search"
      aria-label="Filtros editoriales"
      onSubmit={(event) => {
        event.preventDefault();
        apply({ q: query.trim() });
      }}
    >
      {search ? (
        <label className="field field-search">
          <span>Buscar</span>
          <span style={{ position: "relative", display: "block" }}>
            <input
              type="search"
              className="ds-input"
              style={{ paddingLeft: 32, width: "100%" }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar título, keyword o URL…"
              aria-label={search.placeholder}
            />
            <Search
              size={14}
              aria-hidden
              style={{
                position: "absolute",
                left: 11,
                top: 13,
                color: "var(--ds-muted)",
              }}
            />
          </span>
        </label>
      ) : null}
      {selects.length > 0 ? (
        <details
          className="editorial-filter-disclosure"
          open={filtersOpen}
          onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
        >
          <summary>
            Filtros
            {activeSelects.length > 0 ? (
              <span className="editorial-filter-count">
                {activeSelects.length} activos
              </span>
            ) : null}
          </summary>
          <div className="editorial-filter-grid">
            {selects.map((select) => (
              <label className="field" key={select.key}>
                <span>{select.label}</span>
                <select
                  className="ds-select"
                  value={select.value}
                  onChange={(event) =>
                    apply({ [select.key]: event.target.value })
                  }
                >
                  <option value="all">{select.allLabel ?? `Todos`}</option>
                  {select.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </details>
      ) : null}
      {activeSelects.length > 0 && !filtersOpen ? (
        <p className="editorial-active-filters">
          {activeSelects
            .map(
              (select) =>
                `${select.label}: ${select.options.find((option) => option.value === select.value)?.label ?? select.value}`,
            )
            .join(" · ")}
        </p>
      ) : null}
      {children}
      <div className="toolbar-actions">
        {active > 0 ? (
          <button
            type="button"
            className="ds-button ds-button-quiet"
            onClick={() =>
              apply(
                Object.fromEntries([
                  ...selects.map((select) => [select.key, ""]),
                  ["q", ""],
                ]),
              )
            }
          >
            Limpiar filtros ({active})
          </button>
        ) : null}
        {exportHref ? (
          <a className="ds-button" href={exportHref} download>
            <Download size={14} aria-hidden />
            {exportLabel}
          </a>
        ) : null}
      </div>
    </form>
  );
}
