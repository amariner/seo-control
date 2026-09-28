import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { serviceAuthorized } from "./http";

/**
 * Permisos del visor (P1.5).
 *
 * Hasta ahora el visor no podía escribir porque no importaba ningún módulo de
 * escritura: una propiedad real, pero sostenida solo por revisión manual. Estas
 * pruebas la convierten en un invariante verificable, de modo que añadir un
 * `POST`, un Server Action o un `import` del almacén de curación en el visor
 * rompa la suite en lugar de pasar desapercibido.
 *
 * D-067 abre una única excepción: el Server Action de `app/editorial/actions.ts`
 * guarda estado y fecha de publicación en la bandeja de cambios del visor. La
 * curación sigue sin poder escribirse desde aquí.
 *
 * Se leen los ficheros fuente a propósito: es la única forma de aseverar la
 * ausencia de un export sin ejecutar el runtime de Next ni montar un servidor.
 */

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../app");

const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

/** Módulos que escriben en disco o mutan la curación: prohibidos en el visor. */
const WRITE_MODULES = ["@seo/editorial/curation-store", "node:fs", "node:fs/promises", "fs", "fs/promises"];
const WRITE_SYMBOLS = ["writeCurationStore", "upsertPieceCuration", "upsertSlotCuration", "upsertEventCuration", "addCreatedPiece", "importEditorialV1"];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

/** Única escritura permitida al visor (D-067): la bandeja de cambios, nunca la curación. */
const VIEWER_ACTIONS = "editorial/actions.ts";

const read = (file: string) => ({ path: relative(APP_DIR, file), source: readFileSync(file, "utf8") });

const ALL_FILES = walk(APP_DIR).map(read);
const EDITORIAL_FILES = ALL_FILES.filter((file) => file.path.startsWith("editorial/") || file.path.startsWith("api/v1/editorial/"));
/** Las rutas `service/*` son la excepción declarada: reciben del workbench y exigen token. */
const SERVICE_FILES = ALL_FILES.filter((file) => file.path.startsWith("api/v1/service/"));

const exportsMethod = (source: string, method: string) => new RegExp(`export\\s+(?:async\\s+)?(?:function\\s+${method}\\b|const\\s+${method}\\b)`).test(source);

describe("el visor solo lee, salvo estado y fecha del plan hacia la bandeja (D-067)", () => {
  it("encuentra las rutas editoriales que debe vigilar", () => {
    expect(EDITORIAL_FILES.length).toBeGreaterThanOrEqual(9);
    expect(EDITORIAL_FILES.some((file) => file.path === "editorial/calendario/page.tsx")).toBe(true);
    expect(EDITORIAL_FILES.some((file) => file.path === "api/v1/editorial/pieces/route.ts")).toBe(true);
  });

  it("ninguna ruta editorial exporta un método de escritura", () => {
    const offenders = EDITORIAL_FILES.flatMap((file) => WRITE_METHODS.filter((method) => exportsMethod(file.source, method)).map((method) => `${file.path} exporta ${method}`));
    expect(offenders).toEqual([]);
  });

  it("cada ruta editorial de API expone GET y nada más", () => {
    const routes = EDITORIAL_FILES.filter((file) => file.path.endsWith("route.ts"));
    expect(routes.length).toBeGreaterThanOrEqual(6);
    for (const route of routes) expect(exportsMethod(route.source, "GET"), `${route.path} debería exportar GET`).toBe(true);
  });

  it("solo hay un Server Action en el visor: estado y fecha a la bandeja (D-067)", () => {
    const actions = ALL_FILES.filter((file) => /^\s*["']use server["']/m.test(file.source));
    expect(actions.map((file) => file.path)).toEqual([VIEWER_ACTIONS]);
    const source = actions[0]!.source;
    const exported = [...source.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((match) => match[1]);
    expect(exported).toEqual(["editPieceFromViewer"]);
    // Autenticado, validado con el contrato cerrado de la bandeja y escrito solo en ella.
    expect(source.includes("await auth()")).toBe(true);
    expect(source.includes("editorialInboxEditSchema")).toBe(true);
    expect(source.includes("resolveEditorialInbox")).toBe(true);
  });

  it("el visor no importa módulos ni funciones de escritura", () => {
    const offenders = ALL_FILES.flatMap((file) => {
      const modules = WRITE_MODULES.filter((module) => new RegExp(`from\\s+["']${module.replace("/", "\\/")}["']`).test(file.source));
      const symbols = WRITE_SYMBOLS.filter((symbol) => file.source.includes(symbol));
      return [...modules, ...symbols].map((hit) => `${file.path} usa ${hit}`);
    });
    expect(offenders).toEqual([]);
  });

  it("solo las rutas de servicio aceptan métodos de escritura", () => {
    const writeRoutes = ALL_FILES.filter((file) => WRITE_METHODS.some((method) => exportsMethod(file.source, method))).map((file) => file.path);
    const servicePaths = SERVICE_FILES.map((file) => file.path);
    expect(writeRoutes.length).toBeGreaterThan(0);
    expect(writeRoutes.filter((path) => !servicePaths.includes(path))).toEqual([]);
  });

  it("toda ruta de servicio exige token de servicio o secreto de cron antes de actuar", () => {
    expect(SERVICE_FILES.length).toBeGreaterThanOrEqual(3);
    const unguarded = SERVICE_FILES.filter((file) => !file.source.includes("serviceAuthorized") && !file.source.includes("CRON_SECRET")).map((file) => file.path);
    expect(unguarded).toEqual([]);
  });
});

describe("token de servicio", () => {
  const request = (authorization?: string) => new Request("https://viewer.local/api/v1/service/sync", { headers: authorization ? { authorization } : {} });
  const withToken = <T,>(token: string | undefined, run: () => T): T => {
    const previous = process.env.SERVICE_TOKEN;
    if (token === undefined) delete process.env.SERVICE_TOKEN;
    else process.env.SERVICE_TOKEN = token;
    try {
      return run();
    } finally {
      if (previous === undefined) delete process.env.SERVICE_TOKEN;
      else process.env.SERVICE_TOKEN = previous;
    }
  };

  it("rechaza cuando el entorno no define ningún token", () => {
    expect(withToken(undefined, () => serviceAuthorized(request("Bearer cualquiera")))).toBe(false);
  });

  it("rechaza una petición sin cabecera de autorización", () => {
    expect(withToken("secreto-de-servicio", () => serviceAuthorized(request()))).toBe(false);
  });

  it("rechaza un token que no coincide", () => {
    expect(withToken("secreto-de-servicio", () => serviceAuthorized(request("Bearer otro")))).toBe(false);
  });

  it("acepta el token exacto con o sin el prefijo Bearer", () => {
    expect(withToken("secreto-de-servicio", () => serviceAuthorized(request("Bearer secreto-de-servicio")))).toBe(true);
    expect(withToken("secreto-de-servicio", () => serviceAuthorized(request("secreto-de-servicio")))).toBe(true);
  });

  it("no acepta un token vacío aunque el entorno lo declare vacío", () => {
    expect(withToken("", () => serviceAuthorized(request("Bearer ")))).toBe(false);
  });
});
