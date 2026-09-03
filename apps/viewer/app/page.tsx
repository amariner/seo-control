import { Dashboard } from "@/components/dashboard";
import { getDashboard, parseFilters } from "@/lib/data";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboard(filters);
  return <Dashboard data={data} />;
}
