import { z } from "zod";
import { BRAND_SLUGS } from "./taxonomy";

/**
 * Las ocho marcas del grupo pueden seleccionarse. Antes esto era
 * `["porcelanosa", "noken"]`: el piloto analítico estaba escrito en el contrato,
 * de modo que las otras seis no eran elegibles en ninguna pantalla aunque V1 las
 * midiera y el calendario editorial las cubriera desde P1 (D-033).
 *
 * Que una marca sea seleccionable NO significa que tenga serie analítica. Esa
 * distinción la marca `brand.pilot`, y quien no la tiene lo declara en pantalla
 * en vez de recibir cifras inventadas.
 */
export const projectSlugSchema = z.enum(BRAND_SLUGS);
export const marketCodeSchema = z.enum(["ES", "UK", "US", "FR", "DE"]);
export const periodKeySchema = z.enum(["28d", "90d", "180d", "12m", "24m"]);
export const sourceKeySchema = z.enum(["ga4", "gsc", "semrush", "geo", "crux", "pagespeed", "crawl"]);
export const trendSchema = z.enum(["up", "down", "flat"]);
export const confidenceSchema = z.enum(["alta", "media", "baja"]);
export const insightCategorySchema = z.enum(["resultado", "riesgo", "oportunidad", "diagnostico", "calidad"]);
export const insightStatusSchema = z.enum(["candidato", "aprobado", "archivado"]);
export const actionStatusSchema = z.enum(["propuesta", "planificada", "en_curso", "bloqueada", "completada"]);
export const intentSchema = z.enum(["informacional", "comercial", "transaccional_local", "navegacional"]);
export const brandSegmentSchema = z.enum(["marca_propia", "marca_paraguas", "non_branded"]);
export const pageTypeSchema = z.enum(["home", "categoria", "producto_coleccion", "editorial", "proyecto_inspiracion", "tienda_showroom", "contacto", "otras"]);

export const coverageSchema = z.object({
  ratio: z.number().min(0).max(1),
  label: z.string(),
  quality: z.enum(["completa", "parcial", "insuficiente"]),
  asOf: z.string().date(),
});

export const metricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.enum(["number", "percent", "score", "position", "seconds"]),
  previous: z.number().nullable(),
  previousYear: z.number().nullable(),
  target: z.number().nullable(),
  trend: trendSchema,
  goodDirection: z.enum(["up", "down"]),
  coverage: coverageSchema,
});

export const seriesPointSchema = z.object({
  date: z.string().date(),
  value: z.number(),
  previousYear: z.number().nullable(),
  lowerBand: z.number().nullable(),
  upperBand: z.number().nullable(),
});

export const annotationSchema = z.object({
  id: z.string(),
  date: z.string().date(),
  label: z.string(),
  type: z.enum(["publicacion", "migracion", "release", "campana", "incidencia", "update", "medicion"]),
});

export const evidenceSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  source: sourceKeySchema,
  href: z.string(),
  observedAt: z.string().date(),
});

export const insightSchema = z.object({
  id: z.string(),
  project: projectSlugSchema.nullable(),
  title: z.string(),
  executiveSummary: z.string(),
  technicalExplanation: z.string(),
  category: insightCategorySchema,
  impact: z.number().min(1).max(5),
  urgency: z.number().min(1).max(5),
  confidence: confidenceSchema,
  confidenceReason: z.string(),
  affectedSegments: z.array(z.string()),
  causeType: z.enum(["demostrada", "hipotesis", "no_determinada"]),
  cause: z.string(),
  recommendation: z.string(),
  suggestedOwner: z.string(),
  successCriterion: z.string(),
  status: insightStatusSchema,
  selectedForExecutive: z.boolean(),
  evidence: z.array(evidenceSchema).min(1),
  updatedAt: z.string().date(),
});

export const actionSchema = z.object({
  id: z.string(),
  project: projectSlugSchema,
  title: z.string(),
  status: actionStatusSchema,
  impact: z.number().min(1).max(5),
  confidence: z.number().min(1).max(5),
  effort: z.number().min(1).max(5),
  urgency: z.number().min(1).max(5),
  owner: z.string(),
  dueDate: z.string().date().nullable(),
  successCriterion: z.string(),
  sourceInsightId: z.string(),
});

export const dataSourceStatusSchema = z.object({
  source: sourceKeySchema,
  label: z.string(),
  status: z.enum(["correcto", "retrasado", "parcial", "error", "no_configurado"]),
  lastValidSnapshot: z.string().datetime().nullable(),
  cutoff: z.string().date().nullable(),
  coverage: z.number().min(0).max(1),
  note: z.string(),
});

