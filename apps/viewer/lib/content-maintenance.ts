import { CONTENT_SECTION_VERSION, PILOT_PROJECTS, editorialSectionOf, findBrand, isPilotProject, type BrandSlug } from "@seo/contracts";
import { csvCell } from "@seo/editorial";
import { generalPlanRows, type EditorialPlanRow } from "@seo/editorial-ui";
import { BOOST_REASONS, RETIRE_SIGNALS, maintenanceDigest, withoutRecentPlan, type BoostCandidate, type MaintenanceDigest, type RetireCandidate } from "@seo/reports/content-maintenance";
import { resolveRepository } from "@seo/repository";
import { getPublishedAudit } from "@seo/site-audit/published";
import { normalizeReportSearch } from "@seo/ui/data-table-model";
import { getLiveEditorial, parseBrand } from "./editorial";
import { cachedLive } from "./live-cache";

/**
 * «Mantenimiento» del plan editorial en el visor (D-095). La lectura de
 * Search Console de una sección editorial puede pasar de 2 MB (11.000 posts del
 * Trendbook), el tope de la caché de datos: se guarda el resumen con las dos
 * listas, no la lectura. El plan se descuenta fuera de la caché porque cambia
 * sin esperar al dato.
 */

/** Cambia con las reglas de `content-maintenance.ts`: invalida los resúmenes guardados. */
const DIGEST_VERSION = 2;

export type BrandMaintenance =
  | { brand: BrandSlug; status: "ok"; digest: MaintenanceDigest }
  | { brand: BrandSlug; status: "sin-origen" | "sin-seccion" | "error"; note: string };

export async function getBrandMaintenance(brand: BrandSlug, rows: readonly EditorialPlanRow[], today: string): Promise<BrandMaintenance> {
  const repository = resolveRepository();
  if (!repository.contentSection)
    return { brand, status: "sin-origen", note: "El origen de datos activo no lee Search Console: «Mantenimiento» necesita el origen real (GA4 y Search Console)." };
  if (!editorialSectionOf(brand)) return { brand, status: "sin-seccion", note: `${findBrand(brand)?.name ?? brand} no tiene sección editorial configurada.` };
  const audit = getPublishedAudit(brand);
  try {
    const digest = await cachedLive(
      ["content-maintenance", String(CONTENT_SECTION_VERSION), String(DIGEST_VERSION), brand, audit?.completedAt ?? "sin-crawl"],
      async () => {
        const section = await repository.contentSection!(brand);
        if (!section) throw new Error(`${brand} no tiene sección editorial`);
        return maintenanceDigest(section, audit);
      },
      (value) => value.sources.every((source) => source.ok),
    );
    return { brand, status: "ok", digest: { ...digest, retire: withoutRecentPlan(digest.retire, rows, today) } };
  } catch (error) {
    console.error("[mantenimiento]", brand, error);
    return { brand, status: "error", note: error instanceof Error ? error.message : String(error) };
  }
}

/** Resumen de una marca para la pestaña «Acciones» (D-088): `null` si no hay dato. */
export async function brandMaintenanceDigest(brand: BrandSlug, rows: readonly EditorialPlanRow[]) {
  const result = await getBrandMaintenance(brand, rows, new Date().toISOString().slice(0, 10));
  return result.status === "ok" ? result.digest : null;
}

/* -------------------------------------------------------------------------- */
/* Filas de las tablas y de su CSV: las mismas en pantalla y en el fichero      */
/* -------------------------------------------------------------------------- */

export type MaintenanceRow = { id: string; searchText: string; values: Record<string, string | number | null> };
const brandName = (slug: string) => findBrand(slug)?.name ?? slug;

export function boostRows(items: ReadonlyArray<{ brand: string; candidate: BoostCandidate }>): MaintenanceRow[] {
  return items.map(({ brand, candidate }) => ({
    id: `${brand}:${candidate.page}`,
    searchText: `${candidate.page} ${candidate.topQuery?.query ?? ""}`,
    values: {
      post: candidate.path,
      url: candidate.page,
      brand: brandName(brand),
      reason: BOOST_REASONS[candidate.reason].label,
      query: candidate.topQuery?.query ?? null,
      position: candidate.topQuery?.position ?? candidate.position,
      clicks: candidate.clicks,
      previousClicks: candidate.previousClicks,
      atStake: candidate.atStake,
      action: BOOST_REASONS[candidate.reason].action,
    },
  }));
}

