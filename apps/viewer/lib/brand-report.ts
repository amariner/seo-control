import { BRAND_REPORT_VERSION, EDITORIAL_BRANDS, EDITORIAL_STATUS_LABELS, EDITORIAL_TYPE_LABELS, type BrandSlug, type BrandReport, type EditorialBrandSlug, type EditorialPiece } from "@seo/contracts";
import { resolveRepository } from "@seo/repository";
import { brandColor, brandName, brandShortCode, getEditorial } from "./editorial";
import { cachedLive } from "./live-cache";

export type ReportSearch = Record<string, string | string[] | undefined>;

const pick = (input: ReportSearch, key: string) => {
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
};

/** Filtros del informe ejecutivo, todos en la URL para que el enlace sea compartible. */
export function reportFilters(input: ReportSearch) {
  const market = pick(input, "market");
  return {
    range: pick(input, "range") ?? "90d",
    from: pick(input, "from"),
    to: pick(input, "to"),
    cmp: pick(input, "cmp"),
    cfrom: pick(input, "cfrom"),
    yoy: pick(input, "yoy"),
    // Tier 1 o cualquier mercado adicional de la marca (D-039); el repositorio vuelve a «todos» si la marca no lo tiene.
    market: market && market !== "all" && /^[A-Z]{2,4}$/.test(market.toUpperCase()) ? market.toUpperCase() : "all",
    present: pick(input, "modo") === "presentacion",
  };
}

/** La marca toma su plan de la hoja «Plan editorial» del equipo (D-050). */
const fromPlanSheet = (slug: BrandSlug | EditorialBrandSlug) =>
  getEditorial().plan.some((piece) => piece.brand.slug === slug && piece.provenance.source === "plan-sheet");

/**
 * Piezas de la marca con la búsqueda objetivo que se cruzará con Google. Si la
 * marca tiene hoja de plan (D-050), la hoja es el plan completo; si no, plan y
 * backlog V1 como hasta ahora.
 */
export function editorialTargets(slug: BrandSlug) {
  const dataset = getEditorial();
  const sheet = fromPlanSheet(slug);
  return (sheet ? dataset.plan : [...dataset.plan, ...dataset.backlog])
    .filter((piece) => piece.brand.slug === slug)
    .map((piece) => ({
      id: piece.id,
      month: piece.month ? `${piece.month.year}-${String(piece.month.month).padStart(2, "0")}` : null,
      title: piece.title ?? piece.keyword ?? "Pieza sin título",
      type: piece.typeLiteral || piece.type,
      status: piece.statusLiteral || piece.status,
      keyword: piece.keyword,
      current: sheet,
    }));
}

/**
 * Filas del plan editorial de la ficha de marca con las trece columnas de la
 * hoja del equipo, en su orden (D-055). Estado, tipo y fechas ya incluyen la
 * curación del workbench.
 */
export type EditorialPlanRow = {
  id: string;
  status: string;
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
};

const planRow = (piece: EditorialPiece, general = false): EditorialPlanRow => ({
  id: piece.id,
  status: piece.status === "desconocido" ? piece.statusLiteral || EDITORIAL_STATUS_LABELS.desconocido : EDITORIAL_STATUS_LABELS[piece.status],
  writingDate: piece.writingDate,
  publicationDate: piece.publicationDate,
  type: piece.type === "otro" ? piece.typeLiteral || EDITORIAL_TYPE_LABELS.otro : EDITORIAL_TYPE_LABELS[piece.type],
  brand: piece.brand.literal,
  ...(general && piece.brand.slug ? { brandSlug: piece.brand.slug, brandColor: brandColor(piece.brand.slug) } : {}),
  market: piece.market ?? (piece.marketLiteral || null),
  month: piece.month.year && piece.month.month ? `${piece.month.year}-${String(piece.month.month).padStart(2, "0")}` : null,
  theme: piece.theme,
  subtheme: piece.subtheme,
  keyword: piece.keyword,
  title: piece.title,
  url: piece.url,
  brief: piece.brief?.text ?? null,
});

