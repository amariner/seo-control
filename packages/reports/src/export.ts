import type { DeckSlide } from "./project-report";
import type { FrozenReportEntry } from "./archive";

/**
 * Exportación de un informe congelado (H11, D-081). El HTML y el CSV llevan
 * el mismo sello: quién lo exportó, cuándo, qué versión congelada es (fecha,
 * autor, contrato y huella del fichero) y que es confidencial. Las cifras son
 * las de las diapositivas ya curadas: lo que el equipo ocultó tampoco se
 * exporta.
 */

export const CONFIDENTIALITY = "Confidencial · Uso interno Porcelanosa Grupo";

export type ExportStamp = {
  actor: string;
  exportedAt: string;
  entry: Pick<
    FrozenReportEntry,
    | "id"
    | "brandName"
    | "period"
    | "cutoff"
    | "generatedAt"
    | "generatedBy"
    | "reportVersion"
    | "sha256"
  >;
};

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** `informe-seo-xtone-2026-Q2-cda52565`: la huella corta distingue dos versiones del mismo periodo. */
export const exportFilenameOf = (
  entry: Pick<FrozenReportEntry, "brand" | "period" | "sha256">,
  extension: "html" | "csv",
) =>
  `informe-seo-${slug(entry.brand)}-${entry.period.id}-${entry.sha256.slice(0, 8)}.${extension}`;

/** Líneas del sello, en el orden en que se leen. */
export function stampLines(stamp: ExportStamp): Array<[string, string]> {
  const { entry } = stamp;
  return [
    ["Confidencialidad", CONFIDENTIALITY],
    ["Informe", `${entry.brandName} · ${entry.period.label}`],
    ["Exportado por", stamp.actor],
    ["Exportado el", stamp.exportedAt],
    ["Versión congelada", `${entry.generatedAt} por ${entry.generatedBy}`],
    ["Corte del dato", entry.cutoff],
    ["Contrato del informe", entry.reportVersion],
    ["Huella SHA-256", entry.sha256],
  ];
}

export function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Una celda que empieza por = @ (o por + y - sin cifra detrás) se abre como
  // fórmula en las hojas de cálculo; «+12,3 %» sigue siendo una cifra.
  const formula = /^[=@\t\r]/.test(text) || /^[+\-](?![\d.,])/.test(text);
  const safe = formula ? `'${text}` : text;
  return /[",\r\n;]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * Filas del CSV: el sello, y por apartado sus cifras (con las dos
 * comparaciones) y cada tabla con su cabecera. Una fila por dato, para que se
 * pueda filtrar por apartado en una hoja de cálculo.
 */
export function deckCsvRows(
  slides: DeckSlide[],
  stamp: ExportStamp,
): string[][] {
  const rows: string[][] = stampLines(stamp).map(([label, value]) => [
    label,
    value,
  ]);
  rows.push([]);
  rows.push([
    "Apartado",
    "Tipo",
    "Tabla",
    "Dato",
    "Valor",
    "Frente al periodo anterior",
    "Frente al año anterior",
  ]);
  for (const slide of slides) {
    for (const metric of slide.metrics) {
      rows.push([
        slide.title,
        "cifra",
        "",
        metric.label,
        metric.value,
        metric.change?.text ?? "",
        metric.year?.text ?? "",
      ]);
    }
  }
  for (const slide of slides) {
    for (const list of slide.lists) {
      rows.push([]);
      rows.push([slide.title, "tabla", list.title, ...list.head]);
      if (!list.rows.length)
        rows.push([
          slide.title,
          "tabla",
          list.title,
          list.empty ?? "Sin filas",
        ]);
      for (const row of list.rows)
        rows.push([slide.title, "tabla", list.title, ...row]);
    }
  }
  return rows;
}

export const toCsv = (rows: string[][]) =>
  `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
