import { describe, expect, it } from "vitest";
import type { ProjectSlug } from "@seo/contracts";
import {
  EmptyDayBatchError,
  InMemoryIngestionLedger,
  IngestionSourceNotPlannableError,
  MissingReaderError,
  REPROCESS_DAYS,
  SyntheticDailyReader,
  fingerprintRows,
  ingestionWindow,
  planIngestion,
  runIngestionCycle,
  snapshotStaleness,
  type DailyIngestionSource,
  type DailySourceReader,
  type DayBatch,
  type IngestionCycleReport,
} from "./index";

const PILOT: readonly ProjectSlug[] = ["porcelanosa", "noken"];

/**
 * Espera que no duerme. Estas pruebas verifican el libro (D-030), no la política
 * de reintentos (D-031, en `policy.test.ts`): sin esto, cada día que falla a
 * propósito añadiría a la suite el segundo real que el backoff espera.
 */
const NO_SLEEP = { wait: async () => {} } as const;
const REQUESTED_AT = "2026-09-07T06:00:00Z";

function readers(...entries: ReadonlyArray<[DailyIngestionSource, DailySourceReader]>) {
  return new Map<DailyIngestionSource, DailySourceReader>(entries);
}

function syntheticReaders(options: { revision?: number } = {}) {
  return readers(
    ["ga4", new SyntheticDailyReader("ga4", options)],
    ["gsc", new SyntheticDailyReader("gsc", options)],
  );
}

