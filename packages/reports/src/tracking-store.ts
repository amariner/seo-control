import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { actionTrackingStoreSchema, emptyActionTracking, parseActionTracking, type ActionTrackingStore } from "./action-tracking";

/**
 * Fichero del seguimiento de acciones (D-090). Lo escriben solo los scripts
 * del chat (`pnpm action:track`, `pnpm action:measure`); el workbench lo lee
 * sin caché y el visor lo empaqueta (`./tracking-published`). Las rutas se
 * resuelven como las de los informes publicados (`./files`).
 */
const RELATIVE = "packages/reports/data/tracking/actions.json";
const PACKAGE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../data/tracking/actions.json");

export function trackingPath(): string {
  return (
    [process.env.ACTION_TRACKING_PATH, PACKAGE_PATH, resolve(process.cwd(), RELATIVE), resolve(process.cwd(), "../..", RELATIVE)]
      .filter((candidate): candidate is string => Boolean(candidate))
      .find((candidate) => existsSync(/*turbopackIgnore: true*/ candidate)) ?? PACKAGE_PATH
  );
}

export function readTracking() {
  const path = trackingPath();
  if (!existsSync(/*turbopackIgnore: true*/ path)) return { ...emptyActionTracking(), invalid: null };
  return parseActionTracking(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")));
}

export function writeTracking(store: ActionTrackingStore, now = new Date().toISOString()): void {
  const parsed = actionTrackingStoreSchema.parse({ ...store, updatedAt: now });
  // Claves ordenadas: el diff que sube al visor es estable y legible.
  const actions = Object.fromEntries(Object.entries(parsed.actions).sort(([a], [b]) => a.localeCompare(b)));
  const path = trackingPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, updatedAt: parsed.updatedAt, actions }, null, 1)}\n`, "utf8");
}

/**
 * Qué falta por subir al visor: acciones nuevas, cambiadas o retiradas frente
 * al último commit (el visor desplegado sale de un commit).
 */
export function trackingPending(): { added: string[]; changed: string[]; removed: string[] } {
  const current = readTracking().actions;
  let committed: ActionTrackingStore["actions"] = {};
  try {
    const root = resolve(dirname(trackingPath()), "../../../..");
    const raw = execFileSync("git", ["show", `HEAD:${RELATIVE}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    committed = parseActionTracking(JSON.parse(raw)).actions;
  } catch {
    committed = {};
  }
  const ids = new Set([...Object.keys(current), ...Object.keys(committed)]);
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  for (const id of [...ids].sort()) {
    if (!committed[id]) added.push(id);
    else if (!current[id]) removed.push(id);
    else if (JSON.stringify(current[id]) !== JSON.stringify(committed[id])) changed.push(id);
  }
  return { added, changed, removed };
}
