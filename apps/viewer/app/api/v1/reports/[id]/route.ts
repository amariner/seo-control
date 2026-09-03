import { getDashboard } from "@/lib/data";
import { privateJson } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const report = data.reports.find((item) => item.id === id);
  return report ? privateJson(report) : privateJson({ error: "Informe no encontrado" }, { status: 404 });
}
