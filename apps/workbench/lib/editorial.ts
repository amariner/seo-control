import { EDITORIAL_BRANDS, type EditorialBrandSlug, type EditorialPiece } from "@seo/contracts";
import { getEffectiveEditorialDataset } from "@seo/editorial/dataset";
import { readCurationStore } from "@seo/editorial/curation-store";
import { filterPieces, sortPieces, type PieceFilters } from "@seo/editorial";

/**
 * Capa de lectura del workbench: mismo dataset efectivo (V1 + curación) que
 * consume el visor, para que el curador edite exactamente lo que se publica.
 */

export function getDataset() {
  return getEffectiveEditorialDataset();
}

export function findPiece(id: string | undefined | null): EditorialPiece | null {
  if (!id) return null;
  const dataset = getDataset();
  return dataset.backlog.find((piece) => piece.id === id) ?? dataset.plan.find((piece) => piece.id === id) ?? null;
}

export function findSlot(id: string | undefined | null) {
  if (!id) return null;
  return getDataset().slots.find((slot) => slot.id === id) ?? null;
}

export function findEvent(id: string | undefined | null) {
  if (!id) return null;
  return getDataset().calendar.events.find((event) => event.id === id) ?? null;
}

export function brandLabel(slug: EditorialBrandSlug) {
  return EDITORIAL_BRANDS.find((brand) => brand.slug === slug)?.name ?? slug;
}

/** Registro completo de curación (versión actual + historial) para la vista de edición. */
export function pieceCurationRecord(id: string) {
  return readCurationStore().pieces[id] ?? null;
}

export type PieceListFilters = { brand?: EditorialBrandSlug | "all"; kind?: PieceFilters["kind"]; q?: string };

/** Piezas candidatas a vincular a un evento: misma marca, mismo mes primero. */
export function candidatesForEvent(event: NonNullable<ReturnType<typeof findEvent>>) {
  const dataset = getDataset();
  const pieces = [...dataset.backlog, ...dataset.plan].filter((piece) => piece.brand.slug === event.brand.slug);
  return sortPieces(pieces, "month", "desc").sort((a, b) => (a.month.month === event.month ? -1 : 0) - (b.month.month === event.month ? -1 : 0));
}

export function listPieces(filters: PieceListFilters) {
  const dataset = getDataset();
  const universe = filters.kind === "plan" ? dataset.plan : filters.kind === "all" ? [...dataset.backlog, ...dataset.plan] : dataset.backlog;
  const filtered = filterPieces(universe, { brand: filters.brand ?? "all", q: filters.q ?? "" });
  return { items: sortPieces(filtered, "month", "desc"), total: universe.length };
}
