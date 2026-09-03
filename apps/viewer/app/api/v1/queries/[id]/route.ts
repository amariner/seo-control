import { getDashboard } from "@/lib/data";
import { privateJson } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const insight = data.executiveInsights.find((item) => item.evidence.some((evidence) => evidence.href.endsWith(id)));
  return insight ? privateJson({ id, query: id.replaceAll("-", " "), insight, series: data.series.organic_clicks }) : privateJson({ error: "Query no encontrada" }, { status: 404 });
}
