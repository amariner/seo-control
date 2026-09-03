import { SyncOrchestrator, SyntheticConnector, type SyncStore } from "@seo/sync";

const completed = new Set<string>();
const locks = new Set<string>();
const store: SyncStore = {
  async acquireLock(key) { if (locks.has(key)) return false; locks.add(key); return true; },
  async releaseLock(key) { locks.delete(key); },
  async hasCompleted(key) { return completed.has(key); },
  async begin({ idempotencyKey }) { return idempotencyKey; },
  async commit(runId) { completed.add(runId); },
  async fail() {},
};

const sources = ["ga4", "gsc", "semrush", "geo", "crux", "pagespeed"] as const;
export const syncOrchestrator = new SyncOrchestrator(new Map(sources.map((source) => [source, new SyntheticConnector(source)])), store);
