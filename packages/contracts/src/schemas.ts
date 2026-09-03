import { z } from "zod";

export const projectSlugSchema = z.enum(["porcelanosa", "noken"]);
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

export const dashboardPayloadSchema = z.object({
  generatedAt: z.string().datetime(),
  mode: z.enum(["synthetic", "database"]),
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
export type Insight = z.infer<typeof insightSchema>;
export type Action = z.infer<typeof actionSchema>;
export type ProjectSlug = z.infer<typeof projectSlugSchema>;
export type MarketCode = z.infer<typeof marketCodeSchema>;
export type PeriodKey = z.infer<typeof periodKeySchema>;
export type PublicationPackage = z.infer<typeof publicationPackageSchema>;