export const projectSummarySchema = z.object({
  slug: projectSlugSchema,
  name: z.string(),
  domain: z.string(),
  attention: z.enum(["estable", "observar", "actuar"]),
  score: z.number().min(0).max(100).nullable(),
  businessScore: z.number().min(0).max(100).nullable(),
  visibilityScore: z.number().min(0).max(100).nullable(),
  technicalScore: z.number().min(0).max(100).nullable(),
  delta: z.number(),
  primaryRisk: z.string(),
  primaryOpportunity: z.string(),
});

export const marketSummarySchema = z.object({
  code: marketCodeSchema,
  name: z.string(),
  sessions: z.number(),
  clicks: z.number(),
  conversions: z.number(),
  change: z.number(),
  visibility: z.number(),
  attention: z.enum(["estable", "observar", "actuar"]),
});

export const geoSummarySchema = z.object({
  citationShare: z.number(),
  previousCitationShare: z.number(),
  citedPrompts: z.number(),
  totalPrompts: z.number(),
  aiSessions: z.number(),
  aiConversions: z.number(),
  leadingAssistant: z.string(),
  topCitedDomain: z.string(),
});

export const technicalIssueSchema = z.object({
  id: z.string(),
  project: projectSlugSchema,
  title: z.string(),
  category: z.string(),
  severity: z.enum(["critica", "alta", "media", "baja"]),
  affectedUrls: z.number(),
  trafficAtRisk: z.number(),
  persistenceRuns: z.number(),
  template: z.string(),
  effort: z.enum(["bajo", "medio", "alto"]),
  priorityScore: z.number(),
  sampleUrl: z.string(),
});

export const pageOpportunitySchema = z.object({
  id: z.string(),
  project: projectSlugSchema,
  url: z.string(),
  title: z.string(),
  type: pageTypeSchema,
  status: z.enum(["nuevo", "actualizado", "migrado", "estable", "decay", "consolidar", "retirar"]),
  clicks: z.number(),
  impressions: z.number(),
  position: z.number(),
  ctr: z.number(),
  expectedCtr: z.number(),
  conversions: z.number(),
  opportunityScore: z.number(),
});

/**
 * Consulta non-branded con margen de captación (D-036). Sale de Search Console:
 * demanda real (impresiones), posición media y CTR frente a la curva esperada
 * del propio sitio. `potentialClicks` es lo que la curva dice que se deja de
 * ganar a la posición actual o, fuera del top 3, lo que daría llegar al top 3.
 * No es una previsión: es la magnitud que ordena la lista.
 */
export const queryOpportunitySchema = z.object({
  id: z.string(),
  project: projectSlugSchema,
  query: z.string(),
  clicks: z.number(),
  impressions: z.number(),
  position: z.number(),
  ctr: z.number(),
  expectedCtr: z.number(),
  potentialClicks: z.number(),
  /** URL que más impresiones recibe para la consulta. `null` si GSC no la declara. */
  page: z.string().nullable(),
});

export const reportSchema = z.object({
  id: z.string(),
  project: projectSlugSchema.nullable(),
  title: z.string(),
  type: z.enum(["mensual", "trimestral", "especial"]),
  period: z.string(),
  version: z.number().int().positive(),
  status: z.enum(["borrador", "revision", "aprobado", "publicado"]),
  author: z.string(),
  reviewer: z.string().nullable(),
  publishedAt: z.string().date().nullable(),
  executiveSummary: z.string(),
  blocks: z.number().int().nonnegative(),
});

/**
 * Ventana temporal real del periodo seleccionado, con sus dos comparaciones.
 *
 * Está en el contrato porque la portada la enseña, y mientras no lo estuvo la
 * enseñaba escrita a mano: cambiar el periodo a 24 meses seguía mostrando un
 * rango de 28 días. Un encabezado que miente sobre su propia ventana invalida
 * todo lo que hay debajo.
 */
export const periodWindowSchema = z.object({
  days: z.number().int().positive(),
  start: z.string().date(),
  end: z.string().date(),
  previousStart: z.string().date(),
  previousEnd: z.string().date(),
  previousYearStart: z.string().date(),
  previousYearEnd: z.string().date(),
});

