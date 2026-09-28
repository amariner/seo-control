import { piecesToCsv, slotsToCsv } from "@seo/editorial";
import { auth } from "@/auth";
import { describePlanFilters, filterPlanRows, generalPlanRows, planExportFilters } from "@seo/editorial-ui";
import { planWorkbook } from "@seo/editorial-ui/plan-xlsx";
import { brandName, getLiveEditorial, parseBrand, queryPieces, querySlots } from "@/lib/editorial";

/**
 * Exportación CSV de la vista filtrada y ordenada.
 * - plan-editorial-conjunto.csv: once columnas originales V1, BOM UTF-8 y separador `;`.
 * - plan-editorial-propuestas.csv: columnas dinámicas por número real de alternativas.
 * - plan-editorial.xlsx: el plan general (o el de `?brand=`) tal como se ve en la
 *   tabla, con su búsqueda y filtros y los cambios pendientes del visor (D-069).
 * La descarga queda registrada con usuario y fecha en cabeceras privadas.
 */
export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const url = new URL(request.url);
  const input = Object.fromEntries(url.searchParams.entries());
  const session = await auth();
  const actor = session?.user?.email ?? (process.env.NODE_ENV !== "production" ? "usuario-desarrollo" : "usuario-corporativo");

  if (filename === "plan-editorial.xlsx") return planXlsx(url.searchParams, actor);

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

/** Excel del plan editorial con lo que muestra la tabla: marca, búsqueda y filtros (D-069). */
async function planXlsx(params: URLSearchParams, actor: string) {
  const brand = parseBrand(Object.fromEntries(params.entries()));
  const { dataset, pending } = await getLiveEditorial();
  const selection = planExportFilters(params);
  const rows = filterPlanRows(generalPlanRows(dataset, brand, pending), selection);
  const exportedAt = new Date();
  const scope = brand === "all" ? "ocho-marcas" : brand;
  const file = await planWorkbook(rows, {
    title: brand === "all" ? "Plan editorial de las ocho marcas" : `Plan editorial de ${brandName(brand, brand)}`,
    source: `Hoja «Plan editorial» del equipo, importada el ${dataset.report.importedAt.slice(0, 10)}, con la curación del workbench${pending.size ? ` y ${pending.size} cambios del visor pendientes de sincronizar` : ""}`,
    filters: describePlanFilters(selection),
    exportedBy: actor,
    exportedAt,
  });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plan-editorial-${scope}-${exportedAt.toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Export-Rows": String(rows.length),
      "X-Export-Actor": actor,
      "X-Export-Generated": exportedAt.toISOString(),
    },
  });
}
