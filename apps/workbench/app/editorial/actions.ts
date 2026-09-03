"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  editorialBrandSlugSchema,
  editorialLanguageSchema,
  editorialLinkKindSchema,
  editorialPieceTypeSchema,
  editorialStatusSchema,
  intentSchema,
  marketCodeSchema,
  type EditorialCurationFields,
  type EditorialLink,
} from "@seo/contracts";
import { addCreatedPiece, buildPieceFromInput, upsertEventCuration, upsertPieceCuration, upsertSlotCuration, type CurationMeta, type NewPieceInput } from "@seo/editorial";
import { readCurationStore, sha256, writeCurationStore } from "@seo/editorial/curation-store";

/**
 * Server Actions del workbench (P1.4): único punto de escritura de la curación
 * editorial. El visor nunca importa este fichero; solo lee el resultado a
 * través de `getEffectiveEditorialDataset`.
 */

function str(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: FormDataEntryValue | null): number | null {
  const parsed = str(value);
  return parsed ? Number(parsed) : null;
}

/** Un enlace por línea, formato `tipo:id` (p. ej. `insight:ins-042`). Líneas inválidas se ignoran. */
function parseLinks(value: FormDataEntryValue | null): EditorialLink[] {
  const text = typeof value === "string" ? value : "";
  const links: EditorialLink[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const [kindRaw, ...rest] = line.split(":");
    const id = rest.join(":").trim();
    const kind = editorialLinkKindSchema.safeParse(kindRaw?.trim());
    if (kind.success && id) links.push({ kind: kind.data, id });
  }
  return links;
}

function fieldsFromForm(formData: FormData): EditorialCurationFields {
  return {
    status: editorialStatusSchema.nullable().parse(str(formData.get("status"))),
    type: editorialPieceTypeSchema.nullable().parse(str(formData.get("type"))),
    year: num(formData.get("year")),
    month: num(formData.get("month")),
    writingDate: str(formData.get("writingDate")),
    publicationDate: str(formData.get("publicationDate")),
    intent: intentSchema.nullable().parse(str(formData.get("intent"))),
    cluster: str(formData.get("cluster")),
    objective: str(formData.get("objective")),
    hypothesis: str(formData.get("hypothesis")),
    impact: num(formData.get("impact")),
    effort: num(formData.get("effort")),
    owner: str(formData.get("owner")),
    author: str(formData.get("author")),
    reviewer: str(formData.get("reviewer")),
    successKpi: str(formData.get("successKpi")),
    links: parseLinks(formData.get("links")),
  };
}

function metaFromForm(formData: FormData): CurationMeta {
  return { updatedBy: str(formData.get("updatedBy")), note: str(formData.get("note")), now: new Date().toISOString() };
}

export async function savePieceCuration(pieceId: string, formData: FormData) {
  const store = readCurationStore();
  const next = upsertPieceCuration(store, pieceId, fieldsFromForm(formData), metaFromForm(formData));
  writeCurationStore(next);
  revalidatePath("/editorial");
  redirect(`/editorial?section=piezas&edit=${encodeURIComponent(pieceId)}&saved=1`);
}

export async function createPiece(formData: FormData) {
  const input: NewPieceInput = {
    brand: editorialBrandSlugSchema.parse(formData.get("brand")),
    market: marketCodeSchema.nullable().parse(str(formData.get("market"))),
    language: editorialLanguageSchema.nullable().parse(str(formData.get("language"))),
    theme: str(formData.get("theme")),
    subtheme: str(formData.get("subtheme")),
    keyword: str(formData.get("keyword")),
    title: str(formData.get("title")),
    url: str(formData.get("url")),
    briefText: str(formData.get("briefText")),
    type: editorialPieceTypeSchema.parse(str(formData.get("type")) || "nuevo"),
    year: num(formData.get("year")),
    month: num(formData.get("month")),
    publicationDate: str(formData.get("publicationDate")),
  };
  const now = new Date().toISOString();
  const piece = buildPieceFromInput(input, { seed: randomUUID(), now, sha256 });
  const store = readCurationStore();
  writeCurationStore(addCreatedPiece(store, piece, now));
  revalidatePath("/editorial");
  redirect(`/editorial?section=piezas&edit=${encodeURIComponent(piece.id)}&saved=1`);
}

export async function selectProposal(slotId: string, formData: FormData) {
  const store = readCurationStore();
  const selectedProposalId = str(formData.get("selectedProposalId"));
  const next = upsertSlotCuration(store, slotId, selectedProposalId, { updatedBy: null, note: null, now: new Date().toISOString() });
  writeCurationStore(next);
  revalidatePath("/editorial");
  redirect("/editorial?section=propuestas&saved=1");
}

export async function linkEvent(eventId: string, formData: FormData) {
  const store = readCurationStore();
  const pieceId = str(formData.get("pieceId"));
  const next = upsertEventCuration(store, eventId, pieceId, { updatedBy: null, note: null, now: new Date().toISOString() });
  writeCurationStore(next);
  revalidatePath("/editorial");
  redirect("/editorial?section=eventos&saved=1");
}
