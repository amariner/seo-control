import {
  EMPTY_CURATION_FIELDS,
  type EditorialCurationFields,
  type EditorialCurationStore,
  type EditorialDataset,
  type EditorialInboxChange,
  type EditorialInboxEdit,
  type EditorialPiece,
} from "@seo/contracts";
import { upsertPieceCuration, type CurationMeta } from "./curation";

/**
 * Bandeja de cambios del visor (D-067): fusión pura, sin disco ni red.
 *
 * Regla única para saber si un cambio del visor sigue vigente: es posterior a
 * la última revisión curada de esa pieza. Al traerlo, el workbench crea una
 * revisión con la hora de la sincronización, así que en cuanto esa curación
 * se despliega el cambio deja de superponerse solo, sin borrarlo de la bandeja.
 * Si el workbench edita la pieza después, también gana su edición.
 */

const time = (iso: string) => Date.parse(iso);
const byCreated = (a: EditorialInboxChange, b: EditorialInboxChange) => time(a.createdAt) - time(b.createdAt);

/** Campos curables de la revisión vigente, sin metadatos, para editar sobre ellos. */
function currentFields(store: EditorialCurationStore, pieceId: string): EditorialCurationFields {
  const current = store.pieces[pieceId]?.current;
  if (!current) return { ...EMPTY_CURATION_FIELDS, links: [] };
  const { version: _version, updatedAt: _updatedAt, updatedBy: _updatedBy, note: _note, ...fields } = current;
  return fields;
}

/**
 * Cambia estado y/o fecha de publicación conservando el resto de la curación.
 * La fecha fija también el mes del plan, como hace la importación de la hoja.
 */
export function editPieceCuration(store: EditorialCurationStore, pieceId: string, edit: EditorialInboxEdit, meta: CurationMeta): EditorialCurationStore {
  const fields = currentFields(store, pieceId);
  if (edit.status) fields.status = edit.status;
  if (edit.publicationDate) {
    fields.publicationDate = edit.publicationDate;
    fields.year = Number(edit.publicationDate.slice(0, 4));
    fields.month = Number(edit.publicationDate.slice(5, 7));
  }
  return upsertPieceCuration(store, pieceId, fields, meta);
}

/** Cambios del visor que la curación todavía no recoge, del más antiguo al más reciente. */
export function pendingInboxChanges(store: EditorialCurationStore, changes: readonly EditorialInboxChange[]): EditorialInboxChange[] {
  return changes
    .filter((change) => {
      const current = store.pieces[change.pieceId]?.current;
      return !current || time(change.createdAt) > time(current.updatedAt);
    })
    .sort(byCreated);
}

export type PendingInbox = Map<string, { actor: string; createdAt: string }>;

function overlay(piece: EditorialPiece, change: EditorialInboxChange): EditorialPiece {
  const date = change.publicationDate;
  return {
    ...piece,
    status: change.status ?? piece.status,
    publicationDate: date ?? piece.publicationDate,
    month: date ? { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), yearSource: "date", literal: piece.month.literal } : piece.month,
  };
}

/**
 * Superpone al dataset efectivo (importación + curación desplegada) los cambios
 * del visor aún vigentes. Devuelve también qué piezas tienen cambio pendiente,
 * para marcarlas en la tabla.
 */
export function applyInbox(dataset: EditorialDataset, store: EditorialCurationStore, changes: readonly EditorialInboxChange[]): { dataset: EditorialDataset; pending: PendingInbox } {
  const live = pendingInboxChanges(store, changes);
  if (!live.length) return { dataset, pending: new Map() };
  const byPiece = new Map<string, EditorialInboxChange[]>();
  for (const change of live) byPiece.set(change.pieceId, [...(byPiece.get(change.pieceId) ?? []), change]);
  const apply = (piece: EditorialPiece) => byPiece.get(piece.id)?.reduce(overlay, piece) ?? piece;
  const pending: PendingInbox = new Map([...byPiece].map(([id, list]) => [id, { actor: list.at(-1)!.actor, createdAt: list.at(-1)!.createdAt }]));
  return { dataset: { ...dataset, plan: dataset.plan.map(apply), backlog: dataset.backlog.map(apply) }, pending };
}

export type InboxPull = {
  store: EditorialCurationStore;
  /** Incorporados a la curación. */
  applied: EditorialInboxChange[];
  /** Descartados porque el workbench editó la pieza después. */
  superseded: EditorialInboxChange[];
  /** Descartados porque la pieza ya no existe en el plan (reimportación con otro título o mes). */
  orphaned: EditorialInboxChange[];
};

/**
 * Trae a la curación los cambios del visor sin traer (`pulledAt` nulo). El
 * que perdió frente a una edición posterior del workbench se informa, no se aplica.
 */
export function pullInbox(store: EditorialCurationStore, changes: readonly EditorialInboxChange[], knownPieceIds: ReadonlySet<string>, now: string): InboxPull {
  const baseline = store;
  const result: InboxPull = { store, applied: [], superseded: [], orphaned: [] };
  for (const change of changes.filter((item) => item.pulledAt === null).sort(byCreated)) {
    if (!knownPieceIds.has(change.pieceId)) {
      result.orphaned.push(change);
      continue;
    }
    const current = baseline.pieces[change.pieceId]?.current;
    if (current && time(current.updatedAt) >= time(change.createdAt)) {
      result.superseded.push(change);
      continue;
    }
    const edit: EditorialInboxEdit = {
      ...(change.status && change.status !== "desconocido" ? { status: change.status } : {}),
      ...(change.publicationDate ? { publicationDate: change.publicationDate } : {}),
    };
    result.store = editPieceCuration(result.store, change.pieceId, edit, { updatedBy: change.actor, note: `Visor · ${change.createdAt} · ${change.id}`, now });
    result.applied.push(change);
  }
  return result;
}
