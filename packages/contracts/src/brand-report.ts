import { z } from "zod";
import { marketCodeSchema, projectSlugSchema } from "./schemas";

/**
 * Informe ejecutivo de marca (D-037).
 *
 * Es la ficha `/projects/[slug]` que ven gerencia y dirección: una sola lectura
 * con veredicto, indicadores en lenguaje llano, todos los canales para
 * comparar, gráficos de barras frente a periodos anteriores, dónde ganar, la
 * auditoría de la migración cuando la hay, el plan editorial frente a Google y
 * los próximos pasos.
 *
 * Tiene su propio selector de periodo, más rico que el global (`periodKeySchema`
 * solo admite ventanas móviles): presets de calendario y rango libre. Las dos
 * comparaciones —periodo anterior de igual longitud y mismas fechas del año
 * anterior— se calculan siempre; la interfaz enseña las dos.
 *
 * Las lecturas (`readings`) y los próximos pasos se derivan del dato con reglas
 * fijas y se declaran automáticos: ninguna frase se presenta como decisión
 * humana si nadie la ha revisado (D-025).
 */

// ---------------------------------------------------------------------------
// Periodo
// ---------------------------------------------------------------------------

export const REPORT_PRESETS = [
  { key: "7d", label: "Últimos 7 días", group: "rapidos" },
  { key: "14d", label: "Últimos 14 días", group: "rapidos" },
  { key: "28d", label: "Últimos 28 días", group: "rapidos" },
  { key: "30d", label: "Últimos 30 días", group: "rapidos" },
  { key: "90d", label: "Últimos 90 días", group: "rapidos" },
  { key: "6m", label: "Últimos 6 meses", group: "rapidos" },
  { key: "12m", label: "Últimos 12 meses", group: "rapidos" },
  { key: "semana", label: "Semana pasada", group: "calendario" },
  { key: "este-mes", label: "Este mes", group: "calendario" },
  { key: "mes", label: "Mes pasado", group: "calendario" },
  { key: "este-trimestre", label: "Este trimestre", group: "calendario" },
  { key: "trimestre", label: "Trimestre pasado", group: "calendario" },
  { key: "ytd", label: "Este año", group: "calendario" },
  { key: "ano", label: "Año pasado", group: "calendario" },
  { key: "custom", label: "Personalizado", group: "personalizado" },
] as const;

export type ReportPreset = (typeof REPORT_PRESETS)[number]["key"];
export const reportPresetSchema = z.enum(REPORT_PRESETS.map((preset) => preset.key) as [ReportPreset, ...ReportPreset[]]);

/** Con qué se compara el periodo: el anterior de igual duración o uno elegido a mano. */
export const reportCompareSchema = z.enum(["anterior", "custom"]);
/** Año pasado por fecha (mismo día del mes) o alineado por día de la semana (52 semanas antes). */
export const reportYearAlignSchema = z.enum(["fecha", "semana"]);

/** Primer día que el selector ofrece. GA4 guarda más, pero más allá la comparación interanual deja de tener sentido de negocio. */
export const REPORT_MIN_DATE = "2023-01-01";

export const reportWindowSchema = z.object({
  preset: reportPresetSchema,
  label: z.string(),
  start: z.string().date(),
  end: z.string().date(),
  days: z.number().int().positive(),
  compare: reportCompareSchema,
  previousStart: z.string().date(),
  previousEnd: z.string().date(),
  /** Nombre corto de la comparación para «vs. …». */
  previousLabel: z.string(),
  yearAlign: reportYearAlignSchema,
  previousYearStart: z.string().date(),
  previousYearEnd: z.string().date(),
  previousYearLabel: z.string(),
  /** Grano de los gráficos: diario hasta un mes, semanal hasta seis meses, mensual después. */
  granularity: z.enum(["day", "week", "month"]),
});

export type ReportWindow = z.infer<typeof reportWindowSchema>;
export type ReportRangeInput = {
  range?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  /** Comparación: `anterior` (por defecto) o `custom` con `cfrom`. */
  cmp?: string | undefined;
  cfrom?: string | undefined;
  /** Año pasado: `fecha` (por defecto) o `semana`. */
  yoy?: string | undefined;
};

const DAY = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const parse = (date: string) => Date.parse(`${date}T00:00:00Z`);
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parse(value));

