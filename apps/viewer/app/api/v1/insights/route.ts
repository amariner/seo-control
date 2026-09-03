import { getDashboard } from "@/lib/data";
import { filtersFromUrl, privateJson } from "@/lib/http";

export async function GET(request: Request) {
  const data = await getDashboard(filtersFromUrl(request));
  return privateJson({ items: data.executiveInsights, generatedAt: data.generatedAt });
}
