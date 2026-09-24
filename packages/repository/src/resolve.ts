import { RepositoryUnavailableError, type MetricsRepository, type RepositoryMode } from "./contract";
import { createPostgresRepository } from "./postgres";
import { createSyntheticRepository } from "./synthetic";
import { createLiveRepository } from "./live/repository";

/**
 * Selección del origen (P3.1).
 *
 * Una sola variable de entorno, `SEO_DATA_SOURCE`, y un solo sitio donde se lee.
 * Sin ella, el origen es el sintético: es el único operativo, y el arranque por
 * defecto no debe depender de que alguien recuerde exportar una variable.
 *
 * Un valor desconocido **falla** en vez de caer al sintético. Escribir
 * `SEO_DATA_SOURCE=postgress` con una errata y recibir cifras sintéticas
 * creyendo que son reales es exactamente el fallo que esta capa existe para
 * impedir.
 */
export const REPOSITORY_ENV_VAR = "SEO_DATA_SOURCE" as const;

const FACTORIES: Record<RepositoryMode, () => MetricsRepository> = {
  synthetic: createSyntheticRepository,
  // Lectura directa de GA4/GSC desde el servidor, puente hasta el almacén de P3 (D-034).
  live: () => createLiveRepository(),
  // El origen local (DuckDB/Parquet del workbench) llega con P5; hasta entonces
  // se declara para que el selector sea exhaustivo y no acepte el valor.
  local: () => {
    throw new RepositoryUnavailableError(
      "local",
      "El origen local (DuckDB/Parquet del workbench) no está implementado: llega con P5, junto a la publicación firmada de crawls.",
      "Usa «synthetic» mientras P5 no esté entregada.",
    );
  },
  database: createPostgresRepository,
};

export function isRepositoryMode(value: string): value is RepositoryMode {
  return value in FACTORIES;
}

/**
 * Devuelve el origen configurado. No cachea: los payloads son deterministas y
 * las fábricas no abren conexiones, así que no hay estado que compartir entre
 * peticiones (cuando P3.2 abra un pool, el pool se cachea en `@seo/db`, que es
 * su sitio, no aquí).
 */
export function resolveRepository(env: Record<string, string | undefined> = process.env): MetricsRepository {
  const requested = env[REPOSITORY_ENV_VAR]?.trim();
  if (!requested) return createSyntheticRepository();
  if (!isRepositoryMode(requested)) {
    throw new RepositoryUnavailableError(
      "synthetic",
      `${REPOSITORY_ENV_VAR}="${requested}" no es un origen válido. Valores admitidos: ${Object.keys(FACTORIES).join(", ")}.`,
      `Corrige la variable o quítala para usar el origen sintético. No se cae al sintético con un valor erróneo a propósito: presentaría cifras sintéticas como reales.`,
    );
  }
  return FACTORIES[requested]();
}
