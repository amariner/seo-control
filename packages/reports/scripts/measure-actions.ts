/**
 * `pnpm action:measure [-- --project <slug>] [--dry-run]` (D-090, H10). Mide el
 * resultado de las acciones en seguimiento: vuelve a calcular su cifra con
 * datos reales, con la misma ventana y mercado del punto de partida y el
 * último corte, y lo guarda junto a él. Las descartadas no se miden. Una
 * marca cuya fuente no responde no se mide (conserva el resultado anterior).
 * Sale con código 1 si no mide nada.
 */
import { brandSlugSchema, findBrand, type BrandSlug } from "@seo/contracts";
import { VERDICT_LABEL, formatMetricValue, measureKey, resultOf, trackedIdOf, type TrackedAction } from "../src/action-tracking";
import { liveActionReview } from "../src/review-input";
import { localAuthor } from "../src/store";
import { readTracking, writeTracking } from "../src/tracking-store";
import { hasFlag, loadEnv, option } from "./load-env";

const project = option("--project");
const brandFilter = project === undefined ? null : brandSlugSchema.parse(project);
const dryRun = hasFlag("--dry-run");
const author = localAuthor();
const now = new Date();

const store = readTracking();
if (store.invalid) {
  console.error(`✗ El fichero de seguimiento no cumple el contrato (${store.invalid}).`);
  process.exit(1);
}
const records = Object.values(store.actions).filter((record) => record.status !== "descartada" && (!brandFilter || record.brand === brandFilter));
if (!records.length) {
  console.error(`✗ No hay acciones en seguimiento que medir${brandFilter ? ` en ${findBrand(brandFilter)?.name ?? brandFilter}` : ""}.`);
  process.exit(1);
}

const source = loadEnv();
console.log(`Midiendo ${records.length} ${records.length === 1 ? "acción" : "acciones"} con datos reales (credenciales: ${source ?? "entorno"})…`);

// Un repaso por marca, ventana y mercado: las acciones que lo comparten se miden juntas.
const groups = new Map<string, TrackedAction[]>();
for (const record of records) {
  const group = `${record.brand}|${record.baseline.range}|${record.baseline.market}`;
  groups.set(group, [...(groups.get(group) ?? []), record]);
}

const { invalid: _invalid, ...next } = store;
let measured = 0;
for (const [group, items] of groups) {
  const [brand, range, market] = group.split("|") as [BrandSlug, string, string];
  const name = findBrand(brand)?.name ?? brand;
  let review: Awaited<ReturnType<typeof liveActionReview>>;
  try {
    review = await liveActionReview({ brand, range, market, author, now });
  } catch (error) {
    console.log(`  ${name}: no se mide (${error instanceof Error ? error.message : String(error)})`);
    continue;
  }
  if (review.failed.length) {
    console.log(`  ${name}: no se mide, ${review.failed.map((item) => `${item.source.toUpperCase()} no ha respondido (${item.note})`).join("; ")}`);
    continue;
  }
  console.log(`\n${name} · ${review.input.report.window.label} (${review.meta.window.start} – ${review.meta.window.end}) · corte ${review.meta.cutoff}`);
  for (const record of items) {
    const result = measureKey(record.key, review.sections, review.metricFor, review.meta);
    const updated: TrackedAction = { ...record, result };
    next.actions[trackedIdOf(record.brand, record.key)] = updated;
    measured += 1;
    const reading = resultOf(updated)!;
    const unit = record.metric?.unit ?? "";
    const figures = record.metric ? `${record.metric.label}: ${formatMetricValue(record.baseline.value, unit)} → ${formatMetricValue(result.value, unit)}` : result.proposed ? "los datos aún la proponen" : "los datos ya no la proponen";
    console.log(`  ${record.key} · ${figures} · ${VERDICT_LABEL[reading.verdict]}${reading.provisional ? ` (provisional: ${reading.provisional})` : ""}`);
  }
}

if (!measured) {
  console.error("✗ No se ha medido ninguna acción.");
  process.exit(1);
}
if (dryRun) {
  console.log(`\n(simulación) ${measured} ${measured === 1 ? "resultado" : "resultados"} sin guardar.`);
  process.exit(0);
}
writeTracking(next, now.toISOString());
console.log(`\n✓ ${measured} ${measured === 1 ? "resultado guardado" : "resultados guardados"}. Para llevarlos al visor: «sube las acciones».`);
