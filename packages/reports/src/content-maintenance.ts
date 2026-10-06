import { isSectionPost, postKey, type ContentSectionPage, type ContentSectionReport, type EditorialPieceType, type SiteAuditSummary } from "@seo/contracts";
import type { EditorialPlanRow } from "@seo/editorial-ui";
import { pieceResult } from "./action-journey";
import { pathOf } from "./format";

/**
 * «Mantenimiento» del plan editorial (D-095): qué se ha publicado o
 * actualizado, qué posts potenciar y cuáles son candidatos a retirar.
 *
 * - Últimos cambios: las piezas publicadas del plan, nuevas o actualizaciones,
 *   con su medición de 28, 90 y 180 días (D-079). Ocho marcas.
 * - Potenciar: posts de la sección editorial (`/blog/`, `/trendbook/`) que
 *   pierden clics o tienen clics en juego por su posición, con la curva de CTR
 *   del propio sitio. Search Console; solo el piloto.
 * - Retirar: posts que declaran los sitemaps del crawl publicado sin clics en
 *   12 meses. Sin crawl no hay lista: Search Console solo ve lo que Google
 *   muestra, y un post sin impresiones no aparece en él.
 *
 * Reglas y umbrales de este fichero, nunca IA; la decisión es del equipo.
 */

export const MAINTENANCE_THRESHOLDS = {
  /** Retirar: sin clics y con menos de estas impresiones en 12 meses. */
  retireMaxImpressions: 100,
  /** Potenciar: clics potenciales en 90 días frente a la curva de CTR del sitio. */
  boostMinPotential: 20,
  /** Pierde clics: al menos estos clics en los 90 días anteriores… */
  decayMinPrevious: 30,
  /** …y una caída de al menos este porcentaje. */
  decayDropPct: 30,
  /** Acciones (D-088): posts mínimos para proponer cada regla. */
  boostRulePosts: 3,
  retireRulePosts: 10,
  /** Un post publicado en el plan hace menos de estos días no es candidato a retirar. */
  planRecentDays: 365,
} as const;

/* -------------------------------------------------------------------------- */
/* Últimos cambios                                                              */
/* -------------------------------------------------------------------------- */

export type ChangeKind = "publicacion" | "actualizacion";
export const CHANGE_LABEL: Record<ChangeKind, string> = { publicacion: "Publicación", actualizacion: "Actualización" };
/** Tipos del plan que cambian un contenido que ya existía. */
const UPDATE_TYPES: ReadonlySet<EditorialPieceType> = new Set(["reedicion", "migrar", "migrar_y_reeditar", "refrescar_store"]);

export type RecentChange = {
  id: string;
  brand: string;
  brandSlug: string | null;
  title: string;
  url: string | null;
  keyword: string | null;
  publicationDate: string;
  kind: ChangeKind;
  /** Tipo de la hoja del equipo, tal cual. */
  type: string;
  /** Medición de Search Console (D-079); `null` sin URL ni keyword medibles. */
  result: string | null;
  /** Cambio hecho en el visor que el workbench aún no ha traído. */
  pending: boolean;
};

/** Piezas publicadas del plan hasta hoy, de la más reciente a la más antigua. */
export function recentChanges(rows: readonly EditorialPlanRow[], types: ReadonlyMap<string, EditorialPieceType>, today: string): RecentChange[] {
  return rows
    .filter((row) => row.statusKey === "publicado" && row.publicationDate !== null && row.publicationDate <= today)
    .map((row) => ({
      id: row.id,
      brand: row.brand,
      brandSlug: row.brandSlug ?? null,
      title: row.title ?? row.keyword ?? "Pieza sin título",
      url: row.url,
      keyword: row.keyword,
      publicationDate: row.publicationDate!,
      kind: UPDATE_TYPES.has(types.get(row.id) ?? "sin_tipo") ? ("actualizacion" as const) : ("publicacion" as const),
      type: row.type,
      result: pieceResult(row.measurements ?? []),
      pending: Boolean(row.pending),
    }))
    .sort((a, b) => b.publicationDate.localeCompare(a.publicationDate) || a.title.localeCompare(b.title, "es"));
}

