import { NextResponse } from "next/server";
import type { DashboardFilters } from "./data";
import { parseFilters } from "./data";

export function filtersFromUrl(request: Request): DashboardFilters {
  const url = new URL(request.url);
  return parseFilters(Object.fromEntries(url.searchParams.entries()));
}

export function privateJson(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
  response.headers.set("Vary", "Cookie");
  return response;
}

export function serviceAuthorized(request: Request) {
  const expected = process.env.SERVICE_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied && supplied === expected);
}
