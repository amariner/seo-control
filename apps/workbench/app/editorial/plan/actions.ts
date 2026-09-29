"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runEditorialMeasurement } from "@seo/reports/measure";
import { localAuthor } from "@seo/reports/store";

/** «Medir publicaciones» (P3.5, D-079): recalcula la medición real de las piezas publicadas. */
export async function measurePublishedPieces() {
  let target: string;
  try {
    const { store, requests } = await runEditorialMeasurement({ author: localAuthor() });
    target = `/editorial/plan?${new URLSearchParams({ ok: `${Object.keys(store.pieces).length} piezas medidas con ${requests} consultas a Search Console (dato hasta el ${store.cutoff}). Para llevarlo al visor, pide «sube el plan».` })}`;
  } catch (error) {
    target = `/editorial/plan?${new URLSearchParams({ error: error instanceof Error ? error.message : String(error) })}`;
  }
  revalidatePath("/editorial/plan");
  redirect(target);
}
