import { editorialLinkKindSchema } from "@seo/contracts";
import { buildBacklinkIndex, linkTargetHref, listBacklinks } from "@seo/editorial";
import { privateJson } from "@/lib/http";
import { getEditorial } from "@/lib/editorial";

/**
 * Vista recíproca de `links` en JSON (P1.4, D-015). Sin `kind`/`id` devuelve el
 * índice completo de fichas referenciadas; con ambos, solo las piezas de esa
 * ficha. Solo lectura, como el resto del visor.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dataset = getEditorial();
  const index = buildBacklinkIndex(dataset);
  const kindParam = url.searchParams.get("kind");
  const id = url.searchParams.get("id")?.trim() ?? "";

  if (!kindParam && !id) {
    const entries = listBacklinks(index).map((entry) => ({ kind: entry.kind, id: entry.id, href: linkTargetHref(entry.kind, entry.id), pieces: entry.pieces.length }));
    return privateJson({ generatedAt: dataset.generatedAt, mode: dataset.mode, targets: entries.length, entries });
  }

  const kind = editorialLinkKindSchema.safeParse(kindParam);
  if (!kind.success) return privateJson({ error: "Tipo de enlace no válido", allowed: editorialLinkKindSchema.options }, { status: 400 });
  if (!id) return privateJson({ error: "Falta el identificador de la ficha (id)" }, { status: 400 });

  const pieces = listBacklinks(index).find((entry) => entry.kind === kind.data && entry.id === id)?.pieces ?? [];
  return privateJson({ generatedAt: dataset.generatedAt, mode: dataset.mode, kind: kind.data, id, href: linkTargetHref(kind.data, id), matched: pieces.length, items: pieces });
}
