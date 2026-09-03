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
