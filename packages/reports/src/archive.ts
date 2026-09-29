import { BRAND_SLUGS, findBrand } from "@seo/contracts";
import { curationCount } from "./curate";
import {
  parsePeriod,
  type ReportPeriod,
  type ReportPeriodKind,
} from "./periods";
import { isStaleSnapshot, type PublishedReports } from "./schema";

/**
 * Archivo de informes congelados (H11, D-081). Lo que el visor enseña en
 * `/reports` sale de aquí y de nada más: el índice publicado por el workbench
 * (`data/published/reports.json`). Una entrada solo existe si hay versión
 * congelada; las puntualizaciones sin versión se aplican al informe en vivo
 * y no son archivo.
 */

export type FrozenReportEntry = {
  id: string;
  brand: string;
  brandName: string;
  period: ReportPeriod;
  cutoff: string;
  generatedAt: string;
  generatedBy: string;
  reportVersion: string;
  /** Congelado con otro contrato del informe de marca: las cifras valen, la maqueta puede cambiar. */
  stale: boolean;
  sha256: string;
  curation: {
    count: number;
    hiddenSlides: number;
    notes: number;
    actions: number;
    updatedAt: string;
    updatedBy: string;
  } | null;
};

export type FrozenArchiveFilters = {
  brand: string | "all";
  kind: ReportPeriodKind | "all";
  year: string | "all";
};

export type FrozenArchive = {
  entries: FrozenReportEntry[];
  /** Totales sin filtrar, para decir qué se está ocultando. */
  total: number;
  brands: string[];
  years: string[];
  updatedAt: string;
};

const brandOrder = (slug: string) => {
  const index = (BRAND_SLUGS as readonly string[]).indexOf(slug);
  return index === -1 ? BRAND_SLUGS.length : index;
};

export function frozenEntries(
  published: PublishedReports,
): FrozenReportEntry[] {
  const entries: FrozenReportEntry[] = [];
  for (const [id, item] of Object.entries(published.reports)) {
    const snapshot = item.snapshot;
    const [brand, periodId] = id.split(":");
    const period = periodId ? parsePeriod(periodId) : null;
    if (!snapshot || !brand || !period) continue;
    const curation = item.curation;
    entries.push({
      id,
      brand,
      brandName: findBrand(brand)?.name ?? brand,
      period,
      cutoff: snapshot.cutoff,
      generatedAt: snapshot.generatedAt,
      generatedBy: snapshot.generatedBy,
      reportVersion: snapshot.reportVersion,
      stale: isStaleSnapshot(snapshot),
      sha256: snapshot.sha256,
      curation: curation
        ? {
            count: curationCount(curation),
            hiddenSlides: Object.values(curation.slides).filter(
              (slide) => slide.hidden,
            ).length,
            notes: Object.values(curation.slides).filter((slide) => slide.note)
              .length,
            actions: curation.actions.length,
            updatedAt: curation.updatedAt,
            updatedBy: curation.updatedBy,
          }
        : null,
    });
  }
  // Del periodo más reciente al más antiguo; dentro del mismo, el orden canónico de marcas.
  return entries.sort(
    (a, b) =>
      b.period.end.localeCompare(a.period.end) ||
      a.period.kind.localeCompare(b.period.kind) ||
      brandOrder(a.brand) - brandOrder(b.brand),
  );
}

const pick = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Filtros desde la URL; un valor desconocido vuelve a «todos» sin romper el enlace. */
export function parseFrozenArchiveFilters(
  params: Record<string, string | string[] | undefined>,
): FrozenArchiveFilters {
  const brand = pick(params.marca);
  const kind = pick(params.periodo);
  const year = pick(params.anio);
  return {
    brand: brand && findBrand(brand) ? brand : "all",
    kind: kind === "quarter" || kind === "month" ? kind : "all",
    year: year && /^\d{4}$/.test(year) ? year : "all",
  };
}

export function buildFrozenArchive(
  published: PublishedReports,
  filters: FrozenArchiveFilters,
): FrozenArchive {
  const all = frozenEntries(published);
  const entries = all.filter(
    (entry) =>
      (filters.brand === "all" || entry.brand === filters.brand) &&
      (filters.kind === "all" || entry.period.kind === filters.kind) &&
      (filters.year === "all" || entry.period.start.startsWith(filters.year)),
  );
  return {
    entries,
    total: all.length,
    brands: [...new Set(all.map((entry) => entry.brand))].sort(
      (a, b) => brandOrder(a) - brandOrder(b),
    ),
    years: [...new Set(all.map((entry) => entry.period.start.slice(0, 4)))]
      .sort()
      .reverse(),
    updatedAt: published.updatedAt,
  };
}
