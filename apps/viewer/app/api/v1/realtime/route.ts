import { NextResponse } from "next/server";
import { readRealtime } from "@seo/repository";

/**
 * Usuarios activos ahora (GA4 Realtime, D-044). El navegador consulta esta API
 * propia; la llamada a Google ocurre en el servidor con caché de 30 segundos.
 */
export async function GET(request: Request) {
  const project = new URL(request.url).searchParams.get("project") ?? "all";
  const snapshot = await readRealtime(project);
  const response = NextResponse.json(snapshot);
  response.headers.set("Cache-Control", "private, max-age=30");
  response.headers.set("Vary", "Cookie");
  return response;
}
