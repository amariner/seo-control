import ExcelJS from "exceljs";
import { EDITORIAL_COLUMNS, planMonthLabel, type EditorialPlanRow } from "./rows";

/** Anchos en caracteres, pensados para leer sin ajustar a mano. */
const WIDTHS: Record<(typeof EDITORIAL_COLUMNS)[number]["key"], number> = {
  status: 13,
  writingDate: 14,
  publicationDate: 16,
  type: 18,
  brand: 24,
  market: 7,
  month: 10,
  theme: 30,
  subtheme: 30,
  keyword: 32,
  title: 48,
  url: 48,
  brief: 80,
};

const asDate = (value: string | null) => (value ? new Date(`${value}T00:00:00Z`) : null);

/**
 * Excel del plan editorial (D-069) con las trece columnas de la hoja del equipo,
 * en su orden: fechas como fechas, URL como enlace, cabecera fija y autofiltro.
 * Una segunda hoja deja la procedencia: fuente, filtros y fecha de exportación.
 */
export async function planWorkbook(rows: EditorialPlanRow[], meta: { title: string; source: string; filters: string[]; exportedBy: string; exportedAt: Date }): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SEO Intelligence";
  workbook.created = meta.exportedAt;
  const sheet = workbook.addWorksheet("Plan editorial", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = EDITORIAL_COLUMNS.map((column) => ({ header: column.label, key: column.key, width: WIDTHS[column.key] }));
  for (const row of rows) {
    const added = sheet.addRow({
      ...row,
      writingDate: asDate(row.writingDate),
      publicationDate: asDate(row.publicationDate),
      month: planMonthLabel(row.month),
      url: row.url ? { text: row.url, hyperlink: row.url } : null,
    });
    added.alignment = { vertical: "top" };
  }
  for (const key of ["writingDate", "publicationDate"] as const) sheet.getColumn(key).numFmt = "dd/mm/yyyy";
  sheet.getColumn("brief").alignment = { vertical: "top", wrapText: true };
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F0EC" } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EDITORIAL_COLUMNS.length } };

  const about = workbook.addWorksheet("Procedencia");
  about.columns = [{ width: 22 }, { width: 90 }];
  about.addRows([
    ["Informe", meta.title],
    ["Fuente", meta.source],
    ["Filtros", meta.filters.length ? meta.filters.join(" · ") : "Ninguno"],
    ["Piezas", rows.length],
    ["Exportado", meta.exportedAt.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })],
    ["Exportado por", meta.exportedBy],
  ]);
  about.getColumn(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
