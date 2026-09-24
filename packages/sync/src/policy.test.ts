import { describe, expect, it } from "vitest";
import { SOURCE_CATALOG, type ProjectSlug } from "@seo/contracts";
import {
  DEFAULT_RETRY_POLICY,
  InMemoryIngestionLedger,
  InMemoryLeaseLock,
  InMemoryQuotaLedger,
  LeaseLostError,
  PermanentSourceError,
  QUOTA_BUDGETS,
  RateLimitedError,
  SyntheticDailyReader,
  assertQuotaCatalogCoverage,
  TransientSourceError,
  classifyFailure,
  planIngestion,
  quotaBudget,
  retryDelayMs,
  runIngestionCycle,
  shouldRetry,
  syncRunLockKey,
  type DailyIngestionSource,
  type DailySourceReader,
  type DayBatch,
  type RetryPolicy,
} from "./index";

const PILOT: readonly ProjectSlug[] = ["porcelanosa", "noken"];
const REQUESTED_AT = "2026-09-07T06:00:00Z";
const RAN_AT = "2026-09-07T07:00:00Z";

/** Espera falsa: acumula lo que se habría dormido en vez de dormirlo. */
function fakeClock() {
  const waited: number[] = [];
  return { waited, wait: async (ms: number) => void waited.push(ms) };
}

function readers(...entries: ReadonlyArray<[DailyIngestionSource, DailySourceReader]>) {
  return new Map<DailyIngestionSource, DailySourceReader>(entries);
}

function syntheticReaders() {
  return readers(["ga4", new SyntheticDailyReader("ga4")], ["gsc", new SyntheticDailyReader("gsc")]);
}

/** Lector que falla las `failures` primeras veces de cada día y luego responde. */
class FlakyReader implements DailySourceReader {
  private readonly attempts = new Map<string, number>();

  constructor(
    private readonly inner: SyntheticDailyReader,
    private readonly failures: number,
    private readonly error: () => Error,
  ) {}

  describe() {
    return this.inner.describe();
  }

  async readDay(input: { project: ProjectSlug; day: string }): Promise<DayBatch> {
    const key = `${input.project}:${input.day}`;
    const seen = (this.attempts.get(key) ?? 0) + 1;
    this.attempts.set(key, seen);
    if (seen <= this.failures) throw this.error();
    return this.inner.readDay(input);
  }
}

describe("presupuesto de cuota", () => {
  it("declara presupuesto para todas las fuentes del catálogo y ninguno verificado contra el proveedor", () => {
    expect(() => assertQuotaCatalogCoverage()).not.toThrow();
    expect(QUOTA_BUDGETS.map((budget) => budget.source).sort()).toEqual(SOURCE_CATALOG.map((source) => source.key).sort());
    expect(QUOTA_BUDGETS.every((budget) => budget.verifiedAgainstProvider === false)).toBe(true);
    expect(QUOTA_BUDGETS.every((budget) => budget.rationale.length > 20)).toBe(true);
  });

  it("reserva antes de llamar y deniega al agotar el presupuesto diario", () => {
    const ledger = new InMemoryQuotaLedger({ ga4: { dailyRequests: 2, burstPerMinute: 100 } });
    const at = new Date(RAN_AT);
    expect(ledger.reserve("ga4", at)).toMatchObject({ granted: true, remainingDaily: 1 });
    expect(ledger.reserve("ga4", at)).toMatchObject({ granted: true, remainingDaily: 0 });

    const denied = ledger.reserve("ga4", at);
    expect(denied.granted).toBe(false);
    if (denied.granted) throw new Error("inalcanzable");
    expect(denied.scope).toBe("daily");
    // La espera apunta al día UTC siguiente, no a un minuto: el presupuesto
    // diario no se recupera antes.
    expect(denied.retryAfterMs).toBe(Date.parse("2026-09-08T00:00:00Z") - Date.parse(RAN_AT));
    expect(ledger.spent("ga4", at)).toEqual({ daily: 2, burst: 2 });
  });

  it("limita el ritmo por minuto y lo recupera cuando la ventana avanza", () => {
    const ledger = new InMemoryQuotaLedger({ gsc: { dailyRequests: 100, burstPerMinute: 2 } });
    const at = new Date(RAN_AT);
    ledger.reserve("gsc", at);
    ledger.reserve("gsc", at);

    const denied = ledger.reserve("gsc", at);
    expect(denied).toMatchObject({ granted: false, scope: "burst", retryAfterMs: 60_000 });

    const later = new Date(Date.parse(RAN_AT) + 60_001);
    expect(ledger.reserve("gsc", later)).toMatchObject({ granted: true });
    // El gasto diario no se recupera con el minuto: son dos límites distintos.
    expect(ledger.spent("gsc", later)).toEqual({ daily: 3, burst: 1 });
  });

  it("un presupuesto no declarado es un error, no un permiso implícito", () => {
    expect(() => quotaBudget("ga4")).not.toThrow();
    // @ts-expect-error fuente inexistente a propósito
    expect(() => quotaBudget("looker")).toThrow(/sin presupuesto/);
  });
});

