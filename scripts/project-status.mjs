import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const state = JSON.parse(await readFile(resolve(root, "docs/continuity/PROJECT_STATE.json"), "utf8"));

console.log(`\n${state.project}`);
console.log(`Fase activa: ${state.currentPhase.id} · ${state.currentPhase.name}`);
console.log(`Estado: ${state.currentPhase.status} · ${state.currentPhase.progressPercent}%`);
console.log(`Siguiente acción: ${state.nextAction}`);
console.log("\nBloqueos:");
for (const blocker of state.blockers.filter((item) => item.status !== "resolved")) {
  console.log(`- [${blocker.status}] ${blocker.scope}: ${blocker.detail}`);
}
console.log(`\nÚltima validación: ${state.lastValidation.date}`);
console.log(`- ${state.lastValidation.typecheck}`);
console.log(`- ${state.lastValidation.tests}`);
console.log(`- ${state.lastValidation.productionBuild}\n`);
