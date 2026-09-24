import { findSource, projectSlugSchema, sourceKeySchema, type ProjectSlug, type SourceKey } from "@seo/contracts";

/**
 * Planificación de la ingesta diaria (P3.2).
 *
 * El problema que resuelve: `SyncOrchestrator` (P0) trata una ventana de varios
 * días como una sola unidad de trabajo. Su clave de idempotencia es
 * `proyecto:fuente:corte`, así que reprocesar siete días es *un* commit cuyo
 * contenido depende del corte del reloj. Consecuencia práctica: al día
 * siguiente, con otro corte, esos mismos siete días se vuelven a escribir bajo
 * una clave nueva y nada impide que convivan dos versiones del mismo día. El
 * criterio del roadmap —«jobs proyecto x fuente, D-3, reprocesado de siete días
 * e idempotencia»— exige que la unidad sea el día, no la ventana.
 *
 * Aquí el plan es puro y determinista: mismas entradas, mismos jobs, misma
 * clave. Eso es lo que permite ejecutar cuatro ciclos y comprobar que no
 * aparecen duplicados ni deriva (criterio de salida de P3) **antes** de tener
 * credenciales de GA4 y Search Console. Cuando lleguen, lo único que cambia es
 * quién lee el día; el reparto del trabajo ya estará verificado.
 *
 * El desfase no se escribe aquí: sale de `SOURCE_CATALOG` (D-029). El «D-3» del
 * roadmap es el desfase de Search Console, no una constante global; GA4 publica
 * con uno. Fijar 3 para las dos fuentes cerraría el día de GA4 dos días más
 * tarde de lo necesario y, peor, dejaría el desfase declarado en dos sitios que
 * pueden divergir.
 */

/** Días que se reprocesan en cada ciclo, corte incluido. */
export const REPROCESS_DAYS = 7;

const DAY_MS = 86_400_000;

/**
 * Fuente cuya cadencia es diaria. Es el alcance de P3.2: GA4 y Search Console.
 * Las semanales (SEMrush, CrUX, PageSpeed) llegan en P3.3 con su propio anclaje
 * de semana, y no se inventa aquí.
 */
export type DailyIngestionSource = Extract<SourceKey, "ga4" | "gsc">;

/**
 * Fuente pedida que este planificador no sabe planificar todavía. Se distingue
 * de un error cualquiera para que quien la pida sepa **en qué fase** entra, en
 * vez de recibir «fuente no soportada» (misma regla que
 * `RepositoryUnavailableError` en D-028).
 */
export class IngestionSourceNotPlannableError extends Error {
  readonly source: SourceKey;
  readonly cadence: string;
  readonly phase: string;

  constructor(source: SourceKey, cadence: string, phase: string) {
    super(
      `La fuente «${source}» tiene cadencia ${cadence} y este planificador solo reparte trabajo diario (P3.2: GA4 y Search Console).`,
    );
    this.name = "IngestionSourceNotPlannableError";
    this.source = source;
    this.cadence = cadence;
    this.phase = phase;
  }
}

/**
 * Por qué existe el job.
 *
 * - `cutoff`: el día más reciente que la fuente ya puede cerrar.
 * - `reprocess`: uno de los días anteriores de la ventana. La fuente los revisa
 *   después de publicarlos, así que volver a leerlos no es trabajo redundante:
 *   es la única forma de que el histórico converja.
 */
export type IngestionJobKind = "cutoff" | "reprocess";

export type IngestionJob = {
  readonly project: ProjectSlug;
  readonly source: DailyIngestionSource;
  /** Día que ingiere este job, en `YYYY-MM-DD`. Un job es exactamente un día. */
  readonly day: string;
  readonly kind: IngestionJobKind;
  /**
   * Clave estable de la unidad de trabajo. Depende del día, nunca del reloj:
   * dos ciclos distintos que cubran el mismo día producen la misma clave y por
   * tanto no pueden escribirlo dos veces.
   */
  readonly idempotencyKey: string;
};

