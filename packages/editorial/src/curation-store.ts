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

export function readCurationStore(path: string = DEFAULT_CURATION_PATH): EditorialCurationStore {
  if (!existsSync(path)) return emptyCurationStore(new Date(0).toISOString());
  return editorialCurationStoreSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function writeCurationStore(store: EditorialCurationStore, path: string = DEFAULT_CURATION_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 1)}\n`, "utf8");
}
