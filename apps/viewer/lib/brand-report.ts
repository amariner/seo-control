import { BRAND_REPORT_VERSION, type BrandSlug, type BrandReport } from "@seo/contracts";
import { resolveRepository } from "@seo/repository";
import { getEditorial } from "./editorial";
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

/** Piezas del plan y del backlog de la marca, con la búsqueda objetivo que se cruzará con Google. */
export function editorialTargets(slug: BrandSlug) {
  const dataset = getEditorial();
  return [...dataset.plan, ...dataset.backlog]
    .filter((piece) => piece.brand.slug === slug)
    .map((piece) => ({
      id: piece.id,
      month: piece.month ? `${piece.month.year}-${String(piece.month.month).padStart(2, "0")}` : null,
      title: piece.title ?? piece.keyword ?? "Pieza sin título",
      type: piece.typeLiteral || piece.type,
      status: piece.statusLiteral || piece.status,
      keyword: piece.keyword,
    }));
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
    ["brand-report", BRAND_REPORT_VERSION, slug, filters.market, filters.range, filters.from ?? "", filters.to ?? "", filters.cmp ?? "", filters.cfrom ?? "", filters.yoy ?? "", editorial.map((item) => `${item.id}:${item.keyword}`).join("|")],
    () => repository.brandReport!(request),
    (report) => report.sources.every((source) => source.ok),
  );
}
