/**
 * Ensayo de ingesta diaria (P3.2).
 *
 * Ejecuta N ciclos completos del plan `proyecto x fuente x día` contra lectores
 * declaradamente sintéticos y comprueba, sobre el resultado, los dos criterios
 * de salida de P3 que no dependen de credenciales:
 *
 * - «Cuatro ciclos de sincronización de prueba terminan sin duplicados ni
 *   deriva»: el libro debe acabar con un registro por día y las huellas deben
 *   ser idénticas en los ciclos 2..N.
 * - «Un fallo conserva el último snapshot válido y hace visible su antigüedad»:
 *   con `--fail-day` se degrada un día concreto y se comprueba que su registro
 *   anterior sobrevive intacto y que el informe declara el retraso.
 *
 * Desde P3.3 los cuatro ciclos se ejecutan **con las reglas puestas** —cuota
 * reservada, reintentos clasificados y lock por `proyecto x fuente`— y no en el
 * camino sin política: un ensayo que verifica un camino distinto del que correrá
 * en producción no verifica producción. Al final se añaden tres escenarios que
 * solo esas reglas pueden producir: lock ocupado, presupuesto agotado y fuente
 * intermitente.
 *
 * Sale con código 1 si algo de eso no se cumple. Es la misma disciplina de
 * `pnpm status` y `pnpm reconcile`: un criterio que no se ejecuta no está
 * verificado, y un ensayo que no puede fallar no demuestra nada (D-025).
 *
 * Cuando lleguen las credenciales, este ensayo no se tira: se le pasan los
 * lectores reales de GA4 y Search Console y pasa a ser la comprobación previa a
 * cada despliegue de la sincronización.
 */
import { PILOT_PROJECTS, projectSlugSchema, type ProjectSlug } from "@seo/contracts";
import {
  InMemoryIngestionLedger,
  InMemoryLeaseLock,
  InMemoryQuotaLedger,
  SyntheticDailyReader,
  TransientSourceError,
  planIngestion,
  runIngestionCycle,
  syncRunLockKey,
  type DailyIngestionSource,
  type DailySourceReader,
  type DayBatch,
  type IngestionCycleReport,
} from "../src/index";

const SOURCES: readonly DailyIngestionSource[] = ["ga4", "gsc"];

/**
 * Proyectos del piloto, derivados de la taxonomía y no escritos aquí. El
 * `parse` no es decorativo: `PILOT_PROJECTS` son objetos `Brand`, y pasarlos sin
 * extraer el slug fue el primer fallo real que encontró este ensayo.
 */
const PROJECTS: readonly ProjectSlug[] = PILOT_PROJECTS.map((brand) => projectSlugSchema.parse(brand.slug));

