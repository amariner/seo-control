import { BRAND_REPORT_VERSION, type BrandSlug, type BrandReport } from "@seo/contracts";
import { fromPlanSheet as sheetFor, generalCalendar, generalPlanRows } from "@seo/editorial-ui";
import { editorialTargetsOf } from "@seo/reports/generate";
import { resolveRepository } from "@seo/repository";
import { getEditorial, getLiveEditorial } from "./editorial";
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
const fromPlanSheet = (slug: BrandSlug) => sheetFor(getEditorial(), slug);

/** Piezas de la marca con la búsqueda objetivo que se cruzará con Google (compartido con el workbench, D-076). */
export function editorialTargets(slug: BrandSlug) {
  return editorialTargetsOf(getEditorial(), slug);
}

export type { EditorialPlanRow } from "@seo/editorial-ui";

/**
 * Plan de la pestaña Editorial de un proyecto (D-067, D-068): el plan general
 * vivo filtrado por la marca, con las mismas filas, calendario y temas.
 */
export async function projectEditorial(slug: BrandSlug) {
  const { dataset, pending } = await getLiveEditorial();
  return { pieces: generalPlanRows(dataset, slug, pending), calendar: generalCalendar(dataset, slug), themes: dataset.calendar.themes };
}

/** Procedencia del plan editorial que muestra la ficha de marca. */
export function editorialOrigin(slug: BrandSlug) {
  const dataset = getEditorial();
  const importedAt = dataset.report.importedAt.slice(0, 10);
  return fromPlanSheet(slug)
    ? { label: `hoja «Plan editorial» del equipo, importada el ${importedAt}`, sheet: true }
    : { label: `plan y backlog importados de V1 el ${importedAt}`, sheet: false };
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
