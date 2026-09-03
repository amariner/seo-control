import { getDashboard } from "@/lib/data";
import { privateJson } from "@/lib/http";
import { getEditorial } from "@/lib/editorial";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().toLocaleLowerCase("es") ?? "";
  if (q.length < 2) return privateJson({ items: [] });
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const editorial = getEditorial();
  const items = [
    ...data.executiveInsights.map((item) => ({ type: "insight", id: item.id, title: item.title, subtitle: item.executiveSummary, href: `/insights#${item.id}` })),
    ...data.opportunities.map((item) => ({ type: "page", id: item.id, title: item.title, subtitle: item.url, href: `/pages/${item.id}` })),
    ...data.technicalIssues.map((item) => ({ type: "issue", id: item.id, title: item.title, subtitle: item.category, href: `/issues/${item.id}` })),
    ...data.reports.map((item) => ({ type: "report", id: item.id, title: item.title, subtitle: item.period, href: `/reports/${item.id}` })),
    ...[...editorial.backlog, ...editorial.plan].map((item) => ({ type: "editorial", id: item.id, title: item.title ?? item.keyword ?? "Pieza editorial", subtitle: `${item.brand.literal} · ${item.keyword ?? ""} · ${item.theme ?? ""}`, href: `/editorial/backlog?kind=${item.kind}&piece=${item.id}` })),
  ].filter((item) => `${item.title} ${item.subtitle}`.toLocaleLowerCase("es").includes(q)).slice(0, 50);
  return privateJson({ items });
}