function arg(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const cycles = Number(arg("cycles") ?? 4);
const requestedAt = arg("at") ?? new Date().toISOString();
const failDay = arg("fail-day");

if (!Number.isInteger(cycles) || cycles < 2) {
  console.error("--cycles debe ser un entero >= 2: con un solo ciclo no hay duplicado ni deriva que comprobar.");
  process.exit(1);
}

/** Lector que degrada un día concreto para probar la conservación del anterior. */
class DegradedDayReader implements DailySourceReader {
  constructor(
    private readonly inner: SyntheticDailyReader,
    private readonly day: string,
  ) {}

  describe() {
    return this.inner.describe();
  }

  async readDay(input: { project: ProjectSlug; day: string }): Promise<DayBatch> {
    if (input.day === this.day) throw new Error(`Fallo simulado de la fuente en ${input.day}`);
    return this.inner.readDay(input);
  }
}

function readersFor(cycle: number): ReadonlyMap<DailyIngestionSource, DailySourceReader> {
  const entries = SOURCES.map<[DailyIngestionSource, DailySourceReader]>((source) => {
    const synthetic = new SyntheticDailyReader(source);
    const degrade = failDay !== null && cycle === cycles;
    return [source, degrade ? new DegradedDayReader(synthetic, failDay) : synthetic];
  });
  return new Map(entries);
}

function fingerprints(report: IngestionCycleReport): string[] {
  return report.outcomes.map((outcome) => ("fingerprint" in outcome ? `${outcome.job.idempotencyKey}=${outcome.fingerprint}` : `${outcome.job.idempotencyKey}=FALLO`));
}

const ledger = new InMemoryIngestionLedger();
const plan = planIngestion({ projects: PROJECTS, sources: SOURCES, requestedAt });
const reports: IngestionCycleReport[] = [];

/**
 * Presupuesto y lock compartidos por los cuatro ciclos. Compartirlos es parte
 * de la comprobación: un contador de cuota que se reinicia en cada ciclo no
 * detectaría nunca un gasto acumulado, y un registro de locks nuevo por ciclo
 * no podría detectar que un ciclo no libera lo que tomó.
 */
const quota = new InMemoryQuotaLedger();
const lockRegistry = new InMemoryLeaseLock();

/**
 * El ensayo no duerme: acumula lo que se habría esperado y sigue. Lo que se
 * verifica de un reintento es a qué fallos se aplica y cuánta cuota gasta, no
 * que `setTimeout` funcione; dormir de verdad solo alargaría la verificación
 * previa al despliegue sin comprobar nada más.
 */
let simulatedWaitMs = 0;
const wait = async (ms: number) => void (simulatedWaitMs += ms);
const executionPolicy = { quota, wait, random: () => 0.5 };

console.log(`\nEnsayo de ingesta diaria — ${cycles} ciclos`);
console.log(`Instante planificado: ${requestedAt}`);
for (const window of plan.windows) {
  console.log(`- ${window.source}: ${window.start} .. ${window.cutoff} (${window.days} días, desfase D-${window.lagDays})`);
}
console.log(`Jobs por ciclo: ${plan.jobs.length} (${PROJECTS.length} proyectos x ${SOURCES.length} fuentes x ${plan.windows[0]!.days} días)\n`);

for (let cycle = 1; cycle <= cycles; cycle += 1) {
  const report = await runIngestionCycle({
    plan,
    readers: readersFor(cycle),
    ledger,
    ranAt: new Date(Date.parse(requestedAt) + cycle * 3_600_000).toISOString(),
    policy: { ...executionPolicy, lock: { registry: lockRegistry, owner: `ensayo:${cycle}` } },
  });
  reports.push(report);
  console.log(
    `Ciclo ${cycle}: ${report.inserted} nuevos, ${report.unchanged} sin cambio, ${report.revised} revisados, ${report.failed} fallidos, ${report.deferred} aplazados · run ${report.run.status} (${report.run.attempts} intentos, ${report.run.retries} reintentos, ${report.run.quotaSpent} de cuota)`,
  );
}

const failures: string[] = [];
const baseline = reports[0]!;

if (baseline.inserted !== plan.jobs.length) {
  failures.push(`El primer ciclo debía insertar ${plan.jobs.length} días y insertó ${baseline.inserted}.`);
}
if (ledger.list().length !== plan.jobs.length) {
  failures.push(`Duplicados: el libro tiene ${ledger.list().length} registros para ${plan.jobs.length} días planificados.`);
}

const expectedFailures = failDay === null ? 0 : PROJECTS.length * SOURCES.filter((source) => plan.jobs.some((job) => job.source === source && job.day === failDay)).length;

for (const [index, report] of reports.entries()) {
  if (index === 0) continue;
  const isDegraded = failDay !== null && index === cycles - 1;
  if (report.inserted !== 0) failures.push(`El ciclo ${index + 1} insertó ${report.inserted} días que ya existían.`);
  if (report.revised !== 0) failures.push(`Deriva en el ciclo ${index + 1}: ${report.revised} días cambiaron sin que la fuente cambiara.`);
  if (!isDegraded && report.failed !== 0) failures.push(`El ciclo ${index + 1} tuvo ${report.failed} fallos sin haberlos pedido.`);
  if (isDegraded && report.failed !== expectedFailures) {
    failures.push(`El ciclo degradado debía fallar en ${expectedFailures} jobs de ${failDay} y falló en ${report.failed}.`);
  }
  if (!isDegraded && fingerprints(report).join("|") !== fingerprints(baseline).join("|")) {
    failures.push(`Deriva de huellas entre el ciclo 1 y el ${index + 1}.`);
  }
}

if (failDay !== null) {
  const degraded = reports[reports.length - 1]!;
  const survivors = plan.jobs
    .filter((job) => job.day === failDay)
    .map((job) => ledger.get(job.project, job.source, job.day));
  if (survivors.some((record) => record === null)) {
    failures.push(`El día ${failDay} perdió su último snapshot válido al fallar la fuente.`);
  }
  const baselinePrints = new Map(baseline.outcomes.flatMap((outcome) => ("fingerprint" in outcome ? [[outcome.job.idempotencyKey, outcome.fingerprint] as const] : [])));
  for (const job of plan.jobs.filter((candidate) => candidate.day === failDay)) {
    const record = ledger.get(job.project, job.source, job.day);
    if (record && record.fingerprint !== baselinePrints.get(job.idempotencyKey)) {
      failures.push(`El día ${failDay} de ${job.idempotencyKey} cambió de contenido durante un fallo.`);
    }
  }
  console.log(`\nFallo simulado en ${failDay} durante el último ciclo: ${degraded.failed} jobs fallidos, ${degraded.unchanged} conservados.`);
}

const last = reports[reports.length - 1]!;
if (failDay === null) {
  const holes = last.staleness.filter((entry) => entry.missingDays.length > 0);
  for (const hole of holes) {
    failures.push(`Huecos en la ventana de ${hole.source} para ${hole.project}: ${hole.missingDays.join(", ")}.`);
  }
}

/* --------------------------------------------------------------------- */
/* P3.3 · escenarios que solo las reglas de ejecución pueden producir      */
/* --------------------------------------------------------------------- */

/** Lector que falla las `failures` primeras lecturas de cada día y luego responde. */
class FlakySourceReader implements DailySourceReader {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly inner: SyntheticDailyReader,
    private readonly failures: number,
  ) {}

  describe() {
    return this.inner.describe();
  }

  async readDay(input: { project: ProjectSlug; day: string }): Promise<DayBatch> {
    const key = `${input.project}:${input.day}`;
    const count = (this.seen.get(key) ?? 0) + 1;
    this.seen.set(key, count);
    if (count <= this.failures) throw new TransientSourceError(`504 simulado en ${input.day} (intento ${count})`);
    return this.inner.readDay(input);
  }
}