export type IngestionWindow = {
  readonly source: DailyIngestionSource;
  /** Día más reciente cerrable: hoy menos el desfase declarado por la fuente. */
  readonly cutoff: string;
  /** Primer día de la ventana. `start..cutoff` son `REPROCESS_DAYS` días. */
  readonly start: string;
  readonly days: number;
  /** Desfase leído del catálogo, no escrito aquí. */
  readonly lagDays: number;
};

export type IngestionPlan = {
  readonly requestedAt: string;
  readonly windows: readonly IngestionWindow[];
  /** Ordenados por proyecto, fuente y día ascendente. El orden es parte del contrato. */
  readonly jobs: readonly IngestionJob[];
};

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** `true` si la fuente tiene cadencia diaria en el catálogo. */
export function isDailyIngestionSource(source: SourceKey): source is DailyIngestionSource {
  return findSource(source)?.cadence === "diaria";
}

/**
 * Ventana de la fuente a partir del catálogo. Falla si la fuente no es diaria.
 */
export function ingestionWindow(source: SourceKey, now: Date): IngestionWindow {
  const definition = findSource(source);
  if (!definition) throw new Error(`Fuente «${source}» no declarada en el catálogo`);
  if (!isDailyIngestionSource(source)) {
    throw new IngestionSourceNotPlannableError(source, definition.cadence, definition.connectedBy);
  }

  const cutoffMs = startOfUtcDay(now) - definition.lagDays * DAY_MS;
  return {
    source,
    cutoff: isoDay(cutoffMs),
    start: isoDay(cutoffMs - (REPROCESS_DAYS - 1) * DAY_MS),
    days: REPROCESS_DAYS,
    lagDays: definition.lagDays,
  };
}

export function ingestionJobKey(project: ProjectSlug, source: DailyIngestionSource, day: string): string {
  return `${project}:${source}:${day}`;
}

/**
 * Expande proyecto x fuente x día. No consulta nada: el plan describe el trabajo
 * que toca, y decidir si un día ya está ingerido es del libro (`ledger.ts`).
 * Separarlo es lo que permite comprobar que el plan es idéntico en los cuatro
 * ciclos aunque el resultado de cada ciclo no lo sea.
 */
export function planIngestion(input: {
  readonly projects: readonly ProjectSlug[];
  readonly sources: readonly SourceKey[];
  readonly requestedAt: string;
}): IngestionPlan {
  const now = new Date(input.requestedAt);
  if (Number.isNaN(now.getTime())) throw new Error(`«${input.requestedAt}» no es un instante ISO válido`);
  if (input.projects.length === 0) throw new Error("Un plan de ingesta sin proyectos no describe trabajo alguno");
  if (input.sources.length === 0) throw new Error("Un plan de ingesta sin fuentes no describe trabajo alguno");

  // Las entradas se validan aunque el tipo ya las declare. El primer ensayo de
  // `pnpm ingest:dry-run` pasó `PILOT_PROJECTS` —que son objetos `Brand`, no
  // slugs— y el plan no falló: interpoló cada objeto como «[object Object]», las
  // dos marcas colapsaron en la misma clave y 28 jobs se convirtieron en 14 sin
  // un solo error. Una clave de idempotencia construida por interpolación tiene
  // que rechazar lo que no es un slug, o dedupica marcas distintas en silencio.
  const projects = input.projects.map((project) => projectSlugSchema.parse(project));
  const sources = input.sources.map((source) => sourceKeySchema.parse(source));
  if (new Set(projects).size !== projects.length) throw new Error(`Proyectos repetidos en el plan: ${projects.join(", ")}`);
  if (new Set(sources).size !== sources.length) throw new Error(`Fuentes repetidas en el plan: ${sources.join(", ")}`);

  const windows = sources.map((source) => ingestionWindow(source, now));
  const jobs: IngestionJob[] = [];

  for (const project of projects) {
    for (const window of windows) {
      const cutoffMs = Date.parse(window.cutoff);
      for (let offset = window.days - 1; offset >= 0; offset -= 1) {
        const day = isoDay(cutoffMs - offset * DAY_MS);
        jobs.push({
          project,
          source: window.source,
          day,
          kind: offset === 0 ? "cutoff" : "reprocess",
          idempotencyKey: ingestionJobKey(project, window.source, day),
        });
      }
    }
  }

  return { requestedAt: input.requestedAt, windows, jobs };
}
