import { createHash } from "node:crypto";
import type { ProjectSlug, SourceKey } from "@seo/contracts";
import {
  ingestionJobKey,
  ingestionWindow,
  type DailyIngestionSource,
  type IngestionJob,
} from "./plan";

/**
 * Libro de ingesta por día (P3.2).
 *
 * Existe para poder responder tres preguntas sin base de datos y sin
 * credenciales, que son las tres que el roadmap exige demostrar:
 *
 * 1. ¿Hay duplicados? No puede haberlos: la clave del registro es
 *    `proyecto:fuente:día` y escribir dos veces el mismo día **sustituye**.
 * 2. ¿Hay deriva? Cada día guarda la huella de sus filas. Si la fuente devuelve
 *    lo mismo, la huella no cambia y el registro se marca `unchanged`. Si
 *    cambia, es una revisión declarada —con huella anterior y contador—, no un
 *    número que se mueve en silencio.
 * 3. ¿Qué antigüedad tiene el dato cuando algo falla? El libro solo se escribe
 *    en el éxito, así que un fallo conserva el último snapshot válido por
 *    construcción; `snapshotStaleness` hace visible cuántos días lleva atrás.
 *
 * La implementación es en memoria a propósito. La interfaz `IngestionLedger` es
 * lo que P3.2 implementará contra PostgreSQL cuando exista la instancia; las
 * reglas de idempotencia y deriva quedan aquí, verificadas, en vez de acabar
 * repartidas por sentencias SQL donde nadie las prueba (misma costura que
 * D-028 abrió para la lectura).
 */

/** Lo que una fuente devuelve para un día concreto. */
export type DayBatch = {
  readonly rows: ReadonlyArray<Record<string, string | number | boolean | null>>;
  /** Proporción de la muestra que la fuente pudo cubrir, de 0 a 1. */
  readonly coverage: number;
  readonly warnings?: readonly string[];
};

export type IngestionRecord = {
  readonly project: ProjectSlug;
  readonly source: DailyIngestionSource;
  readonly day: string;
  readonly fingerprint: string;
  readonly rows: number;
  readonly coverage: number;
  /** Primera vez que este día entró en el libro. No cambia con las revisiones. */
  readonly firstIngestedAt: string;
  /** Última vez que el contenido de este día cambió de verdad. */
  readonly lastChangedAt: string;
  /** Veces que la fuente revisó el día después de publicarlo. */
  readonly revisions: number;
  readonly warnings: readonly string[];
};

export type ApplyStatus = "inserted" | "unchanged" | "revised";

export type ApplyResult = {
  readonly status: ApplyStatus;
  readonly record: IngestionRecord;
  /** Huella que había antes. `null` en `inserted`. */
  readonly previousFingerprint: string | null;
};

export interface IngestionLedger {
  apply(job: IngestionJob, batch: DayBatch, at: string): ApplyResult;
  get(project: ProjectSlug, source: DailyIngestionSource, day: string): IngestionRecord | null;
  list(filter?: { project?: ProjectSlug; source?: DailyIngestionSource }): readonly IngestionRecord[];
  /** Día más reciente ingerido con éxito. Es el «último snapshot válido». */
  lastValid(project: ProjectSlug, source: DailyIngestionSource): IngestionRecord | null;
}

/**
 * Huella canónica de las filas de un día.
 *
 * Ordena las claves de cada fila antes de serializar: dos lecturas del mismo día
 * que solo difieran en el orden de las propiedades del JSON son el mismo dato, y
 * marcarlas como revisión inventaría deriva donde no la hay. El orden de las
 * filas sí cuenta como contenido: es la fuente la que lo determina.
 */
