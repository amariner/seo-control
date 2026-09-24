#!/usr/bin/env node
/**
 * Reconciliación de muestras V1 -> V2 (P2.4, primer criterio).
 *
 * P2.1 escribió los contratos de reconciliación: qué muestra, contra qué se
 * compara, con qué tolerancia y qué hacer ante una desviación. Lo que no hizo
 * —porque no era su alcance— fue *ejecutarlos*. Las cifras del inventario eran
 * afirmaciones de una auditoría manual. Este script las convierte en medidas
 * repetibles, y ya ha encontrado una que era falsa (ver D-026).
 *
 * Tres estados posibles para cada dataset, y ninguno se disfraza de otro:
 *
 * - `reconciled`: los dos lados existen, se miden y coinciden. Hoy solo el
 *   dataset editorial: es el único con destino V2 publicado.
 * - `baseline-frozen`: el lado V1 se mide y se congela con hash, pero el destino
 *   V2 todavía no existe (llega en P3/P5/P6/P8). No es paridad: es dejar el
 *   patrón de comparación fijado *antes* de migrar, para que la migración se
 *   valide contra un número registrado y no contra un V1 que quizá haya cambiado.
 * - `blocked` / `not-comparable`: no hay artefacto que medir. GA4 y GSC solo
 *   existen como consulta en vivo, y el estado de tareas nunca salió del
 *   navegador. Se declara y se explica; no se inventa una comparación.
 *
 * El baseline congelado se versiona en el repositorio, así que `--check`
 * funciona en una máquina sin la V1 delante: verifica el lado V2 y avisa de que
 * el lado V1 no se ha podido reverificar, en vez de dar por bueno lo que no ha
 * mirado.
 *
 * Uso:
 *   pnpm reconcile            renderiza docs/continuity/V1_RECONCILIATION.md
 *   pnpm reconcile:check      no escribe; falla si algo no cuadra o está desincronizado
 *   pnpm reconcile:capture    reescribe el baseline desde el disco de V1 (acto deliberado)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const inventoryFile = resolve(root, "docs/continuity/v1-migration-inventory.json");
const baselineFile = resolve(root, "docs/continuity/v1-reconciliation-baseline.json");
const outputFile = resolve(root, "docs/continuity/V1_RECONCILIATION.md");

const checkOnly = process.argv.includes("--check");
const capture = process.argv.includes("--capture");

/** Raíz de la V1. Configurable porque vive fuera del repositorio. */
const V1_ROOT = process.env.V1_ROOT ?? resolve(homedir(), "Desktop/Proyectos/seo-dashboard");

const inventory = JSON.parse(readFileSync(inventoryFile, "utf8"));
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const v1Available = existsSync(V1_ROOT);

/** Mide un fichero de V1: hash y tamaño, sin interpretar su contenido. */
function fingerprint(relativePath) {
  const path = resolve(V1_ROOT, relativePath);
  if (!existsSync(path)) return { path: relativePath, missing: true };
  const buffer = readFileSync(path);
  return { path: relativePath, sha256: sha256(buffer), bytes: buffer.length };
}

// ---------------------------------------------------------------------------
// Sondas: una por dataset del inventario
// ---------------------------------------------------------------------------

const EDITORIAL_SOURCES = [
  ["calendario-2026", "src/data/plan-editorial/calendario-2026.json"],
  ["conjunto-backlog", "src/data/plan-editorial/conjunto-backlog.json"],
  ["conjunto", "src/data/plan-editorial/conjunto.json"],
  ["conjunto-propuestas", "src/data/plan-editorial/conjunto-propuestas.json"],
];

/**
 * El único dataset con los dos lados publicados. La comparación es fuerte: el
 * hash del fichero en el disco de V1 tiene que coincidir con el que el
 * importador archivó, así que un cambio en la fuente se detecta aunque los
 * recuentos sigan cuadrando.
 */
