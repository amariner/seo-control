import type { ProjectSlug } from "@seo/contracts";
import type { DailyIngestionSource, IngestionJob } from "./plan";
import type { DeferralReason, FailureKind, Lease } from "./policy";

/**
 * `SyncRun` observable (P3.3).
 *
 * El roadmap pide «datos parciales y observabilidad por SyncRun», y la tabla
 * `sync_runs` existe desde P0 con estado, cobertura y errores. Lo que faltaba
 * es la regla: **qué significa que un ciclo terminó**. Sin ella, un ciclo que
 * escribió 20 de 28 días acaba con estado `complete` porque no lanzó ninguna
 * excepción, y a partir de ahí la interfaz presenta una serie con agujeros como
 * si estuviera al día.
 *
 * Aquí un run no puede declararse completo si algún job quedó fuera, sea por
 * fallo o por aplazamiento. La distinción entre los dos importa y es la razón de
 * que `deferred` no sea un tipo de fallo:
 *
 * - **Fallo**: la fuente fue consultada y no dio el dato. Es una avería.
 * - **Aplazado**: la fuente ni siquiera se consultó, porque no había cuota o
 *   porque otro ciclo tenía el lock. No es una avería: es trabajo pendiente que
 *   el siguiente ciclo recoge, y el día conserva su último snapshot válido.
 *
 * Contarlos juntos haría que agotar la cuota pareciera una caída del proveedor,
 * y separarlos sin impedir el estado `complete` haría que un ciclo a medias
 * pareciera terminado. Por eso están las dos reglas y no una.
 *
 * El registro es puro y en memoria, como el libro de D-030: la interfaz es lo
 * que P3.3 escribirá contra `sync_runs` cuando exista la instancia.
 */

export type SyncRunJobStatus = "inserted" | "unchanged" | "revised" | "failed" | "deferred";

export type SyncRunJobRecord = {
  readonly key: string;
  readonly project: ProjectSlug;
  readonly source: DailyIngestionSource;
  readonly day: string;
  readonly status: SyncRunJobStatus;
  /** Intentos consumidos, el primero incluido. `0` si se aplazó sin llamar. */
  readonly attempts: number;
  /** Espera acumulada por reintentos, en milisegundos. */
  readonly waitedMs: number;
  /** Peticiones cargadas al presupuesto, reintentos incluidos. */
  readonly quotaSpent: number;
  readonly failure: { readonly kind: FailureKind; readonly reason: string } | null;
  readonly deferral: { readonly reason: DeferralReason; readonly detail: string; readonly retryAfterMs: number } | null;
};

/**
 * - `complete`: todos los jobs planificados entraron en el libro.
 * - `partial`: entró parte. Es el estado normal de un ciclo con cuota agotada o
 *   con una fuente intermitente, y **no** es un éxito.
 * - `failed`: se consultó la fuente y no entró ningún día.
 * - `blocked`: no se llegó a consultar nada: otro ciclo tenía el lock o no
 *   quedaba cuota. Se distingue de `failed` porque no hay avería que investigar.
 */
export type SyncRunStatus = "complete" | "partial" | "failed" | "blocked";

export type SyncRunCounters = {
  readonly planned: number;
  readonly inserted: number;
  readonly unchanged: number;
  readonly revised: number;
  readonly failed: number;
  readonly deferred: number;
};

export type SyncRun = {
  readonly id: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly status: SyncRunStatus;
  readonly counters: SyncRunCounters;
  /** Días que quedaron fuera del libro en este ciclo, fallidos o aplazados. */
  readonly pending: number;
  readonly attempts: number;
  /** Intentos que no fueron el primero. Es lo que mide la salud de la fuente. */
  readonly retries: number;
  readonly waitedMs: number;
  readonly quotaSpent: number;
  readonly locks: readonly { readonly key: string; readonly fencingToken: number; readonly owner: string }[];
  readonly blockedLocks: readonly { readonly key: string; readonly heldBy: string; readonly reason: string }[];
  readonly jobs: readonly SyncRunJobRecord[];
  /** `true` solo si todos los lectores del ciclo leen dato real (D-030). */
  readonly realData: boolean;
  /** Frase que la interfaz muestra. Un run parcial lo dice; no lo esconde. */
  readonly disclosure: string;
};

const WRITTEN: ReadonlySet<SyncRunJobStatus> = new Set<SyncRunJobStatus>(["inserted", "unchanged", "revised"]);

/**
 * Acumulador de un ciclo. No decide nada por su cuenta: recibe lo que pasó con
 * cada job y calcula el estado con las reglas de arriba al cerrarse.
 */
export class SyncRunRecorder {
  private readonly records: SyncRunJobRecord[] = [];
  private readonly leases: { key: string; fencingToken: number; owner: string }[] = [];
  private readonly blocked: { key: string; heldBy: string; reason: string }[] = [];

