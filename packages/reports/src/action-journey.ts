import { EDITORIAL_STATUS_LABELS, type EditorialMeasurement, type EditorialPiece } from "@seo/contracts";
import { backlinksFor, editorialPieceHref, type EditorialBacklinkIndex } from "@seo/editorial";
import { trackedIdOf } from "./action-tracking";
import { nf, signed, change } from "./format";

/**
 * Recorrido oportunidad → pieza → acción → resultado (P3.5, D-092).
 *
 * La oportunidad es el motivo de la regla (la cifra de Search Console o GA4
 * que la propone, D-088); la acción, su seguimiento con criterio y resultado
 * (D-090); la pieza, la del plan editorial que el equipo enlaza a la acción
 * en la curación del workbench con `action:<marca>:<clave>`; y su resultado,
 * la medición real de 28, 90 y 180 días (D-079).
 *
 * La relación vive solo en `piece.links` (D-015): aquí se **deriva** con el
 * índice de reciprocidad, sin un segundo almacén en el seguimiento.
 */

export type ActionPiece = {
  id: string;
  title: string;
  href: string;
  status: string;
  publicationDate: string | null;
  keyword: string | null;
  /** La medición más larga cerrada o, si no hay, la que está en curso; `null` sin publicar o sin medir. */
  result: string | null;
};

/** Lectura de la medición de una pieza: la ventana cerrada más larga o, si no hay, la de 28 días en curso. */
export function pieceResult(measurements: EditorialMeasurement[]): string | null {
  const closed = measurements.filter((item) => item.status === "medido" && item.result !== null).sort((a, b) => b.windowDays - a.windowDays)[0];
  const running = measurements.find((item) => item.status === "en_curso" && item.windowDays === 28);
  const item = closed ?? running;
  if (!item) return measurements.some((entry) => entry.status === "pendiente") ? "medición pendiente" : null;
  const diff = change(item.result, item.baseline);
  const figures = `${nf(item.result)} clics${item.baseline !== null ? ` (antes ${nf(item.baseline)}${diff === null ? "" : `, ${signed(diff, 0)}`})` : ""}`;
  return item.status === "medido"
    ? `${item.windowDays} días: ${figures}`
    : `${item.windowDays} días en curso (${nf(item.coveredDays ?? 0)} con dato): ${figures}`;
}

/** Piezas que enlazan la acción, con su estado y su resultado. */
export function actionPieces(index: EditorialBacklinkIndex, brand: string, key: string): ActionPiece[] {
  return backlinksFor(index, "action", trackedIdOf(brand, key)).map((piece: EditorialPiece) => ({
    id: piece.id,
    title: piece.title ?? piece.keyword ?? "Pieza sin título",
    href: editorialPieceHref(piece),
    status: piece.status === "desconocido" ? piece.statusLiteral || EDITORIAL_STATUS_LABELS.desconocido : EDITORIAL_STATUS_LABELS[piece.status],
    publicationDate: piece.publicationDate,
    keyword: piece.keyword,
    result: pieceResult(piece.measurements),
  }));
}

/** Enlace que el equipo escribe en la curación de la pieza para unirla a la acción. */
export const actionLinkOf = (brand: string, key: string) => `action:${trackedIdOf(brand, key)}`;
