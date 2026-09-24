import type { ProjectSlug } from "@seo/contracts";
import {
  EmptyDayBatchError,
  snapshotStaleness,
  type ApplyStatus,
  type DayBatch,
  type IngestionLedger,
  type SnapshotStaleness,
} from "./ledger";
import type { DailyIngestionSource, IngestionJob, IngestionPlan } from "./plan";
import {
  DEFAULT_RETRY_POLICY,
  InMemoryLeaseLock,
  InMemoryQuotaLedger,
  classifyFailure,
  shouldRetry,
  syncRunLockKey,
  type DeferralReason,
  type Lease,
  type QuotaLedger,
  type RetryPolicy,
  type SyncLock,
} from "./policy";
import { SyncRunRecorder, type SyncRun, type SyncRunJobRecord } from "./run";

/**
 * Ejecución de un ciclo de ingesta diaria (P3.2).
 *
 * Un ciclo recorre los jobs del plan, pide a la fuente el día que le toca y lo
 * aplica al libro. Lo que hace que esto sea verificable hoy es que la lectura
 * está detrás de una interfaz de un solo método: el ciclo no sabe si el día
 * viene de GA4, de Search Console o de un lector determinista de pruebas, y por
 * tanto las reglas —idempotencia por día, revisión declarada, conservación del
 * último snapshot válido y antigüedad visible— se comprueban sin credenciales.
 *
 * Reglas que el ciclo no negocia:
 *
 * - Un job que falla **no** aborta el ciclo. Si Search Console devuelve un
 *   error en un día del reprocesado, los otros seis días y las demás marcas
 *   siguen entrando; el fallo se registra y el día conserva su dato anterior.
 * - Un ciclo nunca declara dato real por su cuenta: `realData` sale de lo que
 *   declara cada lector. Mientras los lectores sean sintéticos, el informe lo
 *   dice (regla de AGENTS.md y misma disciplina que `describe()` en D-028).
 * - Una fuente planificada sin lector configurado es un error de configuración,
 *   no un job que se salta: saltarlo dejaría un hueco en el histórico que
 *   parecería una caída de tráfico.
 */

export type DailyReaderDescription = {
  readonly source: DailyIngestionSource;
  readonly label: string;
  /** `false` mientras el lector no consulte la propiedad real del proyecto. */
  readonly realData: boolean;
  /** Frase que el informe y la interfaz muestran sobre el origen del dato. */
  readonly disclosure: string;
};

/**
 * Lector de un día de una fuente diaria. Un método, un día: es lo que permite
 * que la unidad de idempotencia y la unidad de lectura coincidan.
 */
export interface DailySourceReader {
  describe(): DailyReaderDescription;
  readDay(input: { project: ProjectSlug; day: string }): Promise<DayBatch>;
}

export type IngestionJobOutcome =
  | { readonly job: IngestionJob; readonly status: ApplyStatus; readonly fingerprint: string }
  | { readonly job: IngestionJob; readonly status: "failed"; readonly reason: string }
  | { readonly job: IngestionJob; readonly status: "deferred"; readonly reason: string; readonly deferral: DeferralReason };

export type IngestionCycleReport = {
  readonly requestedAt: string;
  readonly ranAt: string;
  readonly jobs: number;
  readonly inserted: number;
  readonly unchanged: number;
  readonly revised: number;
  readonly failed: number;
  /** Jobs que ni se consultaron: sin cuota o con el lock ocupado. No son averías. */
  readonly deferred: number;
  readonly outcomes: readonly IngestionJobOutcome[];
  /** Antigüedad del último snapshot válido por proyecto y fuente. */
  readonly staleness: readonly SnapshotStaleness[];
  /** `true` solo si **todos** los lectores del ciclo leen dato real. */
  readonly realData: boolean;
  readonly readers: readonly DailyReaderDescription[];
  /** Observabilidad del ciclo: estado, intentos, cuota, locks y parcialidad (P3.3). */
  readonly run: SyncRun;
};

export class MissingReaderError extends Error {
  constructor(readonly source: DailyIngestionSource) {
    super(
      `El plan incluye la fuente «${source}» y no hay lector configurado para ella. Un ciclo no puede saltarse una fuente: dejaría un hueco en el histórico indistinguible de una caída.`,
    );
    this.name = "MissingReaderError";
  }
}

