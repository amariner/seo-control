import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SyncOrchestrator, SyntheticConnector, syncWindow, validatePublicationPackage, type SyncStore } from "./index";

class MemoryStore implements SyncStore {
  complete = new Set<string>();
  locks = new Set<string>();
  async acquireLock(key: string) { if (this.locks.has(key)) return false; this.locks.add(key); return true; }
  async releaseLock(key: string) { this.locks.delete(key); }
  async hasCompleted(key: string) { return this.complete.has(key); }
  async begin() { return "run-1"; }
  async commit() { this.complete.add("porcelanosa:gsc:2026-08-30"); }
  async fail() {}
}

describe("sync orchestration", () => {
  it("reprocesa siete días y toma el desfase de cada fuente del catálogo", () => {
    // Search Console publica con tres días: D-3. La cola son siete días
    // contando el corte (antes eran ocho por contar `cutoff - 7`).
    expect(syncWindow("gsc", new Date("2026-09-02T10:00:00Z"))).toEqual({ cutoff: "2026-08-30", start: "2026-08-24" });
    // GA4 publica con uno; fijar D-3 también aquí cerraba su día dos días tarde.
    expect(syncWindow("ga4", new Date("2026-09-02T10:00:00Z"))).toEqual({ cutoff: "2026-09-01", start: "2026-08-26" });
    // Una fuente semanal no arrastra cola diaria: su corte es su desfase.
    expect(syncWindow("semrush", new Date("2026-09-02T10:00:00Z"))).toEqual({ cutoff: "2026-08-26", start: "2026-08-26" });
  });

  it("is idempotent", async () => {
    const store = new MemoryStore();
    const orchestrator = new SyncOrchestrator(new Map([["gsc", new SyntheticConnector("gsc")]]), store);
    const request = { project: "porcelanosa", source: "gsc", requestedAt: "2026-09-02T10:00:00Z" };
    expect((await orchestrator.run(request)).status).toBe("complete");
    expect((await orchestrator.run(request)).status).toBe("skipped");
  });
});

describe("publication package", () => {
  it("rejects PII-like fields", () => {
    const rows = [{ url: "/example", email: "hidden@example.com" }];
    expect(() => validatePublicationPackage({
      schemaVersion: "1.0",
      packageId: "c26f67c6-5af1-4c7e-a9d8-c76043382e80",
      project: "noken",
      createdAt: "2026-09-02T10:00:00Z",
      createdBy: "service",
      sourceSnapshotId: "crawl-1",
      checksum: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
      rows,
      signature: "a".repeat(32),
    })).toThrow(/no permitido/);
  });
});
