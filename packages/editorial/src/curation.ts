import {
  EDITORIAL_BRANDS,
  EDITORIAL_TYPE_LABELS,
  type EditorialBrandSlug,
  type EditorialCalendarEvent,
  type EditorialCurationFields,
  type EditorialCurationStore,
  type EditorialDataset,
  type EditorialEventCurationRecord,
  type EditorialPiece,
  type EditorialPieceCurationRecord,
  type EditorialPieceCurationRevision,
  type EditorialPieceType,
  type EditorialSlot,
  type EditorialSlotCurationRecord,
  type MarketCode,
} from "@seo/contracts";

/**
 * Curación editorial (P1.4): fusión pura entre el dataset importado de V1 y el
 * almacén de curación del workbench. No depende de Node ni del navegador, así
 * que sirve a `@seo/editorial/dataset` (visor) y al workbench por igual, y se
 * prueba sin tocar disco.
 *
 * Un campo curado en `null` significa "sin opinión del workbench": se muestra
 * el valor importado de V1 si existe. No hay forma de distinguir "nunca
 * curado" de "curado y vuelto a vaciar"; ambos casos devuelven el valor V1,
 * lo cual es la interpretación correcta mientras no exista un tercer estado.
 */

export type CurationMeta = { updatedBy: string | null; note: string | null; now: string };

function nextVersion(previous: { version: number } | undefined) {
  return (previous?.version ?? 0) + 1;
}

export function upsertPieceCuration(store: EditorialCurationStore, pieceId: string, fields: EditorialCurationFields, meta: CurationMeta): EditorialCurationStore {
  const existing = store.pieces[pieceId];
  const revision: EditorialPieceCurationRevision = { ...fields, version: nextVersion(existing?.current), updatedAt: meta.now, updatedBy: meta.updatedBy, note: meta.note };
  const record: EditorialPieceCurationRecord = { pieceId, current: revision, history: existing ? [...existing.history, existing.current] : [] };
  return { ...store, updatedAt: meta.now, pieces: { ...store.pieces, [pieceId]: record } };
}

export function upsertSlotCuration(store: EditorialCurationStore, slotId: string, selectedProposalId: string | null, meta: CurationMeta): EditorialCurationStore {
  const existing = store.slots[slotId];
  const record: EditorialSlotCurationRecord = {
    slotId,
    current: { selectedProposalId, version: nextVersion(existing?.current), updatedAt: meta.now, updatedBy: meta.updatedBy, note: meta.note },
    history: existing ? [...existing.history, existing.current] : [],
  };
  return { ...store, updatedAt: meta.now, slots: { ...store.slots, [slotId]: record } };
}

/** Sustituye la relación heurística evento -> pieza (marca + mes) por un vínculo real. */
export function upsertEventCuration(store: EditorialCurationStore, eventId: string, pieceId: string | null, meta: CurationMeta): EditorialCurationStore {
  const existing = store.events[eventId];
  const record: EditorialEventCurationRecord = {
    eventId,
    current: { pieceId, version: nextVersion(existing?.current), updatedAt: meta.now, updatedBy: meta.updatedBy, note: meta.note },
    history: existing ? [...existing.history, existing.current] : [],
  };
  return { ...store, updatedAt: meta.now, events: { ...store.events, [eventId]: record } };
}

export function addCreatedPiece(store: EditorialCurationStore, piece: EditorialPiece, now: string): EditorialCurationStore {
  return { ...store, updatedAt: now, createdPieces: [...store.createdPieces, piece] };
}

/** Metadato de curación (versión, autor, nota) para mostrar procedencia sin tocar el contrato de la pieza. */
export function findPieceCuration(store: EditorialCurationStore, pieceId: string): EditorialPieceCurationRevision | null {
  return store.pieces[pieceId]?.current ?? null;
}

export type NewPieceInput = {
  brand: EditorialBrandSlug;
  market: MarketCode | null;
  language: "es" | "en" | "fr" | "de" | null;
  theme: string | null;
  subtheme: string | null;
  keyword: string | null;
  title: string | null;
  url: string | null;
  briefText: string | null;
  type: EditorialPieceType;
  year: number | null;
  month: number | null;
  publicationDate: string | null;
};

