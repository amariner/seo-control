import { getDashboard } from "@/lib/data";
import { filtersFromUrl, privateJson } from "@/lib/http";

export async function GET(request: Request) {
  const data = await getDashboard(filtersFromUrl(request));
  const metric = new URL(request.url).searchParams.get("metric") ?? "organic_sessions";
  return privateJson({ metric, points: data.series[metric] ?? [], annotations: data.annotations, coverage: data.metrics.find((item) => item.key === metric)?.coverage ?? null });
}
