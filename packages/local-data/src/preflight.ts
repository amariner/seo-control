import { statfs } from "node:fs/promises";

export const REQUIRED_FREE_BYTES = 50 * 1024 * 1024 * 1024;

export async function diskPreflight(path: string) {
  const stats = await statfs(path);
  const freeBytes = stats.bavail * stats.bsize;
  return {
    freeBytes,
    directory: path,
    requiredBytes: REQUIRED_FREE_BYTES,
    ready: freeBytes >= REQUIRED_FREE_BYTES,
    freeGiB: Math.round((freeBytes / 1024 ** 3) * 10) / 10,
  };
}

export function assertCrawlLimit(maxUrls: number) {
  if (!Number.isInteger(maxUrls) || maxUrls < 1 || maxUrls > 50_000) throw new Error("El crawl debe limitarse entre 1 y 50.000 URLs");
  return maxUrls;
}

/**
 * Crawls pequeños (D-070): hasta 1.000 URL el crawl ocupa unos pocos MB, así que
 * basta el mínimo con el que el repositorio sigue compilando (3 GiB). Por encima,
 * rige el preflight completo de 50 GiB del roadmap (P5).
 */
export const SMALL_CRAWL_MAX_URLS = 1000;
export const SMALL_CRAWL_FREE_BYTES = 3 * 1024 * 1024 * 1024;

export function crawlDiskCheck(maxUrls: number, freeBytes: number): { allowed: boolean; requiredGiB: number } {
  const required = maxUrls <= SMALL_CRAWL_MAX_URLS ? SMALL_CRAWL_FREE_BYTES : REQUIRED_FREE_BYTES;
  return { allowed: freeBytes >= required, requiredGiB: required / 1024 ** 3 };
}
