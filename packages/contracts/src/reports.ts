import { z } from "zod";
import { projectSlugSchema, reportSchema } from "./schemas";

/**
 * Informes versionados y archivo histórico (P2.3).
 *
 * V1 tenía **dos** informes distintos que el inventario de migración clasifica
 * como `merge`: `/tracking/informe` (trimestral profundo, 8 secciones más
 * apéndice) y `/tracking/informe-v2` (por fechas, 10 secciones). Mantener los dos
 * habría duplicado capítulos que dicen lo mismo con otro nombre —«Captación» y
 * «Del buscador a la conversión» comparten la mitad del contenido— y habría
 * obligado a elegir cuál es el bueno en cada revisión.
 *
 * `REPORT_CHAPTERS` es la fusión, y no está escrita de memoria: los `v1Sections`
 * son los encabezados reales de `InformeTrimestral.svelte` e `InformeV2.svelte`
 * de `~/Desktop/Proyectos/seo-dashboard`. Cada capítulo declara en qué fase de V2
 * llega y en qué estado está hoy, así que la pérdida temporal de contenido frente
 * a V1 es una tabla auditable y no una impresión.
 *
 * Lo que P2.3 cierra es la **superficie**: catálogo de capítulos, archivo
 * histórico navegable, cadena de versiones inmutable y filtros compartibles. El
 * contenido real de la mayoría de capítulos depende de P3 a P9.
 */

export const reportChapterKeySchema = z.enum([
  "resumen",
  "descubrimiento",
  "atraccion",
  "captacion",
  "canales",
  "mercados",
  "busquedas",
  "contenidos",
  "autoridad",
  "funnel",
  "geo",
  "salud-tecnica",
  "programacion-editorial",
  "plan-accion",
  "proximo-periodo",
  "metodologia",
]);

export type ReportChapterKey = z.infer<typeof reportChapterKeySchema>;

/** De qué informe de V1 procede un capítulo. Ambos si los dos lo tenían. */
export const reportChapterOriginSchema = z.enum(["informe", "informe-v2"]);

/**
 * `publicado`: el capítulo existe en V2 con su superficie propia.
 * `parcial`: existe una parte utilizable y falta contenido declarado.
 * `pendiente`: no existe todavía; llega en la fase indicada.
 */
export const reportChapterStateSchema = z.enum(["publicado", "parcial", "pendiente"]);

export type ReportChapter = {
  key: ReportChapterKey;
  label: string;
  /** Encabezados literales de V1 que este capítulo absorbe. */
  v1Sections: string[];
  v1Reports: Array<z.infer<typeof reportChapterOriginSchema>>;
  /** Fase de V2 en que el capítulo queda completo. */
  phase: string;
  state: z.infer<typeof reportChapterStateSchema>;
  /** Ruta de V2 que ya cubre el capítulo, cuando existe. */
  surface: string | null;
  /** Qué falta, si falta algo. Obligatorio salvo en `publicado`. */
  gap: string | null;
};

