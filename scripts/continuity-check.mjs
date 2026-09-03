import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "ROADMAP.md",
  "plans/PROJECT_CONTINUATION.md",
  "docs/continuity/PROJECT_STATE.json",
  "docs/continuity/V1_PARITY.md",
  "docs/continuity/DECISIONS.md",
  "docs/continuity/SESSION_LOG.md",
  "docs/design/DESIGN_SYSTEM.md",
];

await Promise.all(required.map((file) => access(resolve(root, file))));
const state = JSON.parse(await readFile(resolve(root, "docs/continuity/PROJECT_STATE.json"), "utf8"));
const roadmap = await readFile(resolve(root, "ROADMAP.md"), "utf8");
if (!state.currentPhase?.id || !state.nextAction) throw new Error("El estado no define fase activa o siguiente acción");
if (!roadmap.includes(`## ${state.currentPhase.id}`)) throw new Error(`La fase ${state.currentPhase.id} no existe en ROADMAP.md`);
if (!Array.isArray(state.invariants) || state.invariants.length < 3) throw new Error("Faltan invariantes del proyecto");
console.log(`Continuidad válida: ${state.currentPhase.id} · ${state.currentPhase.status}`);