describe("plan de ingesta diaria", () => {
  it("toma el desfase de cada fuente del catálogo en vez de fijar D-3 para todas", () => {
    const now = new Date(REQUESTED_AT);
    expect(ingestionWindow("gsc", now)).toEqual({
      source: "gsc",
      cutoff: "2026-09-04",
      start: "2026-08-29",
      days: 7,
      lagDays: 3,
    });
    expect(ingestionWindow("ga4", now)).toMatchObject({ cutoff: "2026-09-06", start: "2026-08-31", lagDays: 1 });
  });

  it("reprocesa siete días contando el corte", () => {
    const plan = planIngestion({ projects: ["porcelanosa"], sources: ["gsc"], requestedAt: REQUESTED_AT });
    expect(plan.jobs).toHaveLength(REPROCESS_DAYS);
    expect(plan.jobs.map((job) => job.day)).toEqual([
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
    expect(plan.jobs.filter((job) => job.kind === "cutoff").map((job) => job.day)).toEqual(["2026-09-04"]);
  });

  it("expande proyecto x fuente x día con claves únicas y estables", () => {
    const plan = planIngestion({ projects: PILOT, sources: ["ga4", "gsc"], requestedAt: REQUESTED_AT });
    expect(plan.jobs).toHaveLength(PILOT.length * 2 * REPROCESS_DAYS);
    expect(new Set(plan.jobs.map((job) => job.idempotencyKey)).size).toBe(plan.jobs.length);
    expect(plan.jobs[0]!.idempotencyKey).toBe("porcelanosa:ga4:2026-08-31");

    const again = planIngestion({ projects: PILOT, sources: ["ga4", "gsc"], requestedAt: REQUESTED_AT });
    expect(again).toEqual(plan);
  });

  it("la clave no depende del reloj: el mismo día pedido otro día es la misma clave", () => {
    const today = planIngestion({ projects: ["noken"], sources: ["gsc"], requestedAt: REQUESTED_AT });
    const tomorrow = planIngestion({ projects: ["noken"], sources: ["gsc"], requestedAt: "2026-09-08T06:00:00Z" });
    const shared = today.jobs.filter((job) => tomorrow.jobs.some((other) => other.day === job.day));
    expect(shared).not.toHaveLength(0);
    for (const job of shared) {
      const other = tomorrow.jobs.find((candidate) => candidate.day === job.day)!;
      expect(other.idempotencyKey).toBe(job.idempotencyKey);
    }
  });

  it("rechaza una fuente semanal declarando la fase que la conecta", () => {
    expect(() => planIngestion({ projects: PILOT, sources: ["semrush"], requestedAt: REQUESTED_AT })).toThrow(
      IngestionSourceNotPlannableError,
    );
    try {
      planIngestion({ projects: PILOT, sources: ["semrush"], requestedAt: REQUESTED_AT });
    } catch (error) {
      expect(error).toBeInstanceOf(IngestionSourceNotPlannableError);
      expect((error as IngestionSourceNotPlannableError).phase).toBe("P3.3");
      expect((error as IngestionSourceNotPlannableError).cadence).toBe("semanal");
    }
  });

  it("no acepta un plan sin proyectos ni sin fuentes", () => {
    expect(() => planIngestion({ projects: [], sources: ["gsc"], requestedAt: REQUESTED_AT })).toThrow(/sin proyectos/);
    expect(() => planIngestion({ projects: PILOT, sources: [], requestedAt: REQUESTED_AT })).toThrow(/sin fuentes/);
  });
});

describe("huella de un día", () => {
  it("ignora el orden de las claves y respeta el de las filas", () => {
    expect(fingerprintRows([{ a: 1, b: 2 }])).toBe(fingerprintRows([{ b: 2, a: 1 }]));
    expect(fingerprintRows([{ a: 1 }, { a: 2 }])).not.toBe(fingerprintRows([{ a: 2 }, { a: 1 }]));
  });
});

describe("cuatro ciclos de ingesta", () => {
  async function fourCycles() {
    const ledger = new InMemoryIngestionLedger();
    const plan = planIngestion({ projects: PILOT, sources: ["ga4", "gsc"], requestedAt: REQUESTED_AT });
    const reports: IngestionCycleReport[] = [];
    for (let cycle = 1; cycle <= 4; cycle += 1) {
      reports.push(
        await runIngestionCycle({
          plan,
          readers: syntheticReaders(),
          ledger,
          ranAt: `2026-09-07T0${cycle + 5}:00:00Z`,
        }),
      );
    }
    return { ledger, plan, reports };
  }

  it("terminan sin duplicados: un registro por proyecto, fuente y día", async () => {
    const { ledger, plan } = await fourCycles();
    expect(ledger.list()).toHaveLength(plan.jobs.length);
    const keys = ledger.list().map((record) => `${record.project}:${record.source}:${record.day}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("terminan sin deriva: la huella de cada día no cambia y solo el primer ciclo escribe", async () => {
    const { reports } = await fourCycles();
    const [first, ...rest] = reports;
    expect(first!.inserted).toBe(first!.jobs);
    expect(first!.revised).toBe(0);
    expect(first!.failed).toBe(0);

    for (const report of rest) {
      expect(report.unchanged).toBe(report.jobs);
      expect(report.inserted).toBe(0);
      expect(report.revised).toBe(0);
      expect(report.failed).toBe(0);
    }

    const fingerprintsOf = (report: IngestionCycleReport) =>
      report.outcomes.map((outcome) => ("fingerprint" in outcome ? outcome.fingerprint : outcome.reason));
    for (const report of rest) expect(fingerprintsOf(report)).toEqual(fingerprintsOf(first!));
  });

  it("dejan el piloto al día y lo declaran sintético, no real", async () => {
    const { reports } = await fourCycles();
    const last = reports[reports.length - 1]!;
    expect(last.realData).toBe(false);
    expect(last.readers.every((reader) => reader.realData === false)).toBe(true);
    expect(last.staleness).toHaveLength(4);
    for (const entry of last.staleness) {
      expect(entry.stale).toBe(false);
      expect(entry.behindDays).toBe(0);
      expect(entry.missingDays).toEqual([]);
      expect(entry.disclosure).toContain("al día");
    }
  });

  it("una revisión de la fuente se declara como revisión y no añade una fila", async () => {
    const ledger = new InMemoryIngestionLedger();
    const plan = planIngestion({ projects: ["porcelanosa"], sources: ["gsc"], requestedAt: REQUESTED_AT });
    await runIngestionCycle({ plan, readers: readers(["gsc", new SyntheticDailyReader("gsc")]), ledger, ranAt: "2026-09-07T06:10:00Z" });
    const before = ledger.get("porcelanosa", "gsc", "2026-09-04")!;

    const report = await runIngestionCycle({
      plan,
      readers: readers(["gsc", new SyntheticDailyReader("gsc", { revision: 5 })]),
      ledger,
      ranAt: "2026-09-08T06:10:00Z",
    });

    expect(report.revised).toBe(plan.jobs.length);
    expect(ledger.list()).toHaveLength(plan.jobs.length);

    const after = ledger.get("porcelanosa", "gsc", "2026-09-04")!;
    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect(after.revisions).toBe(1);
    expect(after.firstIngestedAt).toBe(before.firstIngestedAt);
    expect(after.lastChangedAt).toBe("2026-09-08T06:10:00Z");
  });
});

describe("fallo de un día", () => {
  class FailingDayReader implements DailySourceReader {
    constructor(
      private readonly source: DailyIngestionSource,
      private readonly failing: { day: string; mode: "throw" | "empty" },
    ) {}

    describe() {
      return {
        source: this.source,
        label: `${this.source} de prueba`,
        realData: false,
        disclosure: "Lector de prueba con un día que falla.",
      };
    }

    async readDay(input: { project: ProjectSlug; day: string }): Promise<DayBatch> {
      if (input.day === this.failing.day) {
        if (this.failing.mode === "throw") throw new Error("Cuota de la API agotada");
        return { rows: [], coverage: 0 };
      }
      return new SyntheticDailyReader(this.source).readDay(input);
    }
  }

  it("no aborta el ciclo y conserva el último snapshot válido del día que falla", async () => {
    const ledger = new InMemoryIngestionLedger();
    const plan = planIngestion({ projects: ["noken"], sources: ["gsc"], requestedAt: REQUESTED_AT });

    const healthy = await runIngestionCycle({
      plan,
      readers: readers(["gsc", new SyntheticDailyReader("gsc")]),
      ledger,
      ranAt: "2026-09-07T06:20:00Z",
      policy: NO_SLEEP,
    });
    expect(healthy.failed).toBe(0);
    const preserved = ledger.get("noken", "gsc", "2026-09-02")!;

    const degraded = await runIngestionCycle({
      plan,
      readers: readers(["gsc", new FailingDayReader("gsc", { day: "2026-09-02", mode: "throw" })]),
      ledger,
      ranAt: "2026-09-07T07:20:00Z",
      policy: NO_SLEEP,
    });

    expect(degraded.failed).toBe(1);
    expect(degraded.unchanged).toBe(plan.jobs.length - 1);
    expect(ledger.get("noken", "gsc", "2026-09-02")).toEqual(preserved);
    const failure = degraded.outcomes.find((outcome) => outcome.status === "failed")!;
    expect(failure.job.day).toBe("2026-09-02");
    expect("reason" in failure && failure.reason).toContain("Cuota");
  });

  it("un día vacío o sin cobertura no se guarda y lo dice", async () => {
    const ledger = new InMemoryIngestionLedger();
    const plan = planIngestion({ projects: ["noken"], sources: ["gsc"], requestedAt: REQUESTED_AT });
    const report = await runIngestionCycle({
      plan,
      readers: readers(["gsc", new FailingDayReader("gsc", { day: "2026-09-04", mode: "empty" })]),
      ledger,
      ranAt: "2026-09-07T06:30:00Z",
      policy: NO_SLEEP,
    });

    expect(report.failed).toBe(1);
    expect(ledger.get("noken", "gsc", "2026-09-04")).toBeNull();
    const failure = report.outcomes.find((outcome) => outcome.status === "failed")!;
    expect("reason" in failure && failure.reason).toContain("se conserva el último snapshot válido");

    const staleness = report.staleness[0]!;
    expect(staleness.lastValidDay).toBe("2026-09-03");
    expect(staleness.behindDays).toBe(1);
    expect(staleness.stale).toBe(true);
    expect(staleness.missingDays).toEqual(["2026-09-04"]);
    expect(staleness.disclosure).toContain("1 día por detrás del corte disponible (2026-09-04)");
  });

  it("un hueco a mitad de ventana se declara como hueco aunque el último día esté al día", async () => {
    const ledger = new InMemoryIngestionLedger();
    const plan = planIngestion({ projects: ["noken"], sources: ["gsc"], requestedAt: REQUESTED_AT });
    const report = await runIngestionCycle({
      plan,
      readers: readers(["gsc", new FailingDayReader("gsc", { day: "2026-09-01", mode: "throw" })]),
      ledger,
      ranAt: "2026-09-07T06:40:00Z",
      policy: NO_SLEEP,
    });

    const staleness = report.staleness[0]!;
    // El último día sí entró, así que el retraso es cero: sin la lista de
    // huecos, este estado se leería como «al día» y el 2026-09-01 parecería
    // una caída de tráfico a cero.
    expect(staleness.behindDays).toBe(0);
    expect(staleness.stale).toBe(false);
    expect(staleness.missingDays).toEqual(["2026-09-01"]);
    expect(staleness.disclosure).toContain("la serie tiene hueco, no una caída");
  });

  it("aplicar un día vacío directamente al libro es un error tipado", () => {
    const ledger = new InMemoryIngestionLedger();
    const plan = planIngestion({ projects: ["noken"], sources: ["gsc"], requestedAt: REQUESTED_AT });
    expect(() => ledger.apply(plan.jobs[0]!, { rows: [], coverage: 1 }, REQUESTED_AT)).toThrow(EmptyDayBatchError);
  });

  it("una fuente planificada sin lector es un error de configuración, no un job que se salta", async () => {
    const plan = planIngestion({ projects: PILOT, sources: ["ga4", "gsc"], requestedAt: REQUESTED_AT });
    await expect(
      runIngestionCycle({
        plan,
        readers: readers(["gsc", new SyntheticDailyReader("gsc")]),
        ledger: new InMemoryIngestionLedger(),
        ranAt: REQUESTED_AT,
      }),
    ).rejects.toThrow(MissingReaderError);
  });
});

describe("antigüedad del snapshot", () => {
  it("declara la ausencia total en vez de fingir un cero", () => {
    const staleness = snapshotStaleness(
      new InMemoryIngestionLedger(),
      { project: "porcelanosa", source: "gsc" },
      new Date(REQUESTED_AT),
    );
    expect(staleness.lastValidDay).toBeNull();
    expect(staleness.behindDays).toBeNull();
    expect(staleness.missingDays).toHaveLength(REPROCESS_DAYS);
    expect(staleness.stale).toBe(true);
    expect(staleness.disclosure).toContain("nunca se ha completado una ingesta");
  });
});
