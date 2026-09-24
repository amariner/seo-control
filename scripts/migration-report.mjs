#!/usr/bin/env node
/**
 * Renderiza `docs/continuity/V1_MIGRATION_INVENTORY.md` a partir de
 * `docs/continuity/v1-migration-inventory.json` (P2.1).
 *
 * El JSON es la fuente; el Markdown es la lectura. Con `--check` no escribe:
 * falla si el documento está desincronizado, para que nadie edite la tabla a
 * mano y la deje divergir del contrato que validan las pruebas.
 *
 * La validación de esquema vive en packages/contracts/src/migration.test.ts,
 * que es donde está zod; aquí solo se comprueban las invariantes que se pueden
 * ver sin dependencias.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceFile = resolve(root, "docs/continuity/v1-migration-inventory.json");
const outputFile = resolve(root, "docs/continuity/V1_MIGRATION_INVENTORY.md");
const checkOnly = process.argv.includes("--check");

const inventory = JSON.parse(readFileSync(sourceFile, "utf8"));

const DISPOSITIONS = {
  retain: "Se conserva el comportamiento tal cual.",
  redesign: "Se conserva el valor; se rehace sobre contratos V2.",
  merge: "Se funde con otra superficie en un único capítulo V2.",
  defer: "Se conserva, pero llega en una fase posterior.",
  retire: "No se reimplementa. Exige motivo y alternativa.",
};

const cell = (value) => {
  if (Array.isArray(value))
    return value.length ? value.map((item) => `\`${item}\``).join("<br>") : "—";
  return value === null || value === ""
    ? "—"
    : String(value).replaceAll("|", "\\|");
};

const parityDoc = readFileSync(
  resolve(root, "docs/continuity/V1_PARITY.md"),
  "utf8",
);
const roadmap = readFileSync(resolve(root, "ROADMAP.md"), "utf8");
const catalogued = new Set(
  inventory.surfaces.map((surface) => surface.v1Route),
);
/** Rutas de la matriz de superficies de V1_PARITY.md: primera celda de cada fila. */
const parityRoutes = [...parityDoc.matchAll(/^\| `(\/[^`]*)`/gm)].map(
  (match) => match[1],
);

const problems = [];
for (const route of parityRoutes) {
  if (!catalogued.has(route))
    problems.push(`${route}: está en V1_PARITY.md y no en el inventario`);
}
for (const surface of inventory.surfaces) {
  const phase = surface.targetPhase.split(".")[0];
  if (!roadmap.includes(`## ${phase} \u00b7`))
    problems.push(
      `${surface.v1Route}: fase ${surface.targetPhase} inexistente en ROADMAP.md`,
    );
  if (!DISPOSITIONS[surface.disposition])
    problems.push(
      `${surface.v1Route}: disposición desconocida "${surface.disposition}"`,
    );
  if (surface.disposition === "retire" && !surface.alternative)
    problems.push(`${surface.v1Route}: retirada sin alternativa`);
  if (!surface.sources?.length)
    problems.push(`${surface.v1Route}: sin fuentes catalogadas`);
}
for (const reconciliation of inventory.reconciliations) {
  if (!reconciliation.metrics?.length)
    problems.push(`${reconciliation.id}: sin métricas de reconciliación`);
  if (!reconciliation.onMismatch)
    problems.push(`${reconciliation.id}: sin salida ante desviación`);
}
if (problems.length) {
  console.error("Inventario de migración inválido:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const counts = inventory.surfaces.reduce(
  (acc, surface) => ({
    ...acc,
    [surface.disposition]: (acc[surface.disposition] ?? 0) + 1,
  }),
  {},
);
const pendingRetirements = inventory.surfaces.filter(
  (surface) =>
    surface.disposition === "retire" && surface.approval !== "approved",
);

const toleranceLabel = (tolerance) => {
  if (tolerance.kind === "exact") return "exacta";
  if (tolerance.kind === "not-comparable") return "no comparable";
  return `±${tolerance.value} ${tolerance.unit ?? ""}`.trim();
};

const lines = [];
lines.push("# Inventario y contratos de migración V1 -> V2 (P2.1)");
lines.push("");
lines.push("> Documento generado. No lo edites a mano: la fuente es");
lines.push(
  "> `docs/continuity/v1-migration-inventory.json` y se regenera con `pnpm migration:report`.",
);
lines.push("> `pnpm migration:check` falla si los dos divergen.");
lines.push("");
lines.push(
  `Auditoría de V1 el ${inventory.auditedAt} sobre \`${inventory.v1Source.repository}\` (${inventory.v1Source.stack}): ${inventory.v1Source.pages} páginas y ${inventory.v1Source.endpoints} endpoints.`,
);
lines.push("");
lines.push(
  "`V1_PARITY.md` dice **dónde está** cada capacidad en V2. Este inventario dice **qué se hace con ella** y **con qué evidencia se acepta la migración**. Son ejes distintos y se mantienen separados.",
);
lines.push("");
lines.push("## Clasificación");
lines.push("");
for (const [key, meaning] of Object.entries(DISPOSITIONS)) {
  lines.push(`- \`${key}\` (${counts[key] ?? 0}): ${meaning}`);
}
lines.push("");
if (pendingRetirements.length) {
  lines.push(
    `**Retiradas propuestas y pendientes de aprobación (${pendingRetirements.length}).** P2 no cierra mientras sigan abiertas:`,
  );
  lines.push("");
  for (const surface of pendingRetirements) {
    lines.push(
      `- \`${surface.v1Route}\` — ${surface.dispositionReason} Alternativa: ${surface.alternative}`,
    );
  }
  lines.push("");
}
lines.push(
  "| Ruta V1 | Tipo | Qué se hace | Motivo | Paridad | Fase | Destino V2 |",
);
lines.push("| --- | --- | --- | --- | --- | --- | --- |");
for (const surface of inventory.surfaces) {
  const disposition =
    surface.disposition === "retire"
      ? `**retire** (${surface.approval})`
      : surface.disposition;
  lines.push(
    `| \`${surface.v1Route}\` | ${surface.kind} | ${disposition} | ${cell(surface.dispositionReason)} | ${surface.parityState} | ${surface.targetPhase} | ${cell(surface.v2Target)} |`,
  );
}
lines.push("");
lines.push("## Catálogo técnico");
lines.push("");
lines.push(
  "| Ruta V1 | Capacidad | Fuentes | Transformaciones | Filtros | Exportaciones | Dependencias |",
);
lines.push("| --- | --- | --- | --- | --- | --- | --- |");
for (const surface of inventory.surfaces) {
  lines.push(
    `| \`${surface.v1Route}\` | ${cell(surface.capability)} | ${cell(surface.sources)} | ${cell(surface.transformations)} | ${cell(surface.filters)} | ${cell(surface.exports)} | ${cell(surface.dependencies)} |`,
  );
}
lines.push("");
lines.push("## Reconciliación y tolerancia por dataset");
lines.push("");
lines.push(
  "Sin muestra, comparación y tolerancia declaradas, `P2.4` no tiene criterio de aceptación. Una tolerancia distinta de cero siempre lleva su motivo: si no se puede justificar, es cero.",
);
lines.push("");
for (const reconciliation of inventory.reconciliations) {
  lines.push(`### ${reconciliation.dataset} · \`${reconciliation.id}\``);
  lines.push("");
  lines.push(
    `- Estado: **${reconciliation.status}** (${reconciliation.phase}).`,
  );
  lines.push(`- Origen V1: \`${reconciliation.v1Origin}\`.`);
  lines.push(`- Destino V2: ${reconciliation.v2Target}.`);
  lines.push(`- Muestra: ${reconciliation.sample}`);
  lines.push(`- Se compara contra: ${reconciliation.comparedAgainst}.`);
  lines.push(`- Si no cuadra: ${reconciliation.onMismatch}`);
  lines.push("");
  lines.push("| Métrica | Control V1 | Tolerancia | Por qué |");
  lines.push("| --- | --- | --- | --- |");
  for (const metric of reconciliation.metrics) {
    lines.push(
      `| ${cell(metric.name)} | ${cell(metric.v1Baseline)} | ${toleranceLabel(metric.tolerance)} | ${cell(metric.tolerance.rationale)} |`,
    );
  }
  lines.push("");
}

const rendered = `${lines.join("\n").trimEnd()}\n`;

if (checkOnly) {
  let current = "";
  try {
    current = readFileSync(outputFile, "utf8");
  } catch {
    console.error(
      "Falta docs/continuity/V1_MIGRATION_INVENTORY.md. Ejecuta pnpm migration:report.",
    );
    process.exit(1);
  }
  if (current !== rendered) {
    console.error(
      "V1_MIGRATION_INVENTORY.md está desincronizado del JSON. Ejecuta pnpm migration:report.",
    );
    process.exit(1);
  }
  console.log(
    `Inventario de migración sincronizado: ${inventory.surfaces.length} superficies y ${inventory.reconciliations.length} datasets.`,
  );
} else {
  writeFileSync(outputFile, rendered, "utf8");
  console.log(
    `Escrito docs/continuity/V1_MIGRATION_INVENTORY.md: ${inventory.surfaces.length} superficies y ${inventory.reconciliations.length} datasets.`,
  );
}