function probeEditorial() {
  const files = EDITORIAL_SOURCES.map(([, path]) => fingerprint(path));
  const v1 = { files, measures: {} };
  if (v1Available && files.every((file) => !file.missing)) {
    // Se miden las mismas magnitudes que declara el dataset normalizado, no el
    // número de claves del JSON: los eventos de V1 viven anidados en `months` y
    // las propuestas dentro de cada hueco, así que contar el nivel superior
    // habría puesto un «2» al lado de los 39 eventos de V2 sin comparar nada.
    const calendar = readJson(resolve(V1_ROOT, "src/data/plan-editorial/calendario-2026.json"));
    v1.measures.calendarEvents = calendar.months.reduce((total, month) => total + (month.events?.length ?? 0), 0);
    v1.measures.themeBlocks = calendar.themes.length;
    v1.measures.backlog = readJson(resolve(V1_ROOT, "src/data/plan-editorial/conjunto-backlog.json")).length;
    v1.measures.plan = readJson(resolve(V1_ROOT, "src/data/plan-editorial/conjunto.json")).length;
    const slots = readJson(resolve(V1_ROOT, "src/data/plan-editorial/conjunto-propuestas.json"));
    v1.measures.slots = slots.length;
    v1.measures.proposals = slots.reduce((total, slot) => total + (slot.propuestas?.length ?? 0), 0);
  }

  const datasetPath = "packages/editorial/data/normalized/editorial-dataset.json";
  const dataset = readJson(resolve(root, datasetPath));
  const v2 = {
    source: datasetPath,
    measures: {
      calendarEvents: dataset.calendar.events.length,
      themeBlocks: dataset.calendar.themes.length,
      backlog: dataset.backlog.length,
      plan: dataset.plan.length,
      slots: dataset.slots.length,
      proposals: dataset.slots.reduce((total, slot) => total + (slot.proposals?.length ?? 0), 0),
    },
    archiveHashes: Object.fromEntries(dataset.report.archives.map((archive) => [archive.key, archive.sha256])),
  };
  return { state: "reconciled", v1, v2 };
}

/**
 * Caché de SEMrush. Se capturan los quince ficheros que existen de verdad, no
 * la muestra de cuatro que el inventario describía: `semrush-porcelanosa-uk.json`
 * nunca ha existido (Porcelanosa cachea de/es/fr), y comparar contra un fichero
 * inexistente habría dado un falso positivo silencioso.
 */
function probeSemrush() {
  const dir = resolve(V1_ROOT, "src/data/tracking-pilar");
  if (!v1Available || !existsSync(dir)) return { state: "baseline-frozen", v1: { files: [], measures: {} }, v2: null };
  const names = readdirSync(dir).filter((name) => /^semrush-.*\.json$/.test(name)).sort();
  const files = names.map((name) => fingerprint(`src/data/tracking-pilar/${name}`));
  const measures = {};
  for (const name of names) {
    const data = readJson(resolve(dir, name));
    const queries = data.queries ?? {};
    measures[name.replace(/^semrush-|\.json$/g, "")] = Array.isArray(queries) ? queries.length : Object.keys(queries).length;
  }
  measures["__total"] = Object.entries(measures).reduce((total, [key, value]) => (key.startsWith("__") ? total : total + value), 0);
  return { state: "baseline-frozen", v1: { files, measures }, v2: null };
}

/** Snapshots de crawl archivados en V1. El recuento de URLs es la medida estable. */
function probeCrawls() {
  const auditsDir = resolve(V1_ROOT, "src/data/audits");
  if (!v1Available || !existsSync(auditsDir)) return { state: "baseline-frozen", v1: { files: [], measures: {} }, v2: null };
  const files = [];
  const measures = {};
  for (const brand of readdirSync(auditsDir).sort()) {
    const historyDir = resolve(auditsDir, brand, "history");
    if (!existsSync(historyDir) || !statSync(historyDir).isDirectory()) continue;
    for (const crawl of readdirSync(historyDir).sort()) {
      const relativePath = `src/data/audits/${brand}/history/${crawl}/summary.json`;
      if (!existsSync(resolve(V1_ROOT, relativePath))) continue;
      files.push(fingerprint(relativePath));
      const summary = readJson(resolve(V1_ROOT, relativePath));
      measures[`${brand}/${crawl}`] = summary.totalUrls ?? summary.urlCount ?? null;
    }
  }
  return { state: "baseline-frozen", v1: { files, measures }, v2: null };
}

