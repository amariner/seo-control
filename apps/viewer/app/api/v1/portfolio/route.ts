import { getDashboard } from "@/lib/data";
import { filtersFromUrl, privateJson } from "@/lib/http";

export async function GET(request: Request) {
  return privateJson(await getDashboard(filtersFromUrl(request)));
}
