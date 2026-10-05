import { isPilotProject } from "@seo/contracts";
import { Dashboard } from "@/components/dashboard";
import { UnmeasuredBrand } from "@/components/unmeasured-brand";
import { getDashboard, parseFilters } from "@/lib/data";
import { getPublishedTracking } from "@seo/reports/tracking-published";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboard(filters);
  /* Las ocho marcas son elegibles, pero solo el piloto tiene serie (D-033). El
     repositorio ya devuelve un payload sin analítica para el resto; pintarlo
     con la portada normal dejaría seis secciones vacías sin explicar por qué. */
  if (filters.project !== "all" && !isPilotProject(filters.project)) return <UnmeasuredBrand slug={filters.project} generatedAt={data.generatedAt} />;
  // Seguimiento de acciones (D-090) de la marca elegida o de todas: la portada dice qué está en marcha.
  const records = Object.values(getPublishedTracking().actions).filter((record) => filters.project === "all" || record.brand === filters.project);
  return <Dashboard data={data} tracking={{ records, today: new Date().toISOString().slice(0, 10) }} />;
}
