import { auth } from "@/auth";
import { renderFrozenReportHtml } from "@/lib/frozen-report-html";
import { loadFrozenReport } from "@/lib/frozen-reports";
import { deckCsvRows, exportFilenameOf, toCsv } from "@seo/reports/export";

/**
 * Exportación de un informe congelado (H11, D-081): `?format=html` (por
 * defecto) da un HTML autocontenido y `?format=csv` las cifras y tablas de
 * cada apartado. Los dos llevan el sello de quién, cuándo, qué versión y qué
 * huella, y la confidencialidad. Solo versiones congeladas: un informe en vivo
 * cambia con el dato y no tiene huella que citar.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brand: string; period: string }> },
) {
  const { brand, period } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "html";
  if (format !== "html" && format !== "csv")
    return new Response("Formato no válido", { status: 400 });
  const session = await auth();
  const actor =
    session?.user?.email ??
    (process.env.NODE_ENV !== "production"
      ? "usuario-desarrollo"
      : "usuario-corporativo");
  const stamp = { actor, exportedAt: new Date().toISOString() };
  const headers = (type: string, filename: string) => ({
    "Content-Type": `${type}; charset=utf-8`,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });

  if (format === "csv") {
    const loaded = loadFrozenReport(brand, period);
    if (!loaded)
      return new Response("Informe congelado no encontrado", { status: 404 });
    return new Response(
      toCsv(deckCsvRows(loaded.slides, { ...stamp, entry: loaded.entry })),
      {
        headers: headers("text/csv", exportFilenameOf(loaded.entry, "csv")),
      },
    );
  }

  const rendered = await renderFrozenReportHtml(brand, period, stamp);
  if (!rendered)
    return new Response("Informe congelado no encontrado", { status: 404 });
  return new Response(rendered.html, {
    headers: headers("text/html", exportFilenameOf(rendered.entry, "html")),
  });
}
