import { z } from "zod";
import { actionSchema, projectSlugSchema } from "./schemas";

/**
 * Cronología unificada y seguimiento de acciones (P2.3).
 *
 * V1 repartía el «qué pasó y cuándo» entre sitios que no se hablaban: las
 * anotaciones del panel, el radar de novedades (`/conjunto/radar`), los informes
 * publicados y el calendario editorial. Para responder «¿por qué se movió este
 * KPI el 16 de agosto?» había que abrir cuatro pantallas y cruzarlas a mano.
 *
 * Aquí se funden en una sola línea de tiempo con **carriles** (`lane`). No es un
 * agregador decorativo: el orden y la vecindad temporal son la información. Una
 * incidencia el 16 y una caída de Francia el mismo día es la mitad de un
 * diagnóstico.
 *
 * El inventario de P2.1 decidió que el radar de V1 **no** se conserva como
 * vertical aislado hasta automatizarlo (P4/P5). Por eso su carril existe en el
 * contrato y se declara vacío con su fase, en vez de migrar a mano cuatro
 * noticias que quedarían congeladas.
 */

export const timelineLaneSchema = z.enum(["anotacion", "informe", "editorial", "accion", "contexto-externo"]);

export const TIMELINE_LANES = [
  {
    key: "anotacion",
    label: "Anotaciones",
    description: "Releases, migraciones, incidencias, campañas y actualizaciones conocidas del buscador.",
    state: "publicado",
    phase: "P2",
  },
  {
    key: "informe",
    label: "Informes",
    description: "Versiones publicadas del archivo. Una corrección aparece como su propio hito.",
    state: "publicado",
    phase: "P2",
  },
  {
    key: "editorial",
    label: "Editorial",
    description: "Eventos del calendario general de las ocho marcas, importados de V1.",
    state: "publicado",
    phase: "P1",
  },
  {
    key: "accion",
    label: "Acciones",
    description: "Compromisos con fecha. La fecha del hito es su vencimiento, no su creación.",
    state: "publicado",
    phase: "P2",
  },
  {
    key: "contexto-externo",
    label: "Contexto externo",
    description:
      "Novedades de Google, GEO y herramientas: el radar de V1. P2.1 decidió no conservarlo como vertical aislado hasta automatizar su recogida, así que el carril llega vacío hasta P4.",
    state: "pendiente",
    phase: "P4",
  },
] as const satisfies ReadonlyArray<{
  key: z.infer<typeof timelineLaneSchema>;
  label: string;
  description: string;
  state: "publicado" | "pendiente";
  phase: string;
}>;

export const timelineEntrySchema = z.object({
  id: z.string(),
  date: z.string().date(),
  lane: timelineLaneSchema,
  /** Subtipo dentro del carril, tal como lo nombra su fuente. */
  kind: z.string(),
  title: z.string(),
  detail: z.string().nullable(),
  /** Marca o proyecto al que pertenece. `null` = conjunto del grupo. */
  project: z.string().nullable(),
  href: z.string().nullable(),
  tone: z.enum(["neutral", "good", "warn", "bad", "info"]),
});

export const timelineMonthSchema = z.object({
  key: z.string(),
  label: z.string(),
  entries: z.array(timelineEntrySchema),
});

export const timelineSchema = z.object({
  generatedAt: z.string().datetime(),
  /** Fecha de referencia para «vencido»: el corte del dato, nunca el reloj real. */
  asOf: z.string().date(),
  filters: z.object({
    lane: z.union([timelineLaneSchema, z.literal("all")]),
    project: z.union([projectSlugSchema, z.literal("all")]),
    year: z.union([z.number().int(), z.literal("all")]),
  }),
  /**
   * Lo ya ocurrido, de más reciente a más antiguo: es lo que explica un
   * movimiento del KPI.
   */
  past: z.array(timelineMonthSchema),
  /**
   * Lo comprometido a partir del corte, de más próximo a más lejano. Va aparte
   * porque el calendario editorial planifica meses por delante y, mezclado, el
   * plan futuro sepulta el diagnóstico bajo decenas de hitos que aún no han
   * pasado.
   */
  upcoming: z.array(timelineMonthSchema),
  lanes: z.array(
    z.object({
      key: timelineLaneSchema,
      label: z.string(),
      description: z.string(),
      state: z.enum(["publicado", "pendiente"]),
      phase: z.string(),
      /** Hitos del carril en el archivo completo, no en el filtrado. */
      total: z.number().int().nonnegative(),
    }),
  ),
  years: z.array(z.number().int()),
  totalEntries: z.number().int().nonnegative(),
  visibleEntries: z.number().int().nonnegative(),
});

export type TimelineLane = z.infer<typeof timelineLaneSchema>;
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type TimelineFilters = Timeline["filters"];

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const pick = (input: Record<string, string | string[] | undefined>, key: string) => {
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
};