export function retireRows(items: ReadonlyArray<{ brand: string; candidate: RetireCandidate }>): MaintenanceRow[] {
  return items.map(({ brand, candidate }) => ({
    id: `${brand}:${candidate.page}`,
    searchText: candidate.page,
    values: {
      post: candidate.path,
      url: candidate.page,
      brand: brandName(brand),
      signal: RETIRE_SIGNALS[candidate.signal].label,
      yearImpressions: candidate.yearImpressions,
      sitemap: candidate.sitemap,
      action: RETIRE_SIGNALS[candidate.signal].action,
    },
  }));
}

/** Columnas del CSV de cada lista, en orden. */
export const MAINTENANCE_CSV = {
  potenciar: [
    ["brand", "Marca"],
    ["url", "URL"],
    ["reason", "Motivo"],
    ["query", "Búsqueda principal"],
    ["position", "Posición"],
    ["clicks", "Clics 90 días"],
    ["previousClicks", "Clics 90 días anteriores"],
    ["atStake", "Clics en juego"],
    ["action", "Qué hacer"],
  ],
  retirar: [
    ["brand", "Marca"],
    ["url", "URL"],
    ["signal", "Señal"],
    ["yearImpressions", "Impresiones 12 meses"],
    ["sitemap", "Sitemap"],
    ["action", "Qué hacer"],
  ],
} as const;

const cell = (value: string | number | null | undefined) => csvCell(typeof value === "number" && !Number.isInteger(value) ? String(value).replace(".", ",") : value);

/**
 * CSV de una lista (`?brand=`, más la búsqueda `q` y los filtros `f.<clave>`
 * que añade la tabla): las mismas filas que se ven, con el corte de cada marca.
 * BOM UTF-8 y separador `;`, como el resto de exportaciones editoriales.
 */
export async function maintenanceCsv(list: keyof typeof MAINTENANCE_CSV, params: URLSearchParams): Promise<{ csv: string; rows: number }> {
  const brand = parseBrand(Object.fromEntries(params.entries()));
  const today = new Date().toISOString().slice(0, 10);
  const { dataset, pending } = await getLiveEditorial();
  const slugs: BrandSlug[] = brand === "all" ? PILOT_PROJECTS.map((item) => item.slug) : isPilotProject(brand) ? [brand as BrandSlug] : [];
  const results = await Promise.all(slugs.map((slug) => getBrandMaintenance(slug, generalPlanRows(dataset, slug, pending), today)));
  const cutoffs = new Map<string, string>();
  const rows: MaintenanceRow[] = [];
  for (const result of results) {
    if (result.status !== "ok") continue;
    cutoffs.set(brandName(result.brand), result.digest.cutoff);
    if (list === "potenciar") rows.push(...boostRows(result.digest.boost.map((candidate) => ({ brand: result.brand, candidate }))));
    else if (result.digest.retire.available) rows.push(...retireRows(result.digest.retire.candidates.map((candidate) => ({ brand: result.brand, candidate }))));
  }
  if (list === "potenciar") rows.sort((a, b) => Number(b.values.atStake) - Number(a.values.atStake));
  const query = normalizeReportSearch(params.get("q") ?? "");
  const filters = [...params.entries()].filter(([key]) => key.startsWith("f.")).map(([key, value]) => [key.slice(2), value] as const);
  const visible = rows.filter(
    (row) =>
      (!query || normalizeReportSearch(`${row.searchText} ${Object.values(row.values).filter((value) => value !== null).join(" ")}`).includes(query)) &&
      filters.every(([key, value]) => String(row.values[key] ?? "") === value),
  );
  const columns = MAINTENANCE_CSV[list];
  const lines = [[...columns.map(([, label]) => label), "Corte del dato"].map(cell).join(";")];
  for (const row of visible) lines.push([...columns.map(([key]) => cell(row.values[key])), cell(cutoffs.get(String(row.values.brand)) ?? "")].join(";"));
  return { csv: `\uFEFF${lines.join("\n")}`, rows: visible.length };
}
