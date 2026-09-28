import { resolve } from "node:path";
import { syncInboxToCuration, type DescribedChange } from "../src/inbox-sync";

/**
 * Uso: pnpm editorial:pull [-- --dry-run]
 *
 * Sincronización visor → workbench (D-067). Trae los cambios de estado y fecha
 * de publicación hechos en el visor, los escribe en la curación
 * (data/curation/editorial-curation.json) con su autor y los marca como traídos
 * en la bandeja. No despliega: para llevar el resultado al visor hay que hacer
 * commit de la curación y `vercel deploy --prod` (sincronización inversa).
 *
 * Lee DATABASE_URL de apps/workbench/.env.local (o de apps/viewer/.env.local);
 * sin ella usa la bandeja local que comparten visor y workbench en desarrollo.
 */

const root = resolve(import.meta.dirname, "../../..");
for (const file of ["apps/workbench/.env.local", "apps/viewer/.env.local"]) {
  try {
    if (!process.env.DATABASE_URL?.trim()) process.loadEnvFile(resolve(root, file));
  } catch {
    /* El fichero es opcional. */
  }
}

const dryRun = process.argv.includes("--dry-run");
const report = await syncInboxToCuration({ dryRun });
const line = (change: DescribedChange) =>
  `  · ${change.brand ? `[${change.brand}] ` : ""}${change.piece}: ${change.summary} (${change.actor}, ${new Date(change.createdAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })})`;

console.log(`Bandeja: ${report.source}. ${report.total} cambios registrados.`);
if (report.applied.length) console.log(`\n${dryRun ? "Se incorporarían" : "Incorporados"} a la curación (${report.applied.length}):\n${report.applied.map(line).join("\n")}`);
if (report.superseded.length) console.log(`\nDescartados: el workbench editó la pieza después (${report.superseded.length}):\n${report.superseded.map(line).join("\n")}`);
if (report.orphaned.length) console.log(`\nDescartados: la pieza ya no está en el plan (${report.orphaned.length}):\n${report.orphaned.map(line).join("\n")}`);
if (!report.applied.length && !report.superseded.length && !report.orphaned.length) console.log("\nNada nuevo que traer: el workbench ya está al día con el visor.");
if (dryRun) console.log("\n--dry-run: no se ha escrito nada.");
else if (report.applied.length) console.log("\nCuración actualizada. Para publicarla en el visor: commit de packages/editorial/data/curation/editorial-curation.json y vercel deploy --prod.");
process.exit(0);
