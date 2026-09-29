import { EDITORIAL_BRANDS, EDITORIAL_STATUS_LABELS, EDITORIAL_TYPE_LABELS, type EditorialBrandSlug, type EditorialDataset, type EditorialMeasurement, type EditorialPiece, type EditorialStatus } from "@seo/contracts";
import { normalizeReportSearch } from "@seo/ui/data-table-model";
import { brandColor, brandName, brandShortCode } from "./brands";
import type { PublicationEvent } from "./publication-slider";

/** Cambio del visor aún no incorporado al workbench (D-067): quién y cuándo. */
export type PendingEdit = { actor: string; createdAt: string };
export type PendingEdits = ReadonlyMap<string, PendingEdit>;

/**
 * Filas del plan editorial con las trece columnas de la hoja del equipo, en su
 * orden (D-055). Estado, tipo y fechas ya incluyen la curación del workbench y,
 * en el visor, los cambios pendientes de sincronizar (D-067).
 */
export type EditorialPlanRow = {
  id: string;
  status: string;
  /** Estado normalizado, para el selector de edición (D-067). */
  statusKey: EditorialStatus;
  writingDate: string | null;
  publicationDate: string | null;
  type: string;
  brand: string;
  /** Solo en el plan general: marca normalizada y su color (D-057). */
  brandSlug?: EditorialBrandSlug;
  brandColor?: string;
  market: string | null;
  month: string | null;
  theme: string | null;
  subtheme: string | null;
  keyword: string | null;
  title: string | null;
  url: string | null;
  brief: string | null;
  /** Cambio hecho en el visor que el workbench aún no ha traído. */
  pending?: PendingEdit;
  /** Medición real de lo publicado (P3.5, D-079): ventanas de 28, 90 y 180 días. */
  measurements?: EditorialMeasurement[];
};

/** Tono del estado: publicado en positivo, en marcha en acento, el resto neutro. */
export const statusTone = (status: EditorialStatus) =>
  status === "publicado" ? "done" : status === "aceptado" || status === "redactando" || status === "revision" || status === "programado" ? "doing" : status === "desconocido" ? "none" : "todo";

/** Columnas de la hoja «Plan editorial» del equipo, en su orden (D-055). Tabla y Excel. */
export const EDITORIAL_COLUMNS = [
  { key: "status", label: "Estado" },
  { key: "writingDate", label: "Fecha redacción" },
  { key: "publicationDate", label: "Fecha publicación" },
  { key: "type", label: "Tipo" },
  { key: "brand", label: "Marca" },
  { key: "market", label: "País" },
  { key: "month", label: "Mes" },
  { key: "theme", label: "Temática" },
  { key: "subtheme", label: "Subtema" },
  { key: "keyword", label: "Keyword principal" },
  { key: "title", label: "Título" },
  { key: "url", label: "URL (si existe)" },
  { key: "brief", label: "Notas / Brief", sortable: false },
] as const satisfies ReadonlyArray<{ key: keyof EditorialPlanRow; label: string; sortable?: boolean }>;

export type PlanColumnKey = (typeof EDITORIAL_COLUMNS)[number]["key"];

/** Orden del plan: por mes y, dentro del mes, por fecha de publicación. */
export const sortPlanRows = (a: EditorialPlanRow, b: EditorialPlanRow) =>
  (a.month ?? "9999").localeCompare(b.month ?? "9999") || (a.publicationDate ?? "9999").localeCompare(b.publicationDate ?? "9999");

/** Búsqueda (`q`) y filtros exactos (`f.<columna>`) que la tabla añade al enlace de exportación. */
export function planExportFilters(params: URLSearchParams): { query: string; filters: Partial<Record<PlanColumnKey, string>> } {
  const keys = new Set<string>(EDITORIAL_COLUMNS.map((column) => column.key));
  const filters: Partial<Record<PlanColumnKey, string>> = {};
  for (const [name, value] of params) if (name.startsWith("f.") && keys.has(name.slice(2)) && value) filters[name.slice(2) as PlanColumnKey] = value;
  return { query: params.get("q")?.trim() ?? "", filters };
}

/** Mes como lo muestra la tabla: «jul 2026». */
export const planMonthLabel = (month: string | null) =>
  month ? new Date(`${month}-01T00:00:00Z`).toLocaleDateString("es-ES", { month: "short", year: "numeric", timeZone: "UTC" }) : "Sin mes";

/** Búsqueda y filtros en palabras, para la procedencia del Excel: «Estado: Backlog». */
export function describePlanFilters({ query, filters }: ReturnType<typeof planExportFilters>): string[] {
  const label = (key: string) => EDITORIAL_COLUMNS.find((column) => column.key === key)?.label ?? key;
  return [...(query ? [`Búsqueda: «${query}»`] : []), ...Object.entries(filters).map(([key, value]) => `${label(key)}: ${key === "month" ? planMonthLabel(value ?? null) : value}`)];
}

/**
 * Mismas reglas que la tabla (`@seo/ui/data-table`): búsqueda sin tildes ni
 * mayúsculas en todos los valores y filtros por coincidencia exacta.
 */
export function filterPlanRows(rows: EditorialPlanRow[], { query, filters }: ReturnType<typeof planExportFilters>): EditorialPlanRow[] {
  const needle = normalizeReportSearch(query);
  return rows
    .filter((row) => {
      if (needle && !normalizeReportSearch(EDITORIAL_COLUMNS.map((column) => row[column.key]).filter((value) => value !== null).join(" ")).includes(needle)) return false;
      return Object.entries(filters).every(([key, value]) => String(row[key as PlanColumnKey] ?? "") === value);
    })
    .sort(sortPlanRows);
}