/** Misma fecha un año antes; el 29 de febrero cae en el 28. */
export function shiftYear(date: string, years = -1): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) return iso(Date.UTC(y + years, m, 0));
  return iso(target.getTime());
}

/** Tres barras por tramo: por encima de ~30 tramos el gráfico deja de leerse, así que el grano sube antes. */
const granularityFor = (days: number): ReportWindow["granularity"] => (days <= 31 ? "day" : days <= 190 ? "week" : "month");

/**
 * Rango base de un preset, cerrado en el corte. `null` para `custom`.
 *
 * «Este mes», «este trimestre» y «este año» van del primer día al corte; los
 * «pasados» son periodos completos. La semana empieza en lunes.
 */
export function presetRange(preset: ReportPreset, cutoff: string): { start: string; end: string } | null {
  const end = parse(cutoff);
  const [cy, cm] = cutoff.split("-").map(Number) as [number, number];
  const back = (days: number) => ({ start: iso(end - (days - 1) * DAY), end: cutoff });
  const quarter = Math.floor((cm - 1) / 3);
  switch (preset) {
    case "7d": return back(7);
    case "14d": return back(14);
    case "28d": return back(28);
    case "30d": return back(30);
    case "90d": return back(90);
    case "6m": return back(182);
    case "12m": return back(365);
    case "semana": {
      const weekday = (new Date(end).getUTCDay() + 6) % 7;
      const lastSunday = end - (weekday + 1) * DAY;
      return { start: iso(lastSunday - 6 * DAY), end: iso(lastSunday) };
    }
    case "este-mes": return { start: iso(Date.UTC(cy, cm - 1, 1)), end: cutoff };
    case "mes": return { start: iso(Date.UTC(cy, cm - 2, 1)), end: iso(Date.UTC(cy, cm - 1, 0)) };
    case "este-trimestre": return { start: iso(Date.UTC(cy, quarter * 3, 1)), end: cutoff };
    case "trimestre": return { start: iso(Date.UTC(cy, (quarter - 1) * 3, 1)), end: iso(Date.UTC(cy, quarter * 3, 0)) };
    case "ytd": return { start: iso(Date.UTC(cy, 0, 1)), end: cutoff };
    case "ano": return { start: iso(Date.UTC(cy - 1, 0, 1)), end: iso(Date.UTC(cy - 1, 11, 31)) };
    case "custom": return null;
  }
}

const clampDate = (date: string, min: string, max: string) => (date < min ? min : date > max ? max : date);

/**
 * Traduce la query string a una ventana cerrada en el corte del dato.
 *
 * Tolerante por diseño, como el resto de filtros compartibles: un preset
 * desconocido cae a 90 días y un rango libre inválido o invertido también, en
 * lugar de romper el enlace. Un fin posterior al corte se recorta al corte —la
 * ventana no puede prometer días que la fuente aún no ha publicado—.
 *
 * La comparación personalizada tiene **la misma duración** que el periodo:
 * se elige su inicio y el fin se deduce. Comparar 90 días contra 30 daría
 * variaciones que no significan nada, y los totales se leen como comparables.
 */
export function resolveReportWindow(input: ReportRangeInput, cutoff: string): ReportWindow {
  let preset = reportPresetSchema.catch("90d").parse(input.range ?? "90d");
  let range = presetRange(preset, cutoff);
  if (preset === "custom") {
    if (isDate(input.from) && isDate(input.to) && input.from <= input.to && input.from <= cutoff) {
      const start = clampDate(input.from, REPORT_MIN_DATE, cutoff);
      range = { start, end: clampDate(input.to, start, cutoff) };
    } else {
      preset = "90d";
      range = presetRange("90d", cutoff);
    }
  }
  const { start, end } = range!;
  const days = Math.round((parse(end) - parse(start)) / DAY) + 1;

  let compare = reportCompareSchema.catch("anterior").parse(input.cmp ?? "anterior");
  let previousStart = iso(parse(start) - days * DAY);
  if (compare === "custom") {
    if (isDate(input.cfrom) && input.cfrom >= REPORT_MIN_DATE && iso(parse(input.cfrom) + (days - 1) * DAY) <= cutoff) previousStart = input.cfrom;
    else compare = "anterior";
  }
  const previousEnd = iso(parse(previousStart) + (days - 1) * DAY);

  const yearAlign = reportYearAlignSchema.catch("fecha").parse(input.yoy ?? "fecha");
  const previousYearStart = yearAlign === "semana" ? iso(parse(start) - 364 * DAY) : shiftYear(start);
  const previousYearEnd = yearAlign === "semana" ? iso(parse(end) - 364 * DAY) : shiftYear(end);

  const label = preset === "custom" ? "Personalizado" : REPORT_PRESETS.find((item) => item.key === preset)!.label;
  return reportWindowSchema.parse({
    preset,
    label,
    start,
    end,
    days,
    compare,
    previousStart,
    previousEnd,
    previousLabel: compare === "custom" ? "comparación elegida" : "periodo anterior",
    yearAlign,
    previousYearStart,
    previousYearEnd,
    previousYearLabel: yearAlign === "semana" ? "año pasado (mismo día de la semana)" : "año pasado",
    granularity: granularityFor(days),
  });
}

