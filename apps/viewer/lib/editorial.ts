import { EDITORIAL_BRANDS, type EditorialBrandSlug, type EditorialDataset, type EditorialLinkKind, type EditorialPiece } from "@seo/contracts";
import { getEffectiveEditorialDataset } from "@seo/editorial/dataset";
import { readCurationStore } from "@seo/editorial/curation-store";
import { PIECE_SORT_KEYS, backlinksFor, buildBacklinkIndex, calendarMonths, distinctValues, filterEvents, filterPieces, filterSlots, findPieceCuration, parsePieceFilters, sortPieces, sortSlots, type PieceFilters, type PieceSortKey, type SortDirection } from "@seo/editorial";

/**
 * Capa de acceso editorial del visor (solo lectura).
 * El dataset normalizado sustituye al JSON público de V1; en P3 la misma firma
 * apuntará a PostgreSQL sin cambiar rutas ni componentes. Ya incluye la
 * curación publicada desde el workbench (P1.4): el visor solo la lee.
 */

export type SearchInput = Record<string, string | string[] | undefined>;

const pick = (input: SearchInput, key: string) => {
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
};

export function getEditorial(): EditorialDataset {
  return getEffectiveEditorialDataset();
}

/** Colores de marca del calendario: neutros minerales; nunca verde, ámbar ni rojo. */
export const BRAND_COLORS: Record<EditorialBrandSlug, string> = {
  porcelanosa: "#101516",
  noken: "#4b5bd6",
  ecommerce: "#6b7f9e",
  butech: "#7c8683",
  "antic-colonial": "#8a6d5c",
  krion: "#9aa3a0",
  xtone: "#3d4a5c",
  gamadecor: "#a07c9a",
};

export function brandColor(slug: EditorialBrandSlug | null) {
  return slug ? BRAND_COLORS[slug] : "#b5bcb8";
}

export function brandName(slug: EditorialBrandSlug | null, literal: string) {
  return EDITORIAL_BRANDS.find((brand) => brand.slug === slug)?.name ?? literal;
}

export function brandCode(slug: EditorialBrandSlug | null, literal: string) {
  return EDITORIAL_BRANDS.find((brand) => brand.slug === slug)?.code ?? literal.slice(0, 4).toUpperCase();
}

/**
 * Código de dos letras para la rejilla anual, donde una celda de día mide ~40 px.
 * Evita truncar con puntos suspensivos; el nombre completo sigue en `title` y `aria-label`.
 */
const BRAND_SHORT_CODES: Record<EditorialBrandSlug, string> = {
  porcelanosa: "PO",
  noken: "NK",
  ecommerce: "EC",
  butech: "BU",
  "antic-colonial": "AC",
  krion: "KR",
  xtone: "XT",
  gamadecor: "GD",
};

export function brandShortCode(slug: EditorialBrandSlug | null, literal: string) {
  return slug ? BRAND_SHORT_CODES[slug] : literal.slice(0, 2).toUpperCase();
}

export function parseBrand(input: SearchInput): EditorialBrandSlug | "all" {
  const value = pick(input, "brand");
  return EDITORIAL_BRANDS.some((brand) => brand.slug === value) ? (value as EditorialBrandSlug) : "all";
}

export function parseSort(input: SearchInput): { sort: PieceSortKey; dir: SortDirection } {
  const sort = pick(input, "sort");
  const dir = pick(input, "dir");
  return { sort: PIECE_SORT_KEYS.includes(sort as PieceSortKey) ? (sort as PieceSortKey) : "month", dir: dir === "desc" ? "desc" : "asc" };
}

export function queryPieces(input: SearchInput) {
  const dataset = getEditorial();
  const filters: PieceFilters = { ...parsePieceFilters(input), brand: parseBrand(input) };
  const { sort, dir } = parseSort(input);
  const universe = filters.kind === "backlog" ? dataset.backlog : filters.kind === "plan" ? dataset.plan : [...dataset.backlog, ...dataset.plan];
  const items = sortPieces(filterPieces(universe, filters), sort, dir);
  return {
    dataset,
    filters,
    sort,
    dir,
    items,
    total: universe.length,
    options: {
      markets: distinctValues(universe, (piece) => piece.market ?? piece.marketLiteral),
      themes: distinctValues(universe, (piece) => piece.theme),
      statuses: distinctValues(universe, (piece) => piece.status),
      types: distinctValues(universe, (piece) => piece.type),
      months: [...new Set(universe.map((piece) => piece.month.month).filter((month): month is number => month !== null))].sort((a, b) => a - b),
    },
  };
}