/**
 * Política de ejecución del ciclo (P3.3). Todo es opcional: sin ella el ciclo
 * se comporta como en D-030, con un intento por job, sin presupuesto y sin
 * lock. Con ella, el mismo ciclo respeta cuota, reintenta lo que merece la pena
 * y no se pisa con otro que corra a la vez.
 */
export type IngestionExecutionPolicy = {
  /** Presupuesto de peticiones. `null` desactiva el control; omitirlo lo activa. */
  readonly quota?: QuotaLedger | null;
  readonly retry?: RetryPolicy | null;
  /** Lock por `proyecto x fuente`. `null` lo desactiva. */
  readonly lock?: { readonly registry: SyncLock; readonly owner: string; readonly ttlMs?: number } | null;
  /** Reloj del ciclo. Por defecto el propio `ranAt`, para que el informe sea reproducible. */
  readonly now?: () => Date;
  /** Espera entre reintentos. Se inyecta para que las pruebas no duerman de verdad. */
  readonly wait?: (ms: number) => Promise<void>;
  /** Dispersión del backoff. Se inyecta para que el reintento sea determinista al probarlo. */
  readonly random?: () => number;
  readonly runId?: string;
};

const DEFAULT_LOCK_TTL_MS = 900_000;

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runIngestionCycle(input: {
  readonly plan: IngestionPlan;
  readonly readers: ReadonlyMap<DailyIngestionSource, DailySourceReader>;
  readonly ledger: IngestionLedger;
  /** Instante del ciclo. Explícito para que el informe sea reproducible. */
  readonly ranAt: string;
  readonly policy?: IngestionExecutionPolicy;
}): Promise<IngestionCycleReport> {
  const planned = new Set(input.plan.jobs.map((job) => job.source));
  for (const source of planned) {
    if (!input.readers.has(source)) throw new MissingReaderError(source);
  }

  const policy = input.policy ?? {};
  const quota = policy.quota === null ? null : (policy.quota ?? new InMemoryQuotaLedger());
  const retryPolicy = policy.retry === null ? null : (policy.retry ?? DEFAULT_RETRY_POLICY);
  const lockConfig = policy.lock === null ? null : (policy.lock ?? { registry: new InMemoryLeaseLock(), owner: `cycle:${input.ranAt}` });
  const now = policy.now ?? (() => new Date(input.ranAt));
  const wait = policy.wait ?? sleep;
  const random = policy.random;

  const recorder = new SyncRunRecorder(policy.runId ?? `run:${input.ranAt}`, input.ranAt, input.plan.jobs.length);

  const outcomes: IngestionJobOutcome[] = [];
  const counters: Record<ApplyStatus | "failed" | "deferred", number> = {
    inserted: 0,
    unchanged: 0,
    revised: 0,
    failed: 0,
    deferred: 0,
  };

  // El lock se toma por `proyecto x fuente`, que es el alcance en el que dos
  // ciclos simultáneos se pisarían: la unidad de escritura es el día, pero la
  // ventana de reprocesado se solapa entera entre un ciclo y el siguiente.
  const leases = new Map<string, Lease>();
  const blockedPairs = new Set<string>();
  if (lockConfig) {
    const pairs = new Map<string, { project: ProjectSlug; source: DailyIngestionSource }>();
    for (const job of input.plan.jobs) pairs.set(`${job.project}:${job.source}`, { project: job.project, source: job.source });
    for (const [id, pair] of pairs) {
      const key = syncRunLockKey(pair.project, pair.source);
      const attempt = lockConfig.registry.acquire({
        key,
        owner: lockConfig.owner,
        ttlMs: lockConfig.ttlMs ?? DEFAULT_LOCK_TTL_MS,
        now: now(),
      });
      if (attempt.acquired) {
        leases.set(id, attempt.lease);
        recorder.lockAcquired(attempt.lease);
      } else {
        blockedPairs.add(id);
        recorder.lockBlocked({ key, heldBy: attempt.heldBy, reason: attempt.reason });
      }
    }
  }

  try {
    for (const job of input.plan.jobs) {
      const pairId = `${job.project}:${job.source}`;
      const reader = input.readers.get(job.source)!;
      const lease = leases.get(pairId) ?? null;

      if (blockedPairs.has(pairId)) {
        const detail = `Otro ciclo sostiene el lock de ${job.source} para ${job.project}; el día ${job.day} se aplaza y conserva su último snapshot válido.`;
        counters.deferred += 1;
        outcomes.push({ job, status: "deferred", reason: detail, deferral: "locked" });
        recorder.job(job, { status: "deferred", attempts: 0, waitedMs: 0, quotaSpent: 0, failure: null, deferral: { reason: "locked", detail, retryAfterMs: 0 } });
        continue;
      }

      const executed = await executeJob({ job, reader, ledger: input.ledger, ranAt: input.ranAt, quota, retryPolicy, lease, lock: lockConfig?.registry ?? null, now, wait, random });
      counters[executed.status] += 1;
      recorder.job(job, executed.record);

      if (executed.status === "deferred") {
        outcomes.push({ job, status: "deferred", reason: executed.reason, deferral: executed.record.deferral!.reason });
      } else if (executed.status === "failed") {
        outcomes.push({ job, status: "failed", reason: executed.reason });
      } else {
        outcomes.push({ job, status: executed.status, fingerprint: executed.fingerprint! });
      }
    }
  } finally {
    if (lockConfig) for (const lease of leases.values()) lockConfig.registry.release(lease);
  }

  const pairs = new Map<string, { project: ProjectSlug; source: DailyIngestionSource }>();
  for (const job of input.plan.jobs) pairs.set(`${job.project}:${job.source}`, { project: job.project, source: job.source });

  const readers = [...planned].map((source) => input.readers.get(source)!.describe());
  const ranAtDate = new Date(input.ranAt);
  const realData = readers.length > 0 && readers.every((reader) => reader.realData);

  return {
    requestedAt: input.plan.requestedAt,
    ranAt: input.ranAt,
    jobs: input.plan.jobs.length,
    inserted: counters.inserted,
    unchanged: counters.unchanged,
    revised: counters.revised,
    failed: counters.failed,
    deferred: counters.deferred,
    outcomes,
    staleness: [...pairs.values()].map((pair) => snapshotStaleness(input.ledger, pair, ranAtDate)),
    realData,
    readers,
    run: recorder.finish({ finishedAt: now().toISOString(), realData }),
  };
}

