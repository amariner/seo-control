import { projectSlugSchema } from "@seo/contracts";
import { getDashboard } from "@/lib/data";
import { filtersFromUrl, privateJson } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ project: string }> }) {
  const parsed = projectSlugSchema.safeParse((await params).project);
  if (!parsed.success) return privateJson({ error: "Proyecto no válido" }, { status: 404 });
  return privateJson(await getDashboard({ ...filtersFromUrl(request), project: parsed.data }));
}