/** Parámetros de URL que reproducen una ventana. Solo se escriben los que difieren del valor por defecto. */
export function reportWindowParams(window: Pick<ReportWindow, "preset" | "start" | "end" | "compare" | "previousStart" | "yearAlign">): Record<string, string | null> {
  return {
    range: window.preset,
    from: window.preset === "custom" ? window.start : null,
    to: window.preset === "custom" ? window.end : null,
    cmp: window.compare === "custom" ? "custom" : null,
    cfrom: window.compare === "custom" ? window.previousStart : null,
    yoy: window.yearAlign === "semana" ? "semana" : null,
  };
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

const comparable = z.number().nullable();

export const reportKpiSchema = z.object({
  key: z.enum(["web_sessions", "search_sessions", "search_users", "search_leads", "clicks", "impressions", "ctr", "nonbrand_share"]),
  label: z.string(),
  /** Una frase que explica el indicador sin jerga. */
  help: z.string(),
  unit: z.enum(["number", "percent"]),
  value: z.number().nullable(),
  previous: comparable,
  previousYear: comparable,
  source: z.enum(["ga4", "gsc"]),
});

export const reportSeriesPointSchema = z.object({
  /** Inicio del tramo (día, lunes de la semana o primer día del mes). */
  bucket: z.string().date(),
  label: z.string(),
  current: z.number().nullable(),
  previous: z.number().nullable(),
  previousYear: z.number().nullable(),
});

export const reportChannelSchema = z.object({
  key: z.string(),
  label: z.string(),
  sessions: z.number(),
  previous: z.number(),
  previousYear: z.number(),
  leads: z.number(),
  share: z.number(),
  /** Media diaria de visitas por tramo del periodo, para la mini gráfica (D-045). */
  trend: z.array(z.number()),
});

export const reportMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  label: z.string(),
  searchSessions: z.number().nullable(),
  searchSessionsPreviousYear: z.number().nullable(),
  clicks: z.number().nullable(),
  clicksPreviousYear: z.number().nullable(),
});

export const reportMarketSchema = z.object({
  /** Tier 1 usa el código del contrato global; el resto, el prefijo en mayúsculas (D-039). */
  code: z.string().regex(/^[A-Z]{2,4}$/),
  name: z.string(),
  tier1: z.boolean(),
  definition: z.string(),
  sessions: z.number(),
  previous: z.number(),
  previousYear: z.number(),
  leads: z.number(),
  clicks: z.number().nullable(),
  clicksPrevious: z.number().nullable(),
});

export const reportOpportunitySchema = z.object({
  query: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  position: z.number(),
  ctr: z.number(),
  expectedCtr: z.number(),
  potentialClicks: z.number(),
  page: z.string().nullable(),
  action: z.string(),
});

/** Una fila de Search Console por consulta sin marca y URL, sin agrupar ni estimar. */
export const reportSearchQuerySchema = z.object({
  query: z.string(),
  page: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  position: z.number(),
  /** Porcentaje (0–100), igual que el CTR de los indicadores del informe. */
  ctr: z.number(),
});

export const reportPageSchema = reportSearchQuerySchema.omit({ query: true }).extend({
  /** Nulo si falta la comparación o si la URL no figura en su muestra; nunca se infiere un cero. */
  previousClicks: z.number().nullable(),
});

const reportExplorerSampleSchema = z.object({
  rowLimit: z.number().int().positive(),
  rowsReturned: z.number().int().nonnegative(),
  /** Distingue una consulta sin filas de un fallo o periodo fuera de la retención de GSC. */
  available: z.boolean(),
  /** Posible truncamiento. No alcanzar el límite tampoco garantiza todas las filas de GSC. */
  limitReached: z.boolean(),
});

