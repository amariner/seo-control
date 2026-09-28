import { redirect } from "next/navigation";
import type { SearchInput } from "@/lib/editorial";

/**
 * «Backlog y plan» retirado por ahora (D-062): el plan general de
 * `/editorial/calendario` cubre el plan de las ocho marcas. Los enlaces antiguos
 * a una pieza (`?piece=`) siguen abriendo su detalle allí. La vista anterior
 * está en el historial (806e612) si se recupera.
 */
export default async function BacklogPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const input = await searchParams;
  const piece = Array.isArray(input.piece) ? input.piece[0] : input.piece;
  redirect(piece ? `/editorial/calendario?piece=${encodeURIComponent(piece)}` : "/editorial/calendario");
}
