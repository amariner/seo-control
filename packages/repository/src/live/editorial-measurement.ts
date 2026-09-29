import type { BrandSlug, EditorialMeasurement } from "@seo/contracts";
import { gscQuery, type Env, type GscFilter, type GscRow } from "./google";
import { resolveLiveBrands } from "./brands";
import { keywordFilters } from "./report";

/**
 * Medición editorial real (P3.5, D-079): clics de Search Console de cada pieza
 * publicada en las ventanas de 28, 90 y 180 días que siguen a su publicación,
 * frente a la misma ventana justo antes (línea base).
 *
 * - Con URL se mide la URL exacta (con o sin barra final); sin URL, la keyword
 *   con el mismo filtro que el informe de marca, y la confianza no pasa de media.
 * - Una ventana que aún no ha terminado queda «en curso» con los días que
 *   cubre; una que no ha empezado, «pendiente». Nunca se extrapola.
 * - Solo se miden piezas en estado «publicado» con fecha: una fecha en una pieza
 *   del backlog es un plan, no una publicación.
 */

export const MEASUREMENT_WINDOWS = [28, 90, 180] as const;
type Window = (typeof MEASUREMENT_WINDOWS)[number];

const DAY = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const parse = (date: string) => Date.parse(`${date}T00:00:00Z`);
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type MeasurementWindowPlan = {
  windowDays: Window;
  status: "pendiente" | "en_curso" | "medido";
  start: string;
  end: string;
  baselineStart: string;
  baselineEnd: string;
  coveredDays: number;
};

/** Fechas de cada ventana. La línea base tiene los mismos días que lo cubierto. */
export function planMeasurementWindow(publicationDate: string, cutoff: string, windowDays: Window): MeasurementWindowPlan {
  const start = parse(publicationDate);
  const fullEnd = start + (windowDays - 1) * DAY;
  const last = Math.min(fullEnd, parse(cutoff));
  const coveredDays = last < start ? 0 : Math.round((last - start) / DAY) + 1;
  const status = coveredDays === 0 ? "pendiente" : coveredDays < windowDays ? "en_curso" : "medido";
  const span = Math.max(coveredDays, 1);
  return {
    windowDays,
    status,
    start: iso(start),
    end: iso(coveredDays ? last : start),
    baselineStart: iso(start - span * DAY),
    baselineEnd: iso(start - DAY),
    coveredDays,
  };
}

/** Filtro de página que acepta la URL con y sin barra final. */
export function pageFilter(url: string): GscFilter {
  const base = url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  return { dimension: "page", operator: "includingRegex", expression: `^${escape(base)}/?$` };
}

export type MeasurementFigures = { clicks: number; impressions: number; position: number | null };

const sum = (rows: GscRow[]): MeasurementFigures => {
  const clicks = rows.reduce((total, row) => total + row.clicks, 0);
  const impressions = rows.reduce((total, row) => total + row.impressions, 0);
  const weighted = rows.reduce((total, row) => total + row.position * row.impressions, 0);
  return { clicks, impressions, position: impressions ? weighted / impressions : null };
};

