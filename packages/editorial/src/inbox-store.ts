import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorialInboxChangeSchema, type EditorialInboxChange } from "@seo/contracts";

/**
 * Persistencia de la bandeja de cambios del visor (D-067).
 *
 * - Con `DATABASE_URL`: tabla `editorial_inbox` en Postgres (Neon, Frankfurt).
 *   Es lo que usa el visor desplegado, cuyo disco es de solo lectura, y lo que
 *   lee el workbench al sincronizar si tiene la misma variable.
 * - Sin ella, en local: un JSON fuera de git que comparten visor (3000) y
 *   workbench (3001), para probar el circuito completo sin nube.
 * - En Vercel sin base de datos: no disponible. El visor lo dice y no edita.
 *
 * Solo viajan estado, fecha, pieza, autor y hora: filas de ~200 bytes.
 */

export type ListOptions = {
  /**
   * Devuelve solo lo que aún puede superponerse al plan desplegado: lo no
   * traído y lo traído después de esa fecha (la `updatedAt` de la curación
   * empaquetada). Así la consulta del visor no crece con el historial.
   */
  relevantAfter?: string;
};

export interface EditorialInboxStore {
  readonly kind: "postgres" | "file" | "unavailable";
  /** Texto para la interfaz: dónde se guarda o por qué no se puede. */
  readonly detail: string;
  list(options?: ListOptions): Promise<EditorialInboxChange[]>;
  add(change: EditorialInboxChange): Promise<void>;
  markPulled(ids: readonly string[], at: string): Promise<void>;
}

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INBOX_RELATIVE = "packages/editorial/data/inbox/viewer-changes.json";

/** Misma búsqueda que la curación: el visor arranca en `apps/viewer` y el workbench en `apps/workbench`. */
function inboxPath(env: NodeJS.ProcessEnv): string {
  if (env.EDITORIAL_INBOX_PATH) return env.EDITORIAL_INBOX_PATH;
  const roots = [resolve(process.cwd(), "../.."), process.cwd()];
  const root = roots.find((candidate) => existsSync(/*turbopackIgnore: true*/ resolve(candidate, "packages/editorial/package.json")));
  return root ? resolve(root, INBOX_RELATIVE) : resolve(PACKAGE_ROOT, "data/inbox/viewer-changes.json");
}

const relevant = (change: EditorialInboxChange, options?: ListOptions) =>
  !options?.relevantAfter || change.pulledAt === null || Date.parse(change.pulledAt) > Date.parse(options.relevantAfter);

function fileStore(path: string): EditorialInboxStore {
  const read = (): EditorialInboxChange[] =>
    existsSync(/*turbopackIgnore: true*/ path) ? editorialInboxChangeSchema.array().parse(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8"))) : [];
  const write = (changes: EditorialInboxChange[]) => {
    mkdirSync(dirname(path), { recursive: true });
    // Escritura atómica: visor y workbench pueden escribir a la vez.
    const temp = `${path}.${process.pid}.tmp`;
    writeFileSync(temp, `${JSON.stringify(changes, null, 1)}\n`, "utf8");
    renameSync(temp, path);
  };
  return {
    kind: "file",
    detail: "fichero local (sin base de datos configurada)",
    list: async (options) => read().filter((change) => relevant(change, options)),
    add: async (change) => write([...read(), editorialInboxChangeSchema.parse(change)]),
    markPulled: async (ids, at) => {
      const set = new Set(ids);
      write(read().map((change) => (set.has(change.id) ? { ...change, pulledAt: at } : change)));
    },
  };
}

type Row = { id: string; piece_id: string; status: string | null; publication_date: string | null; actor: string; created_at: Date; pulled_at: Date | null };

function postgresStore(url: string): EditorialInboxStore {
  let ready: Promise<import("postgres").Sql> | null = null;
  const sql = () =>
    (ready ??= (async () => {
      const { default: postgres } = await import("postgres");
      const client = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 });
      // Tabla mínima y autocontenida: se crea al primer uso para no depender de una migración manual.
      await client`
        create table if not exists editorial_inbox (
          id uuid primary key,
          piece_id text not null,
          status text,
          publication_date text,
          actor text not null,
          created_at timestamptz not null,
          pulled_at timestamptz
        )`;
      await client`create index if not exists editorial_inbox_pulled_at on editorial_inbox (pulled_at)`;
      return client;
    })().catch((error) => {
      ready = null;
      throw error;
    }));
  const toChange = (row: Row): EditorialInboxChange =>
    editorialInboxChangeSchema.parse({
      id: row.id,
      pieceId: row.piece_id,
      status: row.status,
      publicationDate: row.publication_date,
      actor: row.actor,
      createdAt: row.created_at.toISOString(),
      pulledAt: row.pulled_at?.toISOString() ?? null,
    });
  return {
    kind: "postgres",
    detail: "base de datos del visor (Postgres)",
    list: async (options) => {
      const client = await sql();
      const rows = options?.relevantAfter
        ? await client<Row[]>`select * from editorial_inbox where pulled_at is null or pulled_at > ${options.relevantAfter} order by created_at`
        : await client<Row[]>`select * from editorial_inbox order by created_at`;
      return rows.map(toChange);
    },
    add: async (change) => {
      const valid = editorialInboxChangeSchema.parse(change);
      const client = await sql();
      await client`insert into editorial_inbox (id, piece_id, status, publication_date, actor, created_at, pulled_at)
        values (${valid.id}, ${valid.pieceId}, ${valid.status}, ${valid.publicationDate}, ${valid.actor}, ${valid.createdAt}, ${valid.pulledAt})`;
    },
    markPulled: async (ids, at) => {
      if (!ids.length) return;
      const client = await sql();
      await client`update editorial_inbox set pulled_at = ${at} where id in ${client(ids as string[])}`;
    },
  };
}

const unavailable: EditorialInboxStore = {
  kind: "unavailable",
  detail: "el visor desplegado no tiene base de datos (DATABASE_URL) para guardar cambios",
  list: async () => [],
  add: async () => {
    throw new Error("Edición no disponible: falta la base de datos del visor (DATABASE_URL).");
  },
  markPulled: async () => undefined,
};

let cached: { key: string; store: EditorialInboxStore } | null = null;

export function resolveEditorialInbox(env: NodeJS.ProcessEnv = process.env): EditorialInboxStore {
  const url = env.DATABASE_URL?.trim();
  const key = url ? `pg:${url}` : env.VERCEL ? "unavailable" : `file:${inboxPath(env)}`;
  if (cached?.key === key) return cached.store;
  const store = url ? postgresStore(url) : env.VERCEL ? unavailable : fileStore(inboxPath(env));
  cached = { key, store };
  return store;
}
