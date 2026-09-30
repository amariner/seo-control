import { EDITORIAL_STATUS_LABELS, type EditorialInboxChange } from "@seo/contracts";
import { applyCuration } from "./curation";
import { readCurationStore, writeCurationStore } from "./curation-store";
import { getEditorialDataset } from "./dataset";
import { pullInbox } from "./inbox";
import { resolveEditorialInbox } from "./inbox-store";

export type DescribedChange = EditorialInboxChange & { piece: string; brand: string | null; summary: string };

export type InboxSyncReport = {
  source: string;
  total: number;
  applied: DescribedChange[];
  superseded: DescribedChange[];
  orphaned: DescribedChange[];
  written: boolean;
};

/**
 * Sincronización visor → workbench (D-067), usada por `pnpm editorial:pull`,
 * que Claude Code ejecuta cuando el usuario lo pide en el chat. Trae los cambios sin traer a la curación, con su
 * autor, y los marca como traídos. No despliega.
 */
export async function syncInboxToCuration({ dryRun = false }: { dryRun?: boolean } = {}): Promise<InboxSyncReport> {
  const inbox = resolveEditorialInbox();
  const store = readCurationStore();
  const dataset = applyCuration(getEditorialDataset(), store);
  const pieces = new Map([...dataset.plan, ...dataset.backlog].map((piece) => [piece.id, piece]));
  const describe = (change: EditorialInboxChange): DescribedChange => {
    const piece = pieces.get(change.pieceId);
    const summary = [change.status ? `estado → ${EDITORIAL_STATUS_LABELS[change.status]}` : null, change.writingDate ? `redacción → ${change.writingDate}` : null, change.publicationDate ? `publicación → ${change.publicationDate}` : null].filter(Boolean).join(", ");
    return { ...change, piece: piece?.title ?? piece?.keyword ?? change.pieceId, brand: piece?.brand.literal ?? null, summary };
  };

  const changes = await inbox.list();
  const now = new Date().toISOString();
  const result = pullInbox(store, changes, new Set(pieces.keys()), now);
  const processed = [...result.applied, ...result.superseded, ...result.orphaned].map((change) => change.id);
  const written = !dryRun && processed.length > 0;
  if (written) {
    if (result.applied.length) writeCurationStore(result.store);
    await inbox.markPulled(processed, now);
  }
  return {
    source: inbox.detail,
    total: changes.length,
    applied: result.applied.map(describe),
    superseded: result.superseded.map(describe),
    orphaned: result.orphaned.map(describe),
    written,
  };
}
