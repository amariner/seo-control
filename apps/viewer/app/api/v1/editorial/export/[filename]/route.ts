import { piecesToCsv, slotsToCsv } from "@seo/editorial";
import { auth } from "@/auth";
import { queryPieces, querySlots } from "@/lib/editorial";

/**
 * Exportación CSV de la vista filtrada y ordenada.
 * - plan-editorial-conjunto.csv: once columnas originales V1, BOM UTF-8 y separador `;`.
 * - plan-editorial-propuestas.csv: columnas dinámicas por número real de alternativas.
 * La descarga queda registrada con usuario y fecha en cabeceras privadas.
 */
export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const url = new URL(request.url);
  const input = Object.fromEntries(url.searchParams.entries());
  const session = await auth();
  const actor = session?.user?.email ?? (process.env.NODE_ENV !== "production" ? "usuario-desarrollo" : "usuario-corporativo");

  let csv: string;
  let rows: number;
  if (filename === "plan-editorial-conjunto.csv") {
    const { items } = queryPieces(input);
    csv = piecesToCsv(items);
    rows = items.length;
  } else if (filename === "plan-editorial-propuestas.csv") {
    const { items } = querySlots(input);
    csv = slotsToCsv(items);
    rows = items.length;
  } else {
    return new Response("Exportación no disponible", { status: 404 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Export-Rows": String(rows),
      "X-Export-Actor": actor,
      "X-Export-Generated": new Date().toISOString(),
    },
  });
}
