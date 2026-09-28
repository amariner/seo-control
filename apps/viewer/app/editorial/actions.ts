"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { editorialInboxEditSchema } from "@seo/contracts";
import { resolveEditorialInbox } from "@seo/editorial/inbox-store";
import type { PieceEdit, PieceEditResult } from "@seo/editorial-ui/plan-editors";
import { auth } from "@/auth";
import { getEditorial } from "@/lib/editorial";

/**
 * Única escritura del visor (D-067): estado y fecha de publicación de una pieza
 * del plan. No toca la curación —vive en el repositorio—; deja el cambio en la
 * bandeja, que el plan superpone al instante y el workbench incorpora al
 * sincronizar. Cada cambio guarda quién y cuándo.
 */
export async function editPieceFromViewer(pieceId: string, edit: PieceEdit): Promise<PieceEditResult> {
  const session = await auth();
  const actor = session?.user?.email ?? (process.env.NODE_ENV !== "production" ? "usuario-desarrollo" : null);
  if (!actor) return { ok: false, error: "Inicia sesión para editar el plan." };

  const parsed = editorialInboxEditSchema.safeParse(edit);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Cambio no válido." };
  const dataset = getEditorial();
  if (![...dataset.plan, ...dataset.backlog].some((piece) => piece.id === pieceId)) return { ok: false, error: "La pieza ya no está en el plan." };

  try {
    await resolveEditorialInbox().add({
      id: randomUUID(),
      pieceId,
      status: parsed.data.status ?? null,
      publicationDate: parsed.data.publicationDate ?? null,
      actor,
      createdAt: new Date().toISOString(),
      pulledAt: null,
    });
  } catch (error) {
    console.error("[editorial] no se pudo guardar el cambio", error);
    return { ok: false, error: error instanceof Error && error.message.startsWith("Edición no disponible") ? error.message : "No se ha podido guardar. Inténtalo de nuevo." };
  }
  revalidatePath("/editorial/calendario");
  revalidatePath("/projects/[slug]", "page");
  return { ok: true };
}