const pad = (value: number) => String(value).padStart(2, "0");

/** La marca toma su plan de la hoja «Plan editorial» del equipo (D-050). */
export const fromPlanSheet = (dataset: EditorialDataset, slug: EditorialBrandSlug) =>
  dataset.plan.some((piece) => piece.brand.slug === slug && piece.provenance.source === "plan-sheet");

/** Piezas del plan de una marca: la hoja si la tiene (D-050); si no, plan y backlog V1. */
export const brandPlan = (dataset: EditorialDataset, slug: EditorialBrandSlug) =>
  (fromPlanSheet(dataset, slug) ? dataset.plan : [...dataset.plan, ...dataset.backlog]).filter((piece) => piece.brand.slug === slug);

export const planRow = (piece: EditorialPiece, general = false, pending?: PendingEdits): EditorialPlanRow => ({
  id: piece.id,
  status: piece.status === "desconocido" ? piece.statusLiteral || EDITORIAL_STATUS_LABELS.desconocido : EDITORIAL_STATUS_LABELS[piece.status],
  statusKey: piece.status,
  writingDate: piece.writingDate,
  publicationDate: piece.publicationDate,
  type: piece.type === "otro" ? piece.typeLiteral || EDITORIAL_TYPE_LABELS.otro : EDITORIAL_TYPE_LABELS[piece.type],
  brand: piece.brand.literal,
  ...(general && piece.brand.slug ? { brandSlug: piece.brand.slug, brandColor: brandColor(piece.brand.slug) } : {}),
  market: piece.market ?? (piece.marketLiteral || null),
  month: piece.month.year && piece.month.month ? `${piece.month.year}-${pad(piece.month.month)}` : null,
  theme: piece.theme,
  subtheme: piece.subtheme,
  keyword: piece.keyword,
  title: piece.title,
  url: piece.url,
  brief: piece.brief?.text ?? null,
  ...(pending?.get(piece.id) ? { pending: pending.get(piece.id) } : {}),
  // Solo la medición real (con procedencia); las ventanas vacías de V1 no se arrastran.
  ...(piece.measurements.some((item) => item.scope) ? { measurements: piece.measurements } : {}),
});

const brandsOf = (brand: EditorialBrandSlug | "all") => EDITORIAL_BRANDS.filter((item) => brand === "all" || item.slug === brand);

/**
 * Plan editorial general (D-057): las filas de todas las marcas o de una, con el
 * color de cada marca. La ficha de un proyecto es el mismo plan filtrado (D-067).
 */
export function generalPlanRows(dataset: EditorialDataset, brand: EditorialBrandSlug | "all", pending?: PendingEdits): EditorialPlanRow[] {
  return brandsOf(brand).flatMap((item) => brandPlan(dataset, item.slug).map((piece) => planRow(piece, true, pending)));
}

type Slot = PublicationEvent & { slug: EditorialBrandSlug };

/**
 * Una pieza con fecha de publicación entra en el calendario (D-067). Ocupa el
 * hueco «POST <marca>» de ese día si lo hay; si no, se añade como post.
 */
function withDatedPieces(slots: Slot[], pieces: EditorialPiece[]): PublicationEvent[] {
  const free = [...slots];
  const placed: PublicationEvent[] = [];
  for (const piece of pieces) {
    if (!piece.publicationDate || !piece.brand.slug) continue;
    const slug = piece.brand.slug;
    const index = free.findIndex((slot) => slot.slug === slug && slot.date === piece.publicationDate && slot.type === "POST");
    if (index >= 0) free.splice(index, 1);
    placed.push({
      date: piece.publicationDate,
      type: "POST",
      label: `POST ${brandName(slug, piece.brand.literal).toUpperCase()}`,
      title: piece.title ?? piece.keyword ?? "Pieza sin título",
      brand: brandName(slug, piece.brand.literal),
      code: brandShortCode(slug, piece.brand.literal),
      color: brandColor(slug),
    });
  }
  return [...free.map(({ slug: _slug, ...event }) => event), ...placed].sort((a, b) => a.date.localeCompare(b.date));
}

/** Huecos de publicación y piezas con fecha, de todas las marcas o de una, con nombre, código y color. */
export function generalCalendar(dataset: EditorialDataset, brand: EditorialBrandSlug | "all") {
  const slots: Slot[] = dataset.calendar.events.flatMap((event) =>
    event.brand.slug !== null && (brand === "all" || event.brand.slug === brand)
      ? [{ slug: event.brand.slug, date: event.date, type: event.typeLiteral.toUpperCase(), label: event.label, brand: brandName(event.brand.slug, event.brand.literal), code: brandShortCode(event.brand.slug, event.brand.literal), color: brandColor(event.brand.slug) }]
      : [],
  );
  const covered = brandsOf(brand);
  const pieces = covered.flatMap((item) => brandPlan(dataset, item.slug));
  const sheet = covered.every((item) => !dataset.calendar.events.some((event) => event.brand.slug === item.slug) || dataset.calendar.events.some((event) => event.brand.slug === item.slug && event.provenance.source === "plan-sheet"));
  return { events: withDatedPieces(slots, pieces), source: sheet ? "hoja «Calendario» del equipo y fechas del plan" : "hoja «Calendario» del equipo, calendario V1 y fechas del plan" };
}
