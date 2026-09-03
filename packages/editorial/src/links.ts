import { EDITORIAL_LINK_KIND_LABELS, type EditorialDataset, type EditorialLinkKind, type EditorialPiece } from "@seo/contracts";

/**
 * Reciprocidad de `links` (P1.4, D-015).
 *
 * La pieza editorial es la única propietaria de la relación: `piece.links`
 * apunta a un insight, acción, query, página, cluster, informe o resultado. La
 * vista recíproca —qué piezas referencian una ficha— se **deriva** de ese mismo
 * array; no se guarda un segundo array invertido, porque duplicarlo permitiría
 * que las dos mitades divergieran y obligaría al visor a escribir.
 *
 * Módulo puro: no toca disco ni depende de Node. El visor lo alimenta con el
 * dataset efectivo (importado + curación) y en P3 con la proyección de
 * PostgreSQL, sin cambiar esta firma.
 */

export type EditorialBacklink = {
  kind: EditorialLinkKind;
  /** Identificador de la ficha destino tal como lo escribió el workbench. */
  id: string;
  pieces: EditorialPiece[];
};

/** Clave estable `tipo:id` para indexar y para los formularios del workbench. */
export function linkKey(kind: EditorialLinkKind, id: string) {
  return `${kind}:${id}`;
}

export type EditorialBacklinkIndex = Map<string, EditorialBacklink>;

/**
 * Índice `tipo:id -> piezas que lo referencian`, recorriendo backlog y plan una
 * sola vez. Las piezas de cada entrada conservan el orden del dataset y una
 * pieza nunca aparece dos veces en la misma ficha aunque repita el enlace.
 */
export function buildBacklinkIndex(dataset: Pick<EditorialDataset, "backlog" | "plan">): EditorialBacklinkIndex {
  const index: EditorialBacklinkIndex = new Map();
  for (const piece of [...dataset.backlog, ...dataset.plan]) {
    for (const link of piece.links) {
      const id = link.id.trim();
      if (!id) continue;
      const key = linkKey(link.kind, id);
      const entry = index.get(key);
      if (!entry) index.set(key, { kind: link.kind, id, pieces: [piece] });
      else if (!entry.pieces.some((existing) => existing.id === piece.id)) entry.pieces.push(piece);
    }
  }
  return index;
}

/** Piezas que referencian una ficha concreta. Array vacío si ninguna lo hace. */
export function backlinksFor(index: EditorialBacklinkIndex, kind: EditorialLinkKind, id: string): EditorialPiece[] {
  return index.get(linkKey(kind, id.trim()))?.pieces ?? [];
}

/** Todas las fichas referenciadas, ordenadas por tipo y luego por identificador. */
export function listBacklinks(index: EditorialBacklinkIndex): EditorialBacklink[] {
  const kinds = Object.keys(EDITORIAL_LINK_KIND_LABELS) as EditorialLinkKind[];
  return [...index.values()].sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.id.localeCompare(b.id, "es", { numeric: true }));
}

/**
 * Ruta canónica de una pieza editorial en el visor: la bandeja de backlog/plan
 * abre el panel de detalle con `?piece=`. Es la dirección que usan el buscador
 * y la vista recíproca, para que exista una sola forma de enlazar una pieza.
 */
export function editorialPieceHref(piece: Pick<EditorialPiece, "id" | "kind">) {
  return `/editorial/backlog?kind=${piece.kind}&piece=${encodeURIComponent(piece.id)}`;
}

/**
 * Ruta canónica de la ficha destino en el visor (D-015). `null` cuando el tipo
 * todavía no tiene ficha propia: `cluster` llega con P6 y `result` con P9, y
 * hasta entonces el enlace se muestra como texto en lugar de inventar una URL
 * que devolvería 404.
 */
export function linkTargetHref(kind: EditorialLinkKind, id: string): string | null {
  const target = encodeURIComponent(id.trim());
  switch (kind) {
    case "insight":
      return `/insights#${target}`;
    case "action":
      return `/actions#${target}`;
    case "query":
      return `/queries/${target}`;
    case "page":
      return `/pages/${target}`;
    case "report":
      return `/reports/${target}`;
    case "cluster":
    case "result":
      return null;
  }
}