/** Piezas del plan de una marca: la hoja si la tiene (D-050); si no, plan y backlog V1. */
const brandPlan = (slug: BrandSlug | EditorialBrandSlug) => {
  const dataset = getEditorial();
  return (fromPlanSheet(slug) ? dataset.plan : [...dataset.plan, ...dataset.backlog]).filter((piece) => piece.brand.slug === slug);
};

export function editorialPlanRows(slug: BrandSlug): EditorialPlanRow[] {
  return brandPlan(slug).map((piece) => planRow(piece));
}

/**
 * Plan editorial general (D-057): las mismas filas de la ficha, de todas las
 * marcas o de una, con el color de cada marca para distinguirlas.
 */
export function generalPlanRows(brand: EditorialBrandSlug | "all"): EditorialPlanRow[] {
  return EDITORIAL_BRANDS.filter((item) => brand === "all" || item.slug === brand).flatMap((item) => brandPlan(item.slug).map((piece) => planRow(piece, true)));
}

/** Huecos de publicación de todas las marcas (o de una) con nombre, código y color. */
export function generalCalendar(brand: EditorialBrandSlug | "all") {
  const dataset = getEditorial();
  const events = dataset.calendar.events
    .filter((event) => event.brand.slug !== null && (brand === "all" || event.brand.slug === brand))
    .map((event) => ({
      date: event.date,
      type: event.typeLiteral.toUpperCase(),
      label: event.label,
      brand: brandName(event.brand.slug, event.brand.literal),
      code: brandShortCode(event.brand.slug, event.brand.literal),
      color: brandColor(event.brand.slug),
    }));
  const covered = EDITORIAL_BRANDS.filter((item) => brand === "all" || item.slug === brand);
  const sheet = covered.every((item) => !dataset.calendar.events.some((event) => event.brand.slug === item.slug) || dataset.calendar.events.some((event) => event.brand.slug === item.slug && event.provenance.source === "plan-sheet"));
  return { events, source: sheet ? "hoja «Calendario» del equipo" : "hoja «Calendario» del equipo y calendario V1" };
}

/** Procedencia del plan editorial que muestra la ficha de marca. */
export function editorialOrigin(slug: BrandSlug) {
  const dataset = getEditorial();
  const importedAt = dataset.report.importedAt.slice(0, 10);
  return fromPlanSheet(slug)
    ? { label: `hoja «Plan editorial» del equipo, importada el ${importedAt}`, sheet: true }
    : { label: `plan y backlog importados de V1 el ${importedAt}`, sheet: false };
}

/** Huecos de publicación de la marca en el calendario editorial (D-051). */
export function editorialCalendar(slug: BrandSlug) {
  const dataset = getEditorial();
  const events = dataset.calendar.events
    .filter((event) => event.brand.slug === slug)
    .map((event) => ({ date: event.date, type: event.typeLiteral.toUpperCase(), label: event.label }));
  const sheet = dataset.calendar.events.some((event) => event.brand.slug === slug && event.provenance.source === "plan-sheet");
  return { events, source: sheet ? "hoja «Calendario» del equipo" : "calendario importado de V1" };
}

/**
 * Informe ejecutivo de marca (D-037). `null` cuando el origen activo no lo
 * ofrece —el sintético no lo implementa a propósito—; la página lo explica.
 */
export async function getBrandReport(slug: BrandSlug, input: ReportSearch): Promise<BrandReport | null> {
  const repository = resolveRepository();
  if (!repository.brandReport) return null;
  const filters = reportFilters(input);
  const editorial = editorialTargets(slug);
  const request = { brand: slug, market: filters.market, range: { range: filters.range, from: filters.from, to: filters.to, cmp: filters.cmp, cfrom: filters.cfrom, yoy: filters.yoy }, editorial };
  return cachedLive(
    ["brand-report", BRAND_REPORT_VERSION, slug, filters.market, filters.range, filters.from ?? "", filters.to ?? "", filters.cmp ?? "", filters.cfrom ?? "", filters.yoy ?? "", editorial.map((item) => `${item.id}:${item.keyword}:${item.month ?? ""}${item.current ? ":c" : ""}`).join("|")],
    () => repository.brandReport!(request),
    (report) => report.sources.every((source) => source.ok),
  );
}