type JobExecution = {
  readonly status: ApplyStatus | "failed" | "deferred";
  readonly reason: string;
  readonly fingerprint?: string;
  readonly record: Omit<SyncRunJobRecord, "key" | "project" | "source" | "day">;
};

/**
 * Un job, con cuota, reintentos y ficha de lock.
 *
 * El orden importa y no es arbitrario:
 *
 * 1. Se **reserva** cuota antes de cada intento, reintentos incluidos. Sin
 *    reserva no se llama a la fuente: el job se aplaza, no falla.
 * 2. Se clasifica el fallo antes de decidir el reintento. Un permanente sale a
 *    la primera; uno desconocido tiene menos intentos que uno transitorio.
 * 3. Se comprueba la ficha del lock **justo antes de escribir**, no al empezar.
 *    Entre la lectura y la escritura pueden pasar minutos: si el arrendamiento
 *    caducó y otro ciclo tomó el relevo, esta escritura llega tarde y se
 *    descarta en vez de pisar la suya.
 */
async function executeJob(input: {
  job: IngestionJob;
  reader: DailySourceReader;
  ledger: IngestionLedger;
  ranAt: string;
  quota: QuotaLedger | null;
  retryPolicy: RetryPolicy | null;
  lease: Lease | null;
  lock: SyncLock | null;
  now: () => Date;
  wait: (ms: number) => Promise<void>;
  random?: () => number;
}): Promise<JobExecution> {
  const { job } = input;
  let attempts = 0;
  let waitedMs = 0;
  let quotaSpent = 0;

  for (;;) {
    if (input.quota) {
      const decision = input.quota.reserve(job.source, input.now());
      if (!decision.granted) {
        const detail =
          attempts === 0
            ? `${decision.reason} El día ${job.day} de ${job.project} se aplaza sin consultar la fuente y conserva su último snapshot válido.`
            : `${decision.reason} El reintento del día ${job.day} de ${job.project} no cabe en el presupuesto.`;
        if (attempts === 0) {
          return {
            status: "deferred",
            reason: detail,
            record: { status: "deferred", attempts, waitedMs, quotaSpent, failure: null, deferral: { reason: "quota", detail, retryAfterMs: decision.retryAfterMs } },
          };
        }
        return {
          status: "failed",
          reason: detail,
          record: { status: "failed", attempts, waitedMs, quotaSpent, failure: { kind: "rate-limited", reason: detail }, deferral: null },
        };
      }
      quotaSpent += 1;
    }

    attempts += 1;
    try {
      const batch = await input.reader.readDay({ project: job.project, day: job.day });
      // La ficha se comprueba aquí, con la lectura ya en la mano y antes de
      // tocar el libro. Comprobarla al principio del job no demostraría nada:
      // lo que hay que impedir es la escritura tardía, no la lectura tardía.
      if (input.lease && input.lock) input.lock.assertHolds(input.lease, input.now());
      const result = input.ledger.apply(job, batch, input.ranAt);
      return {
        status: result.status,
        reason: "",
        fingerprint: result.record.fingerprint,
        record: { status: result.status, attempts, waitedMs, quotaSpent, failure: null, deferral: null },
      };
    } catch (error) {
      const classification = classifyFailure(error);
      // Un día vacío no es una avería de la fuente que se arregle esperando: es
      // una ausencia declarada por el libro (D-030). Reintentarla gastaría
      // cuota para volver a recibir la misma ausencia.
      const permanentByShape = error instanceof EmptyDayBatchError;
      const decision =
        input.retryPolicy && !permanentByShape
          ? shouldRetry({ attempt: attempts, classification, policy: input.retryPolicy, waitedMs, random: input.random })
          : { retry: false, delayMs: 0, reason: permanentByShape ? "Día vacío o sin cobertura: no es un fallo que se arregle reintentando." : "Reintentos desactivados en este ciclo." };

      if (!decision.retry) {
        const reason = `${classification.reason} (${decision.reason})`;
        return {
          status: "failed",
          reason,
          record: {
            status: "failed",
            attempts,
            waitedMs,
            quotaSpent,
            failure: { kind: permanentByShape ? "permanent" : classification.kind, reason },
            deferral: null,
          },
        };
      }

      waitedMs += decision.delayMs;
      await input.wait(decision.delayMs);
    }
  }
}