  constructor(
    readonly id: string,
    readonly startedAt: string,
    private readonly planned: number,
  ) {}

  lockAcquired(lease: Lease): void {
    this.leases.push({ key: lease.key, fencingToken: lease.fencingToken, owner: lease.owner });
  }

  lockBlocked(input: { key: string; heldBy: string; reason: string }): void {
    this.blocked.push({ ...input });
  }

  job(
    job: IngestionJob,
    outcome: Omit<SyncRunJobRecord, "key" | "project" | "source" | "day">,
  ): SyncRunJobRecord {
    const record: SyncRunJobRecord = {
      key: job.idempotencyKey,
      project: job.project,
      source: job.source,
      day: job.day,
      ...outcome,
    };
    this.records.push(record);
    return record;
  }

  finish(input: { finishedAt: string; realData: boolean }): SyncRun {
    const counters: SyncRunCounters = {
      planned: this.planned,
      inserted: this.records.filter((record) => record.status === "inserted").length,
      unchanged: this.records.filter((record) => record.status === "unchanged").length,
      revised: this.records.filter((record) => record.status === "revised").length,
      failed: this.records.filter((record) => record.status === "failed").length,
      deferred: this.records.filter((record) => record.status === "deferred").length,
    };

    const written = this.records.filter((record) => WRITTEN.has(record.status)).length;
    // `planned` manda sobre lo registrado: un job que ni siquiera llegó a
    // registrarse cuenta como pendiente. Si no, un ciclo que se interrumpe a
    // mitad se declararía completo por no haber anotado el resto.
    const pending = this.planned - written;

    const attempts = this.records.reduce((total, record) => total + record.attempts, 0);
    const retries = this.records.reduce((total, record) => total + Math.max(0, record.attempts - 1), 0);

    const status: SyncRunStatus =
      pending === 0
        ? "complete"
        : written > 0
          ? "partial"
          : counters.failed > 0
            ? "failed"
            : "blocked";

    return {
      id: this.id,
      startedAt: this.startedAt,
      finishedAt: input.finishedAt,
      status,
      counters,
      pending,
      attempts,
      retries,
      waitedMs: this.records.reduce((total, record) => total + record.waitedMs, 0),
      quotaSpent: this.records.reduce((total, record) => total + record.quotaSpent, 0),
      locks: [...this.leases],
      blockedLocks: [...this.blocked],
      jobs: [...this.records],
      realData: input.realData,
      disclosure: describeSyncRun({ status, counters, pending, realData: input.realData, records: this.records }),
    };
  }
}

function describeSyncRun(input: {
  status: SyncRunStatus;
  counters: SyncRunCounters;
  pending: number;
  realData: boolean;
  records: readonly SyncRunJobRecord[];
}): string {
  const origin = input.realData ? "" : " Los lectores de este ciclo son sintéticos, así que ninguna cifra suya es real.";

  if (input.status === "complete") {
    return `Ciclo completo: ${input.counters.planned} días planificados, todos en el libro (${input.counters.inserted} nuevos, ${input.counters.unchanged} sin cambio, ${input.counters.revised} revisados).${origin}`;
  }

  const causes: string[] = [];
  if (input.counters.failed > 0) {
    const kinds = new Map<FailureKind, number>();
    for (const record of input.records) {
      if (record.failure) kinds.set(record.failure.kind, (kinds.get(record.failure.kind) ?? 0) + 1);
    }
    const detail = [...kinds.entries()].map(([kind, count]) => `${count} ${kind}`).join(", ");
    causes.push(`${input.counters.failed} por fallo de la fuente (${detail})`);
  }
  if (input.counters.deferred > 0) {
    const quota = input.records.filter((record) => record.deferral?.reason === "quota").length;
    const locked = input.records.filter((record) => record.deferral?.reason === "locked").length;
    const detail = [quota ? `${quota} sin cuota` : null, locked ? `${locked} con el lock ocupado` : null].filter(Boolean).join(", ");
    causes.push(`${input.counters.deferred} aplazados (${detail})`);
  }
  const unrecorded = input.pending - input.counters.failed - input.counters.deferred;
  if (unrecorded > 0) causes.push(`${unrecorded} sin registrar, el ciclo no llegó a ejecutarlos`);

  const head =
    input.status === "blocked"
      ? "Ciclo bloqueado: no se consultó la fuente"
      : input.status === "failed"
        ? "Ciclo fallido: no entró ningún día en el libro"
        : "Datos PARCIALES";

  return `${head}. ${input.counters.planned - input.pending} de ${input.counters.planned} días entraron; quedan ${input.pending}: ${causes.join("; ")}. Los días que faltan conservan su último snapshot válido y siguen contando como hueco hasta que un ciclo posterior los ingiera.${origin}`;
}
