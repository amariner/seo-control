import { marketCodeSchema, periodKeySchema, projectSlugSchema, type DashboardFilters } from "@seo/contracts";
import { resolveRepository } from "@seo/repository";
import { cachedLive } from "./live-cache";

export type { DashboardFilters };

export function parseFilters(input: Record<string, string | string[] | undefined>): DashboardFilters {
  const projectValue = Array.isArray(input.project) ? input.project[0] : input.project;
  const marketValue = Array.isArray(input.market) ? input.market[0] : input.market;
  const periodValue = Array.isArray(input.period) ? input.period[0] : input.period;
  return {
    project: projectValue === "all" || !projectValue ? "all" : projectSlugSchema.catch("porcelanosa").parse(projectValue),
    market: marketValue === "all" || !marketValue ? "all" : marketCodeSchema.catch("ES").parse(marketValue),
    period: periodKeySchema.catch("28d").parse(periodValue),
  };
}

/**
 * Lectura de la portada a través del adapter de repositorio (P3.1). Ya no se
 * llama al conector sintético por su nombre: el origen lo elige
 * `resolveRepository` con `SEO_DATA_SOURCE`, así que P3.2 lo sustituye sin tocar
 * ni esta función ni las pantallas.
 */
export async function getDashboard(filters: DashboardFilters) {
  const repository = resolveRepository();
  if (repository.describe().mode !== "live") return repository.dashboard(filters);
  return cachedLive(
    ["dashboard", filters.project, filters.market, filters.period],
    () => repository.dashboard(filters),
    (payload) => payload.sources.every((source) => source.status === "correcto" || source.status === "no_configurado"),
  );
}

/**
 * Procedencia del origen activo. La interfaz muestra lo que declara el
 * repositorio en vez de un aviso escrito a mano, de modo que el día que el
 * origen cambie el aviso cambie con él (D-025 aplicado a la propia fuente).
 */
export function describeDataSource() {
  return resolveRepository().describe();
}

export function filterQuery(filters: DashboardFilters) {
  return new URLSearchParams(filters).toString();
}