describe("clasificación de fallos y reintento", () => {
  it("distingue el transitorio del permanente por tipo declarado y por código", () => {
    expect(classifyFailure(new RateLimitedError("429", 5_000))).toMatchObject({ kind: "rate-limited", retryable: true, retryAfterMs: 5_000 });
    expect(classifyFailure(new TransientSourceError("timeout"))).toMatchObject({ kind: "transient", retryable: true });
    expect(classifyFailure(new PermanentSourceError("propiedad inexistente"))).toMatchObject({ kind: "permanent", retryable: false });
    expect(classifyFailure(Object.assign(new Error("429"), { status: 429 }))).toMatchObject({ kind: "rate-limited", retryable: true });
    expect(classifyFailure(Object.assign(new Error("503"), { status: 503 }))).toMatchObject({ kind: "transient", retryable: true });
    expect(classifyFailure(Object.assign(new Error("403"), { status: 403 }))).toMatchObject({ kind: "permanent", retryable: false });
    expect(classifyFailure(new Error("algo raro"))).toMatchObject({ kind: "unknown", retryable: true });
  });

  it("no reintenta un fallo permanente y da menos intentos a uno desconocido", () => {
    const permanent = shouldRetry({ attempt: 1, classification: classifyFailure(new PermanentSourceError("403")) });
    expect(permanent.retry).toBe(false);
    expect(permanent.reason).toMatch(/sin ninguna probabilidad de éxito/);

    const unknown = classifyFailure(new Error("?"));
    expect(shouldRetry({ attempt: 1, classification: unknown, random: () => 0.5 }).retry).toBe(true);
    expect(shouldRetry({ attempt: DEFAULT_RETRY_POLICY.maxAttemptsUnknown, classification: unknown }).retry).toBe(false);

    const transient = classifyFailure(new TransientSourceError("5xx"));
    expect(shouldRetry({ attempt: DEFAULT_RETRY_POLICY.maxAttemptsUnknown, classification: transient, random: () => 0.5 }).retry).toBe(true);
    expect(shouldRetry({ attempt: DEFAULT_RETRY_POLICY.maxAttempts, classification: transient }).retry).toBe(false);
  });

  it("crece exponencialmente, dispersa la espera y respeta la que pide la fuente", () => {
    const policy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, jitterRatio: 0 };
    expect(retryDelayMs(1, policy)).toBe(1_000);
    expect(retryDelayMs(2, policy)).toBe(2_000);
    expect(retryDelayMs(3, policy)).toBe(4_000);
    expect(retryDelayMs(9, policy)).toBe(policy.maxDelayMs);

    // Con dispersión, dos jobs que reciben el mismo 429 no vuelven a la vez.
    const low = retryDelayMs(1, DEFAULT_RETRY_POLICY, { random: () => 0 });
    const high = retryDelayMs(1, DEFAULT_RETRY_POLICY, { random: () => 1 });
    expect(low).toBe(800);
    expect(high).toBe(1_200);

    // La fuente manda cuando pide más de lo calculado.
    expect(retryDelayMs(1, policy, { retryAfterMs: 12_000 })).toBe(12_000);
    expect(retryDelayMs(1, policy, { retryAfterMs: 100 })).toBe(1_000);
  });

  it("corta el reintento cuando la espera acumulada supera el techo del job", () => {
    const decision = shouldRetry({
      attempt: 1,
      classification: classifyFailure(new TransientSourceError("5xx")),
      waitedMs: DEFAULT_RETRY_POLICY.maxTotalWaitMs,
      random: () => 0.5,
    });
    expect(decision.retry).toBe(false);
    expect(decision.reason).toMatch(/techo de 60000 ms/);
  });
});