/** Muestras de GSC: las consultas anónimas y otras filas pueden quedar fuera aun bajo el límite. */
export const reportExplorerCoverageSchema = z.object({
  searchQueries: reportExplorerSampleSchema.extend({ scope: z.literal("non_brand_query_page") }),
  pages: reportExplorerSampleSchema.extend({ scope: z.literal("all_pages") }),
  previousPages: reportExplorerSampleSchema.extend({ scope: z.literal("all_pages") }),
});

export const reportConvertingPageSchema = z.object({
  page: z.string(),
  sessions: z.number(),
  leads: z.number(),
  rate: z.number(),
  queries: z.array(z.string()),
});

export const reportContentMoverSchema = z.object({
  page: z.string(),
  before: z.number(),
  now: z.number(),
  change: z.number().nullable(),
});

export const reportMigrationUrlSchema = z.object({
  oldUrl: z.string(),
  clicksBefore: z.number(),
  clicksAfter: z.number(),
  httpStatus: z.number().nullable(),
  redirectsTo: z.string().nullable(),
  hops: z.number().int().nonnegative(),
  finalStatus: z.number().nullable(),
  /** Clics de la URL de destino desde la migración. */
  targetClicks: z.number().nullable(),
  /** (clics de la antigua + destino después) / clics de la antigua antes. */
  recovery: z.number().nullable(),
  verdict: z.enum(["recupera", "recupera-parcial", "no-recupera", "sin-redireccion", "destino-roto", "cadena", "sin-comprobar"]),
});

export const reportMigrationSchema = z.object({
  date: z.string().date(),
  label: z.string(),
  /** Ventanas iguales antes y después de la fecha de la migración. */
  beforeStart: z.string().date(),
  beforeEnd: z.string().date(),
  afterStart: z.string().date(),
  afterEnd: z.string().date(),
  siteClicksBefore: z.number(),
  siteClicksAfter: z.number(),
  lostUrls: z.number().int(),
  lostClicks: z.number(),
  checked: z.number().int(),
  urls: z.array(reportMigrationUrlSchema),
});

export const reportEditorialSchema = z.object({
  id: z.string(),
  month: z.string().nullable(),
  title: z.string(),
  type: z.string(),
  status: z.string(),
  keyword: z.string().nullable(),
  /** False si la consulta no pudo comprobarse: los ceros numéricos no son una medición. */
  measured: z.boolean(),
  position: z.number().nullable(),
  clicks: z.number(),
  impressions: z.number(),
  page: z.string().nullable(),
  situation: z.enum(["sin-presencia", "lejos", "cerca", "ya-top"]),
  advice: z.string(),
});

export const reportReadingSchema = z.array(z.string());

/**
 * Versión de la forma del informe. Entra en las claves de caché: sin ella, un
 * cambio de estructura desplegado seguiría sirviendo seis horas el informe
 * anterior guardado.
 */
export const BRAND_REPORT_VERSION = "2026-09-24.12";

/**
 * Por qué «Visitas SEO» (GA4) y «Clics en Google» (Search Console) no coinciden
 * (D-045): GA4 cuenta sesiones de todos los buscadores; Search Console, clics en
 * la búsqueda web de Google. Todo del periodo actual y del mismo mercado.
 */
export const reportSearchReconciliationSchema = z.object({
  googleSessions: z.number().nullable(),
  otherEngineSessions: z.number().nullable(),
  /** Otros buscadores con más sesiones, agrupados por nombre (Bing, Yahoo…). */
  engines: z.array(z.object({ label: z.string(), sessions: z.number(), previous: z.number() })),
  googleWebClicks: z.number().nullable(),
  googleImageClicks: z.number().nullable(),
});
export type ReportSearchReconciliation = z.infer<typeof reportSearchReconciliationSchema>;

/**
 * Keywords posicionadas (D-045): búsquedas de Google con impresiones en el
 * periodo y su reparto por posición media. Search Console omite las consultas
 * anónimas y devuelve como mucho `rowLimit` filas.
 */
export const reportKeywordRankingSchema = z.object({
  total: z.number(),
  /** Posición media ≤ 3. */
  top3: z.number(),
  /** Posición media > 3 y ≤ 20. */
  top20: z.number(),
  /** Posición media > 20. */
  rest: z.number(),
  /** Keywords que no contienen la marca propia ni la paraguas. */
  nonBrand: z.number(),
  previousTotal: z.number().nullable(),
  rowLimit: z.number(),
  limitReached: z.boolean(),
});
export type ReportKeywordRanking = z.infer<typeof reportKeywordRankingSchema>;