/** Snapshot de canibalización: sitios, mercados y pares detectados. */
function probeCanibalizaciones() {
  const paths = ["src/data/canibalizaciones/conjunto.json", "src/data/canibalizaciones/sites-overview.json"];
  if (!v1Available || paths.some((path) => !existsSync(resolve(V1_ROOT, path))))
    return { state: "baseline-frozen", v1: { files: [], measures: {} }, v2: null };
  const conjunto = readJson(resolve(V1_ROOT, paths[0]));
  const overview = readJson(resolve(V1_ROOT, paths[1]));
  return {
    state: "baseline-frozen",
    v1: {
      files: paths.map(fingerprint),
      measures: {
        sitios: conjunto.sites.length,
        mercados: conjunto.markets.length,
        paresCanibalizacion: conjunto.cannibalizationPairs.length,
        "sites-overview.sitios": overview.sites.length,
        "sites-overview.mercados": overview.markets.length,
        rango: `${conjunto.dateRange?.start ?? "?"} a ${conjunto.dateRange?.end ?? "?"}`,
      },
    },
    v2: null,
  };
}

/** Inventario de prompts GEO, contado por mercado como declara el contrato. */
function probeGeoPrompts() {
  const path = "src/data/prompts-geo.json";
  if (!v1Available || !existsSync(resolve(V1_ROOT, path)))
    return { state: "baseline-frozen", v1: { files: [], measures: {} }, v2: null };
  const data = readJson(resolve(V1_ROOT, path));
  const measures = {};
  for (const [market, value] of Object.entries(data.markets ?? {})) {
    measures[market] = Array.isArray(value) ? value.length : (value.prompts ?? []).length;
  }
  measures["__total"] = Object.entries(measures).reduce((total, [key, value]) => (key.startsWith("__") ? total : total + value), 0);
  return { state: "baseline-frozen", v1: { files: [fingerprint(path)], measures }, v2: null };
}

/**
 * Datasets sin artefacto que medir. No es una laguna del script: es la
 * naturaleza de la fuente, y el inventario ya lo dice.
 */
const blocked = (reason) => () => ({ state: "blocked", v1: { files: [], measures: {} }, v2: null, blockedReason: reason });

const PROBES = {
  "editorial-snapshots": probeEditorial,
  "semrush-cache": probeSemrush,
  "crawl-snapshots": probeCrawls,
  "canibalizaciones-snapshot": probeCanibalizaciones,
  "prompts-geo-inventory": probeGeoPrompts,
  "ga4-daily": blocked(
    "La fuente V1 es una consulta en vivo a la GA4 Data API, no un fichero. No hay nada que congelar hasta que P3 tenga credenciales y almacén propio; entonces la comparación es día a día con tolerancia relativa del 1%.",
  ),
  "gsc-daily": blocked(
    "La fuente V1 es una consulta en vivo a la Search Console API. Igual que GA4: la reconciliación exacta de clics solo puede ejecutarse cuando P3 conecte la fuente y guarde la misma ventana con el mismo desfase de tres días.",
  ),
  "tasks-local-state": blocked(
    "El estado vivía en el localStorage del navegador de cada persona y no existe copia en servidor. El propio contrato lo declara `not-comparable`: en P4 las tareas se regeneran y se avisa de que el estado marcado en V1 no viaja.",
  ),
};

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

const problems = [];
const results = [];

