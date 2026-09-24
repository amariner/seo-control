import { parsePortfolioFilters, portfolioFilterQuery, togglePortfolioBrand, type BrandSlug, type PortfolioFilters } from "@seo/contracts";
import { brandEditorialActivity } from "@seo/editorial";
import { resolveRepository } from "@seo/repository";
import { getEditorial } from "./editorial";
import { cachedLive } from "./live-cache";

/**
 * Acceso de la visión transversal del grupo (P2.2), sustituta de `/` y
 * `/conjunto` de V1.
 *
 * Combina dos fuentes con cobertura muy distinta, y esa diferencia es
 * información que la pantalla muestra en vez de esconder:
 *
 * - **Analítica**: conector sintético del piloto (Porcelanosa + Noken) hasta que
 *   P3 conecte GA4/GSC. Las otras seis marcas llegan sin cifra y con motivo.
 * - **Editorial**: dataset real importado de V1, con las ocho marcas desde P1.
 *
 * La analítica se lee por el adapter de repositorio (P3.1) y la actividad
 * editorial se le pasa como contexto: son dos orígenes con calendarios
 * distintos, y el adapter no debe atar el calendario editorial —que ya
 * funciona— a la llegada de P3.
 */
export async function getPortfolio(filters: PortfolioFilters) {
  const dataset = getEditorial();
  const context = { editorial: brandEditorialActivity(dataset), planningYear: dataset.planningYear };
  const repository = resolveRepository();
  if (repository.describe().mode !== "live") return repository.portfolio(filters, context);
  // La actividad editorial entra en la clave: la curación cambia en caliente y no debe esperar a que caduque la analítica.
  return cachedLive(
    ["portfolio", filters.brands.join(","), filters.market, filters.period, filters.compare, JSON.stringify(context)],
    () => repository.portfolio(filters, context),
    (payload) => payload.brands.every((brand) => !brand.pilot || brand.analytics?.coverage.quality === "completa"),
  );
}

export function portfolioFiltersFromUrl(request: Request): PortfolioFilters {
  return parsePortfolioFilters(Object.fromEntries(new URL(request.url).searchParams));
}

/** Enlace profundo a la propia vista con un cambio de filtro. Todo el estado va en la URL. */
export function portfolioHref(filters: PortfolioFilters, changes: Partial<PortfolioFilters> = {}) {
  const query = portfolioFilterQuery({ ...filters, ...changes });
  return query ? `/portfolio?${query}` : "/portfolio";
}

/** Enlace que añade o quita una marca de la selección, conservando el resto del estado. */
export function brandToggleHref(filters: PortfolioFilters, slug: BrandSlug) {
  return portfolioHref(togglePortfolioBrand(filters, slug));
}
