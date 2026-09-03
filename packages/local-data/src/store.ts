import { mkdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { CURATED_EXPORT_SQL, LOCAL_SCHEMA_SQL } from "./schema";

export class LocalDuckDbStore {
  private constructor(private readonly connection: DuckDBConnection) {}

  static async open(databasePath: string) {
    const path = resolve(databasePath);
    await mkdir(dirname(path), { recursive: true });
    const instance = await DuckDBInstance.fromCache(path, { threads: "4", memory_limit: "4GB" });
    const connection = await instance.connect();
    await connection.run(LOCAL_SCHEMA_SQL);
    return new LocalDuckDbStore(connection);
  }

  async execute(sql: string, values?: Record<string, string | number | boolean | null>) {
    return this.connection.run(sql, values);
  }

  async query<T extends Record<string, unknown>>(sql: string, values?: Record<string, string | number | boolean | null>) {
    const result = await this.connection.run(sql, values);
    return await result.getRowObjectsJson() as T[];
  }

  async exportApprovedIssues(runId: string, outputPath: string) {
    const resolved = resolve(outputPath);
    if (extname(resolved).toLowerCase() !== ".parquet") throw new Error("La exportación curada debe usar extensión .parquet");
    await mkdir(dirname(resolved), { recursive: true });
    await this.connection.run(CURATED_EXPORT_SQL, { run_id: runId, output_path: resolved });
    return resolved;
  }

  close() {
    this.connection.closeSync();
  }
}