/**
 * Lector determinista y **declaradamente sintético**.
 *
 * No imita a GA4 ni a Search Console: produce una fila por día derivada del
 * proyecto y la fecha, de modo que dos ciclos del mismo día devuelvan lo mismo.
 * Su función es demostrar las reglas del ciclo —y permitir desarrollar las
 * pantallas de observabilidad de P3 sin credenciales—, no aproximar magnitudes.
 * `realData: false` es lo que impide que un informe suyo se presente como real.
 */
export class SyntheticDailyReader implements DailySourceReader {
  constructor(
    readonly source: DailyIngestionSource,
    private readonly options: { readonly coverage?: number; readonly revision?: number } = {},
  ) {}

  describe(): DailyReaderDescription {
    return {
      source: this.source,
      label: `${this.source} sintético`,
      realData: false,
      disclosure: `Lector sintético de ${this.source}: la serie es determinista y no procede de la propiedad del proyecto. Se sustituye en P3.2 al recibir credenciales.`,
    };
  }

  async readDay(input: { project: ProjectSlug; day: string }): Promise<DayBatch> {
    const seed = [...`${input.project}:${this.source}:${input.day}`].reduce((total, char) => total + char.charCodeAt(0), 0);
    const revision = this.options.revision ?? 0;
    return {
      rows: [
        {
          project: input.project,
          day: input.day,
          source: this.source,
          value: seed + revision,
          synthetic: true,
        },
      ],
      coverage: this.options.coverage ?? 1,
      warnings: [],
    };
  }
}
