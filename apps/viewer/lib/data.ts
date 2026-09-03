import { getMockDashboard } from "@seo/contracts/mock";
import { marketCodeSchema, periodKeySchema, projectSlugSchema, type DashboardPayload } from "@seo/contracts";

export type DashboardFilters = DashboardPayload["filters"];

export function parseFilters(input: Record<string, string | string[] | undefined>): DashboardFilters {
  const projectValue = Array.isArray(input.project) ? input.project[0] : input.project;
  const marketValue = Array.isArray(input.market) ? input.market[0] : input.market;
  const periodValue = Array.isArray(input.period) ? input.period[0] : input.period;
  return {
    project: projectValue === "all" || !projectValue ? "all" : projectSlugSchema.catch("porcelanosa").parse(projectValue),
    market: marketValue === "all" || !marketValue ? "all" : marketCodeSchema.catch("ES").parse(marketValue),
    period: periodKeySchema.catch("28d").parse(periodValue),
  };
}

export async function getDashboard(filters: DashboardFilters) {
  // The repository boundary is intentional: in phase 2 this switches to PostgreSQL
  // projections without changing route or component contracts.
  return getMockDashboard(filters);
}

export function filterQuery(filters: DashboardFilters) {
  return new URLSearchParams(filters).toString();
}