/* -------------------------------------------------------------------------- */
/* Potenciar                                                                    */
/* -------------------------------------------------------------------------- */

export type BoostReason = "pierde" | "ctr" | "primera" | "segunda";
export const BOOST_REASONS: Record<BoostReason, { label: string; action: string }> = {
  pierde: { label: "Pierde clics", action: "Actualizar el contenido (datos, fechas, enlaces) y revisar qué búsquedas ha perdido." },
  ctr: { label: "CTR bajo en el top 3", action: "Reescribir title y description: ya está arriba, pero lo eligen poco." },
  primera: { label: "Primera página", action: "Reforzar contenido, title y enlaces internos para entrar en el top 3." },
  segunda: { label: "Segunda página", action: "Ampliar el contenido de su búsqueda principal y enlazarlo desde páginas con tráfico." },
};

export type BoostCandidate = {
  page: string;
  path: string;
  reason: BoostReason;
  clicks: number | null;
  previousClicks: number | null;
  impressions: number | null;
  position: number | null;
  topQuery: ContentSectionPage["topQuery"];
  potentialClicks: number;
  /** Clics en juego en 90 días: los perdidos («Pierde clics») o los potenciales (el resto). Ordena la lista. */
  atStake: number;
};

/**
 * Posts que potenciar. Primero lo que pierde clics (si los dos tramos son
 * comparables); después lo que tiene clics en juego por la posición de su
 * búsqueda principal sin marca, hasta la segunda página. Más allá no se
 * potencia un post: se crea una pieza.
 */
export function boostCandidates(pages: readonly ContentSectionPage[], options: { decayComparable: boolean }): BoostCandidate[] {
  const T = MAINTENANCE_THRESHOLDS;
  const candidates: BoostCandidate[] = [];
  for (const page of pages) {
    const base = {
      page: page.page,
      path: pathOf(page.page),
      clicks: page.clicks,
      previousClicks: page.previousClicks,
      impressions: page.impressions,
      position: page.position,
      topQuery: page.topQuery,
      potentialClicks: page.potentialClicks,
    };
    const { clicks, previousClicks } = page;
    if (options.decayComparable && clicks !== null && previousClicks !== null && previousClicks >= T.decayMinPrevious && clicks <= previousClicks * (1 - T.decayDropPct / 100)) {
      candidates.push({ ...base, reason: "pierde", atStake: previousClicks - clicks });
      continue;
    }
    const position = page.topQuery?.position ?? null;
    if (page.potentialClicks < T.boostMinPotential || position === null || position > 20) continue;
    candidates.push({ ...base, reason: position <= 3 ? "ctr" : position <= 10 ? "primera" : "segunda", atStake: page.potentialClicks });
  }
  return candidates.sort((a, b) => b.atStake - a.atStake || a.path.localeCompare(b.path));
}

/* -------------------------------------------------------------------------- */
/* Retirar                                                                      */
/* -------------------------------------------------------------------------- */

export type RetireSignal = "sin-clics" | "sin-impresiones";
export const RETIRE_SIGNALS: Record<RetireSignal, { label: string; action: string }> = {
  "sin-clics": {
    label: "Sin clics en 12 meses",
    action: "Redirigir (301) al post más cercano o retirar (410); si el tema sigue vigente, fusionarlo o actualizarlo.",
  },
  "sin-impresiones": {
    label: "Sin impresiones en 12 meses",
    action: "Comprobar en Search Console si está indexado: si es nuevo, esperar; si no se indexa, mejorarlo o retirarlo.",
  },
};

export type RetireCandidate = {
  page: string;
  path: string;
  /** Fichero de sitemap que lo declara. */
  sitemap: string;
  signal: RetireSignal;
  yearClicks: number;
  yearImpressions: number;
};