export function findPiece(id: string | undefined): EditorialPiece | null {
  if (!id) return null;
  const dataset = getEditorial();
  return dataset.backlog.find((piece) => piece.id === id) ?? dataset.plan.find((piece) => piece.id === id) ?? null;
}

/** Solo lectura: expone versión/autor/nota de la curación para mostrar procedencia en el detalle. */
export function pieceCurationMeta(id: string) {
  return findPieceCuration(readCurationStore(), id);
}

export function findEvent(id: string | undefined) {
  if (!id) return null;
  return getEditorial().calendar.events.find((event) => event.id === id) ?? null;
}

export function querySlots(input: SearchInput) {
  const dataset = getEditorial();
  const monthValue = pick(input, "month");
  const month = monthValue && monthValue !== "all" ? Number(monthValue) : "all";
  const filters = { brand: parseBrand(input), market: pick(input, "market") || "all", month: typeof month === "number" && month >= 1 && month <= 12 ? month : ("all" as const), theme: pick(input, "theme") || "all", q: pick(input, "q")?.trim() || "" };
  const items = sortSlots(filterSlots(dataset.slots, filters));
  return { dataset, filters, items, total: dataset.slots.length, options: { themes: distinctValues(dataset.slots, (slot) => slot.theme), months: [...new Set(dataset.slots.map((slot) => slot.month.month).filter((value): value is number => value !== null))].sort((a, b) => a - b) } };
}

export function queryCalendar(input: SearchInput) {
  const dataset = getEditorial();
  const brand = parseBrand(input);
  const months = calendarMonths(dataset);
  const yearValue = Number(pick(input, "year"));
  const years = [...new Set(months.map((month) => month.year))];
  const year = years.includes(yearValue) ? yearValue : years[0] ?? dataset.planningYear;
  const monthValue = Number(pick(input, "month"));
  const monthsOfYear = months.filter((month) => month.year === year);
  const month = monthsOfYear.some((item) => item.month === monthValue) ? monthValue : null;
  const view = pick(input, "view") === "month" || month !== null ? "month" : "year";
  const focusMonth = month ?? monthsOfYear[0]?.month ?? 1;
  const events = filterEvents(dataset.calendar.events, { brand, year });
  return { dataset, brand, year, years, month: view === "month" ? focusMonth : null, view, months: monthsOfYear, events, themes: dataset.calendar.themes.filter((theme) => theme.year === year) };
}

/**
 * Piezas y huecos relacionados con un evento. Cuando el workbench ha curado
 * `event.pieceId` (P1.4), `linkedPiece` es la relación real y sustituye a la
 * heurística por marca y mes; las candidatas heurísticas se mantienen como
 * apoyo mientras el evento siga sin curar.
 */
export function relatedForEvent(event: NonNullable<ReturnType<typeof findEvent>>) {
  const dataset = getEditorial();
  const sameBrandMonth = (piece: EditorialPiece) => piece.brand.slug === event.brand.slug && piece.month.month === event.month && (piece.month.year ?? event.year) === event.year;
  return {
    linkedPiece: event.pieceId ? findPiece(event.pieceId) : null,
    backlog: dataset.backlog.filter(sameBrandMonth),
    plan: dataset.plan.filter(sameBrandMonth),
    slots: dataset.slots.filter((slot) => slot.brand.slug === event.brand.slug && slot.month.month === event.month),
    theme: dataset.calendar.themes.find((theme) => theme.year === event.year && theme.month === event.month) ?? null,
  };
}

/**
 * Vista recíproca de `links` (P1.4, D-015): piezas editoriales que referencian
 * una ficha de insight, acción, query, página, cluster o informe.
 *
 * Se deriva del dataset efectivo en cada petición, igual que el resto de la
 * lectura editorial: la pieza sigue siendo la propietaria del enlace y el visor
 * no escribe nada. El índice se reconstruye por llamada porque la curación
 * cambia en caliente; con 261 piezas el coste es irrelevante y evita servir una
 * relación obsoleta tras guardar en el workbench.
 */
export function editorialBacklinks(kind: EditorialLinkKind, id: string): EditorialPiece[] {
  return backlinksFor(buildBacklinkIndex(getEditorial()), kind, id);
}

/** Índice completo, para páginas que resuelven varias fichas en un mismo render. */
export function editorialBacklinkIndex() {
  return buildBacklinkIndex(getEditorial());
}

/** Construye un href conservando los parámetros actuales y aplicando cambios. */
export function hrefWith(base: string, current: SearchInput, changes: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params.set(key, single);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "" || value === "all") params.delete(key);
    else params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
