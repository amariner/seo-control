import { privateJson } from "@/lib/http";
import { syncOrchestrator } from "@/lib/sync-service";

const allowedSources = new Set(["ga4", "gsc", "semrush", "geo", "crux", "pagespeed"]);

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) return privateJson({ error: "No autorizado" }, { status: 401 });
  const source = new URL(request.url).searchParams.get("source") ?? "";
  if (!allowedSources.has(source)) return privateJson({ error: "Fuente no válida" }, { status: 400 });
  if (!process.env.DATABASE_URL) return privateJson({ error: "Neon no configurado; no se ejecutan sincronizaciones cloud" }, { status: 503 });
  const requestedAt = new Date().toISOString();
  const results = await Promise.allSettled(["porcelanosa", "noken"].map((project) => syncOrchestrator.run({ project, source, requestedAt })));
  return privateJson({ source, requestedAt, projects: results.map((result, index) => result.status === "fulfilled" ? { project: index === 0 ? "porcelanosa" : "noken", result: result.value } : { project: index === 0 ? "porcelanosa" : "noken", error: String(result.reason) }) });
}
