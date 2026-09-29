/**
 * `pnpm report:generate -- --project <slug> --period <2026-Q2|2026-08>` (D-076).
 * Congela un informe con datos reales de GA4 y Search Console. Lee las
 * credenciales de apps/workbench/.env.local (o, en su defecto, de las del
 * visor). Lo mismo que el botón «Regenerar» de /informes en el workbench.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { brandSlugSchema } from "@seo/contracts";
import { generateSnapshot } from "../src/generate";
import { localAuthor, repositoryRoot, saveSnapshot } from "../src/store";

function loadEnv() {
  const root = repositoryRoot();
  for (const file of ["apps/workbench/.env.local", "apps/viewer/.env.local"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && process.env[match[1]!] === undefined) process.env[match[1]!] = match[2]!.replace(/^"(.*)"$/, "$1");
    }
    return file;
  }
  return null;
}

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const project = brandSlugSchema.parse(value("--project"));
const period = value("--period");
if (!period) throw new Error("Falta --period (p. ej. 2026-Q2 o 2026-08)");
const source = loadEnv();
console.log(`Generando ${project} · ${period} (credenciales: ${source ?? "entorno"})…`);
const started = Date.now();
const { id, snapshot } = await generateSnapshot({ brand: project, period, author: localAuthor() });
saveSnapshot(id, snapshot);
console.log(`✓ ${id} congelado en ${((Date.now() - started) / 1000).toFixed(1)} s · corte ${snapshot.report.cutoff} · ${snapshot.pieces.length} piezas · crawl ${snapshot.audit ? "sí" : "no"}`);
