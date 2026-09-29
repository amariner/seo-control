/**
 * `pnpm editorial:measure` (P3.5, D-079): mide con Search Console real las
 * piezas publicadas del plan en ventanas de 28, 90 y 180 días. Lo mismo que
 * «Medir publicaciones» en el plan editorial del workbench.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runEditorialMeasurement } from "../src/measure";
import { localAuthor, repositoryRoot } from "../src/store";

for (const file of ["apps/workbench/.env.local", "apps/viewer/.env.local"]) {
  const path = resolve(repositoryRoot(), file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]!] === undefined) process.env[match[1]!] = match[2]!.replace(/^"(.*)"$/, "$1");
  }
  break;
}
const { store, requests } = await runEditorialMeasurement({ author: localAuthor() });
const measured = Object.values(store.pieces).flat();
console.log(`✓ ${Object.keys(store.pieces).length} piezas medidas (${requests} consultas a Search Console, corte ${store.cutoff})`);
console.log(`  ventanas: ${measured.filter((m) => m.status === "medido").length} medidas · ${measured.filter((m) => m.status === "en_curso").length} en curso · ${measured.filter((m) => m.status === "pendiente").length} pendientes`);
for (const item of store.skipped) console.log(`  sin medir ${item.id}: ${item.reason}`);