/**
 * Visitas desde asistentes de IA (D-046): sesiones de GA4 cuyo origen es un
 * asistente (ChatGPT, Gemini…), de cualquier canal, en el mismo mercado.
 */
export const reportAiTrafficSchema = z.object({
  total: z.number(),
  previousTotal: z.number(),
  assistants: z.array(z.object({ key: z.string(), label: z.string(), sessions: z.number(), previous: z.number() })),
});
export type ReportAiTraffic = z.infer<typeof reportAiTrafficSchema>;

/** Usuarios SEO nuevos y recurrentes del periodo (D-045). Recurrentes = total − nuevos. */
export const reportUserMixSchema = z.object({
  newUsers: z.number(),
  returningUsers: z.number(),
  /** % de nuevos en el periodo anterior, para la variación en puntos. */
  previousNewShare: z.number().nullable(),
});
export type ReportUserMix = z.infer<typeof reportUserMixSchema>;

export const brandReportSchema = z.object({
  generatedAt: z.string().datetime(),
  mode: z.literal("live"),
  brand: projectSlugSchema,
  /** `all` o el código de uno de `markets`. */
  market: z.string(),
  window: reportWindowSchema,
  cutoff: z.string().date(),
  /** Primer día que Search Console conserva. Antes, GSC no tiene dato. */
  gscFloor: z.string().date(),
  verdict: z.object({ tone: z.enum(["good", "warn", "bad"]), headline: z.string(), detail: z.string() }),
  kpis: z.array(reportKpiSchema),
  searchReconciliation: reportSearchReconciliationSchema.nullable(),
  keywordRanking: reportKeywordRankingSchema.nullable(),
  aiTraffic: reportAiTrafficSchema.nullable(),
  userMix: reportUserMixSchema.nullable(),
  /** Lecturas automáticas por bloque. Siempre declaradas como tales en la interfaz. */
  readings: z.record(z.string(), reportReadingSchema),
  channels: z.array(reportChannelSchema),
  searchSeries: z.array(reportSeriesPointSchema),
  clickSeries: z.array(reportSeriesPointSchema),
  /** Usuarios SEO por tramo: suma de usuarios diarios, solo para la mini gráfica (D-045). */
  usersSeries: z.array(reportSeriesPointSchema),
  /** Impresiones de Google por tramo (misma consulta diaria que `clickSeries`). */
  impressionsSeries: z.array(reportSeriesPointSchema),
  /** Visitas de todos los canales por tramo (GA4), para «Tráfico total». */
  webSeries: z.array(reportSeriesPointSchema),
  months: z.array(reportMonthSchema),
  annotations: z.array(z.object({ id: z.string(), date: z.string().date(), label: z.string(), type: z.string() })),
  funnel: z.object({ impressions: z.number().nullable(), clicks: z.number().nullable(), searchSessions: z.number(), leads: z.number(), leadEvent: z.string().nullable(), leadEventShare: z.number().nullable() }),
  markets: z.array(reportMarketSchema),
  opportunities: z.array(reportOpportunitySchema),
  searchQueries: z.array(reportSearchQuerySchema),
  pages: z.array(reportPageSchema),
  explorerCoverage: reportExplorerCoverageSchema,
  convertingPages: z.array(reportConvertingPageSchema),
  contentUp: z.array(reportContentMoverSchema),
  contentDown: z.array(reportContentMoverSchema),
  migration: reportMigrationSchema.nullable(),
  editorial: z.array(reportEditorialSchema),
  nextSteps: z.array(z.object({ title: z.string(), why: z.string(), area: z.enum(["tecnico", "contenido", "editorial", "medicion"]) })),
  dataQuality: z.array(z.object({ tone: z.enum(["info", "warn"]), text: z.string() })),
  sources: z.array(z.object({ source: z.enum(["ga4", "gsc"]), ok: z.boolean(), note: z.string() })),
});

export type BrandReport = z.infer<typeof brandReportSchema>;
export type ReportKpi = z.infer<typeof reportKpiSchema>;
export type ReportSeriesPoint = z.infer<typeof reportSeriesPointSchema>;
export type ReportEditorial = z.infer<typeof reportEditorialSchema>;
