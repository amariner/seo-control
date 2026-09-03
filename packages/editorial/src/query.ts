import {
  EDITORIAL_STATUS_LABELS,
  EDITORIAL_TYPE_LABELS,
  MONTH_NAMES_ES,
  type EditorialBrandSlug,
  type EditorialCalendarEvent,
  type EditorialDataset,
  type EditorialPiece,
  type EditorialPieceType,
  type EditorialSlot,
  type EditorialStatus,
} from "@seo/contracts";

/**
 * Consultas puras sobre el dataset editorial: filtros compartibles por URL,
 * orden estable, rejilla mensual, agenda y exportación CSV equivalente a V1.
 * No dependen de Node ni del navegador, así que sirven al visor (servidor) y a
 * las pruebas por igual.
 */

export type PieceKind = "backlog" | "plan";

export type PieceFilters = {
  kind?: PieceKind | "all";
  brand?: EditorialBrandSlug | "all";
  market?: string | "all";
  status?: EditorialStatus | "all";
  type?: EditorialPieceType | "all";
  /** Mes 1-12 o "all". */
  month?: number | "all";
  theme?: string | "all";
  language?: string | "all";
  q?: string;
};

export type PieceSortKey = "status" | "type" | "brand" | "market" | "month" | "theme" | "keyword" | "title" | "publicationDate" | "writingDate";
export type SortDirection = "asc" | "desc";

export const PIECE_SORT_KEYS: PieceSortKey[] = ["status", "type", "brand", "market", "month", "theme", "keyword", "title", "publicationDate", "writingDate"];

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

const normalizeQuery = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();

export function pieceSearchText(piece: EditorialPiece) {
  return normalizeQuery([piece.title, piece.keyword, piece.theme, piece.subtheme, piece.brief?.text, piece.url, piece.brand.literal].filter(Boolean).join(" \n "));
}

export function parsePieceFilters(input: Record<string, string | string[] | undefined>): PieceFilters {
  const pick = (key: string) => {
    const value = input[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const monthValue = pick("month");
  const month = monthValue && monthValue !== "all" ? Number(monthValue) : "all";
  return {
    kind: (pick("kind") as PieceFilters["kind"]) || "all",
    brand: (pick("brand") as PieceFilters["brand"]) || "all",
    market: pick("market") || "all",
    status: (pick("status") as PieceFilters["status"]) || "all",
    type: (pick("type") as PieceFilters["type"]) || "all",
    month: typeof month === "number" && Number.isInteger(month) && month >= 1 && month <= 12 ? month : "all",
    theme: pick("theme") || "all",
    language: pick("language") || "all",
    q: pick("q")?.trim() || "",
  };
}

export function filterPieces(pieces: EditorialPiece[], filters: PieceFilters) {
  const query = filters.q ? normalizeQuery(filters.q) : "";
  return pieces.filter((piece) => {
    if (filters.kind && filters.kind !== "all" && piece.kind !== filters.kind) return false;
    if (filters.brand && filters.brand !== "all" && piece.brand.slug !== filters.brand) return false;
    if (filters.market && filters.market !== "all" && (piece.market ?? piece.marketLiteral) !== filters.market) return false;
    if (filters.status && filters.status !== "all" && piece.status !== filters.status) return false;
    if (filters.type && filters.type !== "all" && piece.type !== filters.type) return false;
    if (filters.month && filters.month !== "all" && piece.month.month !== filters.month) return false;
    if (filters.theme && filters.theme !== "all" && (piece.theme ?? "") !== filters.theme) return false;
    if (filters.language && filters.language !== "all" && piece.language !== filters.language) return false;
    if (query && !pieceSearchText(piece).includes(query)) return false;
    return true;
  });
}

function sortValue(piece: EditorialPiece, key: PieceSortKey): string | number {
  switch (key) {
    case "status":
      return EDITORIAL_STATUS_LABELS[piece.status];
    case "type":
      return EDITORIAL_TYPE_LABELS[piece.type];
    case "brand":
      return piece.brand.literal;
    case "market":
      return piece.market ?? piece.marketLiteral;
    case "month":
      return (piece.month.year ?? 9999) * 100 + (piece.month.month ?? 99);
    case "theme":
      return `${piece.theme ?? ""} ${piece.subtheme ?? ""}`.trim();
    case "keyword":
      return piece.keyword ?? "";
    case "title":
      return piece.title ?? "";
    case "publicationDate":
      return piece.publicationDate ?? "9999-99-99";
    case "writingDate":
      return piece.writingDate ?? "9999-99-99";
  }
}

/** Orden estable: la clave elegida y, como desempate, mes, marca, título e índice de origen. */
export function sortPieces(pieces: EditorialPiece[], key: PieceSortKey = "month", direction: SortDirection = "asc") {
  const sign = direction === "asc" ? 1 : -1;
  const compare = (a: string | number, b: string | number) => (typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b)));
  return [...pieces].sort((a, b) => {
    const primary = compare(sortValue(a, key), sortValue(b, key));
    if (primary !== 0) return primary * sign;
    return compare(sortValue(a, "month"), sortValue(b, "month")) || collator.compare(a.brand.literal, b.brand.literal) || collator.compare(a.title ?? "", b.title ?? "") || a.provenance.sourceIndex - b.provenance.sourceIndex;
  });
}

