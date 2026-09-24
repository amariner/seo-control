import { z } from "zod";
import { PERIOD_DAYS, sourceKeySchema, type PeriodKey, type SourceKey } from "./schemas";

/**
 * Catálogo de métricas, fuentes, zona horaria, moneda y periodos (P3.1).
 *
 * Hasta ahora estos hechos existían, pero dispersos y escritos a mano en cada
 * superficie: el conector sintético fijaba las magnitudes, `portfolio.ts`
 * decidía por su cuenta que la visibilidad se pondera por sesiones y el desfase
 * de tres días de Search Console solo aparecía en una nota de la interfaz. Esa
 * dispersión es exactamente lo que rompe una migración: cuando P3.2 escriba el
 * SQL, tiene que agregar **igual** que agrega hoy el sintético, o los números
 * cambiarán al conectar el dato real y nadie sabrá si es la fuente o el código.
 *
 * Por eso el catálogo es portante, no descriptivo: `aggregateMetric` es la única
 * función que agrega, y `portfolio.ts` la usa. Añadir una métrica sin declarar
 * su regla de agregación rompe las pruebas.
 *
 * La regla que más importa es la distinción entre `sum` y `weighted-average`.
 * Sumar sesiones de dos marcas es correcto; sumar sus porcentajes de visibilidad
 * no significa nada. Un porcentaje solo se agrega ponderándolo por la magnitud
 * que lo genera, y el catálogo obliga a declarar cuál es.
 */

/** Zona horaria única del grupo. Todas las ventanas y cortes se calculan en ella. */
export const REPORTING_TIMEZONE = "Europe/Madrid" as const;

/**
 * Moneda única. El grupo vende en varios mercados, pero el reporting SEO no
 * convierte divisa: los ingresos llegan ya consolidados en euros desde GA4, así
 * que no hay tipo de cambio que versionar (si algún día lo hay, entra aquí).
 */
export const REPORTING_CURRENCY = "EUR" as const;

/**
 * Cómo se combina una métrica al agregar varias filas (marcas, mercados, días).
 *
 * - `sum`: magnitudes absolutas. Sesiones, clics, conversiones.
 * - `weighted-average`: porcentajes y medias. Exigen `weightBy`.
 * - `latest`: estados puntuales que no se acumulan; se toma la fila más reciente.
 */
export const metricAggregationSchema = z.enum(["sum", "weighted-average", "latest"]);

export const metricDefinitionSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    unit: z.enum(["number", "percent", "score", "position", "seconds"]),
    source: sourceKeySchema,
    aggregation: metricAggregationSchema,
    /** Clave de la métrica que pondera. Obligatoria en `weighted-average`, prohibida en el resto. */
    weightBy: z.string().nullable(),
    goodDirection: z.enum(["up", "down"]),
    /** Días de desfase con los que la fuente publica el dato. GSC: 3. */
    sourceLagDays: z.number().int().min(0).max(14),
    /** Qué mide exactamente. Es lo que se muestra en la metodología, no una glosa. */
    definition: z.string().min(20),
    /** Qué NO mide, o cuándo desconfiar. `null` solo si de verdad no hay salvedad. */
    caveat: z.string().nullable(),
    /** Ventana mínima con la que el KPI es interpretable. */
    minPeriod: z.enum(["28d", "90d", "180d", "12m", "24m"]),
  })
  .refine((metric) => (metric.aggregation === "weighted-average") === (metric.weightBy !== null), {
    message: "Una media ponderada debe declarar por qué métrica se pondera, y solo ella puede declararlo.",
    path: ["weightBy"],
  });

export type MetricDefinition = z.infer<typeof metricDefinitionSchema>;
export type MetricAggregation = z.infer<typeof metricAggregationSchema>;