describe("lock con ficha creciente", () => {
  const key = syncRunLockKey("porcelanosa", "ga4");

  it("no concede el mismo lock a dos ciclos y explica por qué se aplaza", () => {
    const lock = new InMemoryLeaseLock();
    const first = lock.acquire({ key, owner: "ciclo-a", ttlMs: 60_000, now: new Date(RAN_AT) });
    expect(first.acquired).toBe(true);

    const second = lock.acquire({ key, owner: "ciclo-b", ttlMs: 60_000, now: new Date(RAN_AT) });
    expect(second.acquired).toBe(false);
    if (second.acquired) throw new Error("inalcanzable");
    expect(second.heldBy).toBe("ciclo-a");
    expect(second.reason).toMatch(/escriben el mismo día dos veces/);
  });

  it("impide la escritura tardía del ciclo atascado, que el TTL por sí solo no impide", () => {
    const lock = new InMemoryLeaseLock();
    const stalled = lock.acquire({ key, owner: "ciclo-a", ttlMs: 1_000, now: new Date(RAN_AT) });
    if (!stalled.acquired) throw new Error("inalcanzable");

    const afterTtl = new Date(Date.parse(RAN_AT) + 2_000);
    // El TTL caducó el permiso, pero el proceso sigue vivo y cree que manda.
    expect(lock.holds(stalled.lease, afterTtl)).toBe(false);

    const relay = lock.acquire({ key, owner: "ciclo-b", ttlMs: 60_000, now: afterTtl });
    if (!relay.acquired) throw new Error("inalcanzable");
    expect(relay.lease.fencingToken).toBe(stalled.lease.fencingToken + 1);

    expect(() => lock.assertHolds(stalled.lease, afterTtl)).toThrow(LeaseLostError);
    expect(() => lock.assertHolds(relay.lease, afterTtl)).not.toThrow();

    // Y el ciclo caducado tampoco puede liberar el lock del que le sustituyó.
    lock.release(stalled.lease);
    expect(lock.holds(relay.lease, afterTtl)).toBe(true);
  });

  it("perder el arrendamiento es permanente dentro del ciclo, no un fallo a reintentar", () => {
    const lock = new InMemoryLeaseLock();
    const lease = lock.acquire({ key, owner: "ciclo-a", ttlMs: 1_000, now: new Date(RAN_AT) });
    if (!lease.acquired) throw new Error("inalcanzable");
    lock.acquire({ key, owner: "ciclo-b", ttlMs: 60_000, now: new Date(Date.parse(RAN_AT) + 2_000) });

    let captured: unknown;
    try {
      lock.assertHolds(lease.lease, new Date(Date.parse(RAN_AT) + 2_000));
    } catch (error) {
      captured = error;
    }
    expect(classifyFailure(captured)).toMatchObject({ kind: "permanent", retryable: false });
  });
});