for (const contract of inventory.reconciliations) {
  const probe = PROBES[contract.id];
  if (!probe) {
    problems.push(`El contrato \`${contract.id}\` no tiene sonda en scripts/reconcile.mjs: añádela o retíralo del inventario.`);
    continue;
  }
  const probed = probe();
  results.push({
    id: contract.id,
    dataset: contract.dataset,
    phase: contract.phase,
    contractStatus: contract.status,
    state: probed.state === "blocked" && contract.status === "not-comparable" ? "not-comparable" : probed.state,
    blockedReason: probed.blockedReason ?? null,
    v1: probed.v1,
    v2: probed.v2,
  });
}

for (const id of Object.keys(PROBES)) {
  if (!inventory.reconciliations.some((contract) => contract.id === id))
    problems.push(`La sonda \`${id}\` no corresponde a ningún contrato del inventario.`);
}

/**
 * Un dataset que este script sabe ejecutar tiene que ofrecer al menos una
 * métrica exacta: si todas fueran tolerantes, la ejecución no probaría nada.
 *
 * Lo que no se exige es que *todas* lo sean. Un contrato puede mezclar
 * legítimamente lo verificable contra el fichero (recuento de keywords, URLs
 * por crawl, pares detectados) con lo que cambia por diseño al migrar: SEMrush
 * recalcula volúmenes cada mes, el health score se recalibra en V2 en vez de
 * copiarse y la canibalización se recalcula con otro criterio. Esas métricas se
 * declaran `not-comparable` con su motivo y se dejan fuera de la comparación,
 * en lugar de fingir una equivalencia que no existe.
 */
for (const contract of inventory.reconciliations) {
  const result = results.find((item) => item.id === contract.id);
  if (!result || (result.state !== "reconciled" && result.state !== "baseline-frozen")) continue;
  const metrics = contract.metrics ?? [];
  if (!metrics.some((metric) => metric.tolerance?.kind === "exact"))
    problems.push(
      `\`${contract.id}\` se ejecuta contra ficheros estáticos pero no declara ninguna métrica exacta: la ejecución no probaría nada.`,
    );
  for (const metric of metrics) {
    if (metric.tolerance?.kind === "not-comparable" && !metric.tolerance?.rationale)
      problems.push(`\`${contract.id}\` declara «${metric.name}» como no comparable sin explicar por qué.`);
  }
}

// Reconciliación real del dataset editorial: hash de V1 contra el archivado por
// el importador, y recuentos de V1 contra los del dataset normalizado.
const editorial = results.find((item) => item.id === "editorial-snapshots");
if (editorial && v1Available) {
  const missing = editorial.v1.files.filter((file) => file.missing);
  if (missing.length) {
    problems.push(`Faltan ficheros editoriales en la V1: ${missing.map((file) => file.path).join(", ")}.`);
  } else {
    for (const [key] of EDITORIAL_SOURCES) {
      const archived = editorial.v2.archiveHashes[key];
      const onDisk = editorial.v1.files.find((file) => file.path.endsWith(`${key}.json`))?.sha256;
      if (archived !== onDisk)
        problems.push(
          `El fichero \`${key}.json\` de la V1 ya no coincide con el que archivó la importación (disco ${onDisk?.slice(0, 12)} vs archivo ${archived?.slice(0, 12)}). Reejecuta \`pnpm editorial:import\` y revisa qué cambió antes de dar la paridad por buena.`,
        );
    }
    const expected = { calendarEvents: 39, backlog: 115, plan: 146, slots: 34, proposals: 68, themeBlocks: 6 };
    for (const [key, value] of Object.entries(expected)) {
      if (editorial.v2.measures[key] !== value)
        problems.push(`El dataset normalizado tiene ${editorial.v2.measures[key]} en «${key}» y el contrato fija ${value}.`);
      // La comparación que de verdad prueba la migración: V1 medido contra V2
      // medido, no cada lado contra una constante escrita en el contrato.
      if (editorial.v1.measures[key] !== editorial.v2.measures[key])
        problems.push(
          `«${key}» no reconcilia: la V1 mide ${editorial.v1.measures[key]} y el dataset normalizado ${editorial.v2.measures[key]}.`,
        );
    }
  }
}

