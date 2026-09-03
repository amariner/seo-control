import { getDashboard } from "@/lib/data";
import { privateJson } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const item = data.technicalIssues.find((value) => value.id === id);
  return item ? privateJson(item) : privateJson({ error: "Incidencia no encontrada" }, { status: 404 });
}
