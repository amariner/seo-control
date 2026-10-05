/**
 * `pnpm action:track -- --project <slug>` (D-090, H10). Seguimiento de las
 * acciones de la pestaña «Acciones» desde el chat (D-082):
 *
 * - Sin `--action`: lista lo que proponen hoy los datos (clave, prioridad,
 *   motivo, cifra y criterio de éxito) y lo que el equipo ya sigue.
 * - `--action <clave>` con `--status`, `--owner`, `--due AAAA-MM-DD|sla`,
 *   `--note` o `--learning`: empieza el seguimiento (guarda el punto de
 *   partida con datos reales) o lo actualiza (sin consultar a Google).
 * - `--remove`: retira el seguimiento de esa acción.
 *
 * `--range` (90d por defecto) y `--market` (all) eligen la ventana del punto
 * de partida, que se repite al medir. `--dry-run` enseña el cambio sin
 * guardarlo. Sale con código 1 si no guarda nada.
 */
import { brandSlugSchema, findBrand } from "@seo/contracts";
import {
  ACTION_SLA_DAYS,
  TRACKED_STATUS_LABEL,
  actionsOfBrand,
  dueText,
  formatMetricValue,
  resolveTarget,
  startTracking,
  trackedActionStatusSchema,
  trackedIdOf,
  updateTracking,
  withTracking,
  type TrackedAction,
  type TrackingChange,
} from "../src/action-tracking";
import { buildBacklinkIndex } from "@seo/editorial";
import { getEffectiveEditorialDataset } from "@seo/editorial/dataset";
import { actionLinkOf, actionPieces } from "../src/action-journey";
import { PRIORITY_LABEL, PRIORITY_ORDER, reviewActions, type ProjectAction } from "../src/project-actions";
import { liveActionReview } from "../src/review-input";
import { localAuthor } from "../src/store";
import { readTracking, writeTracking } from "../src/tracking-store";
import { hasFlag, loadEnv, option } from "./load-env";

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const parsedProject = brandSlugSchema.safeParse(option("--project"));
if (!parsedProject.success) fail("Falta --project <slug> (p. ej. xtone, porcelanosa, noken)");
const project = parsedProject.data!;
const brandName = findBrand(project)?.name ?? project;
const key = option("--action");
const dryRun = hasFlag("--dry-run");
const author = localAuthor();
const now = new Date().toISOString();
const today = now.slice(0, 10);

const rawStatus = option("--status");
const status = rawStatus === undefined ? undefined : trackedActionStatusSchema.safeParse(rawStatus.replace("-", "_"));
if (status && !status.success) fail(`Estado no válido: ${rawStatus} (planificada, en_curso, bloqueada, completada o descartada)`);
const change: TrackingChange = {
  status: status?.data,
  owner: option("--owner"),
  due: option("--due"),
  note: option("--note"),
  learning: option("--learning"),
};
const hasChange = Object.values(change).some((value) => value !== undefined);

const store = readTracking();
if (store.invalid) fail(`El fichero de seguimiento no cumple el contrato (${store.invalid}); corrígelo antes de escribir.`);

const metricLine = (action: ProjectAction) => {
  if (!action.metric) return "Cifra: sin cifra propia · éxito: que los datos dejen de proponerla";
  const { criterion } = resolveTarget(action.metric, action.metric.value);
  return `Cifra: ${action.metric.label} = ${formatMetricValue(action.metric.value, action.metric.unit)} · éxito: ${criterion}`;
};
const backlinks = buildBacklinkIndex(getEffectiveEditorialDataset());
const trackedLine = (record: TrackedAction) => {
  const pieces = actionPieces(backlinks, record.brand, record.key);
  return [
    `Seguimiento: ${TRACKED_STATUS_LABEL[record.status]} · ${record.owner ?? "sin responsable"} · ${dueText(record, today)}`,
    ...pieces.map((piece) => `      Pieza: ${piece.title} (${piece.status}${piece.result ? `, ${piece.result}` : ""})`),
  ].join("\n");
};

/* -------------------------------------------------------------------------- */
/* Retirar                                                                     */
/* -------------------------------------------------------------------------- */
if (key && hasFlag("--remove")) {
  const id = trackedIdOf(project, key);
  if (!store.actions[id]) fail(`${id} no está en seguimiento`);
  const { invalid: _invalid, ...next } = store;
  delete next.actions[id];
  if (dryRun) {
    console.log(`(simulación) Se retiraría el seguimiento de ${id}`);
    process.exit(0);
  }
  writeTracking(next, now);
  console.log(`✓ ${id}: seguimiento retirado (su historial se pierde; queda en git hasta el próximo commit)`);
  process.exit(0);
}

