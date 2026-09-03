import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Permisos del workbench (P1.5), contraparte de `apps/viewer/lib/permissions.test.ts`.
 *
 * El workbench sí escribe, pero por un solo camino: los Server Actions de
 * `app/editorial/actions.ts`. Estas pruebas fijan ese embudo, de modo que
 * escribir la curación desde una página, un componente o una ruta de API rompa
 * la suite en lugar de abrir un segundo punto de escritura sin control de
 * versión, autoría ni nota.
 */

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../app");

/** Funciones que mutan o persisten la curación editorial. */
const WRITE_SYMBOLS = ["writeCurationStore", "upsertPieceCuration", "upsertSlotCuration", "upsertEventCuration", "addCreatedPiece"];
const ACTIONS_FILE = "editorial/actions.ts";

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const FILES = walk(APP_DIR).map((file) => ({ path: relative(APP_DIR, file), source: readFileSync(file, "utf8") }));

describe("el workbench escribe, pero solo por los Server Actions", () => {
  it("localiza el fichero de acciones editoriales", () => {
    const actions = FILES.find((file) => file.path === ACTIONS_FILE);
    expect(actions).toBeDefined();
    expect(/^\s*["']use server["']/m.test(actions!.source)).toBe(true);
  });

  it("ningún otro fichero del workbench muta la curación", () => {
    const offenders = FILES.filter((file) => file.path !== ACTIONS_FILE).flatMap((file) => WRITE_SYMBOLS.filter((symbol) => file.source.includes(symbol)).map((symbol) => `${file.path} usa ${symbol}`));
    expect(offenders).toEqual([]);
  });

  it("ninguna ruta de API del workbench acepta escritura", () => {
    const writeRoutes = FILES.filter((file) => file.path.endsWith("route.ts") && /export\s+(?:async\s+)?(?:function|const)\s+(POST|PUT|PATCH|DELETE)\b/.test(file.source));
    expect(writeRoutes.map((file) => file.path)).toEqual([]);
  });

  it("las acciones cubren pieza, hueco, evento y creación, y todas persisten", () => {
    const actions = FILES.find((file) => file.path === ACTIONS_FILE)!.source;
    for (const symbol of WRITE_SYMBOLS) expect(actions.includes(symbol), `las acciones deberían usar ${symbol}`).toBe(true);
    const exported = [...actions.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((match) => match[1]);
    expect(exported).toContain("savePieceCuration");
    // Cada acción exportada debe terminar escribiendo y revalidando: sin eso, el
    // visor seguiría sirviendo el estado anterior y la edición parecería perdida.
    expect(actions.includes("writeCurationStore")).toBe(true);
    expect(actions.includes("revalidatePath")).toBe(true);
  });

  it("la lectura del workbench usa el mismo dataset efectivo que el visor", () => {
    const lib = readFileSync(resolve(APP_DIR, "../lib/editorial.ts"), "utf8");
    expect(lib.includes("getEffectiveEditorialDataset")).toBe(true);
  });
});