const scenarioAt = new Date(Date.parse(requestedAt) + (cycles + 1) * 3_600_000).toISOString();

console.log("\nEscenarios de ejecución (P3.3):");

// 1. Lock ocupado por otro ciclo: se aplaza entero, sin consultar la fuente.
{
  const busy = new InMemoryLeaseLock();
  for (const project of PROJECTS) {
    for (const source of SOURCES) {
      busy.acquire({ key: syncRunLockKey(project, source), owner: "ciclo-en-curso", ttlMs: 600_000, now: new Date(scenarioAt) });
    }
  }
  const blockedLedger = new InMemoryIngestionLedger();
  const report = await runIngestionCycle({
    plan,
    readers: readersFor(1),
    ledger: blockedLedger,
    ranAt: scenarioAt,
    policy: { quota: new InMemoryQuotaLedger(), wait, lock: { registry: busy, owner: "ensayo-bloqueado" } },
  });

  console.log(`- Lock ocupado: run ${report.run.status}, ${report.deferred} aplazados, ${report.run.quotaSpent} de cuota gastada.`);
  if (report.run.status !== "blocked") failures.push(`Un ciclo con todos los locks ocupados debía quedar «blocked» y quedó «${report.run.status}».`);
  if (report.deferred !== plan.jobs.length) failures.push(`El ciclo bloqueado debía aplazar ${plan.jobs.length} jobs y aplazó ${report.deferred}.`);
  if (report.failed !== 0) failures.push(`Un lock ocupado no es una avería: el ciclo bloqueado registró ${report.failed} fallos.`);
  if (report.run.quotaSpent !== 0) failures.push(`El ciclo bloqueado gastó ${report.run.quotaSpent} peticiones de cuota sin llegar a consultar la fuente.`);
  if (blockedLedger.list().length !== 0) failures.push("El ciclo bloqueado escribió en el libro pese a no tener el lock.");
}