export type RetireReview = {
  /** Hay inventario de posts: los sitemaps del crawl publicado. */
  available: boolean;
  /** Por qué no hay lista; `null` si la hay. */
  missing: string | null;
  /** Fecha del crawl publicado cuyos sitemaps se usan. */
  crawl: string | null;
  /** El sitio declara más URL de las que guarda el crawl: inventario parcial. */
  truncated: boolean;
  /** Posts que declaran los sitemaps. */
  declared: number;
  /** Con clics o con impresiones por encima del umbral en 12 meses. */
  alive: number;
  /** Solo tienen impresiones en los últimos 90 días: URL nueva (o migrada) o post reciente. No se juzgan aún. */
  shortHistory: number;
  /** Publicados en el plan hace menos de 12 meses: fuera de la lista. */
  excludedByPlan: number;
  candidates: RetireCandidate[];
  /**
   * Sin crawl: posts que Search Console aún muestra sin clics y con menos de
   * 100 impresiones en 12 meses. Solo orientativo: puede contar URL ya retiradas.
   */
  searchConsoleOnly: number | null;
};

const fileLabel = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? url);
  } catch {
    return url;
  }
};

/** Con impresiones antes de los últimos 90 días: hay historia suficiente para juzgarlo. */
const hasHistory = (page: ContentSectionPage) => (page.previousImpressions ?? 0) > 0 || (page.yearImpressions ?? 0) - (page.impressions ?? 0) - (page.previousImpressions ?? 0) > 0;
const isLow = (page: ContentSectionPage) => (page.yearClicks ?? 0) === 0 && (page.yearImpressions ?? 0) < MAINTENANCE_THRESHOLDS.retireMaxImpressions;

/** Posts de los sitemaps del crawl sin clics en 12 meses. */
export function retireReview(section: ContentSectionReport, audit: SiteAuditSummary | null): RetireReview {
  const empty = { crawl: audit?.completedAt ?? null, truncated: false, declared: 0, alive: 0, shortHistory: 0, excludedByPlan: 0, candidates: [] };
  if (!section.coverage.year.available || !section.coverage.recent.available || !section.coverage.previous.available)
    return { ...empty, available: false, missing: "Search Console no ha respondido en alguna ventana: sin las cifras de 12 meses no se señala nada.", searchConsoleOnly: null };
  const files = (audit?.sitemap?.files ?? []).filter((file) => file.urls.length);
  if (!files.length) {
    return {
      ...empty,
      available: false,
      missing: audit ? "El crawl publicado no guarda los sitemaps: hace falta uno nuevo." : "Sin crawl publicado: el inventario de posts sale de sus sitemaps.",
      searchConsoleOnly: section.pages.filter((page) => isLow(page) && hasHistory(page)).length,
    };
  }
  const declared = new Map<string, { url: string; sitemap: string }>();
  for (const file of files)
    for (const url of file.urls) {
      const key = postKey(url);
      if (key && !declared.has(key) && isSectionPost(url, section.section)) declared.set(key, { url, sitemap: fileLabel(file.url) });
    }
  const pages = new Map(section.pages.map((page) => [postKey(page.page), page]));
  const candidates: RetireCandidate[] = [];
  let alive = 0;
  let shortHistory = 0;
  for (const [key, { url, sitemap }] of declared) {
    const page = pages.get(key);
    if (!page) {
      candidates.push({ page: url, path: pathOf(url), sitemap, signal: "sin-impresiones", yearClicks: 0, yearImpressions: 0 });
      continue;
    }
    if (!isLow(page)) alive += 1;
    else if (!hasHistory(page)) shortHistory += 1;
    else candidates.push({ page: url, path: pathOf(url), sitemap, signal: "sin-clics", yearClicks: page.yearClicks ?? 0, yearImpressions: page.yearImpressions ?? 0 });
  }
  const ORDER: Record<RetireSignal, number> = { "sin-clics": 0, "sin-impresiones": 1 };
  candidates.sort((a, b) => ORDER[a.signal] - ORDER[b.signal] || a.yearImpressions - b.yearImpressions || a.path.localeCompare(b.path));
  return {
    available: true,
    missing: null,
    crawl: audit!.completedAt,
    truncated: audit!.sitemap!.truncated,
    declared: declared.size,
    alive,
    shortHistory,
    excludedByPlan: 0,
    candidates,
    searchConsoleOnly: null,
  };
}

