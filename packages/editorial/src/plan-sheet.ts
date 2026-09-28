import { MONTH_NAMES_ES, type EditorialBrandSlug } from "@seo/contracts";
import type { PlanSheetEvent, PlanSheetSnapshot, V1Row } from "./normalize";

/**
 * Conversión pura de la hoja «Plan editorial» (xlsx del equipo) a filas con las
 * mismas trece columnas del plan V1 (D-050). El lector de xlsx vive en el
 * script; aquí solo se interpretan cabeceras y valores de celda ya leídos.
 */

export const PLAN_SHEET_NAME = "Plan editorial";
export const CALENDAR_SHEET_PATTERN = /^calendario\s+(\d{4})$/i;

/** Cabecera de la hoja → campo V1. Se compara sin tildes ni mayúsculas. */
const HEADER_FIELDS: Array<[string, keyof V1Row]> = [
  ["estado", "estado"],
  ["fecha redaccion", "fechaRedaccion"],
  ["fecha publicacion", "fechaPublicacion"],
  ["tipo", "tipo"],
  ["marca", "marca"],
  ["pais", "pais"],
  ["mes", "mesEstimado"],
  ["tematica", "tematica"],
  ["subtema", "subtematica"],
  ["keyword principal", "keywordPrincipal"],
  ["titulo", "titulo"],
  ["url", "url"],
  ["notas", "notas"],
];

const fold = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();

const pad = (value: number) => String(value).padStart(2, "0");

/** Valor de celda → texto. Las fechas salen en ISO (UTC), las fórmulas por su resultado. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  if (typeof value === "object") {
    const cell = value as { result?: unknown; richText?: Array<{ text?: string }>; text?: unknown; hyperlink?: unknown };
    if (Array.isArray(cell.richText)) return cell.richText.map((part) => part.text ?? "").join("");
    if ("result" in cell) return cellText(cell.result);
    if (cell.text !== undefined) return cellText(cell.text);
    if (typeof cell.hyperlink === "string") return cell.hyperlink;
    return "";
  }
  return String(value);
}

/** La columna «Mes» llega como fecha de hoja de cálculo; el plan V1 usa «07 Julio». */
function monthLiteral(value: unknown) {
  if (value instanceof Date) {
    const month = value.getUTCMonth() + 1;
    return `${pad(month)} ${MONTH_NAMES_ES[month]}`;
  }
  return cellText(value).trim();
}

/** Localiza la fila de cabecera (la que empieza por «Estado») y mapea columnas. */
export function locateHeader(rows: unknown[][]) {
  const index = rows.findIndex((row) => fold(cellText(row[0])) === "estado");
  if (index < 0) throw new Error(`La hoja «${PLAN_SHEET_NAME}» no tiene una fila de cabecera que empiece por «Estado».`);
  const header = rows[index]!.map((cell) => fold(cellText(cell)));
  const columns = new Map<keyof V1Row, number>();
  for (const [label, field] of HEADER_FIELDS) {
    const column = header.findIndex((value) => value === label || value.startsWith(`${label} `));
    if (column >= 0) columns.set(field, column);
  }
  const missing = HEADER_FIELDS.filter(([, field]) => !columns.has(field)).map(([label]) => label);
  if (missing.length) throw new Error(`Faltan columnas en la hoja «${PLAN_SHEET_NAME}»: ${missing.join(", ")}.`);
  return { index, columns };
}

/** Filas de la hoja → filas V1. Descarta las completamente vacías. */
export function planSheetRows(rows: unknown[][]): V1Row[] {
  const { index, columns } = locateHeader(rows);
  const result: V1Row[] = [];
  for (const row of rows.slice(index + 1)) {
    const entry: V1Row = {};
    for (const [field, column] of columns) {
      entry[field] = field === "mesEstimado" ? monthLiteral(row[column]) : cellText(row[column]).trim();
    }
    if (Object.values(entry).some((value) => value !== "")) result.push(entry);
  }
  return result;
}

const isFormula = (value: unknown) => typeof value === "object" && value !== null && "formula" in value;
const isDayRow = (row: unknown[]) => row.length >= 7 && row.slice(0, 7).every((cell) => typeof cell === "number" && Number.isInteger(cell) && cell >= 1 && cell <= 31);

/** «POST XTONE», «NEWS KRION», «POST PORCE 1», «POST KRION (Pincha aquí)». */
const SLOT = /^(POST|NEWS)\s+(.+?)(?:\s+(\d+))?(?:\s*\(.*\))?[\s-]*$/i;

/**
 * Hoja «Calendario AAAA»: bloques por mes (nombre del mes en la columna A),
 * filas de siete números de día y, debajo, las celdas con los huecos
 * «POST/NEWS <marca>». Las celdas con fórmula son títulos de piezas con fecha
 * de publicación, que ya vienen de la hoja del plan, y se ignoran.
 */
export function planSheetCalendar(rows: unknown[][], year: number): PlanSheetEvent[] {
  const monthIndex = new Map(MONTH_NAMES_ES.map((name, index) => [fold(name), index] as const).filter(([, index]) => index > 0));
  const events: PlanSheetEvent[] = [];
  let month: number | null = null;
  let week: Array<{ year: number; month: number; day: number }> | null = null;
  let weekInMonth = 0;
  for (const row of rows) {
    const first = monthIndex.get(fold(cellText(row[0])));
    if (first) {
      month = first;
      week = null;
      weekInMonth = 0;
      continue;
    }
    if (!month) continue;
    if (isDayRow(row)) {
      const days = row.slice(0, 7) as number[];
      const max = Math.max(...days);
      week = days.map((day) => {
        // Primera semana: días altos del mes anterior. Últimas: días bajos del siguiente.
        const offset = weekInMonth === 0 && day > 7 ? -1 : weekInMonth > 0 && day < 8 && max > 20 ? 1 : 0;
        const date = new Date(Date.UTC(year, month! - 1 + offset, day));
        return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day };
      });
      weekInMonth += 1;
      continue;
    }
    if (!week) continue;
    row.slice(0, 7).forEach((cell, column) => {
      if (isFormula(cell)) return;
      const text = cellText(cell);
      for (const token of text.split(/\n|\s{2,}/).map((part) => part.trim()).filter(Boolean)) {
        const match = token.match(SLOT);
        if (!match) continue;
        const [, type, brand, num] = match;
        events.push({ ...week![column]!, type: type!.toUpperCase(), brand: brand!.trim(), num: num ?? null, label: token.replace(/\s+/g, " ") });
      }
    });
  }
  return events;
}

export function buildPlanSheetSnapshot(input: {
  fileName: string;
  sha256: string;
  rows: unknown[][];
  brands: EditorialBrandSlug[];
  calendar?: { sheet: string; year: number; rows: unknown[][] };
}): PlanSheetSnapshot {
  return {
    schemaVersion: "plan-sheet.v1",
    origin: { fileName: input.fileName, sha256: input.sha256, sheet: PLAN_SHEET_NAME, ...(input.calendar ? { calendarSheet: input.calendar.sheet } : {}) },
    brands: [...new Set(input.brands)].sort(),
    rows: planSheetRows(input.rows),
    calendar: input.calendar ? planSheetCalendar(input.calendar.rows, input.calendar.year) : [],
  };
}
