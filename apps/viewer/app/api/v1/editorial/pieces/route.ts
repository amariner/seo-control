import { privateJson } from "@/lib/http";
import { queryPieces } from "@/lib/editorial";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = Object.fromEntries(url.searchParams.entries());
  const { dataset, filters, sort, dir, items, total } = queryPieces(input);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 500) || 500, 1), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  return privateJson({ generatedAt: dataset.generatedAt, mode: dataset.mode, filters, sort, dir, total, matched: items.length, limit, offset, items: items.slice(offset, offset + limit) });
}