// 2. Presupuesto agotado: días aplazados, run parcial y hueco declarado.
{
  const budget = 3;
  const partialLedger = new InMemoryIngestionLedger();
  const report = await runIngestionCycle({
    plan,
    readers: readersFor(1),
    ledger: partialLedger,
    ranAt: scenarioAt,
    policy: {
      quota: new InMemoryQuotaLedger({ ga4: { dailyRequests: budget }, gsc: { dailyRequests: budget } }),
      wait,
      lock: { registry: new InMemoryLeaseLock(), owner: "ensayo-cuota" },
    },
  });

  const expectedWritten = budget * SOURCES.length;
  console.log(`- Cuota recortada a ${budget}/fuente: run ${report.run.status}, ${report.inserted} escritos, ${report.deferred} aplazados.`);
  if (report.run.status !== "partial") failures.push(`Un ciclo con la cuota agotada debía quedar «partial» y quedó «${report.run.status}».`);
  if (report.inserted !== expectedWritten) failures.push(`Con ${budget} peticiones por fuente debían entrar ${expectedWritten} días y entraron ${report.inserted}.`);
  if (report.failed !== 0) failures.push(`Quedarse sin cuota no es una avería de la fuente: el ciclo registró ${report.failed} fallos.`);
  if (report.deferred !== plan.jobs.length - expectedWritten) {
    failures.push(`El ciclo debía aplazar ${plan.jobs.length - expectedWritten} días y aplazó ${report.deferred}.`);
  }
  if (!report.run.disclosure.includes("PARCIALES")) failures.push("El run parcial no declara que los datos lo son.");
  if (report.staleness.some((entry) => entry.missingDays.length === 0)) {
    failures.push("Los días aplazados no aparecen como hueco en la ventana: se leerían como una caída de tráfico.");
  }
  for (const outcome of report.outcomes) {
    if (outcome.status !== "deferred") continue;
    if (partialLedger.get(outcome.job.project, outcome.job.source, outcome.job.day) !== null) {
      failures.push(`El día aplazado ${outcome.job.idempotencyKey} acabó en el libro.`);
    }
  }
}

// 3. Fuente intermitente: se reintenta, cada intento se cobra al presupuesto.
{
  const flakyLedger = new InMemoryIngestionLedger();
  const flakyQuota = new InMemoryQuotaLedger();
  const single = planIngestion({ projects: [PROJECTS[0]!], sources: ["ga4"], requestedAt });
  const before = simulatedWaitMs;
  const report = await runIngestionCycle({
    plan: single,
    readers: new Map<DailyIngestionSource, DailySourceReader>([["ga4", new FlakySourceReader(new SyntheticDailyReader("ga4"), 2)]]),
    ledger: flakyLedger,
    ranAt: scenarioAt,
    policy: { quota: flakyQuota, wait, random: () => 0.5, lock: { registry: new InMemoryLeaseLock(), owner: "ensayo-intermitente" } },
  });

  const expectedAttempts = single.jobs.length * 3;
  console.log(
    `- Fuente intermitente (2 fallos transitorios por día): run ${report.run.status}, ${report.run.retries} reintentos, ${report.run.quotaSpent} de cuota, ${report.run.waitedMs} ms de espera simulada.`,
  );
  if (report.run.status !== "complete") failures.push(`Una fuente que se recupera al tercer intento debía terminar «complete» y terminó «${report.run.status}».`);
  if (report.run.attempts !== expectedAttempts) failures.push(`Se esperaban ${expectedAttempts} intentos y hubo ${report.run.attempts}.`);
  if (report.run.quotaSpent !== expectedAttempts) {
    failures.push(`Cada intento debe cobrarse al presupuesto: ${expectedAttempts} intentos y ${report.run.quotaSpent} peticiones contadas.`);
  }
  if (flakyQuota.spent("ga4", new Date(scenarioAt)).daily !== expectedAttempts) {
    failures.push("El contador de cuota no registró los reintentos: el presupuesto sería una cifra decorativa.");
  }
  if (simulatedWaitMs <= before) failures.push("Un reintento con espera creciente no acumuló ninguna espera.");
}

console.log("\nAntigüedad del último snapshot válido:");
for (const entry of last.staleness) {
  console.log(`- ${entry.disclosure}`);
}
console.log(`\nProcedencia: ${last.realData ? "dato real" : "SINTÉTICO"}`);
for (const reader of last.readers) console.log(`- ${reader.disclosure}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} comprobación(es) fallida(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\n${cycles} ciclos sin duplicados ni deriva. Libro: ${ledger.list().length} días.`);