/**
 * Celda CSV compatible con V1: separador `;`, comillas solo cuando hacen falta.
 * Se añade una protección mínima contra fórmulas (`=`, `+`, `@`) que V1 no tenía;
 * el prefijo se documenta como diferencia deliberada de seguridad.
 */
export function csvCell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+@]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export const PIECE_CSV_COLUMNS: Array<[string, (piece: EditorialPiece) => string]> = [
  ["Estado", (piece) => piece.statusLiteral],
  ["Tipo", (piece) => piece.typeLiteral],
  ["Marca", (piece) => piece.brand.literal],
  ["País", (piece) => piece.marketLiteral],
  ["Mes", (piece) => piece.month.literal],
  ["Temática", (piece) => piece.theme ?? ""],
  ["Subtema", (piece) => piece.subtheme ?? ""],
  ["Keyword principal", (piece) => piece.keyword ?? ""],
  ["Título", (piece) => piece.title ?? ""],
  ["URL", (piece) => piece.url ?? ""],
  ["Notas", (piece) => piece.brief?.text ?? ""],
];

/** CSV con BOM UTF-8, separador `;` y las once columnas originales, en el orden recibido. */
export function piecesToCsv(pieces: EditorialPiece[]) {
  const lines = [PIECE_CSV_COLUMNS.map(([label]) => csvCell(label)).join(";")];
  for (const piece of pieces) lines.push(PIECE_CSV_COLUMNS.map(([, getter]) => csvCell(getter(piece))).join(";"));
  return `﻿${lines.join("\n")}`;
}

export type SlotFilters = { brand?: EditorialBrandSlug | "all"; market?: string | "all"; month?: number | "all"; theme?: string | "all"; q?: string };

