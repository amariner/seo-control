import { PILOT_PROJECTS, findBrand, marketCodeSchema, periodKeySchema, projectSlugSchema, type DashboardFilters, type DashboardPayload } from "@seo/contracts";
import { resolveRepository } from "@seo/repository";
import { getPublishedAudit } from "@seo/site-audit/published";
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
  const payload = await cachedLive(
    ["dashboard", filters.project, filters.market, filters.period],
    () => repository.dashboard(filters),
    (payload) => payload.sources.every((source) => source.status === "correcto" || source.status === "no_configurado"),
  );
  return withPublishedCrawls(payload, filters);
}

/**
 * La fila «Crawl» de las fuentes sale del repositorio de métricas, que no ve
 * los crawls: se publican desde el workbench como resumen empaquetado (D-070).
 * Con el origen real se rellena con lo publicado de las marcas del filtro, sin
 * firma (la publicación firmada llega con P5). Se aplica fuera de la caché: el
 * resumen publicado cambia con el despliegue, no con el corte del dato.
 */
export function withPublishedCrawls(payload: DashboardPayload, filters: DashboardFilters): DashboardPayload {
  const brands = PILOT_PROJECTS.filter((brand) => filters.project === "all" || brand.slug === filters.project);
  const audits = brands.flatMap((brand) => {
    const audit = getPublishedAudit(brand.slug);
    return audit ? [{ brand, audit }] : [];
  });
  if (!audits.length || !brands.length) return payload;
  const latest = audits.map((item) => item.audit.completedAt).sort().at(-1)!;
  const day = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
  return {
    ...payload,
    sources: payload.sources.map((source) =>
      source.source !== "crawl"
        ? source
        : {
            ...source,
            label: "Crawl publicado",
            status: audits.length === brands.length ? "correcto" : "parcial",
            lastValidSnapshot: latest,
            cutoff: latest.slice(0, 10),
            coverage: audits.length / brands.length,
            note: `Resumen del crawl local publicado sin firma (D-070): ${audits.map((item) => `${findBrand(item.brand.slug)?.name ?? item.brand.slug} (${day(item.audit.completedAt)})`).join(", ")}${audits.length < brands.length ? `; sin crawl: ${brands.filter((brand) => !audits.some((item) => item.brand.slug === brand.slug)).map((brand) => brand.name).join(", ")}` : ""}. La publicación firmada llega con P5.`,
          },
    ),
  };
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