export const REPORT_CHAPTERS = [
  {
    key: "resumen",
    label: "Resumen ejecutivo",
    v1Sections: ["📋 Resumen ejecutivo del trimestre", "Resumen del periodo"],
    v1Reports: ["informe", "informe-v2"],
    phase: "P7",
    state: "publicado",
    surface: "/reports",
    gap: null,
  },
  {
    key: "descubrimiento",
    label: "Descubrimiento",
    v1Sections: ["1 · Descubrimiento"],
    v1Reports: ["informe"],
    phase: "P3",
    state: "pendiente",
    surface: null,
    gap: "Impresiones y demanda por segmento con serie real de Search Console.",
  },
  {
    key: "atraccion",
    label: "Atracción",
    v1Sections: ["2 · Atracción"],
    v1Reports: ["informe"],
    phase: "P3",
    state: "pendiente",
    surface: null,
    gap: "Clics, CTR y posición con curva de CTR esperado propia.",
  },
  {
    key: "captacion",
    label: "Captación",
    v1Sections: ["3 · Captación"],
    v1Reports: ["informe"],
    phase: "P3",
    state: "pendiente",
    surface: null,
    gap: "Sesiones y macroconversiones reconciliadas entre GA4 y Search Console.",
  },
  {
    key: "canales",
    label: "Origen de las visitas",
    v1Sections: ["De dónde vienen las visitas"],
    v1Reports: ["informe-v2"],
    phase: "P3",
    state: "pendiente",
    surface: null,
    gap: "Desglose por canal de GA4, que exige la integración real.",
  },
  {
    key: "mercados",
    label: "Rendimiento por mercado",
    v1Sections: ["Rendimiento por mercado"],
    v1Reports: ["informe-v2"],
    phase: "P3",
    state: "parcial",
    surface: "/portfolio",
    gap: "La superficie existe desde P2.2 con comparativa y visibilidad ponderada; el dato es sintético hasta P3 y solo cubre el piloto.",
  },
  {
    key: "busquedas",
    label: "Búsquedas",
    v1Sections: ["Búsquedas"],
    v1Reports: ["informe-v2"],
    phase: "P3",
    state: "parcial",
    surface: "/queries/[id]",
    gap: "La ficha de query existe desde P1.4 con la evidencia que la cita, pero sin serie propia: la query no es entidad del contrato hasta P3.",
  },
  {
    key: "contenidos",
    label: "Contenidos",
    v1Sections: ["Contenidos"],
    v1Reports: ["informe-v2"],
    phase: "P6",
    state: "parcial",
    surface: "/pages/[id]",
    gap: "Existe la ficha de URL con oportunidad; falta el rendimiento agregado por cluster de contenido.",
  },
  {
    key: "autoridad",
    label: "Autoridad temática",
    v1Sections: ["5 · Autoridad y contenidos"],
    v1Reports: ["informe"],
    phase: "P6",
    state: "pendiente",
    surface: null,
    gap: "Árbol comercial y editorial con pilares, clusters, gaps y quick wins.",
  },
  {
    key: "funnel",
    label: "Del buscador a la conversión",
    v1Sections: ["Del buscador a la conversión"],
    v1Reports: ["informe-v2"],
    phase: "P9",
    state: "pendiente",
    surface: null,
    gap: "Funnels y atribución, que dependen del modelo de impacto de P9.",
  },
  {
    key: "geo",
    label: "Visibilidad en asistentes (GEO)",
    v1Sections: ["Inteligencia artificial (GEO)"],
    v1Reports: ["informe-v2"],
    phase: "P8",
    state: "pendiente",
    surface: null,
    gap: "Set de prompts versionado y citación por asistente. El bloque GEO de la portada es un resumen, no el capítulo.",
  },
  {
    key: "salud-tecnica",
    label: "Salud técnica",
    v1Sections: ["4 · Salud técnica", "Salud técnica del sitio"],
    v1Reports: ["informe", "informe-v2"],
    phase: "P5",
    state: "parcial",
    surface: "/issues/[id]",
    gap: "Existe la ficha de incidencia; faltan inventario, histórico y diff del crawl publicado. El score de V1 no se copia: se recalibra (P2.1).",
  },
  {
    key: "programacion-editorial",
    label: "Programación editorial",
    v1Sections: ["Programación editorial"],
    v1Reports: ["informe-v2"],
    phase: "P1",
    state: "publicado",
    surface: "/editorial/calendario",
    gap: null,
  },
  {
    key: "plan-accion",
    label: "Plan de acción",
    v1Sections: ["6 · Plan de acción"],
    v1Reports: ["informe"],
    phase: "P4",
    state: "parcial",
    surface: "/actions",
    gap: "La tabla de acciones prioriza y enlaza con la pieza editorial; falta el ciclo de decisión con SLA y resultado medido.",
  },
  {
    key: "proximo-periodo",
    label: "Próximo periodo",
    v1Sections: ["7 · Tareas próximo trimestre", "Qué haremos el próximo periodo"],
    v1Reports: ["informe", "informe-v2"],
    phase: "P4",
    state: "pendiente",
    surface: null,
    gap: "Compromiso del siguiente ciclo con responsable, fecha y criterio de éxito persistidos.",
  },
  {
    key: "metodologia",
    label: "Metodología y cobertura",
    v1Sections: ["Apéndice"],
    v1Reports: ["informe"],
    phase: "P2",
    state: "publicado",
    surface: "/data",
    gap: null,
  },
] as const satisfies ReadonlyArray<ReportChapter>;

export const REPORT_CHAPTER_KEYS = REPORT_CHAPTERS.map((chapter) => chapter.key);

/**
 * Una versión publicada es inmutable: una corrección genera otra versión con su
 * nota de cambio. `changeNote` es null solo en la primera.
 */
export const reportVersionSchema = z.object({
  version: z.number().int().positive(),
  status: reportSchema.shape.status,
  author: z.string(),
  reviewer: z.string().nullable(),
  publishedAt: z.string().date().nullable(),
  changeNote: z.string().nullable(),
});

export const reportArchiveEntrySchema = reportSchema.extend({
  /** Cadena completa de versiones, de la más antigua a la más reciente. */
  versions: z.array(reportVersionSchema).min(1),
  /** Capítulos que este informe incluye, del catálogo fusionado. */
  chapters: z.array(reportChapterKeySchema).min(1),
  /** Año de cierre, para el archivo histórico. */
  year: z.number().int(),
});

export const reportArchiveChapterSchema = z.object({
  key: reportChapterKeySchema,
  label: z.string(),
  v1Sections: z.array(z.string()),
  v1Reports: z.array(reportChapterOriginSchema),
  phase: z.string(),
  state: reportChapterStateSchema,
  surface: z.string().nullable(),
  gap: z.string().nullable(),
  /** Informes del archivo que ya incluyen el capítulo. */
  reportIds: z.array(z.string()),
});

