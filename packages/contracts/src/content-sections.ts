import { z } from "zod";
import { brandSlugSchema } from "./portfolio";
import type { BrandSlug } from "./taxonomy";

/**
 * Secciones editoriales de las marcas del piloto (D-095): la carpeta donde
 * viven sus posts. Es lo que «Mantenimiento» del plan editorial repasa para
 * proponer qué potenciar y qué retirar.
 *
 * Comprobado con Search Console (90 días al 2 de octubre de 2026): el blog de
 * Porcelanosa es el Trendbook (`/trendbook/`, con el idioma detrás:
 * `/trendbook/fr/…`); Noken y XTONE usan `/blog/` (con el mercado delante:
 * `/es/blog/…`, `/en/blog/…`). Una marca sin sección no tiene repaso de posts.
 */
export type EditorialSection = {
  /** Nombre que ve el equipo: «Trendbook», «Blog». */
  label: string;
  /** Carpeta de la ruta que contiene los posts, en cualquier nivel. */
  segment: string;
};

export const EDITORIAL_SECTIONS: Partial<Record<BrandSlug, EditorialSection>> = {
  porcelanosa: { label: "Trendbook", segment: "trendbook" },
  noken: { label: "Blog", segment: "blog" },
  xtone: { label: "Blog", segment: "blog" },
};

export const editorialSectionOf = (brand: string): EditorialSection | null => EDITORIAL_SECTIONS[brand as BrandSlug] ?? null;

/** Filtro RE2 de página para Search Console: la carpeta de la sección en cualquier nivel de la ruta. */
export const sectionPageRegex = (section: EditorialSection) => `^https?://[^/]+/(?:[^/?#]+/)*${section.segment}/`;

/** Versión de la lectura de la sección: entra en las claves de caché y cambia con su forma. */
export const CONTENT_SECTION_VERSION = 1;

/**
 * Clave de un post para cruzar Search Console, sitemaps y plan: host en
 * minúsculas y ruta sin barra final, sin protocolo, parámetros ni fragmento.
 * Las variantes con parámetros de una misma ruta cuentan como el mismo post.
 */
export function postKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

/** Idioma o mercado como carpeta: `fr`, `en_gb`, `fr-fr`. */
const LOCALE = /^[a-z]{2}(?:[-_][a-z]{2})?$/i;
/** Carpetas de la sección que no son posts: listados, taxonomías y paginación. */
const NOT_POSTS = new Set(["page", "category", "categoria", "categorie", "categories", "kategorie", "tag", "tags", "etiqueta", "etiquetas", "author", "autor", "feed", "search", "buscar"]);

/**
 * Si la URL es un post de la sección: tras la carpeta (y su idioma, si lo
 * lleva) queda un slug que no es la portada del blog, una página del listado
 * ni una taxonomía. `/trendbook/fr/` es la portada francesa; `/blog/page/2/`,
 * un listado.
 */
export function isSectionPost(url: string, section: EditorialSection): boolean {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }
  const segments = path.split("/").filter(Boolean);
  const at = segments.indexOf(section.segment);
  if (at < 0) return false;
  const rest = segments.slice(at + 1);
  if (rest.length > 1 && LOCALE.test(rest[0]!)) rest.shift();
  else if (rest.length === 1 && LOCALE.test(rest[0]!)) return false;
  // `/blog/2026/` o `/blog/2026/05/` son archivos por fecha, no posts.
  return rest.length > 0 && !NOT_POSTS.has(rest[0]!.toLowerCase()) && !rest.every((segment) => /^\d+$/.test(segment));
}

const windowSchema = z.object({ start: z.string().date(), end: z.string().date() });
const sampleSchema = z.object({
  /** La consulta respondió; si no, sus cifras son nulas, nunca cero. */
  available: z.boolean(),
  rows: z.number().int().nonnegative(),
  /** Se alcanzó el tope de filas: puede faltar algún post. */
  limitReached: z.boolean(),
});

/** Un post de la sección con sus cifras de Search Console. Nulo: la ventana no respondió. */
export const contentSectionPageSchema = z.object({
  page: z.string(),
  /** Últimos 90 días. */
  clicks: z.number().nullable(),
  impressions: z.number().nullable(),
  /** Posición media ponderada por impresiones; nula sin impresiones. */
  position: z.number().nullable(),
  /** Los 90 días anteriores. */
  previousClicks: z.number().nullable(),
  previousImpressions: z.number().nullable(),
  /** Últimos 12 meses. */
  yearClicks: z.number().nullable(),
  yearImpressions: z.number().nullable(),
  /** Búsqueda sin marca con más impresiones en los últimos 90 días. */
  topQuery: z.object({ query: z.string(), clicks: z.number(), impressions: z.number(), position: z.number() }).nullable(),
  /** Clics que faltan frente a la curva de CTR del propio sitio (búsquedas sin marca, 90 días); ordena, no promete. */
  potentialClicks: z.number(),
});

/**
 * Lectura de Search Console de la sección editorial de una marca (D-095):
 * todos sus posts con impresiones en 12 meses, más los 90 últimos días frente
 * a los 90 anteriores y sus búsquedas sin marca. Consultas propias filtradas
 * por la carpeta, para no depender de la muestra de 5.000 páginas del informe.
 */
export const contentSectionReportSchema = z.object({
  generatedAt: z.string().datetime(),
  brand: brandSlugSchema,
  section: z.object({ label: z.string(), segment: z.string() }),
  cutoff: z.string().date(),
  windows: z.object({ year: windowSchema, recent: windowSchema, previous: windowSchema }),
  pages: z.array(contentSectionPageSchema),
  coverage: z.object({ year: sampleSchema, recent: sampleSchema, previous: sampleSchema, queries: sampleSchema }),
  /**
   * Migraciones de URL de la marca dentro de los 12 meses: con una, las URL
   * nuevas no tienen historia y la comparación entre tramos no vale (D-095).
   */
  migrations: z.array(z.object({ date: z.string().date(), label: z.string() })),
  sources: z.array(z.object({ source: z.literal("gsc"), ok: z.boolean(), note: z.string() })),
});

export type ContentSectionPage = z.infer<typeof contentSectionPageSchema>;
export type ContentSectionReport = z.infer<typeof contentSectionReportSchema>;
