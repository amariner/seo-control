import { resolve } from "node:path";
import { DEFAULT_PATHS, importV1Editorial } from "../src/import";

/**
 * Uso: pnpm --filter @seo/editorial import:v1 [-- --source <carpeta V1>] [--force]
 *
 * Archiva los cuatro snapshots V1, genera el dataset normalizado y el informe.
 * Sin cambios en las entradas, no reescribe nada (idempotente).
 */

const args = process.argv.slice(2);
const sourceIndex = args.indexOf("--source");
const sourceDir = sourceIndex >= 0 && args[sourceIndex + 1] ? resolve(args[sourceIndex + 1]!) : DEFAULT_PATHS.sourceDir;
const force = args.includes("--force");

const result = await importV1Editorial({ ...DEFAULT_PATHS, sourceDir }, { force });

if (result.status === "unchanged") {
  console.log(`Sin cambios: la huella ${result.fingerprint.slice(0, 12)}… coincide con la importación del ${result.report.importedAt}.`);
  process.exit(0);
}

const { dataset } = result;
console.log(`Importación editorial V1 · ${dataset.generatedAt}`);
console.log(`Huella de entradas: ${result.fingerprint}`);
console.log("");
console.log("Fuente                 esperado  importado  rechazado  estado");
for (const archive of dataset.report.archives) {
  console.log(`${archive.key.padEnd(22)} ${String(archive.expectedCount).padStart(8)}  ${String(archive.importedCount).padStart(9)}  ${String(archive.rejectedCount).padStart(9)}  ${archive.status}`);
}
console.log(`Propuestas: ${dataset.slots.reduce((total, slot) => total + slot.proposals.length, 0)} · bloques temáticos: ${dataset.calendar.themes.length} · colisiones de identidad: ${dataset.report.identityCollisions}`);
console.log("");
for (const [key, stats] of Object.entries(dataset.report.briefs)) console.log(`Briefs ${key}: ${stats.count} · ${stats.totalChars.toLocaleString("es-ES")} caracteres (${stats.totalNormalizedChars.toLocaleString("es-ES")} normalizados)`);
console.log("");
console.log("Alias de marca:");
for (const alias of dataset.report.brandAliases) console.log(`  "${alias.literal}" -> ${alias.slug ?? "SIN RESOLVER"}${alias.line ? ` · línea "${alias.line}"` : ""} (${alias.occurrences})`);
if (dataset.report.warnings.length) {
  console.log("");
  console.log("Avisos:");
  for (const warning of dataset.report.warnings) console.log(`  - ${warning}`);
}
if (dataset.report.rejections.length) {
  console.log("");
  console.log("Rechazos:");
  for (const rejection of dataset.report.rejections) console.log(`  - [${rejection.source}#${rejection.sourceIndex}] ${rejection.reason}`);
}
console.log("");
console.log(`Ficheros escritos:\n${result.written.map((path) => `  ${path}`).join("\n")}`);
