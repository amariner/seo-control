import { describePlanFilters, filterPlanRows, generalPlanRows, planExportFilters } from "@seo/editorial-ui";
import { planWorkbook } from "@seo/editorial-ui/plan-xlsx";
import { getDataset } from "@/lib/editorial";

/** Excel del plan del workbench con la búsqueda y los filtros de la tabla (D-069). Solo lectura. */
export async function GET(request: Request) {
  const selection = planExportFilters(new URL(request.url).searchParams);
  const dataset = getDataset();
  const rows = filterPlanRows(generalPlanRows(dataset, "all"), selection);
  const exportedAt = new Date();
  const file = await planWorkbook(rows, {
    title: "Plan editorial de las ocho marcas (workbench)",
    source: `Hoja «Plan editorial» del equipo, importada el ${dataset.report.importedAt.slice(0, 10)}, con la curación local del workbench`,
    filters: describePlanFilters(selection),
    exportedBy: process.env.WORKBENCH_CURATOR?.trim() || "workbench",
    exportedAt,
  });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plan-editorial-workbench-${exportedAt.toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
