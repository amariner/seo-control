import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDatabase(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL no está configurada");
  const client = postgres(url, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

export type SeoDatabase = ReturnType<typeof createDatabase>;