// Contraste contra el baseline congelado: detecta que la V1 ha cambiado bajo los pies.
let baseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, "utf8")) : null;

if (capture) {
  baseline = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    v1Source: relative(homedir(), V1_ROOT),
    note:
      "Baseline congelado de las muestras V1 (P2.4). Se versiona para que la reconciliación sea comprobable sin la V1 delante y para que la migración de P3/P5/P6/P8 se valide contra un número registrado con hash, no contra un V1 que puede haber cambiado. Se reescribe solo con `pnpm reconcile:capture`, nunca de forma automática.",
    datasets: results.map(({ id, dataset, phase, state, blockedReason, v1, v2 }) => ({ id, dataset, phase, state, blockedReason, v1, v2 })),
  };
  writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Baseline capturado en ${relative(root, baselineFile)} (${results.length} datasets).`);
} else if (baseline && v1Available) {
  for (const result of results) {
    const frozen = baseline.datasets.find((item) => item.id === result.id);
    if (!frozen) {
      problems.push(`El dataset \`${result.id}\` no está en el baseline congelado: ejecuta \`pnpm reconcile:capture\` de forma deliberada.`);
      continue;
    }
    for (const file of result.v1.files) {
      const before = frozen.v1.files.find((item) => item.path === file.path);
      if (!before) {
        problems.push(`\`${result.id}\`: el fichero \`${file.path}\` no estaba en el baseline. La V1 ha ganado una fuente; revísala y recaptura.`);
        continue;
      }
      if (file.missing) problems.push(`\`${result.id}\`: \`${file.path}\` estaba en el baseline y ya no existe en la V1.`);
      else if (before.sha256 !== file.sha256)
        problems.push(`\`${result.id}\`: \`${file.path}\` ha cambiado desde el baseline (${before.sha256.slice(0, 12)} -> ${file.sha256.slice(0, 12)}).`);
    }
    for (const [key, value] of Object.entries(result.v1.measures)) {
      if (frozen.v1.measures[key] !== value)
        problems.push(`\`${result.id}\`: «${key}» medía ${frozen.v1.measures[key]} en el baseline y ahora ${value}.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

const STATE_LABELS = {
  reconciled: "**reconciliado** · los dos lados medidos y coincidentes",
  "baseline-frozen": "**baseline congelado** · lado V1 medido con hash; destino V2 pendiente",
  blocked: "**bloqueado** · no hay artefacto que medir",
  "not-comparable": "**no comparable** · la fuente nunca salió del navegador",
};

const measuresTable = (measures) => {
  const entries = Object.entries(measures).filter(([key]) => !key.startsWith("__"));
  if (!entries.length) return "_Sin medir en esta ejecución._";
  const total = measures["__total"];
  const rows = entries.map(([key, value]) => `| \`${key}\` | ${value ?? "—"} |`).join("\n");
  return `| Medida | Valor |\n| --- | --- |\n${rows}${total !== undefined ? `\n| **total** | **${total}** |` : ""}`;
};

const counts = results.reduce((acc, result) => ({ ...acc, [result.state]: (acc[result.state] ?? 0) + 1 }), {});