export function filterSlots(slots: EditorialSlot[], filters: SlotFilters) {
  const query = filters.q ? normalizeQuery(filters.q) : "";
  return slots.filter((slot) => {
    if (filters.brand && filters.brand !== "all" && slot.brand.slug !== filters.brand) return false;
    if (filters.market && filters.market !== "all" && (slot.market ?? slot.marketLiteral) !== filters.market) return false;
    if (filters.month && filters.month !== "all" && slot.month.month !== filters.month) return false;
    if (filters.theme && filters.theme !== "all" && (slot.theme ?? "") !== filters.theme) return false;
    if (query) {
      const haystack = normalizeQuery([slot.slotLiteral, slot.theme, slot.brand.literal, ...slot.proposals.flatMap((proposal) => [proposal.keyword, proposal.subtheme, ...proposal.titles])].filter(Boolean).join(" "));
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortSlots(slots: EditorialSlot[]) {
  return [...slots].sort((a, b) => ((a.month.year ?? 9999) * 100 + (a.month.month ?? 99)) - ((b.month.year ?? 9999) * 100 + (b.month.month ?? 99)) || collator.compare(a.brand.literal, b.brand.literal) || collator.compare(a.slotLiteral, b.slotLiteral) || a.provenance.sourceIndex - b.provenance.sourceIndex);
}

/** El número de alternativas es dinámico: se exportan tantas columnas como propuestas tenga el hueco más largo. */
export function slotsToCsv(slots: EditorialSlot[]) {
  const maxProposals = slots.reduce((max, slot) => Math.max(max, slot.proposals.length), 0);
  const head = ["Mes", "Marca", "País", "Bloque temático", "Subtema"];
  for (let index = 1; index <= maxProposals; index += 1) head.push(`Tema ${index} Origen`, `Tema ${index} Tipo`, `Tema ${index} Título`, `Tema ${index} Keyword`, `Tema ${index} URL`, `Tema ${index} Ángulo`);
  const lines = [head.map(csvCell).join(";")];
  for (const slot of slots) {
    const row = [slot.month.literal, slot.brand.literal, slot.marketLiteral, slot.theme ?? "", slot.slotLiteral];
    for (let index = 0; index < maxProposals; index += 1) {
      const proposal = slot.proposals[index];
      if (proposal) row.push(proposal.format === "rework" ? "Reutilizar" : proposal.format === "nuevo" ? "Nuevo" : proposal.formatLiteral, proposal.typeLiteral, proposal.titles[0] ?? "", proposal.keyword ?? "", proposal.url ?? "", proposal.angle ?? "");
      else row.push("", "", "", "", "", "");
    }
    lines.push(row.map(csvCell).join(";"));
  }
  return `﻿${lines.join("\n")}`;
}

export type MonthCell = { date: string | null; day: number | null; weekday: number; events: EditorialCalendarEvent[] };

/** Rejilla de un mes con la semana iniciada en lunes y los eventos agrupados por día. */
export function buildMonthCells(year: number, month: number, events: EditorialCalendarEvent[]): MonthCell[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const byDay = new Map<number, EditorialCalendarEvent[]>();
  for (const event of events) {
    if (event.year !== year || event.month !== month) continue;
    const list = byDay.get(event.day) ?? [];
    list.push(event);
    byDay.set(event.day, list);
  }
  const cells: MonthCell[] = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push({ date: null, day: null, weekday: index, events: [] });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day, weekday: (firstWeekday + day - 1) % 7, events: (byDay.get(day) ?? []).sort((a, b) => collator.compare(a.brand.literal, b.brand.literal) || collator.compare(a.sequence ?? "", b.sequence ?? "")) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null, weekday: cells.length % 7, events: [] });
  return cells;
}

export type AgendaDay = { date: string; events: EditorialCalendarEvent[] };

/** Agenda cronológica (móvil): un bloque por día con evento. */
export function buildAgenda(events: EditorialCalendarEvent[]): AgendaDay[] {
  const byDate = new Map<string, EditorialCalendarEvent[]>();
  for (const event of [...events].sort((a, b) => a.date.localeCompare(b.date) || collator.compare(a.brand.literal, b.brand.literal))) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }
  return [...byDate.entries()].map(([date, list]) => ({ date, events: list }));
}

export type CalendarFilters = { brand?: EditorialBrandSlug | "all"; month?: number | "all"; year?: number | "all" };

export function filterEvents(events: EditorialCalendarEvent[], filters: CalendarFilters) {
  return events.filter((event) => {
    if (filters.brand && filters.brand !== "all" && event.brand.slug !== filters.brand) return false;
    if (filters.month && filters.month !== "all" && event.month !== filters.month) return false;
    if (filters.year && filters.year !== "all" && event.year !== filters.year) return false;
    return true;
  });
}

/** Meses presentes en el calendario, en orden cronológico, sin fijar el año en código. */
export function calendarMonths(dataset: EditorialDataset) {
  const keys = new Set<string>();
  for (const event of dataset.calendar.events) keys.add(`${event.year}-${String(event.month).padStart(2, "0")}`);
  for (const theme of dataset.calendar.themes) keys.add(`${theme.year}-${String(theme.month).padStart(2, "0")}`);
  return [...keys].sort().map((key) => {
    const [year, month] = key.split("-").map(Number) as [number, number];
    return { year, month, label: `${MONTH_NAMES_ES[month]} ${year}` };
  });
}

export function distinctValues<T>(items: T[], pick: (item: T) => string | null | undefined) {
  return [...new Set(items.map(pick).filter((value): value is string => Boolean(value)))].sort(collator.compare);
}