/** Construye una pieza íntegra de backlog creada en el workbench, sin fila V1 de origen. */
export function buildPieceFromInput(input: NewPieceInput, options: { seed: string; now: string; sha256: (value: string) => string }): EditorialPiece {
  const brandMeta = EDITORIAL_BRANDS.find((brand) => brand.slug === input.brand);
  const brief = input.briefText?.trim() ? input.briefText.trim() : null;
  const id = `ed-bk-${options.sha256(`workbench|${options.seed}`).slice(0, 16)}`;
  return {
    id,
    kind: "backlog",
    provenance: { source: "workbench", sourceIndex: 0, sourceSha256: options.sha256(id), importedAt: options.now, identityOrdinal: 1 },
    status: "backlog",
    statusLiteral: "Creado en workbench",
    type: input.type,
    typeLiteral: EDITORIAL_TYPE_LABELS[input.type],
    brand: { slug: input.brand, line: null, literal: brandMeta?.name ?? input.brand },
    market: input.market,
    marketLiteral: input.market ?? "",
    language: input.language,
    month: { year: input.year, month: input.month, yearSource: input.publicationDate ? "date" : input.year || input.month ? "estimate" : "none", literal: "" },
    writingDate: null,
    publicationDate: input.publicationDate,
    warnings: [],
    theme: input.theme,
    subtheme: input.subtheme,
    keyword: input.keyword,
    title: input.title,
    url: input.url,
    brief: brief ? { text: brief, normalizedLength: brief.length, sha256: options.sha256(brief) } : null,
    intent: null,
    cluster: null,
    objective: null,
    hypothesis: null,
    impact: null,
    effort: null,
    owner: null,
    author: null,
    reviewer: null,
    dependencies: [],
    successKpi: null,
    measurements: [],
    links: [],
  };
}

function overlayPiece(piece: EditorialPiece, record: EditorialPieceCurationRecord | undefined): EditorialPiece {
  if (!record) return piece;
  const c = record.current;
  const publicationDate = c.publicationDate ?? piece.publicationDate;
  const month = c.year !== null || c.month !== null
    ? { year: c.year ?? piece.month.year, month: c.month ?? piece.month.month, yearSource: publicationDate ? ("date" as const) : ("estimate" as const), literal: piece.month.literal }
    : piece.month;
  return {
    ...piece,
    // status/type cambian; statusLiteral/typeLiteral son procedencia V1 inmutable y nunca se tocan aquí.
    status: c.status ?? piece.status,
    type: c.type ?? piece.type,
    month,
    writingDate: c.writingDate ?? piece.writingDate,
    publicationDate,
    intent: c.intent ?? piece.intent,
    cluster: c.cluster ?? piece.cluster,
    objective: c.objective ?? piece.objective,
    hypothesis: c.hypothesis ?? piece.hypothesis,
    impact: c.impact ?? piece.impact,
    effort: c.effort ?? piece.effort,
    owner: c.owner ?? piece.owner,
    author: c.author ?? piece.author,
    reviewer: c.reviewer ?? piece.reviewer,
    successKpi: c.successKpi ?? piece.successKpi,
    links: c.links.length ? c.links : piece.links,
  };
}

function overlaySlot(slot: EditorialSlot, record: EditorialSlotCurationRecord | undefined): EditorialSlot {
  if (!record) return slot;
  const selectedProposalId = record.current.selectedProposalId;
  return { ...slot, selectedProposalId, proposals: slot.proposals.map((proposal) => ({ ...proposal, selected: proposal.id === selectedProposalId })) };
}

function overlayEvent(event: EditorialCalendarEvent, record: EditorialEventCurationRecord | undefined): EditorialCalendarEvent {
  if (!record) return event;
  return { ...event, pieceId: record.current.pieceId };
}

/**
 * Fusiona el dataset importado con la curación del workbench. Con un almacén
 * vacío devuelve un dataset equivalente al importado (mismas cuentas, mismo
 * contenido): las 47 pruebas existentes sobre el dataset V1 no cambian.
 */
export function applyCuration(dataset: EditorialDataset, store: EditorialCurationStore): EditorialDataset {
  const createdPieces = store.createdPieces.map((piece) => overlayPiece(piece, store.pieces[piece.id]));
  const backlog = [...dataset.backlog.map((piece) => overlayPiece(piece, store.pieces[piece.id])), ...createdPieces];
  const plan = dataset.plan.map((piece) => overlayPiece(piece, store.pieces[piece.id]));
  const slots = dataset.slots.map((slot) => overlaySlot(slot, store.slots[slot.id]));
  const events = dataset.calendar.events.map((event) => overlayEvent(event, store.events[event.id]));
  const brands = dataset.brands.map((brand) => {
    const created = store.createdPieces.filter((piece) => piece.brand.slug === brand.slug).length;
    return created ? { ...brand, backlogPieces: brand.backlogPieces + created } : brand;
  });
  return { ...dataset, brands, backlog, plan, calendar: { ...dataset.calendar, events }, slots };
}