export function fingerprintRows(rows: DayBatch["rows"]): string {
  const canonical = rows.map((row) =>
    Object.keys(row)
      .sort()
      .map((key) => [key, row[key] ?? null] as const),
  );
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** Un día vacío o sin cobertura no se guarda: no es un dato, es una ausencia. */
export class EmptyDayBatchError extends Error {
  constructor(readonly job: IngestionJob) {
    super(
      `El día ${job.day} de ${job.source} para ${job.project} llegó vacío o sin cobertura; se conserva el último snapshot válido.`,
    );
    this.name = "EmptyDayBatchError";
  }
}

export class InMemoryIngestionLedger implements IngestionLedger {
  private readonly records = new Map<string, IngestionRecord>();

  apply(job: IngestionJob, batch: DayBatch, at: string): ApplyResult {
    if (batch.rows.length === 0 || batch.coverage <= 0) throw new EmptyDayBatchError(job);
    if (batch.coverage > 1) throw new Error(`Cobertura ${batch.coverage} fuera de rango en ${job.idempotencyKey}`);

    const key = ingestionJobKey(job.project, job.source, job.day);
    const fingerprint = fingerprintRows(batch.rows);
    const previous = this.records.get(key) ?? null;
    const warnings = [...(batch.warnings ?? [])];

    if (!previous) {
      const record: IngestionRecord = {
        project: job.project,
        source: job.source,
        day: job.day,
        fingerprint,
        rows: batch.rows.length,
        coverage: batch.coverage,
        firstIngestedAt: at,
        lastChangedAt: at,
        revisions: 0,
        warnings,
      };
      this.records.set(key, record);
      return { status: "inserted", record, previousFingerprint: null };
    }

    if (previous.fingerprint === fingerprint) {
      // Se actualizan los avisos porque describen la lectura, no el dato; el
      // resto del registro se conserva intacto para que `lastChangedAt` siga
      // significando «cuándo cambió», no «cuándo se comprobó».
      const record: IngestionRecord = { ...previous, warnings };
      this.records.set(key, record);
      return { status: "unchanged", record, previousFingerprint: previous.fingerprint };
    }

    const record: IngestionRecord = {
      ...previous,
      fingerprint,
      rows: batch.rows.length,
      coverage: batch.coverage,
      lastChangedAt: at,
      revisions: previous.revisions + 1,
      warnings,
    };
    this.records.set(key, record);
    return { status: "revised", record, previousFingerprint: previous.fingerprint };
  }

  get(project: ProjectSlug, source: DailyIngestionSource, day: string): IngestionRecord | null {
    return this.records.get(ingestionJobKey(project, source, day)) ?? null;
  }

  list(filter: { project?: ProjectSlug; source?: DailyIngestionSource } = {}): readonly IngestionRecord[] {
    return [...this.records.values()]
      .filter((record) => (filter.project ? record.project === filter.project : true))
      .filter((record) => (filter.source ? record.source === filter.source : true))
      .sort((a, b) =>
        a.project === b.project
          ? a.source === b.source
            ? a.day.localeCompare(b.day)
            : a.source.localeCompare(b.source)
          : a.project.localeCompare(b.project),
      );
  }

  lastValid(project: ProjectSlug, source: DailyIngestionSource): IngestionRecord | null {
    const days = this.list({ project, source });
    return days.length ? days[days.length - 1]! : null;
  }
}

export type SnapshotStaleness = {
  readonly project: ProjectSlug;
  readonly source: DailyIngestionSource;
  /** Día del último snapshot válido. `null` si nunca se ingirió nada. */
  readonly lastValidDay: string | null;
  /** Día que la fuente ya podría haber cerrado en este instante. */
  readonly expectedDay: string;
  /** Días de retraso respecto a `expectedDay`. `null` si no hay snapshot. */
  readonly behindDays: number | null;
  /**
   * Días de la ventana de reprocesado que no tienen registro.
   *
   * Se mide aparte del retraso porque son dos averías distintas: el retraso dice
   * que el dato se quedó atrás, y un hueco dice que falta un día **dentro** del
   * histórico. Un hueco no mueve el último día válido, así que sin esta lista un
   * fallo a mitad de ventana se vería «al día» y el día ausente se leería como
   * una caída de tráfico.
   */
  readonly missingDays: readonly string[];
  readonly stale: boolean;
  /** Frase para la interfaz: hace visible la antigüedad, no la esconde. */
  readonly disclosure: string;
};

const DAY_MS = 86_400_000;

/**
 * Antigüedad del último snapshot válido frente al día que la fuente ya podría
 * haber cerrado. Es la mitad visible del criterio de salida: conservar el dato
 * anterior sin decir de cuándo es equivale a presentarlo como actual.
 */
export function snapshotStaleness(
  ledger: IngestionLedger,
  target: { project: ProjectSlug; source: SourceKey },
  at: Date,
): SnapshotStaleness {
  const window = ingestionWindow(target.source, at);
  const last = ledger.lastValid(target.project, window.source);

  const missingDays: string[] = [];
  const cutoffMs = Date.parse(window.cutoff);
  for (let offset = window.days - 1; offset >= 0; offset -= 1) {
    const day = new Date(cutoffMs - offset * DAY_MS).toISOString().slice(0, 10);
    if (!ledger.get(target.project, window.source, day)) missingDays.push(day);
  }

  if (!last) {
    return {
      project: target.project,
      source: window.source,
      lastValidDay: null,
      expectedDay: window.cutoff,
      behindDays: null,
      missingDays,
      stale: true,
      disclosure: `Sin datos de ${window.source} para ${target.project}: nunca se ha completado una ingesta. El corte disponible sería ${window.cutoff}.`,
    };
  }

  const behindDays = Math.round((cutoffMs - Date.parse(last.day)) / DAY_MS);
  const stale = behindDays > 0;
  const gap = missingDays.length
    ? ` Faltan ${missingDays.length} ${missingDays.length === 1 ? "día" : "días"} dentro de la ventana (${missingDays.join(", ")}): la serie tiene hueco, no una caída.`
    : "";

  return {
    project: target.project,
    source: window.source,
    lastValidDay: last.day,
    expectedDay: window.cutoff,
    behindDays,
    missingDays,
    stale,
    disclosure: stale
      ? `Último dato válido de ${window.source} para ${target.project}: ${last.day}, ${behindDays} ${behindDays === 1 ? "día" : "días"} por detrás del corte disponible (${window.cutoff}).${gap}`
      : `${window.source} para ${target.project} está al día: ${last.day}, el corte más reciente que la fuente publica con ${window.lagDays} ${window.lagDays === 1 ? "día" : "días"} de desfase.${gap}`,
  };
}