export const dashboardPayloadSchema = z.object({
  generatedAt: z.string().datetime(),
  /** `live`: lectura directa de GA4/GSC desde el servidor, sin almacén propio (D-034). */
  mode: z.enum(["synthetic", "live", "database"]),
  /** Ventana del periodo activo. La portada la muestra en vez de suponerla. */
  window: periodWindowSchema,
  filters: z.object({
    project: z.union([projectSlugSchema, z.literal("all")]),
    market: z.union([marketCodeSchema, z.literal("all")]),
    period: periodKeySchema,
  }),
  metrics: z.array(metricSchema),
  projects: z.array(projectSummarySchema),
  markets: z.array(marketSummarySchema),
  executiveInsights: z.array(insightSchema).max(5),
  geo: geoSummarySchema,
  actions: z.array(actionSchema),
  sources: z.array(dataSourceStatusSchema),
  series: z.record(z.string(), z.array(seriesPointSchema)),
  annotations: z.array(annotationSchema),
  technicalIssues: z.array(technicalIssueSchema),
  opportunities: z.array(pageOpportunitySchema),
  /** Solo lo rellena un origen con GSC real. El sintético no inventa demanda. */
  queryOpportunities: z.array(queryOpportunitySchema).default([]),
  reports: z.array(reportSchema),
});

export const syncRequestSchema = z.object({
  project: projectSlugSchema,
  source: sourceKeySchema.exclude(["crawl"]),
  requestedAt: z.string().datetime(),
  force: z.boolean().default(false),
});

export const publicationPackageSchema = z.object({
  schemaVersion: z.literal("1.0"),
  packageId: z.string().uuid(),
  project: projectSlugSchema,
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  sourceSnapshotId: z.string(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))).max(500),
  signature: z.string().min(32),
});

export type DashboardPayload = z.infer<typeof dashboardPayloadSchema>;
/** Estado de filtros de la portada. Vive en el contrato porque el adapter de
 *  repositorio (P3.1) y las dos apps necesitan el mismo tipo. */
export type DashboardFilters = DashboardPayload["filters"];
/** Clave de fuente de datos. El catálogo (P3.1) la usa para tipar sus definiciones. */
export type SourceKey = z.infer<typeof sourceKeySchema>;
export type Insight = z.infer<typeof insightSchema>;
export type QueryOpportunity = z.infer<typeof queryOpportunitySchema>;
export type Action = z.infer<typeof actionSchema>;
export type ProjectSlug = z.infer<typeof projectSlugSchema>;
export type MarketCode = z.infer<typeof marketCodeSchema>;
export type PeriodKey = z.infer<typeof periodKeySchema>;
export type PublicationPackage = z.infer<typeof publicationPackageSchema>;
export type PeriodWindow = z.infer<typeof periodWindowSchema>;

const MONTHS_ES_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_ES_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * Rango legible en español. Colapsa lo que se repite: dentro del mismo mes
 * queda «3–30 agosto 2026», y si cruza meses o años se abrevia lo justo para
 * que no quepa duda del año.
 */
export function formatPeriodRange(start: string, end: string): string {
  const [ys, ms, ds] = start.split("-").map(Number) as [number, number, number];
  const [ye, me, de] = end.split("-").map(Number) as [number, number, number];
  if (ys === ye && ms === me) return `${ds}–${de} ${MONTHS_ES_LONG[ms - 1]} ${ye}`;
  if (ys === ye) return `${ds} ${MONTHS_ES_SHORT[ms - 1]} – ${de} ${MONTHS_ES_SHORT[me - 1]} ${ye}`;
  return `${ds} ${MONTHS_ES_SHORT[ms - 1]} ${ys} – ${de} ${MONTHS_ES_SHORT[me - 1]} ${ye}`;
}

const DAY_MS = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Días que cubre cada periodo. 12m y 24m se cuentan en días para no depender del calendario. */
export const PERIOD_DAYS: Record<PeriodKey, number> = { "28d": 28, "90d": 90, "180d": 180, "12m": 365, "24m": 730 };

/**
 * Construye la ventana a partir del corte del dato, no del reloj: dos peticiones
 * del mismo snapshot deben describir el mismo periodo.
 */
export function buildPeriodWindow(period: PeriodKey, cutoff: string): PeriodWindow {
  const days = PERIOD_DAYS[period];
  const end = Date.parse(cutoff);
  const start = end - (days - 1) * DAY_MS;
  return {
    days,
    start: iso(start),
    end: iso(end),
    previousStart: iso(start - days * DAY_MS),
    previousEnd: iso(end - days * DAY_MS),
    previousYearStart: iso(start - 365 * DAY_MS),
    previousYearEnd: iso(end - 365 * DAY_MS),
  };
}
