import { buildAgenda } from "@seo/editorial";
import { privateJson } from "@/lib/http";
import { queryCalendar } from "@/lib/editorial";

export async function GET(request: Request) {
  const input = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { dataset, brand, year, years, months, events, themes } = queryCalendar(input);
  return privateJson({
    generatedAt: dataset.generatedAt,
    mode: dataset.mode,
    planningYear: dataset.planningYear,
    filters: { brand, year },
    years,
    months,
    brands: dataset.brands,
    events,
    themes,
    agenda: buildAgenda(events),
  });
}
