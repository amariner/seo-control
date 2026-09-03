import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LocalDuckDbStore } from "./store";

describe("DuckDB + Parquet", () => {
  it("persists a crawl and exports only approved curated issues", async () => {
    const directory = await mkdtemp(join(tmpdir(), "seo-duckdb-"));
    const store = await LocalDuckDbStore.open(join(directory, "workbench.duckdb"));
    try {
      await store.execute("INSERT INTO crawl_runs (id, project, domain, started_at, status, max_urls, configuration) VALUES ($id, $project, $domain, now(), 'complete', 50000, '{}')", { id: "run-1", project: "noken", domain: "noken.com" });
      await store.execute("INSERT INTO curated_issues VALUES ($id, 'run-1', 'fp-1', 'Indexabilidad', 'alta', 10, 1200, 2, 80, '[]', true)", { id: "issue-1" });
      const parquet = await store.exportApprovedIssues("run-1", join(directory, "issues.parquet"));
      expect((await readFile(parquet)).subarray(0, 4).toString()).toBe("PAR1");
      const rows = await store.query<{ total: number }>("SELECT count(*)::INTEGER AS total FROM curated_issues WHERE approved = true");
      expect(rows[0]?.total).toBe(1);
    } finally { store.close(); }
  });
});
