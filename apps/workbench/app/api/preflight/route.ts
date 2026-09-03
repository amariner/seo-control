import { diskPreflight } from "@seo/local-data";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await diskPreflight(process.cwd()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ ready: false, freeGiB: 0, error: error instanceof Error ? error.message : "No se pudo comprobar el disco" }, { status: 500 }); }
}