export const reportArchiveSchema = z.object({
  generatedAt: z.string().datetime(),
  mode: z.enum(["synthetic", "database"]),
  filters: z.object({
    project: z.union([projectSlugSchema, z.literal("all")]),
    type: z.union([reportSchema.shape.type, z.literal("all")]),
    status: z.union([reportSchema.shape.status, z.literal("all")]),
    year: z.union([z.number().int(), z.literal("all")]),
  }),
  entries: z.array(reportArchiveEntrySchema),
  /** Años presentes en el archivo completo, no en el filtrado. */
  years: z.array(z.number().int()),
  /** Total de informes antes de filtrar: el archivo declara lo que oculta. */
  totalEntries: z.number().int().nonnegative(),
  chapters: z.array(reportArchiveChapterSchema),
  coverage: z.object({
    published: z.number().int().nonnegative(),
    partial: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    v1Sections: z.number().int().nonnegative(),
  }),
});

export type ReportVersion = z.infer<typeof reportVersionSchema>;
export type ReportArchiveEntry = z.infer<typeof reportArchiveEntrySchema>;
export type ReportArchive = z.infer<typeof reportArchiveSchema>;
export type ReportFilters = ReportArchive["filters"];
export type ReportArchiveChapter = z.infer<typeof reportArchiveChapterSchema>;

const pick = (input: Record<string, string | string[] | undefined>, key: string) => {
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
};

/** Filtros del archivo, tolerantes: un valor inválido equivale a «todos». */
export function parseReportFilters(input: Record<string, string | string[] | undefined>): ReportFilters {
  const project = pick(input, "project");
  const type = pick(input, "type");
  const status = pick(input, "status");
  const year = Number(pick(input, "year"));
  return {
    project: projectSlugSchema.safeParse(project).success ? (project as z.infer<typeof projectSlugSchema>) : "all",
    type: reportSchema.shape.type.safeParse(type).success ? (type as z.infer<typeof reportSchema.shape.type>) : "all",
    status: reportSchema.shape.status.safeParse(status).success ? (status as z.infer<typeof reportSchema.shape.status>) : "all",
    year: Number.isInteger(year) && year > 2000 ? year : "all",
  };
}

export function reportFilterQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.project !== "all") params.set("project", filters.project);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.year !== "all") params.set("year", String(filters.year));
  return params.toString();
}

/**
 * Aplica los filtros y deriva el catálogo de capítulos y su cobertura. Es puro y
 * es el único origen de esas cifras.
 *
 * El orden del archivo es cronológico inverso —lo último cerrado primero— y con
 * un desempate estable por identificador: dos informes del mismo periodo no
 * pueden barajarse entre peticiones.
 */
export function buildReportArchive(input: {
  generatedAt: string;
  mode: "synthetic" | "database";
  filters: ReportFilters;
  entries: ReportArchiveEntry[];
}): ReportArchive {
  const { filters, entries } = input;
  const matches = entries.filter((entry) => {
    if (filters.project !== "all" && entry.project !== filters.project) return false;
    if (filters.type !== "all" && entry.type !== filters.type) return false;
    if (filters.status !== "all" && entry.status !== filters.status) return false;
    if (filters.year !== "all" && entry.year !== filters.year) return false;
    return true;
  });

  const sorted = [...matches].sort((a, b) => {
    const dateA = a.publishedAt ?? "";
    const dateB = b.publishedAt ?? "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return a.id.localeCompare(b.id);
  });

  const chapters: ReportArchiveChapter[] = REPORT_CHAPTERS.map((chapter) => ({
    ...chapter,
    v1Sections: [...chapter.v1Sections],
    v1Reports: [...chapter.v1Reports],
    reportIds: entries.filter((entry) => entry.chapters.includes(chapter.key)).map((entry) => entry.id),
  }));

  const payload: ReportArchive = {
    generatedAt: input.generatedAt,
    mode: input.mode,
    filters,
    entries: sorted,
    years: [...new Set(entries.map((entry) => entry.year))].sort((a, b) => b - a),
    totalEntries: entries.length,
    chapters,
    coverage: {
      published: chapters.filter((chapter) => chapter.state === "publicado").length,
      partial: chapters.filter((chapter) => chapter.state === "parcial").length,
      pending: chapters.filter((chapter) => chapter.state === "pendiente").length,
      v1Sections: chapters.reduce((total, chapter) => total + chapter.v1Sections.length, 0),
    },
  };

  return reportArchiveSchema.parse(payload);
}

/** Versión vigente: la última de la cadena. Nunca se reescribe una anterior. */
export function latestVersion(entry: ReportArchiveEntry): ReportVersion {
  return entry.versions[entry.versions.length - 1]!;
}
