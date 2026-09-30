import { z } from "zod";
import { brandSlugSchema } from "./portfolio";

/**
 * Estado del sitio (D-070): resumen de un crawl local que se publica en el visor.
 *
 * El crawl completo (HTML analizado, enlaces, todas las páginas) se queda en el
 * workbench, en `data/local/crawls`. Al visor solo viaja este resumen, con topes
 * explícitos: incidencias con un máximo de muestras y una tabla de páginas
 * acotada. Así el volumen no crece con el tamaño del crawl.
 */

export const SITE_AUDIT_SCHEMA_VERSION = "site-audit.v1" as const;
/** Topes del resumen publicado: lo que el visor recibe como máximo. */
export const SITE_AUDIT_LIMITS = { pages: 500, samplesPerIssue: 10, sitemapUrls: 10_000, sitemapFiles: 60 } as const;

export const siteAuditSeveritySchema = z.enum(["critica", "alta", "media", "baja"]);
export type SiteAuditSeverity = z.infer<typeof siteAuditSeveritySchema>;

export const siteAuditCategorySchema = z.enum(["rastreo", "indexacion", "contenido", "enlazado", "internacional", "rendimiento"]);
export type SiteAuditCategory = z.infer<typeof siteAuditCategorySchema>;

export const SITE_AUDIT_CATEGORY_LABELS: Record<SiteAuditCategory, string> = {
  rastreo: "Rastreo y HTTP",
  indexacion: "Indexación",
  contenido: "Contenido on-page",
  enlazado: "Enlazado interno",
  internacional: "Internacional",
  rendimiento: "Rendimiento",
};

export const SITE_AUDIT_SEVERITY_LABELS: Record<SiteAuditSeverity, string> = { critica: "Crítica", alta: "Alta", media: "Media", baja: "Baja" };

export const siteAuditIssueSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string(),
  severity: siteAuditSeveritySchema,
  category: siteAuditCategorySchema,
  /** Qué se comprueba y por qué importa, en una frase. */
  description: z.string(),
  affected: z.number().int().nonnegative(),
  /** Rutas de ejemplo (máximo `SITE_AUDIT_LIMITS.samplesPerIssue`). */
  sample: z.array(z.string()).max(SITE_AUDIT_LIMITS.samplesPerIssue),
});
export type SiteAuditIssue = z.infer<typeof siteAuditIssueSchema>;

export const siteAuditPageRowSchema = z.object({
  /** Ruta relativa al dominio, más corta que la URL completa. */
  path: z.string(),
  status: z.number().int(),
  depth: z.number().int().nonnegative(),
  indexable: z.boolean(),
  inSitemap: z.boolean(),
  title: z.string().nullable(),
  titleLength: z.number().int().nonnegative(),
  descriptionLength: z.number().int().nonnegative(),
  h1Count: z.number().int().nonnegative(),
  wordCount: z.number().int().nonnegative(),
  responseMs: z.number().int().nonnegative(),
  lang: z.string().nullable(),
  issues: z.array(z.string()),
});
export type SiteAuditPageRow = z.infer<typeof siteAuditPageRowSchema>;

export const siteAuditSummarySchema = z.object({
  schemaVersion: z.literal(SITE_AUDIT_SCHEMA_VERSION),
  project: brandSlugSchema,
  domain: z.string(),
  startUrl: z.string().url(),
  runId: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  config: z.object({
    maxUrls: z.number().int().positive(),
    concurrency: z.number().int().positive(),
    respectRobots: z.boolean(),
    userAgent: z.string(),
    /** Cómo se eligen las URL «principales» cuando el sitio es mayor que el tope. */
    selection: z.string(),
  }),
  totals: z.object({
    crawled: z.number().int().nonnegative(),
    html: z.number().int().nonnegative(),
    ok: z.number().int().nonnegative(),
    redirects: z.number().int().nonnegative(),
    clientErrors: z.number().int().nonnegative(),
    serverErrors: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    indexable: z.number().int().nonnegative(),
    noindex: z.number().int().nonnegative(),
    blockedByRobots: z.number().int().nonnegative(),
    sitemapUrls: z.number().int().nonnegative(),
    crawledInSitemap: z.number().int().nonnegative(),
    /** URL con alguna incidencia crítica o alta. */
    pagesWithSevere: z.number().int().nonnegative(),
    avgResponseMs: z.number().int().nonnegative(),
    p90ResponseMs: z.number().int().nonnegative(),
  }),
  statusDistribution: z.array(z.object({ status: z.number().int(), count: z.number().int() })),
  depthDistribution: z.array(z.object({ depth: z.number().int(), count: z.number().int() })),
  languages: z.array(z.object({ lang: z.string(), count: z.number().int() })),
  issues: z.array(siteAuditIssueSchema),
  pages: z.array(siteAuditPageRowSchema).max(SITE_AUDIT_LIMITS.pages),
  /** Cierto si había más páginas que el tope y la tabla se recortó. */
  pagesTruncated: z.boolean(),
  /**
   * Sitemaps leídos al empezar el crawl y URL que declara cada uno (D-087),
   * para la estructura de la pestaña «Páginas». Ausente en resúmenes anteriores.
   */
  sitemap: z
    .object({
      files: z
        .array(
          z.object({
            url: z.string(),
            parent: z.string().nullable(),
            kind: z.enum(["indice", "urls", "ilegible"]),
            lastmod: z.string().nullable(),
            /** URL que declara (solo los `urls`); el tope `sitemapUrls` es la suma de todos. */
            urls: z.array(z.string()),
          }),
        )
        .max(SITE_AUDIT_LIMITS.sitemapFiles),
      /** Detalle por fichero: falso en crawls anteriores a D-086 (todas las URL en el primero). */
      detailed: z.boolean(),
      /** Cierto si el sitio declara más URL que el tope y las listas se recortaron. */
      truncated: z.boolean(),
    })
    .refine((value) => value.files.reduce((sum, file) => sum + file.urls.length, 0) <= SITE_AUDIT_LIMITS.sitemapUrls, "Demasiadas URL de sitemap.")
    .optional(),
  publishedAt: z.string().datetime(),
});
export type SiteAuditSummary = z.infer<typeof siteAuditSummarySchema>;

/** Fichero que empaqueta el visor: un resumen por proyecto, el último publicado. */
export const publishedSiteAuditsSchema = z.object({
  schemaVersion: z.literal(SITE_AUDIT_SCHEMA_VERSION),
  audits: z.record(z.string(), siteAuditSummarySchema),
});
export type PublishedSiteAudits = z.infer<typeof publishedSiteAuditsSchema>;
