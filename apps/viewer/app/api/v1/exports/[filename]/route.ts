import { auth } from "@/auth";
import { getDashboard } from "@/lib/data";
import { createSimplePdf, csvCell } from "@/lib/export";
import { findReport } from "@/lib/reports";

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const match = filename.match(/^(.+)\.(csv|pdf)$/);
  if (!match) return new Response("Formato no válido", { status: 400 });
  const [, id, format] = match;
  const session = await auth();
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  // El archivo histórico (P2.3) es la fuente del informe: incluye los cierres
  // anteriores que el payload de la portada no lleva.
  const report = findReport(id!);
  if (!report) return new Response("Informe no encontrado", { status: 404 });
  const actor = session?.user?.email ?? (process.env.NODE_ENV !== "production" ? "usuario-desarrollo" : "usuario-corporativo");

  if (format === "csv") {
    const rows = [
      ["Confidencial", "Uso interno Porcelanosa Grupo"],
      ["Usuario", actor],
      ["Generado", new Date().toISOString()],
      ["Informe", report.title],
      ["Versión", report.version],
      ["Versiones publicadas", report.versions.length],
      ["Nota de la versión vigente", report.versions[report.versions.length - 1]?.changeNote ?? "primera versión"],
      [],
      ["Métrica", "Valor", "Periodo anterior", "Interanual", "Objetivo", "Cobertura"],
      ...data.metrics.map((metric) => [metric.label, metric.value, metric.previous, metric.previousYear, metric.target, metric.coverage.ratio]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${report.id}-v${report.version}.csv"`, "Cache-Control": "private, no-store" } });
  }

  const pdf = createSimplePdf([
    report.title,
    `Periodo: ${report.period} | Version: ${report.version}`,
    `Confidencial | Generado para ${actor} | ${new Date().toISOString()}`,
    "",
    report.executiveSummary,
    "",
    ...data.executiveInsights.flatMap((insight, index) => [`${index + 1}. ${insight.title}`, insight.executiveSummary, `Accion: ${insight.recommendation}`, ""]),
  ]);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${report.id}-v${report.version}.pdf"`, "Cache-Control": "private, no-store" } });
}