export const METRIC_CATALOG = [
  {
    key: "organic_sessions",
    label: "Sesiones orgánicas",
    unit: "number",
    source: "ga4",
    aggregation: "sum",
    weightBy: null,
    goodDirection: "up",
    sourceLagDays: 1,
    definition: "Sesiones cuyo canal por defecto es Organic Search, atribuidas a la propiedad GA4 del proyecto y filtradas por prefijo de ruta del mercado.",
    caveat: "GA4 aplica umbrales de privacidad y consolida datos hasta 48 horas: dos consultas legítimas del mismo día pueden diferir ligeramente.",
    minPeriod: "28d",
  },
  {
    key: "organic_clicks",
    label: "Clics orgánicos",
    unit: "number",
    source: "gsc",
    aggregation: "sum",
    weightBy: null,
    goodDirection: "up",
    sourceLagDays: 3,
    definition: "Clics de resultados de búsqueda de Google sobre la propiedad de Search Console del proyecto, en la misma ventana que el resto de KPIs.",
    caveat: "Search Console anonimiza las consultas de bajo volumen: la suma por query es siempre menor que el total de la propiedad.",
    minPeriod: "28d",
  },
  {
    key: "macro_conversions",
    label: "Macroconversiones",
    unit: "number",
    source: "ga4",
    aggregation: "sum",
    weightBy: null,
    goodDirection: "up",
    sourceLagDays: 1,
    definition: "Eventos de conversión marcados como principales en GA4 (contacto, cita en tienda y solicitud de muestra) atribuidos a sesión orgánica.",
    caveat: "La atribución es de último clic no directo: una conversión influida por orgánico pero cerrada por otro canal no cuenta aquí.",
    minPeriod: "28d",
  },
  {
    key: "nonbrand_share",
    label: "Cuota non-branded",
    unit: "percent",
    source: "gsc",
    aggregation: "weighted-average",
    weightBy: "organic_clicks",
    goodDirection: "up",
    sourceLagDays: 3,
    definition: "Porcentaje de clics orgánicos cuya consulta no contiene ningún término de marca propia ni de marca paraguas del grupo.",
    caveat: "La clasificación depende de la lista de términos de marca por proyecto: una consulta con errata de marca puede clasificarse como non-branded.",
    minPeriod: "28d",
  },
  {
    key: "visibility",
    label: "Visibilidad / SOV",
    unit: "percent",
    source: "semrush",
    aggregation: "weighted-average",
    weightBy: "organic_sessions",
    goodDirection: "up",
    sourceLagDays: 7,
    definition: "Cuota de visibilidad sobre el set estable de keywords del proyecto, ponderada por volumen de búsqueda y posición media.",
    caveat: "Solo es comparable entre periodos si el set de keywords no ha cambiado de versión; un set nuevo rompe la serie y debe declararse.",
    minPeriod: "90d",
  },
  {
    key: "technical_health",
    label: "Salud técnica",
    unit: "score",
    source: "crawl",
    aggregation: "weighted-average",
    weightBy: "organic_sessions",
    goodDirection: "up",
    sourceLagDays: 0,
    definition: "Índice compuesto de indexabilidad, respuestas HTTP, canonical, hreflang y Core Web Vitals sobre el último crawl aprobado del proyecto.",
    caveat: "Se recalibra en V2 en lugar de copiar la fórmula de V1, así que no es comparable con el score del dashboard original (D-026).",
    minPeriod: "28d",
  },
] as const satisfies ReadonlyArray<MetricDefinition>;

export type MetricKey = (typeof METRIC_CATALOG)[number]["key"];

export function findMetric(key: string): MetricDefinition | null {
  return METRIC_CATALOG.find((metric) => metric.key === key) ?? null;
}

/** Definición de una fuente: cadencia, desfase y si V2 la tiene conectada hoy. */
export const sourceDefinitionSchema = z.object({
  key: sourceKeySchema,
  label: z.string().min(1),
  /** Cada cuánto se sincroniza cuando esté conectada. */
  cadence: z.enum(["diaria", "semanal", "por-ejecucion"]),
  lagDays: z.number().int().min(0).max(14),
  /** Ninguna está conectada todavía: P3.2 y P3.3 las activan. */
  connected: z.boolean(),
  /** Fase que la conecta. `null` si ya lo está. */
  connectedBy: z.string().nullable(),
});

