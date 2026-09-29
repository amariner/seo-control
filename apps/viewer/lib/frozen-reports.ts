import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCuratedReport,
  buildFrozenArchive,
  frozenEntries,
  reportIdOf,
  snapshotInput,
  type FrozenArchiveFilters,
} from "@seo/reports";
import {
  getPublishedReport,
  getPublishedReports,
  getPublishedSnapshot,
} from "@seo/reports/published";
import { BRAND_LOGOS } from "./brand-logos";

/**
 * Informes congelados en el visor (H11, D-081). Solo lectura: el índice lo
 * publica el workbench y llega con commit y despliegue. `/reports` lista estas
 * entradas; la presentación y la exportación abren la misma versión con las
 * mismas puntualizaciones, así que web, PDF, HTML y CSV enseñan las mismas
 * cifras.
 */
export function getFrozenArchive(filters: FrozenArchiveFilters) {
  return buildFrozenArchive(getPublishedReports(), filters);
}

export const frozenPresentationHref = (
  brand: string,
  periodId: string,
  pdf = false,
) => `/projects/${brand}/informe?periodo=${periodId}${pdf ? "&pdf=1" : ""}`;

export const frozenExportHref = (
  brand: string,
  periodId: string,
  format: "html" | "csv",
) => `/api/v1/reports/frozen/${brand}/${periodId}?format=${format}`;

/** Versión congelada con sus diapositivas ya curadas, o `null` si no existe o su fichero no cumple el contrato. */
export function loadFrozenReport(brand: string, periodId: string) {
  const id = reportIdOf(brand, periodId);
  const entry = frozenEntries(getPublishedReports()).find(
    (item) => item.id === id,
  );
  const snapshot = entry ? getPublishedSnapshot(brand, periodId) : null;
  if (!entry || !snapshot) return null;
  const slides = buildCuratedReport(
    snapshotInput(snapshot),
    getPublishedReport(id)?.curation,
  );
  return { entry, snapshot, slides };
}

/**
 * Ficheros de la app que la exportación incrusta (CSS y logotipos). En
 * desarrollo el directorio de trabajo es `apps/viewer`; en Vercel puede ser la
 * raíz del monorepo. Se declaran en `outputFileTracingIncludes`.
 */
function appFile(relative: string): string | null {
  const candidates = [
    resolve(process.cwd(), relative),
    resolve(process.cwd(), "apps/viewer", relative),
  ];
  const found = candidates.find((candidate) =>
    existsSync(/*turbopackIgnore: true*/ candidate),
  );
  return found ? readFileSync(/*turbopackIgnore: true*/ found, "utf8") : null;
}

export function exportStyles(): string {
  return [
    appFile("../../packages/ui/src/tokens.css"),
    appFile("components/report/project-deck.css"),
  ]
    .filter((css): css is string => css !== null)
    .join("\n");
}

/** Logotipo de la marca como `data:` para que el HTML no dependa del visor. */
export function inlineLogo(brand: string): string | undefined {
  const path = BRAND_LOGOS[brand];
  if (!path) return undefined;
  const svg = appFile(`public${path}`);
  return svg
    ? `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
    : undefined;
}
