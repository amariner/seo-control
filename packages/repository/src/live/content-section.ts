import { isSectionPost, postKey, sectionPageRegex, type BrandSlug, type ContentSectionPage, type ContentSectionReport, type EditorialSection } from "@seo/contracts";
import { gscQuery, type Env, type GscFilter, type GscRequest, type GscRow } from "./google";
import { ctrCurve, potential } from "./opportunities";
import type { ResolvedLiveBrand } from "./brands";

/**
 * Sección editorial de una marca en Search Console (D-095): la lectura que usa
 * «Mantenimiento» del plan editorial para proponer qué potenciar y qué retirar.
 *
 * Cuatro consultas filtradas por la carpeta de la sección (`/blog/`,
 * `/trendbook/`), no la muestra de 5.000 páginas del informe de marca: en
 * Porcelanosa y Noken esa muestra se llena antes de llegar a los posts con poco
 * tráfico, y un post que falta en ella no es un post sin tráfico.
 *
 * - 12 meses por página: lo que dice si un post vive o está muerto.
 * - 90 días y los 90 anteriores por página: lo que pierde clics.
 * - 90 días por búsqueda sin marca y página: posición, búsqueda principal y
 *   clics potenciales frente a la curva de CTR del propio sitio (D-036).
 *
 * Una ventana que no responde deja sus cifras en nulo, nunca en cero.
 */

const DAY = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => iso(Date.parse(`${date}T00:00:00Z`) + days * DAY);
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Filas por petición de la API de Search Console. */
const PAGE_SIZE = 25_000;
/** Tope de filas por página y ventana: de sobra para un blog. */
export const SECTION_PAGE_ROWS = 100_000;
/** Tope de filas búsqueda × página: la cola sin impresiones apenas mueve el potencial. */
export const SECTION_QUERY_ROWS = 25_000;

export function sectionWindows(cutoff: string): ContentSectionReport["windows"] {
  return {
    year: { start: addDays(cutoff, -364), end: cutoff },
    recent: { start: addDays(cutoff, -89), end: cutoff },
    previous: { start: addDays(cutoff, -179), end: addDays(cutoff, -90) },
  };
}

type Sample = { ok: true; rows: GscRow[]; limitReached: boolean } | { ok: false; error: string };