export const SOURCE_CATALOG = [
  { key: "ga4", label: "Google Analytics 4", cadence: "diaria", lagDays: 1, connected: false, connectedBy: "P3.2" },
  { key: "gsc", label: "Search Console", cadence: "diaria", lagDays: 3, connected: false, connectedBy: "P3.2" },
  { key: "semrush", label: "SEMrush", cadence: "semanal", lagDays: 7, connected: false, connectedBy: "P3.3" },
  { key: "crux", label: "CrUX", cadence: "semanal", lagDays: 7, connected: false, connectedBy: "P3.3" },
  { key: "pagespeed", label: "PageSpeed", cadence: "semanal", lagDays: 0, connected: false, connectedBy: "P3.3" },
  { key: "crawl", label: "Crawl aprobado", cadence: "por-ejecucion", lagDays: 0, connected: false, connectedBy: "P5" },
  { key: "geo", label: "GEO", cadence: "semanal", lagDays: 0, connected: false, connectedBy: "P8" },
] as const satisfies ReadonlyArray<z.infer<typeof sourceDefinitionSchema>>;

export function findSource(key: SourceKey) {
  return SOURCE_CATALOG.find((source) => source.key === key) ?? null;
}

/**
 * Desfase con el que se puede cerrar una ventana: el mayor de las fuentes
 * implicadas. Cerrar antes produce un periodo incompleto que parece una caída.
 */
export function cutoffLagDays(keys: readonly MetricKey[]): number {
  return keys.reduce((worst, key) => Math.max(worst, findMetric(key)?.sourceLagDays ?? 0), 0);
}

/** Una métrica con ventana mínima mayor que el periodo pedido no es interpretable. */
export function isPeriodSufficient(key: MetricKey, period: PeriodKey): boolean {
  const metric = findMetric(key);
  if (!metric) return false;
  return PERIOD_DAYS[period] >= PERIOD_DAYS[metric.minPeriod];
}

export type MetricRow = { value: number; weight?: number };

/**
 * Aplica la regla de agregación declarada. Es la única función que agrega
 * métricas en el monorepo: si una superficie necesita otra regla, la regla se
 * añade aquí y se declara en el catálogo, no se escribe en la superficie.
 *
 * Devuelve `null` cuando no hay nada que agregar, en lugar de cero: un cero es
 * una afirmación sobre el negocio y la ausencia de filas no lo es.
 */
export function aggregateMetric(key: MetricKey, rows: readonly MetricRow[]): number | null {
  const metric = findMetric(key);
  if (!metric) throw new Error(`Métrica «${key}» no declarada en el catálogo`);
  if (!rows.length) return null;

  if (metric.aggregation === "sum") return rows.reduce((total, row) => total + row.value, 0);
  if (metric.aggregation === "latest") return rows[rows.length - 1]!.value;

  const weight = rows.reduce((total, row) => total + (row.weight ?? 0), 0);
  if (weight <= 0) return null;
  const weighted = rows.reduce((total, row) => total + row.value * (row.weight ?? 0), 0);
  return Math.round((weighted / weight) * 10) / 10;
}

/** Resumen del catálogo para la página de metodología y para el estado del proyecto. */
export function summarizeCatalog() {
  return {
    metrics: METRIC_CATALOG.length,
    sources: SOURCE_CATALOG.length,
    connectedSources: SOURCE_CATALOG.filter((source) => source.connected).length,
    timezone: REPORTING_TIMEZONE,
    currency: REPORTING_CURRENCY,
    summable: METRIC_CATALOG.filter((metric) => metric.aggregation === "sum").map((metric) => metric.key),
    weighted: METRIC_CATALOG.filter((metric) => metric.aggregation === "weighted-average").map((metric) => metric.key),
  };
}
