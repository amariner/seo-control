/**
 * `pnpm report:curate -- --project <slug> --period <2026-Q2>` (D-082).
 * Puntualizaciones de un informe congelado, desde el chat del asistente
 * (Claude Code o Codex): sustituye al editor que tenía el workbench.
 *
 * - Sin más flags (o `--show`): imprime en JSON los apartados con sus cifras,
 *   tablas y claves de fila, y las puntualizaciones vigentes con la misma
 *   forma que espera `--file`.
 * - `--file <ruta.json>`: sustituye las puntualizaciones por las del fichero
 *   (`{ slides, actions }`, ver `reportCurationInputSchema`). Falla si nombra
 *   un apartado, cifra, tabla o fila que el informe no tiene.
 * - `--reset`: quita todas las puntualizaciones.
 *
 * Solo sobre versiones congeladas: primero `pnpm report:generate`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { brandSlugSchema } from "@seo/contracts";
import { snapshotInput } from "../src";
import { curationProblems, describeSlides } from "../src/curate";
import { buildProjectReport } from "../src/project-report";
import { reportCurationInputSchema, reportIdOf, reportIdSchema } from "../src/schema";
import { localAuthor, readReports, readSnapshot, saveCuration } from "../src/store";

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const project = brandSlugSchema.parse(value("--project"));
const id = reportIdSchema.parse(reportIdOf(project, value("--period") ?? ""));
const snapshot = readSnapshot(id);
if (!snapshot) throw new Error(`${id} no está congelado: pnpm report:generate -- --project ${project} --period ${id.split(":")[1]}`);
const current = readReports().reports[id]?.curation;
const stamp = () => ({ updatedAt: new Date().toISOString(), updatedBy: localAuthor() });

if (args.includes("--reset")) {
  saveCuration(id, { slides: {}, actions: [], ...stamp() });
  console.log(`✓ ${id}: puntualizaciones retiradas`);
} else if (value("--file")) {
  // `pnpm --filter` ejecuta en packages/reports: la ruta se resuelve contra donde se lanzó el comando.
  const file = resolve(process.env.INIT_CWD ?? process.cwd(), value("--file")!);
  const input = reportCurationInputSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const slides = buildProjectReport({ ...snapshotInput(snapshot), teamActions: input.actions });
  const problems = curationProblems(slides, input);
  if (problems.length) {
    console.error(`✗ ${id}: nada guardado.\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    process.exit(1);
  }
  saveCuration(id, { ...input, ...stamp() });
  const notes = Object.values(input.slides).filter((item) => item.note).length;
  console.log(`✓ ${id}: ${Object.keys(input.slides).length} apartados puntualizados, ${notes} notas, ${input.actions.length} acciones del equipo. Para el visor desplegado: «sube los informes».`);
} else {
  const slides = buildProjectReport({ ...snapshotInput(snapshot), teamActions: current?.actions });
  const out = {
    id,
    snapshot: { generatedAt: snapshot.generatedAt, generatedBy: snapshot.generatedBy, cutoff: snapshot.report.cutoff },
    curation: current ? { slides: current.slides, actions: current.actions } : { slides: {}, actions: [] },
    curatedBy: current ? { updatedAt: current.updatedAt, updatedBy: current.updatedBy } : null,
    slides: describeSlides(slides),
  };
  console.log(JSON.stringify(out, null, 1));
}