describe("SyncRun: cuota, reintentos, locks y datos parciales", () => {
  const plan = planIngestion({ projects: PILOT, sources: ["ga4", "gsc"], requestedAt: REQUESTED_AT });

  it("un ciclo sin nada que aplazar se declara completo", async () => {
    const ledger = new InMemoryIngestionLedger();
    const report = await runIngestionCycle({ plan, readers: syntheticReaders(), ledger, ranAt: RAN_AT });
    expect(report.deferred).toBe(0);
    expect(report.run.status).toBe("complete");
    expect(report.run.pending).toBe(0);
    expect(report.run.counters).toMatchObject({ planned: plan.jobs.length, inserted: plan.jobs.length });
    expect(report.run.attempts).toBe(plan.jobs.length);
    expect(report.run.retries).toBe(0);
    // El origen sintético se declara también en la observabilidad, no solo en el lector.
    expect(report.run.realData).toBe(false);
    expect(report.run.disclosure).toMatch(/sintéticos/);
  });

  it("agotar la cuota aplaza días en vez de fallarlos, y el ciclo queda PARCIAL", async () => {
    const ledger = new InMemoryIngestionLedger();
    const quota = new InMemoryQuotaLedger({ ga4: { dailyRequests: 3, burstPerMinute: 100 }, gsc: { dailyRequests: 100, burstPerMinute: 100 } });
    const report = await runIngestionCycle({ plan, readers: syntheticReaders(), ledger, ranAt: RAN_AT, policy: { quota } });

    const ga4Jobs = plan.jobs.filter((job) => job.source === "ga4").length;
    expect(report.deferred).toBe(ga4Jobs - 3);
    expect(report.failed).toBe(0);
    expect(report.run.status).toBe("partial");
    expect(report.run.disclosure).toMatch(/Datos PARCIALES/);
    expect(report.run.disclosure).toMatch(/sin cuota/);

    // Un día aplazado no entra en el libro y sigue contando como hueco: no se
    // presenta como ingerido ni como caída de tráfico.
    const deferredJobs = report.outcomes.filter((outcome) => outcome.status === "deferred");
    expect(deferredJobs.length).toBeGreaterThan(0);
    for (const outcome of deferredJobs) {
      expect(ledger.get(outcome.job.project, outcome.job.source, outcome.job.day)).toBeNull();
    }
    const ga4Staleness = report.staleness.filter((entry) => entry.source === "ga4");
    expect(ga4Staleness.every((entry) => entry.missingDays.length > 0)).toBe(true);
  });

  it("reintenta lo transitorio, cobra cada intento al presupuesto y lo cuenta en el run", async () => {
    const ledger = new InMemoryIngestionLedger();
    const clock = fakeClock();
    const quota = new InMemoryQuotaLedger({ ga4: { dailyRequests: 1_000, burstPerMinute: 1_000 } });
    const single = planIngestion({ projects: ["porcelanosa"], sources: ["ga4"], requestedAt: REQUESTED_AT });
    const flaky = new FlakyReader(new SyntheticDailyReader("ga4"), 2, () => new TransientSourceError("504 del proveedor"));

    const report = await runIngestionCycle({
      plan: single,
      readers: readers(["ga4", flaky]),
      ledger,
      ranAt: RAN_AT,
      policy: { quota, wait: clock.wait, random: () => 0.5 },
    });

    expect(report.inserted).toBe(single.jobs.length);
    expect(report.failed).toBe(0);
    expect(report.run.status).toBe("complete");
    expect(report.run.attempts).toBe(single.jobs.length * 3);
    expect(report.run.retries).toBe(single.jobs.length * 2);
    // Cada intento gasta cuota, reintentos incluidos: si no, el presupuesto es
    // una cifra decorativa.
    expect(report.run.quotaSpent).toBe(single.jobs.length * 3);
    expect(quota.spent("ga4", new Date(RAN_AT)).daily).toBe(single.jobs.length * 3);
    expect(clock.waited).toHaveLength(single.jobs.length * 2);
    expect(report.run.waitedMs).toBe(clock.waited.reduce((total, ms) => total + ms, 0));
  });

  it("no reintenta un fallo permanente: un intento, una cuota", async () => {
    const ledger = new InMemoryIngestionLedger();
    const clock = fakeClock();
    const quota = new InMemoryQuotaLedger();
    const single = planIngestion({ projects: ["porcelanosa"], sources: ["gsc"], requestedAt: REQUESTED_AT });
    const broken = new FlakyReader(new SyntheticDailyReader("gsc"), 99, () => new PermanentSourceError("credenciales revocadas"));

    const report = await runIngestionCycle({
      plan: single,
      readers: readers(["gsc", broken]),
      ledger,
      ranAt: RAN_AT,
      policy: { quota, wait: clock.wait },
    });

    expect(report.failed).toBe(single.jobs.length);
    expect(report.run.status).toBe("failed");
    expect(report.run.attempts).toBe(single.jobs.length);
    expect(report.run.quotaSpent).toBe(single.jobs.length);
    expect(clock.waited).toHaveLength(0);
    expect(report.run.jobs.every((job) => job.failure?.kind === "permanent")).toBe(true);
    expect(report.run.disclosure).toMatch(/no entró ningún día/);
  });

  it("un ciclo que encuentra el lock ocupado se bloquea sin consultar la fuente", async () => {
    const ledger = new InMemoryIngestionLedger();
    const registry = new InMemoryLeaseLock();
    for (const project of PILOT) {
      for (const source of ["ga4", "gsc"] as const) {
        registry.acquire({ key: syncRunLockKey(project, source), owner: "ciclo-en-curso", ttlMs: 600_000, now: new Date(RAN_AT) });
      }
    }

    const report = await runIngestionCycle({
      plan,
      readers: syntheticReaders(),
      ledger,
      ranAt: RAN_AT,
      policy: { lock: { registry, owner: "ciclo-nuevo" } },
    });

    expect(report.deferred).toBe(plan.jobs.length);
    expect(report.failed).toBe(0);
    expect(report.run.status).toBe("blocked");
    expect(report.run.blockedLocks).toHaveLength(4);
    expect(report.run.quotaSpent).toBe(0);
    expect(ledger.list()).toHaveLength(0);
    expect(report.run.disclosure).toMatch(/Ciclo bloqueado/);
  });

  it("libera el lock al terminar, así que el ciclo siguiente sí entra", async () => {
    const ledger = new InMemoryIngestionLedger();
    const registry = new InMemoryLeaseLock();
    const lock = { registry, owner: "ciclo-a" };
    const first = await runIngestionCycle({ plan, readers: syntheticReaders(), ledger, ranAt: RAN_AT, policy: { lock } });
    expect(first.run.status).toBe("complete");

    const second = await runIngestionCycle({
      plan,
      readers: syntheticReaders(),
      ledger,
      ranAt: "2026-09-07T08:00:00Z",
      policy: { lock: { registry, owner: "ciclo-b" } },
    });
    expect(second.run.status).toBe("complete");
    expect(second.unchanged).toBe(plan.jobs.length);
    expect(second.run.blockedLocks).toHaveLength(0);
  });

  it("descarta la escritura del ciclo cuyo arrendamiento caducó a mitad de camino", async () => {
    const ledger = new InMemoryIngestionLedger();
    const registry = new InMemoryLeaseLock();
    const single = planIngestion({ projects: ["porcelanosa"], sources: ["ga4"], requestedAt: REQUESTED_AT });

    // El ciclo toma un lock de un segundo y su reloj avanza un minuto entre la
    // lectura y la escritura: es el ciclo atascado que despierta tarde.
    let tick = 0;
    const now = () => new Date(Date.parse(RAN_AT) + (tick++ === 0 ? 0 : 60_000));

    const report = await runIngestionCycle({
      plan: single,
      readers: readers(["ga4", new SyntheticDailyReader("ga4")]),
      ledger,
      ranAt: RAN_AT,
      policy: { lock: { registry, owner: "ciclo-atascado", ttlMs: 1_000 }, now, quota: null },
    });

    expect(report.inserted).toBe(0);
    expect(report.failed).toBe(single.jobs.length);
    expect(ledger.list()).toHaveLength(0);
    expect(report.run.jobs.every((job) => job.failure?.kind === "permanent")).toBe(true);
    expect(report.run.jobs.every((job) => job.attempts === 1)).toBe(true);
  });

  it("un día vacío no se reintenta: la ausencia no se arregla esperando", async () => {
    const ledger = new InMemoryIngestionLedger();
    const clock = fakeClock();
    const single = planIngestion({ projects: ["porcelanosa"], sources: ["ga4"], requestedAt: REQUESTED_AT });
    const empty: DailySourceReader = {
      describe: () => new SyntheticDailyReader("ga4").describe(),
      readDay: async () => ({ rows: [], coverage: 0, warnings: [] }),
    };

    const report = await runIngestionCycle({
      plan: single,
      readers: readers(["ga4", empty]),
      ledger,
      ranAt: RAN_AT,
      policy: { wait: clock.wait },
    });

    expect(report.failed).toBe(single.jobs.length);
    expect(clock.waited).toHaveLength(0);
    expect(report.run.attempts).toBe(single.jobs.length);
    expect(report.run.jobs.every((job) => job.failure?.reason.includes("último snapshot válido"))).toBe(true);
  });
});
