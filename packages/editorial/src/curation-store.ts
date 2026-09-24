import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorialCurationStoreSchema, emptyCurationStore, type EditorialCurationStore } from "@seo/contracts";

/**
 * Persistencia del almacén de curación editorial (P1.4).
 *
 * Vive en un fichero separado del dataset importado de V1 (D-008): nunca lo
 * sobrescribe, así que `pnpm editorial:import` sigue siendo idempotente sobre
 * los cuatro snapshots V1 sin perder curación. En P3 este fichero se sustituye
 * por PostgreSQL con la misma firma de lectura (`readCurationStore`).
 *
 * La lectura es siempre síncrona y sin caché en memoria: el visor (puerto 3000)
 * y el workbench (puerto 3001) son procesos distintos que comparten el mismo
 * disco en local, así que cada petición ve la curación más reciente sin
 * necesidad de reiniciar ni de un bus de invalidación.
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_CURATION_PATH = resolve(PACKAGE_ROOT, "data/curation/editorial-curation.json");

export const sha256 = (input: string) => createHash("sha256").update(input, "utf8").digest("hex");

const CURATION_RELATIVE = "packages/editorial/data/curation/editorial-curation.json";

/**
 * Dónde buscar la curación al leer. En desarrollo basta la ruta relativa al
 * paquete, pero en un build de producción Next empaqueta este módulo y
 * `import.meta.url` apunta al chunk, no a `packages/editorial`: la lectura
 * devolvía un almacén vacío sin avisar y el visor desplegado perdía toda la
 * curación publicada. Se prueban, en orden, la variable explícita, la ruta del
 * paquete y las dos raíces posibles desde el directorio de trabajo (monorepo o
 * `apps/viewer`, que es donde arranca la función en Vercel).
 */
export function curationPathCandidates(): string[] {
  return [
    process.env.EDITORIAL_CURATION_PATH,
    DEFAULT_CURATION_PATH,
    resolve(process.cwd(), CURATION_RELATIVE),
    resolve(process.cwd(), "../..", CURATION_RELATIVE),
  ].filter((candidate): candidate is string => Boolean(candidate));
}

export function readCurationStore(explicitPath?: string): EditorialCurationStore {
  // Rutas resueltas en ejecución: el fichero se incluye en el despliegue con
  // `outputFileTracingIncludes` (apps/viewer/next.config.ts), no por trazado.
  const path = explicitPath ?? curationPathCandidates().find((candidate) => existsSync(/*turbopackIgnore: true*/ candidate)) ?? DEFAULT_CURATION_PATH;
  if (!existsSync(/*turbopackIgnore: true*/ path)) return emptyCurationStore(new Date(0).toISOString());
  return editorialCurationStoreSchema.parse(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")));
}

export function writeCurationStore(store: EditorialCurationStore, path: string = DEFAULT_CURATION_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 1)}\n`, "utf8");
}
