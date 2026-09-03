import { privateJson } from "@/lib/http";
import { findPiece } from "@/lib/editorial";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const piece = findPiece(id);
  if (!piece) return privateJson({ error: "Pieza editorial no encontrada" }, { status: 404 });
  return privateJson(piece);
}
