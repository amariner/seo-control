"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from "lucide-react";
import { compareReportValues, normalizeReportSearch } from "./data-table-model";
import "./data-table.css";

export type ReportDataColumn = {
  key: string;
  label: string;
  numeric?: boolean;
  sortable?: boolean;
};

export type ReportDataRow = {
  id: string;
  /** Keeps links to a specific record reachable after pagination. */
  anchorId?: string;
  /** Include the complete keyword and URL, even when the visible cell is shorter. */
  searchText: string;
  /** Raw values keep numeric sorting independent from formatted cell content. */
  values: Record<string, string | number | null>;
  cells?: Record<string, ReactNode>;
};

export type ReportDataTableProps = {
  id: string;
  caption: string;
  columns: ReportDataColumn[];
  rows: ReportDataRow[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  pageSize?: 10 | 25 | 50 | 100;
  note?: ReactNode;
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});
const numberFormat = new Intl.NumberFormat("es-ES", {
  useGrouping: "always" as unknown as boolean,
});
const pageSizes = [10, 25, 50, 100] as const;

/** The print event must commit the complete filtered table before the browser captures it. */
function usePrintTable(): boolean {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("print");
    const beforePrint = () => flushSync(() => setPrinting(true));
    const afterPrint = () => setPrinting(false);
    const mediaChanged = () => setPrinting(media.matches);
    mediaChanged();
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    media.addEventListener("change", mediaChanged);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      media.removeEventListener("change", mediaChanged);
    };
  }, []);
  return printing;
}