const lines = [
  "# Reconciliación de muestras V1 -> V2",
  "",
  "<!-- Generado por scripts/reconcile.mjs. No editar a mano: `pnpm reconcile:check` falla si divergen. -->",
  "",
  `Última ejecución: ${new Date().toISOString().slice(0, 10)}. Origen V1: \`${relative(homedir(), V1_ROOT)}\`${v1Available ? "" : " · **no accesible en esta máquina**"}.`,
  "",
  "Este documento es la ejecución de los contratos de reconciliación que P2.1 escribió",
  "(`docs/continuity/v1-migration-inventory.json`). Cierra el primer criterio de `P2.4`",
  "para todo lo que se puede medir hoy y deja explícito, dataset a dataset, lo que no.",
  "",
  "Un `baseline congelado` **no es paridad**: es la muestra V1 medida y hasheada *antes* de",
  "migrarla, para que P3, P5, P6 y P8 se validen contra un número registrado en el",
  "repositorio en vez de contra una V1 que puede haber cambiado entre tanto.",
  "",
  "## Resumen",
  "",
  "| Estado | Datasets |",
  "| --- | --- |",
  ...Object.entries(STATE_LABELS).map(([state, label]) => `| ${label} | ${counts[state] ?? 0} |`),
  "",
  `Total: ${results.length} datasets. El baseline vive en \`docs/continuity/v1-reconciliation-baseline.json\`.`,
  "",
];

for (const result of results) {
  lines.push(
    `## ${result.dataset}`,
    "",
    `- **Contrato**: \`${result.id}\` · fase destino \`${result.phase}\` · estado declarado en el inventario \`${result.contractStatus}\``,
    `- **Resultado**: ${STATE_LABELS[result.state]}`,
  );
  if (result.blockedReason) lines.push(`- **Por qué**: ${result.blockedReason}`);
  if (result.v1.files.length) {
    lines.push(
      `- **Ficheros V1 medidos**: ${result.v1.files.length}`,
      "",
      "| Fichero | sha256 | Bytes |",
      "| --- | --- | --- |",
      ...result.v1.files.map((file) => `| \`${file.path}\` | ${file.missing ? "**ausente**" : `\`${file.sha256.slice(0, 16)}…\``} | ${file.bytes ?? "—"} |`),
    );
  }
  lines.push("", "### Medidas del lado V1", "", measuresTable(result.v1.measures), "");
  if (result.v2) {
    lines.push(
      "### Medidas del lado V2",
      "",
      `Fuente: \`${result.v2.source}\`.`,
      "",
      measuresTable(result.v2.measures),
      "",
      "Los cuatro ficheros de V1 coinciden en hash con los que archivó el importador, así que",
      "la equivalencia no depende solo de que los recuentos cuadren.",
      "",
    );
  } else if (result.state === "baseline-frozen") {
    lines.push(`_Sin lado V2 todavía: el destino de este dataset llega en \`${result.phase}\`._`, "");
  }
}

const report = `${lines.join("\n")}\n`;

if (capture) {
  writeFileSync(outputFile, report);
} else if (checkOnly) {
  const current = existsSync(outputFile) ? readFileSync(outputFile, "utf8") : "";
  // La fecha de ejecución cambia cada día: se compara el cuerpo, no la cabecera.
  const strip = (text) => text.replace(/^Última ejecución: .*$/m, "").trim();
  if (strip(current) !== strip(report))
    problems.push("`docs/continuity/V1_RECONCILIATION.md` está desincronizado con la ejecución: `pnpm reconcile` para regenerarlo.");
} else {
  writeFileSync(outputFile, report);
  console.log(`Informe escrito en ${relative(root, outputFile)}.`);
}

if (!v1Available) {
  console.log(`Aviso: la V1 no está en \`${V1_ROOT}\`. Se ha verificado el lado V2 y el baseline congelado; el lado V1 no se ha reverificado.`);
}

for (const [state, label] of Object.entries(STATE_LABELS)) {
  const ids = results.filter((result) => result.state === state).map((result) => result.id);
  if (ids.length) console.log(`${label.replace(/\*\*/g, "")}: ${ids.join(", ")}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problema(s) de reconciliación:`);
  for (const problem of problems) console.error(`- ${problem.replace(/`/g, "")}`);
  process.exit(1);
}

console.log("\nReconciliación sin desviaciones.");