/* -------------------------------------------------------------------------- */
/* Actualizar uno existente: sin consultar a Google                            */
/* -------------------------------------------------------------------------- */
if (key && store.actions[trackedIdOf(project, key)]) {
  const id = trackedIdOf(project, key);
  if (!hasChange) {
    console.log(`${id} · ${store.actions[id]!.title}\n  ${trackedLine(store.actions[id]!)}`);
    fail("Nada que cambiar: indica --status, --owner, --due, --note o --learning");
  }
  if (option("--range") || option("--market")) console.log("  (--range y --market solo cuentan al empezar el seguimiento: se ignoran)");
  const { record, changes } = updateTracking(store.actions[id]!, change, author, now);
  if (!changes.length) fail(`Nada que cambiar en ${id}: ya tiene esos valores`);
  if (record.status === "completada" && !record.learning) console.log("  Aviso: se cierra sin aprendizaje; añádelo con --learning para reutilizarlo.");
  if (dryRun) {
    console.log(`(simulación) ${id}: ${changes.join("; ")}`);
    process.exit(0);
  }
  const { invalid: _invalid, ...next } = store;
  next.actions[id] = record;
  writeTracking(next, now);
  console.log(`✓ ${id}: ${changes.join("; ")}\n  ${trackedLine(record)}`);
  process.exit(0);
}

/* -------------------------------------------------------------------------- */
/* Listar o empezar: repaso con datos reales                                   */
/* -------------------------------------------------------------------------- */
const source = loadEnv();
const range = option("--range") ?? "90d";
const market = (option("--market") ?? "all").toUpperCase().replace("ALL", "all");
console.log(`Repasando ${brandName} con datos reales (credenciales: ${source ?? "entorno"})…`);
const review = await liveActionReview({ brand: project, range, market, author });
const { input, sections, meta, failed } = review;
const report = input.report;
const actions = reviewActions(sections).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
const records = actionsOfBrand(store, project);
const { tracked, elsewhere } = withTracking(sections, records);
const header = `${brandName} · ${report.window.label} (${report.window.start} – ${report.window.end}) · ${report.market === "all" ? "todos los mercados" : report.market} · corte ${report.cutoff}`;

if (!key) {
  console.log(`\n${header}`);
  console.log(`${actions.length} acciones propuestas · ${records.length} en seguimiento`);
  for (const item of failed) console.log(`  Aviso: ${item.source.toUpperCase()} no ha respondido (${item.note})`);
  for (const priority of ["urgente", "alta", "media", "baja"] as const) {
    const group = actions.filter((action) => action.priority === priority);
    if (!group.length) continue;
    console.log(`\n${PRIORITY_LABEL[priority].toUpperCase()}`);
    for (const action of group) {
      console.log(`  ${action.key} · ${action.title}`);
      console.log(`    Motivo: ${action.why}`);
      console.log(`    ${metricLine(action)}`);
      console.log(`    ${tracked[action.key] ? trackedLine(tracked[action.key]!) : `Seguimiento: sin asignar (SLA ${ACTION_SLA_DAYS[action.priority]} días)`}`);
    }
  }
  if (elsewhere.length) {
    console.log("\nEN SEGUIMIENTO QUE ESTOS DATOS YA NO PROPONEN");
    for (const record of elsewhere) console.log(`  ${record.key} · ${record.title}\n    ${trackedLine(record)}`);
  }
  console.log(`\nPara seguir una: pnpm action:track -- --project ${project} --action <clave> [--owner "Nombre"] [--due AAAA-MM-DD] [--status en_curso] [--note "…"]`);
  process.exit(0);
}

const action = actions.find((item) => item.key === key);
if (!action) {
  const family = key.split(":")[0];
  const similar = actions.filter((item) => item.key.startsWith(`${family}:`)).map((item) => item.key);
  fail(`Los datos de ${header} no proponen «${key}»: solo se empieza a seguir una acción propuesta.${similar.length ? ` Del mismo apartado: ${similar.join(", ")}.` : ""}`);
}
// Sin la fuente de la cifra, el punto de partida no valdría como referencia.
if (failed.length && action!.metric?.evidence === "busqueda")
  fail(`No se guarda el punto de partida: ${failed.map((item) => `${item.source.toUpperCase()} no ha respondido (${item.note})`).join("; ")}. Vuelve a intentarlo más tarde.`);
if (option("--learning") && !(change.status === "completada" || change.status === "descartada")) console.log("  Aviso: el aprendizaje suele anotarse al cerrar la acción.");

const baseline = { ...meta, value: action!.metric?.value ?? null, proposed: true, title: action!.title, why: action!.why };
const record = startTracking({ brand: project, action: action!, baseline, change, author, now });
const id = trackedIdOf(project, key);
if (dryRun) {
  console.log(`(simulación) ${id}: ${record.history[0]!.change}\n  Criterio: ${record.criterion}`);
  process.exit(0);
}
const { invalid: _invalid, ...next } = store;
next.actions[id] = record;
writeTracking(next, now);
console.log(`✓ ${id}: ${record.history[0]!.change}`);
console.log(`  ${record.title}`);
console.log(`  Criterio de éxito: ${record.criterion}`);
console.log(`  Punto de partida: corte ${meta.cutoff}, ${meta.window.start} – ${meta.window.end}, ${meta.market === "all" ? "todos los mercados" : meta.market}${meta.crawl ? `, crawl del ${meta.crawl.slice(0, 10)}` : ""}`);
console.log(`  Para enlazar una pieza del plan: en la curación del workbench, Enlaces «${actionLinkOf(project, key)}».`);
console.log("  Para llevarlo al visor: «sube las acciones» (commit y despliegue).");