const nf = (value: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
const count = (value: number, one: string, many: string) => `${nf(value)} ${value === 1 ? one : many}`;

/** Resultado de una ventana con su lectura, redactada con reglas. */
export function measurementOf({
  plan,
  scope,
  result,
  baseline,
  cutoff,
  measuredAt,
}: {
  plan: MeasurementWindowPlan;
  scope: "url" | "keyword";
  result: MeasurementFigures | null;
  baseline: MeasurementFigures | null;
  cutoff: string;
  measuredAt: string;
}): EditorialMeasurement {
  const common = {
    windowDays: plan.windowDays,
    metricKey: "gsc_clicks",
    measuredAt,
    cutoff,
    coveredDays: plan.coveredDays,
    scope,
  } as const;
  if (plan.status === "pendiente" || !result || !baseline)
    return {
      ...common,
      status: "pendiente",
      baseline: null,
      result: null,
      interpretation: `La ventana empieza el ${plan.start}; el dato de Search Console llega hasta el ${cutoff}.`,
      confidence: "baja",
      impressions: null,
      baselineImpressions: null,
      position: null,
    };
  const diff = result.clicks - baseline.clicks;
  const pct = baseline.clicks ? Math.round((diff / baseline.clicks) * 100) : null;
  const what = scope === "url" ? "la URL" : "la keyword";
  const partial = plan.status === "en_curso" ? ` (en curso: ${plan.coveredDays} de ${plan.windowDays} días)` : "";
  const interpretation = !result.impressions
    ? `Sin impresiones de ${what} en Google en ${plan.coveredDays} días${partial}.`
    : `${count(result.clicks, "clic", "clics")} y ${count(result.impressions, "impresión", "impresiones")} en ${plan.coveredDays} días${partial}, frente a ${count(baseline.clicks, "clic", "clics")} antes de publicar${pct === null ? "" : ` (${pct > 0 ? "+" : ""}${pct} %)`}.`;
  const volume = Math.max(result.impressions, baseline.impressions);
  const confidence: EditorialMeasurement["confidence"] =
    plan.status === "en_curso" || volume < 10 ? "baja" : scope === "keyword" || volume < 100 ? "media" : "alta";
  return {
    ...common,
    status: plan.status,
    baseline: baseline.clicks,
    result: result.clicks,
    interpretation,
    confidence,
    impressions: result.impressions,
    baselineImpressions: baseline.impressions,
    position: result.position === null ? null : Math.round(result.position * 10) / 10,
  };
}

export type MeasurablePiece = {
  id: string;
  brand: BrandSlug | null;
  status: string;
  publicationDate: string | null;
  url: string | null;
  keyword: string | null;
};

export type EditorialMeasurementRun = {
  cutoff: string;
  pieces: Record<string, EditorialMeasurement[]>;
  skipped: Array<{ id: string; reason: string }>;
  requests: number;
};

/** Mide las piezas publicadas de las marcas con Search Console. De una en una: la cuota de GSC es por minuto. */
export async function measureEditorialPieces({
  env,
  pieces,
  cutoff,
  now = new Date(),
}: {
  env: Env;
  pieces: readonly MeasurablePiece[];
  cutoff: string;
  now?: Date;
}): Promise<EditorialMeasurementRun> {
  const sites = new Map(resolveLiveBrands(env).map((brand) => [brand.slug, brand.siteUrl]));
  const measuredAt = now.toISOString().slice(0, 10);
  const out: EditorialMeasurementRun = { cutoff, pieces: {}, skipped: [], requests: 0 };
  for (const piece of pieces) {
    if (piece.status !== "publicado" || !piece.publicationDate) continue;
    const site = piece.brand ? sites.get(piece.brand) : null;
    if (!site) {
      out.skipped.push({ id: piece.id, reason: "La marca no tiene Search Console en V2 (entra con P11)." });
      continue;
    }
    const scope: "url" | "keyword" | null = piece.url ? "url" : piece.keyword ? "keyword" : null;
    if (!scope) {
      out.skipped.push({ id: piece.id, reason: "Sin URL ni keyword: no hay qué medir." });
      continue;
    }
    const filters = scope === "url" ? [pageFilter(piece.url!)] : keywordFilters(piece.keyword!);
    const measurements: EditorialMeasurement[] = [];
    for (const windowDays of MEASUREMENT_WINDOWS) {
      const plan = planMeasurementWindow(piece.publicationDate, cutoff, windowDays);
      if (plan.status === "pendiente") {
        measurements.push(measurementOf({ plan, scope, result: null, baseline: null, cutoff, measuredAt }));
        continue;
      }
      const [result, baseline] = await Promise.all([
        gscQuery(env, site, { startDate: plan.start, endDate: plan.end, dimensions: ["page"], filters, rowLimit: 50 }),
        gscQuery(env, site, { startDate: plan.baselineStart, endDate: plan.baselineEnd, dimensions: ["page"], filters, rowLimit: 50 }),
      ]);
      out.requests += 2;
      measurements.push(measurementOf({ plan, scope, result: sum(result), baseline: sum(baseline), cutoff, measuredAt }));
    }
    out.pieces[piece.id] = measurements;
  }
  return out;
}