export function ReportDataTable({
  id,
  caption,
  columns,
  rows,
  searchPlaceholder = "Buscar keyword o URL…",
  showSearch = true,
  pageSize = 10,
  note,
}: ReportDataTableProps) {
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState<string | null>(null);
  const printing = usePrintTable();
  const normalizedQuery = normalizeReportSearch(query);
  const indexedRows = useMemo(
    () =>
      rows.map((row) => ({
        row,
        search: normalizeReportSearch(
          `${row.searchText} ${Object.values(row.values)
            .filter((value) => value !== null)
            .join(" ")}`,
        ),
      })),
    [rows],
  );
  const filteredRows = useMemo(
    () =>
      indexedRows
        .filter(
          (entry) => !normalizedQuery || entry.search.includes(normalizedQuery),
        )
        .map((entry) => entry.row),
    [indexedRows, normalizedQuery],
  );
  const tableColumns = useMemo<ColumnDef<typeof features, ReportDataRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        header: column.label,
        accessorFn: (row) => row.values[column.key] ?? undefined,
        cell: ({ row }) =>
          row.original.cells?.[column.key] ??
          row.original.values[column.key] ??
          "—",
        enableSorting: column.sortable !== false,
        sortDescFirst: Boolean(column.numeric),
        sortUndefined: "last",
        sortFn: (a, b, columnId) => {
          const left = a.getValue<string | number>(columnId);
          const right = b.getValue<string | number>(columnId);
          return compareReportValues(left ?? "", right ?? "");
        },
      })),
    [columns],
  );
  const table = useTable({
    features,
    columns: tableColumns,
    data: filteredRows,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    autoResetPageIndex: true,
    enableMultiSort: false,
  });
  const { pageIndex, pageSize: currentPageSize } = table.state.pagination;
  const visibleRows = printing
    ? table.getPrePaginatedRowModel().rows
    : table.getRowModel().rows;
  const total = filteredRows.length;
  const first = total ? pageIndex * currentPageSize + 1 : 0;
  const last = Math.min((pageIndex + 1) * currentPageSize, total);
  const pageCount = Math.max(1, table.getPageCount());
  const count = total
    ? `${numberFormat.format(first)}–${numberFormat.format(last)} de ${numberFormat.format(total)}`
    : "0 resultados";

  useEffect(() => {
    const followHash = () => {
      let hash: string;
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!hash || !rows.some((row) => row.anchorId === hash)) return;
      setQuery("");
      setAnchor(hash);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, [rows]);

  useEffect(() => {
    if (!anchor) return;
    const index = table
      .getPrePaginatedRowModel()
      .rows.findIndex((row) => row.original.anchorId === anchor);
    if (index < 0) return;
    const targetPage = Math.floor(index / currentPageSize);
    if (targetPage !== pageIndex) {
      table.setPageIndex(targetPage);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(anchor);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center" });
      setAnchor(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [anchor, table, pageIndex, currentPageSize, filteredRows]);

  function updateSearch(value: string) {
    setQuery(value);
    table.firstPage();
  }

  return (
    <div className="report-data" id={`${id}-panel`}>
      <div className="report-data-toolbar">
        {showSearch && (
          <div className="report-data-search">
            <label className="ds-sr-only" htmlFor={`${id}-search`}>
              Buscar en {caption}
            </label>
            <Search size={18} aria-hidden="true" />
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              aria-controls={`${id}-table`}
            />
            {query && (
              <button
                type="button"
                className="report-data-clear"
                aria-label={`Borrar búsqueda en ${caption}`}
                onClick={() => updateSearch("")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <label className="report-data-size" htmlFor={`${id}-size`}>
          Filas
          <select
            id={`${id}-size`}
            aria-label={`Filas por página en ${caption}`}
            value={currentPageSize}
            onChange={(event) =>
              table.setPagination({
                pageIndex: 0,
                pageSize: Number(event.target.value),
              })
            }
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="report-data-scroll"
        role="region"
        aria-label={`${caption}. Tabla desplazable`}
        tabIndex={0}
      >
        <table id={`${id}-table`} className="report-data-table">
          <caption className="ds-sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header, index) => {
                  const direction = header.column.getIsSorted();
                  const nextDirection = header.column.getNextSortingOrder();
                  const Icon =
                    direction === "asc"
                      ? ArrowUp
                      : direction === "desc"
                        ? ArrowDown
                        : ArrowUpDown;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={
                        columns[index]?.numeric
                          ? "report-data-numeric"
                          : undefined
                      }
                      aria-sort={
                        direction === "asc"
                          ? "ascending"
                          : direction === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="report-data-sort"
                          aria-label={`${columns[index]?.label}: ${nextDirection === "asc" ? "ordenar de menor a mayor" : nextDirection === "desc" ? "ordenar de mayor a menor" : "quitar orden"}`}
                          onClick={() => {
                            header.column.toggleSorting();
                            table.firstPage();
                          }}
                        >
                          <table.FlexRender header={header} />
                          <Icon size={14} aria-hidden="true" />
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.id}
                id={row.original.anchorId}
                tabIndex={row.original.anchorId ? -1 : undefined}
              >
                {row.getAllCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={
                      columns[index]?.numeric
                        ? "report-data-numeric"
                        : undefined
                    }
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
            {!total && (
              <tr>
                <td colSpan={columns.length} className="report-data-empty">
                  <strong>
                    {normalizedQuery
                      ? "No hay coincidencias"
                      : "Sin datos en este periodo"}
                  </strong>
                  <span>
                    {normalizedQuery
                      ? "Prueba otro término de búsqueda."
                      : "Los datos aparecerán cuando estén disponibles."}
                  </span>
                  {normalizedQuery && (
                    <button type="button" onClick={() => updateSearch("")}>
                      Borrar búsqueda
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="report-data-footer">
        <p
          className="report-data-count"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {count}
          {normalizedQuery && (
            <span> · {numberFormat.format(rows.length)} en total</span>
          )}
        </p>
        <nav
          className="report-data-pagination"
          aria-label={`Paginación de ${caption}`}
        >
          <button
            type="button"
            aria-label="Primera página"
            title="Primera página"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            <ChevronsLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Página anterior"
            title="Página anterior"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span aria-label={`Página ${pageIndex + 1} de ${pageCount}`}>
            {pageIndex + 1} / {pageCount}
          </span>
          <button
            type="button"
            aria-label="Página siguiente"
            title="Página siguiente"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Última página"
            title="Última página"
            disabled={!table.getCanLastPage()}
            onClick={() => table.lastPage()}
          >
            <ChevronsRight size={18} aria-hidden="true" />
          </button>
        </nav>
      </div>
      {note && <div className="report-data-note">{note}</div>}
      {printing && normalizedQuery && (
        <p className="report-data-print-filter">
          Búsqueda: {query} · {numberFormat.format(total)} de{" "}
          {numberFormat.format(rows.length)} filas
        </p>
      )}
    </div>
  );
}
