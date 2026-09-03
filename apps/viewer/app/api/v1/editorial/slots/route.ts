import { privateJson } from "@/lib/http";
import { querySlots } from "@/lib/editorial";

export async function GET(request: Request) {
  const input = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { dataset, filters, items, total } = querySlots(input);
  return privateJson({ generatedAt: dataset.generatedAt, mode: dataset.mode, filters, total, matched: items.length, items });
}
