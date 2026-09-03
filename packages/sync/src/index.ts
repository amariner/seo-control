import { createHash, verify } from "node:crypto";
import {
  publicationPackageSchema,
  syncRequestSchema,
  type ProjectSlug,
  type PublicationPackage,
} from "@seo/contracts";

export type CloudSource = "ga4" | "gsc" | "semrush" | "geo" | "crux" | "pagespeed";

export type NormalizedBatch = {
  source: CloudSource;
  project: ProjectSlug;
  cutoff: string;
  coverage: number;
  rows: ReadonlyArray<Record<string, string | number | boolean | null>>;
  warnings: string[];
};

export interface SourceConnector {
  readonly source: CloudSource;
  fetchAndNormalize(input: { project: ProjectSlug; cutoff: string; start: string }): Promise<NormalizedBatch>;
}

export interface SyncStore {
  acquireLock(key: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
  hasCompleted(idempotencyKey: string): Promise<boolean>;
  begin(input: { idempotencyKey: string; project: ProjectSlug; source: CloudSource; cutoff: string }): Promise<string>;
  commit(runId: string, batch: NormalizedBatch): Promise<void>;
  fail(runId: string, error: string): Promise<void>;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function syncWindow(source: CloudSource, now = new Date()) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3));
  const rollingDays = source === "ga4" || source === "gsc" ? 7 : 0;
  const start = new Date(cutoff);
  start.setUTCDate(start.getUTCDate() - rollingDays);
  return { cutoff: isoDate(cutoff), start: isoDate(start) };
}

export class SyncOrchestrator {
  constructor(
    private readonly connectors: ReadonlyMap<CloudSource, SourceConnector>,
    private readonly store: SyncStore,
  ) {}

  async run(rawRequest: unknown) {
    const request = syncRequestSchema.parse(rawRequest);
    const connector = this.connectors.get(request.source);
    if (!connector) throw new Error(`Conector no configurado: ${request.source}`);

    const window = syncWindow(request.source, new Date(request.requestedAt));
    const idempotencyKey = `${request.project}:${request.source}:${window.cutoff}`;
    if (!request.force && await this.store.hasCompleted(idempotencyKey)) {
      return { status: "skipped" as const, reason: "already-complete", idempotencyKey };
    }

    const locked = await this.store.acquireLock(idempotencyKey, 900);
    if (!locked) return { status: "skipped" as const, reason: "locked", idempotencyKey };

    let runId: string | undefined;
    try {
      runId = await this.store.begin({ idempotencyKey, project: request.project, source: request.source, cutoff: window.cutoff });
      const batch = await connector.fetchAndNormalize({ project: request.project, ...window });
      if (batch.rows.length === 0 || batch.coverage <= 0) throw new Error("Snapshot vacío o sin cobertura; se conserva el último dato válido");
      await this.store.commit(runId, batch);
      return { status: "complete" as const, runId, idempotencyKey, coverage: batch.coverage, rows: batch.rows.length };
    } catch (error) {
      if (runId) await this.store.fail(runId, error instanceof Error ? error.message : "Error desconocido");
      throw error;
    } finally {
      await this.store.releaseLock(idempotencyKey);
    }
  }
}

const forbiddenKey = /(email|phone|telefono|nombre|name|user[_-]?id|client[_-]?id|ip|cookie|token|secret|raw|payload)/i;

export function canonicalPublicationBody(pkg: Omit<PublicationPackage, "signature">) {
  return JSON.stringify({
    schemaVersion: pkg.schemaVersion,
    packageId: pkg.packageId,
    project: pkg.project,
    createdAt: pkg.createdAt,
    createdBy: pkg.createdBy,
    sourceSnapshotId: pkg.sourceSnapshotId,
    checksum: pkg.checksum,
    rows: pkg.rows,
  });
}

export function validatePublicationPackage(raw: unknown, publicKeyPem?: string) {
  const pkg = publicationPackageSchema.parse(raw);
  for (const row of pkg.rows) {
    const forbidden = Object.keys(row).find((key) => forbiddenKey.test(key));
    if (forbidden) throw new Error(`Campo no permitido en publicación: ${forbidden}`);
  }

  const rowsBody = JSON.stringify(pkg.rows);
  const digest = createHash("sha256").update(rowsBody).digest("hex");
  if (digest !== pkg.checksum) throw new Error("Checksum de publicación no válido");

  if (publicKeyPem) {
    const { signature, ...unsigned } = pkg;
    const valid = verify("sha256", Buffer.from(canonicalPublicationBody(unsigned)), publicKeyPem, Buffer.from(signature, "base64"));
    if (!valid) throw new Error("Firma de publicación no válida");
  }
  return pkg;
}

export class SyntheticConnector implements SourceConnector {
  constructor(readonly source: CloudSource) {}

  async fetchAndNormalize(input: { project: ProjectSlug; cutoff: string; start: string }): Promise<NormalizedBatch> {
    return {
      source: this.source,
      project: input.project,
      cutoff: input.cutoff,
      coverage: this.source === "pagespeed" ? 0.88 : 1,
      rows: [{ project: input.project, start: input.start, cutoff: input.cutoff, metric: "synthetic", value: 1 }],
      warnings: this.source === "pagespeed" ? ["Dos URLs mantienen el último snapshot válido"] : [],
    };
  }
}