/** Quita de la lista los posts que el plan publicó hace menos de 12 meses. Fuera de la caché: el plan cambia sin esperar al dato. */
export function withoutRecentPlan(review: RetireReview, rows: readonly EditorialPlanRow[], today: string): RetireReview {
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - MAINTENANCE_THRESHOLDS.planRecentDays * 86_400_000).toISOString().slice(0, 10);
  const recent = new Set(
    rows.filter((row) => row.statusKey === "publicado" && row.url && row.publicationDate && row.publicationDate >= since).map((row) => postKey(row.url!)),
  );
  const candidates = review.candidates.filter((candidate) => !recent.has(postKey(candidate.page)));
  return { ...review, candidates, excludedByPlan: review.excludedByPlan + review.candidates.length - candidates.length };
}

/* -------------------------------------------------------------------------- */
/* Resumen por marca                                                            */
/* -------------------------------------------------------------------------- */

export type MaintenanceDigest = {
  brand: string;
  /** «Trendbook», «Blog». */
  label: string;
  cutoff: string;
  generatedAt: string;
  windows: ContentSectionReport["windows"];
  coverage: ContentSectionReport["coverage"];
  sources: ContentSectionReport["sources"];
  /** Migración de URL más reciente de los 12 meses, si la hay. */
  migration: ContentSectionReport["migrations"][number] | null;
  /** Los dos tramos de 90 días se pueden comparar: ninguna migración entre ellos. */
  decayComparable: boolean;
  totals: { posts: number; clicks: number | null; previousClicks: number | null };
  /** Con crawl, potenciar se limita a los posts que declaran los sitemaps (las URL antiguas no cuentan). */
  boostScope: "sitemaps" | "search-console";
  /** Posts entre los que se busca qué potenciar: los de los sitemaps o los que tienen impresiones en 12 meses. */
  boostBase: number;
  boost: BoostCandidate[];
  retire: RetireReview;
};

/** Las dos listas de una marca y sus totales: lo que se guarda en caché y usa la pestaña «Acciones». */
export function maintenanceDigest(section: ContentSectionReport, audit: SiteAuditSummary | null): MaintenanceDigest {
  const { windows } = section;
  const migration = [...section.migrations].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const decayComparable = section.coverage.previous.available && !section.migrations.some((item) => item.date >= windows.previous.start && item.date <= windows.recent.end);
  const sum = (field: "clicks" | "previousClicks", available: boolean) => (available ? section.pages.reduce((total, page) => total + (page[field] ?? 0), 0) : null);
  const retire = retireReview(section, audit);
  const declared = new Set(
    (audit?.sitemap?.files ?? []).flatMap((file) => file.urls).filter((url) => isSectionPost(url, section.section)).map((url) => postKey(url)),
  );
  const scoped = declared.size ? section.pages.filter((page) => declared.has(postKey(page.page))) : section.pages;
  return {
    brand: section.brand,
    label: section.section.label,
    cutoff: section.cutoff,
    generatedAt: section.generatedAt,
    windows,
    coverage: section.coverage,
    sources: section.sources,
    migration,
    decayComparable,
    totals: { posts: section.pages.length, clicks: sum("clicks", section.coverage.recent.available), previousClicks: sum("previousClicks", section.coverage.previous.available) },
    boostScope: declared.size ? "sitemaps" : "search-console",
    boostBase: declared.size || section.pages.length,
    boost: boostCandidates(scoped, { decayComparable }),
    retire,
  };
}
