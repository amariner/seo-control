"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { Check, Copy, X } from "lucide-react";
import {
  DUPLICATE_FORMS,
  type DuplicateCell,
  type PageDuplicate,
  type PageTrend,
} from "@/lib/page-analysis";
import { REPORT_DATA_FILTER_EVENT } from "./data-table";

/**
 * Acciones de las tarjetas de la pestaña Páginas (D-072): las cifras de «Ganan
 * y pierden» filtran la tabla de páginas y «URLs duplicadas» abre el brief.
 */

const format = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    useGrouping: "always" as unknown as boolean,
  }).format(value);

export function TrendFilterButton({
  table,
  trend,
  label,
  className,
  children,
}: {
  table: string;
  trend: PageTrend;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`brand-page-trend ${className ?? ""}`}
      aria-label={label}
      title={label}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent(REPORT_DATA_FILTER_EVENT, {
            detail: { id: table, filters: { trend } },
          }),
        )
      }
    >
      {children}
    </button>
  );
}

/** Ruta legible: sin dominio y con los parámetros decodificados («?color[0]=GRIS»). */
const pathOf = (url: string) => {
  let path = url;
  try {
    const parsed = new URL(url);
    path = `${parsed.pathname}${parsed.search}`;
  } catch {}
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};
const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Celda del cruce: clics y, si hay varias URLs de esa forma, cuántas. */
const cellText = (cell: DuplicateCell | undefined) =>
  cell
    ? `${format(cell.clicks)} clics${cell.urls > 1 ? ` · ${format(cell.urls)} URLs` : ""}`
    : "—";

const HEAD = [
  "Ruta",
  ...DUPLICATE_FORMS.map((form) => form.label),
  "Clics repartidos",
  "Acción",
];

function briefRows(duplicates: PageDuplicate[]) {
  return duplicates.map((item) => [
    pathOf(item.path),
    ...DUPLICATE_FORMS.map((form) => {
      const text = cellText(item.cells[form.key]);
      return item.mainForm === form.key ? `${text} (principal)` : text;
    }),
    format(item.scattered),
    item.action,
  ]);
}

export function DuplicatesDialog({
  duplicates,
  context,
  children,
}: {
  duplicates: PageDuplicate[];
  /** Marca, periodo y fuente: encabezan el brief copiado. */
  context: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const rows = briefRows(duplicates);
  const scattered = duplicates.reduce((sum, item) => sum + item.scattered, 0);
  const title = "Brief · URLs duplicadas en Google";
  const summary = `${format(duplicates.length)} rutas aparecen en más de una URL; las formas secundarias reciben ${format(scattered)} clics que deberían sumar a la principal.`;
  const note =
    "Cada fila cruza una ruta con las formas en que Google la muestra. Principal = la forma de la URL con más clics en Search Console; antes de redirigir, confirmar el canonical declarado en «Estado del sitio».";

  async function copy() {
    const tsv = [
      title,
      context,
      summary,
      "",
      HEAD.join("\t"),
      ...rows.map((row) => row.join("\t")),
      "",
      note,
    ].join("\n");
    const html = `<p><strong>${escape(title)}</strong><br>${escape(context)}</p><p>${escape(summary)}</p><table border="1" cellpadding="4" cellspacing="0"><thead><tr>${HEAD.map((cell) => `<th>${escape(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table><p><em>${escape(note)}</em></p>`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([tsv], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(tsv);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="brand-page-trend brand-page-dup-trigger"
          aria-label="Ver el brief de las URLs duplicadas"
          title="Ver el brief de las URLs duplicadas"
        >
          {children}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="brand-dialog-overlay" />
        <Dialog.Content className="brand-dialog">
          <header className="brand-dialog-head">
            <div>
              <Dialog.Title className="brand-dialog-title">
                {title}
              </Dialog.Title>
              <p className="brand-dialog-meta">{context}</p>
            </div>
            <div className="brand-dialog-actions">
              <button
                type="button"
                className="ds-button ds-button-primary ds-button-compact"
                onClick={copy}
              >
                {copied ? (
                  <Check size={15} aria-hidden />
                ) : (
                  <Copy size={15} aria-hidden />
                )}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <Dialog.Close className="brand-dialog-close" aria-label="Cerrar">
                <X size={18} aria-hidden />
              </Dialog.Close>
            </div>
          </header>
          <Dialog.Description className="brand-dialog-summary">
            {summary}
          </Dialog.Description>
          <div className="brand-dialog-table">
            <table>
              <thead>
                <tr>
                  <th>Ruta</th>
                  {DUPLICATE_FORMS.map((form) => (
                    <th key={form.key} className="is-numeric">
                      {form.label}
                    </th>
                  ))}
                  <th className="is-numeric">Repartidos</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((item) => (
                  <tr key={item.path}>
                    <td className="brand-dialog-url">
                      <strong>{pathOf(item.path)}</strong>
                    </td>
                    {DUPLICATE_FORMS.map((form) => {
                      const cell = item.cells[form.key];
                      const main = item.mainForm === form.key;
                      return (
                        <td
                          key={form.key}
                          className={`is-numeric brand-dialog-cell${main ? " is-main" : ""}${cell ? "" : " is-empty"}`}
                          title={cell ? pathOf(cell.sample) : undefined}
                        >
                          {cell ? (
                            <>
                              {format(cell.clicks)}
                              {cell.urls > 1 ? (
                                <small>{format(cell.urls)} URLs</small>
                              ) : null}
                              {main ? <small>Principal</small> : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                    <td className="is-numeric">
                      <strong>{format(item.scattered)}</strong>
                    </td>
                    <td>{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="brand-dialog-note">{note}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
