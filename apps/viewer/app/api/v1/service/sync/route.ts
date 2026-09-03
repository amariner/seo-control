import { privateJson, serviceAuthorized } from "@/lib/http";
import { syncOrchestrator } from "@/lib/sync-service";

export async function POST(request: Request) {
  if (!serviceAuthorized(request)) return privateJson({ error: "No autorizado" }, { status: 401 });
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) return privateJson({ error: "Repositorio cloud no configurado" }, { status: 503 });
  try { return privateJson(await syncOrchestrator.run(await request.json())); }
  catch (error) { return privateJson({ error: error instanceof Error ? error.message : "Error de sincronización" }, { status: 400 }); }
}