export function parseTimelineFilters(input: Record<string, string | string[] | undefined>): TimelineFilters {
  const lane = pick(input, "lane");
  const project = pick(input, "project");
  const year = Number(pick(input, "year"));
  return {
    lane: timelineLaneSchema.safeParse(lane).success ? (lane as TimelineLane) : "all",
    project: projectSlugSchema.safeParse(project).success ? (project as z.infer<typeof projectSlugSchema>) : "all",
    year: Number.isInteger(year) && year > 2000 ? year : "all",
  };
}

export function timelineFilterQuery(filters: TimelineFilters): string {
  const params = new URLSearchParams();
  if (filters.lane !== "all") params.set("lane", filters.lane);
  if (filters.project !== "all") params.set("project", filters.project);
  if (filters.year !== "all") params.set("year", String(filters.year));
  return params.toString();
}

/**
 * Agrupa por mes descendente y ordena dentro del mes por fecha descendente, con
 * desempate estable por identificador: dos hitos del mismo día no pueden
 * barajarse entre peticiones.
 */
export function buildTimeline(input: {
  generatedAt: string;
  asOf: string;
  filters: TimelineFilters;
  entries: TimelineEntry[];
}): Timeline {
  const { filters, entries } = input;
  const matches = entries.filter((entry) => {
    if (filters.lane !== "all" && entry.lane !== filters.lane) return false;
    // Un hito del conjunto (`project: null`) no se oculta al filtrar por marca:
    // afecta a todas, y esconderlo rompería la explicación de esa marca.
    if (filters.project !== "all" && entry.project !== null && entry.project !== filters.project) return false;
    if (filters.year !== "all" && Number(entry.date.slice(0, 4)) !== filters.year) return false;
    return true;
  });

  const past = matches.filter((entry) => entry.date <= input.asOf);
  const upcoming = matches.filter((entry) => entry.date > input.asOf);
  const byDateDesc = (a: TimelineEntry, b: TimelineEntry) => (a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date));
  const byDateAsc = (a: TimelineEntry, b: TimelineEntry) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date));

  const group = (list: TimelineEntry[]) => {
    const months = new Map<string, TimelineEntry[]>();
    for (const entry of list) {
      const key = entry.date.slice(0, 7);
      const bucket = months.get(key);
      if (bucket) bucket.push(entry);
      else months.set(key, [entry]);
    }
    return [...months.entries()].map(([key, monthEntries]) => {
      const [year, month] = key.split("-").map(Number) as [number, number];
      return { key, label: `${MONTHS_ES[month - 1]} ${year}`, entries: monthEntries };
    });
  };

  const payload: Timeline = {
    generatedAt: input.generatedAt,
    asOf: input.asOf,
    filters,
    past: group([...past].sort(byDateDesc)),
    upcoming: group([...upcoming].sort(byDateAsc)),
    lanes: TIMELINE_LANES.map((lane) => ({ ...lane, total: entries.filter((entry) => entry.lane === lane.key).length })),
    years: [...new Set(entries.map((entry) => Number(entry.date.slice(0, 4))))].sort((a, b) => b - a),
    totalEntries: entries.length,
    visibleEntries: matches.length,
  };

  return timelineSchema.parse(payload);
}

// ---------------------------------------------------------------------------
// Seguimiento de acciones
// ---------------------------------------------------------------------------

export const actionTrackingStateSchema = z.enum(["sin-fecha", "vencida", "en-plazo", "cerrada"]);

export const trackedActionSchema = actionSchema.extend({
  tracking: actionTrackingStateSchema,
  /** Días hasta el vencimiento respecto del corte del dato. Negativo = vencida. */
  daysToDue: z.number().int().nullable(),
});

export type TrackedAction = z.infer<typeof trackedActionSchema>;

const DAY = 86_400_000;

/**
 * Estado de seguimiento de una acción respecto del **corte del dato**, no del
 * reloj del servidor: una pantalla que dice «vencida hoy» sobre un snapshot de
 * hace tres días miente, y además haría el render no determinista.
 */
export function trackAction(action: z.infer<typeof actionSchema>, asOf: string): TrackedAction {
  if (action.status === "completada") return { ...action, tracking: "cerrada", daysToDue: null };
  if (!action.dueDate) return { ...action, tracking: "sin-fecha", daysToDue: null };
  const days = Math.round((Date.parse(action.dueDate) - Date.parse(asOf)) / DAY);
  return { ...action, tracking: days < 0 ? "vencida" : "en-plazo", daysToDue: days };
}

/** Reparto por estado de seguimiento. Es el resumen del plan, no una decoración. */
export function actionTrackingSummary(actions: TrackedAction[]) {
  return {
    total: actions.length,
    vencidas: actions.filter((action) => action.tracking === "vencida").length,
    enPlazo: actions.filter((action) => action.tracking === "en-plazo").length,
    sinFecha: actions.filter((action) => action.tracking === "sin-fecha").length,
    cerradas: actions.filter((action) => action.tracking === "cerrada").length,
    bloqueadas: actions.filter((action) => action.status === "bloqueada").length,
  };
}