async function sample(query: (request: GscRequest) => Promise<GscRow[]>, request: GscRequest, limit: number): Promise<Sample> {
  try {
    const rows: GscRow[] = [];
    for (let startRow = 0; startRow < limit; startRow += PAGE_SIZE) {
      const page = await query({ ...request, rowLimit: Math.min(PAGE_SIZE, limit - startRow), startRow });
      rows.push(...page);
      if (page.length < PAGE_SIZE) return { ok: true, rows, limitReached: false };
    }
    return { ok: true, rows, limitReached: rows.length >= limit };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function fetchContentSection(env: Env, brand: ResolvedLiveBrand, section: EditorialSection, cutoff: string): Promise<ContentSectionReport> {
  const windows = sectionWindows(cutoff);
  const generatedAt = new Date().toISOString();
  if (!brand.siteUrl) {
    const failed: Sample = { ok: false, error: "sin sitio de Search Console configurado" };
    return buildContentSection({ brand: brand.slug, section, cutoff, windows, generatedAt, migrations: migrationsOf(brand, windows), year: failed, recent: failed, previous: failed, queries: failed });
  }
  const query = (request: GscRequest) => gscQuery(env, brand.siteUrl!, request);
  const inSection: GscFilter = { dimension: "page", operator: "includingRegex", expression: sectionPageRegex(section) };
  const nonBrand: GscFilter = { dimension: "query", operator: "excludingRegex", expression: `(?i)(${brand.brandRegex})` };
  const byPage = (window: { start: string; end: string }) => sample(query, { startDate: window.start, endDate: window.end, dimensions: ["page"], filters: [inSection] }, SECTION_PAGE_ROWS);
  const [year, recent, previous, queries] = await Promise.all([
    byPage(windows.year),
    byPage(windows.recent),
    byPage(windows.previous),
    sample(query, { startDate: windows.recent.start, endDate: windows.recent.end, dimensions: ["query", "page"], filters: [inSection, nonBrand] }, SECTION_QUERY_ROWS),
  ]);
  return buildContentSection({ brand: brand.slug, section, cutoff, windows, generatedAt, migrations: migrationsOf(brand, windows), excludeQueries: brand.opportunityExcludeRegex, year, recent, previous, queries });
}

/** Migraciones configuradas de la marca dentro de los 12 meses de la lectura. */
const migrationsOf = (brand: ResolvedLiveBrand, windows: ContentSectionReport["windows"]) =>
  (brand.annotations ?? []).filter((item) => item.type === "migracion" && item.date >= windows.year.start && item.date <= windows.year.end).map((item) => ({ date: item.date, label: item.label }));

type Totals = { clicks: number; impressions: number; weighted: number };
type Entry = { page: string; year?: Totals; recent?: Totals; previous?: Totals; queries: Array<{ query: string; clicks: number; impressions: number; position: number }> };

const add = (totals: Totals | undefined, row: GscRow): Totals => ({
  clicks: (totals?.clicks ?? 0) + row.clicks,
  impressions: (totals?.impressions ?? 0) + row.impressions,
  weighted: (totals?.weighted ?? 0) + row.position * row.impressions,
});

/** Agregado por post de las cuatro consultas. Separado de la red para probarlo con filas fijas. */
export function buildContentSection(input: {
  brand: BrandSlug;
  section: EditorialSection;
  cutoff: string;
  windows: ContentSectionReport["windows"];
  generatedAt: string;
  migrations?: ContentSectionReport["migrations"];
  /** Búsquedas que no cuentan como oportunidad (`opportunityExcludeRegex` de la marca, D-036). */
  excludeQueries?: string;
  year: Sample;
  recent: Sample;
  previous: Sample;
  queries: Sample;
}): ContentSectionReport {
  const { section } = input;
  const entries = new Map<string, Entry>();
  const entryOf = (url: string | undefined): Entry | null => {
    if (!url || !isSectionPost(url, section)) return null;
    const key = postKey(url);
    if (!key) return null;
    const entry = entries.get(key) ?? { page: url, queries: [] };
    // La forma limpia (sin parámetros) es la que se enseña.
    if (entry.page.includes("?") && !url.includes("?")) entry.page = url;
    entries.set(key, entry);
    return entry;
  };
  for (const window of ["year", "recent", "previous"] as const) {
    const result = input[window];
    if (!result.ok) continue;
    for (const row of result.rows) {
      const entry = entryOf(row.keys?.[0]);
      if (entry) entry[window] = add(entry[window], row);
    }
  }
  const excluded = input.excludeQueries ? new RegExp(input.excludeQueries, "i") : null;
  const queryRows = input.queries.ok ? input.queries.rows.filter((row) => !(excluded && excluded.test(row.keys?.[0] ?? ""))) : [];
  const curve = ctrCurve(queryRows);
  for (const row of queryRows) {
    const [query, page] = row.keys ?? [];
    const entry = query ? entryOf(page) : null;
    if (entry) entry.queries.push({ query: query!, clicks: row.clicks, impressions: row.impressions, position: row.position });
  }

  const value = (ok: boolean, totals: Totals | undefined, field: "clicks" | "impressions") => (ok ? (totals?.[field] ?? 0) : null);
  const pages: ContentSectionPage[] = [...entries.values()].map((entry) => {
    const top = entry.queries.reduce<Entry["queries"][number] | null>((best, item) => (!best || item.impressions > best.impressions ? item : best), null);
    return {
      page: entry.page,
      clicks: value(input.recent.ok, entry.recent, "clicks"),
      impressions: value(input.recent.ok, entry.recent, "impressions"),
      position: entry.recent?.impressions ? round1(entry.recent.weighted / entry.recent.impressions) : null,
      previousClicks: value(input.previous.ok, entry.previous, "clicks"),
      previousImpressions: value(input.previous.ok, entry.previous, "impressions"),
      yearClicks: value(input.year.ok, entry.year, "clicks"),
      yearImpressions: value(input.year.ok, entry.year, "impressions"),
      topQuery: top ? { query: top.query, clicks: top.clicks, impressions: top.impressions, position: round1(top.position) } : null,
      potentialClicks: entry.queries.reduce((sum, item) => sum + potential(item.impressions, item.clicks, item.position, curve), 0),
    };
  });
  pages.sort((a, b) => (b.yearClicks ?? 0) - (a.yearClicks ?? 0) || (b.yearImpressions ?? 0) - (a.yearImpressions ?? 0) || a.page.localeCompare(b.page));

  const coverage = (result: Sample) => (result.ok ? { available: true, rows: result.rows.length, limitReached: result.limitReached } : { available: false, rows: 0, limitReached: false });
  const failed = (["year", "recent", "previous", "queries"] as const).filter((window) => !input[window].ok);
  const LABEL = { year: "12 meses", recent: "últimos 90 días", previous: "90 días anteriores", queries: "búsquedas de los últimos 90 días" } as const;
  return {
    generatedAt: input.generatedAt,
    brand: input.brand,
    section: { label: section.label, segment: section.segment },
    cutoff: input.cutoff,
    windows: input.windows,
    pages,
    coverage: { year: coverage(input.year), recent: coverage(input.recent), previous: coverage(input.previous), queries: coverage(input.queries) },
    migrations: input.migrations ?? [],
    sources: [
      {
        source: "gsc",
        ok: failed.length === 0,
        note: failed.length
          ? `Search Console no ha respondido en ${failed.map((window) => LABEL[window]).join(", ")}: ${failed.map((window) => (input[window] as { error: string }).error).filter((item, index, all) => all.indexOf(item) === index).join("; ")}`
          : `${pages.length} posts de ${section.label} con impresiones en los últimos 12 meses.`,
      },
    ],
  };
}
