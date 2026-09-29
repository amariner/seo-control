"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PILOT_PROJECTS, brandSlugSchema } from "@seo/contracts";
import { buildProjectReport, parsePeriod, reportActionPrioritySchema, reportIdSchema, rowKeyFor, snapshotInput, type ReportCuration, type ReportSlideCuration } from "@seo/reports";
import { ReportGenerationError, generateSnapshot } from "@seo/reports/generate";
import { localAuthor, readReports, readSnapshot, removeSnapshot, saveCuration, saveSnapshot } from "@seo/reports/store";

/**
 * Server Actions de la pestaña Informes (D-076): único punto de escritura de
 * `packages/reports/data/published`. El visor solo lee ese fichero, que le
 * llega con commit y despliegue («sube los informes» en el chat).
 */

const back = (path: string, params: Record<string, string>) => `${path}?${new URLSearchParams(params)}`;
const errorText = (error: unknown) => (error instanceof ReportGenerationError || error instanceof Error ? error.message : String(error));

async function freeze(brand: string, period: string) {
  const { id, snapshot } = await generateSnapshot({ brand: brandSlugSchema.parse(brand), period, author: localAuthor() });
  saveSnapshot(id, snapshot);
  return id;
}

export async function regenerateReport(formData: FormData) {
  const id = reportIdSchema.parse(formData.get("id"));
  const returnTo = String(formData.get("returnTo") ?? "/informes");
  const [brand, period] = id.split(":") as [string, string];
  let target: string;
  try {
    await freeze(brand, period);
    target = back(returnTo, { ok: `Congelado ${id} con datos de hoy` });
  } catch (error) {
    target = back(returnTo, { error: `${id}: ${errorText(error)}` });
  }
  revalidatePath("/informes", "layout");
  redirect(target);
}

/** Regenera un trimestre para las marcas del piloto, de una en una (las APIs de Google limitan la concurrencia). */
export async function regenerateQuarter(formData: FormData) {
  const period = parsePeriod(String(formData.get("period")));
  if (!period) redirect(back("/informes", { error: "Periodo desconocido" }));
  const done: string[] = [];
  const failed: string[] = [];
  for (const brand of PILOT_PROJECTS) {
    try {
      await freeze(brand.slug, period.id);
      done.push(brand.name);
    } catch (error) {
      failed.push(`${brand.name}: ${errorText(error)}`);
    }
  }
  revalidatePath("/informes", "layout");
  const params: Record<string, string> = {};
  if (done.length) params.ok = `${period.label} congelado para ${done.join(", ")}`;
  if (failed.length) params.error = failed.join(" · ");
  redirect(back("/informes", params));
}

export async function discardSnapshot(formData: FormData) {
  const id = reportIdSchema.parse(formData.get("id"));
  removeSnapshot(id);
  revalidatePath("/informes", "layout");
  const [brand, period] = id.split(":");
  redirect(back(`/informes/${brand}/${period}`, { ok: "Versión congelada retirada: el visor vuelve a mostrar el informe en vivo" }));
}

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");

/**
 * Guarda las puntualizaciones. El formulario envía lo que se MUESTRA (casillas
 * marcadas); lo oculto se deduce contra las diapositivas de la versión
 * congelada, que se recalculan aquí para no fiarse de lo que llegue.
 */
export async function saveReportCuration(formData: FormData) {
  const id = reportIdSchema.parse(formData.get("id"));
  const [brand, period] = id.split(":") as [string, string];
  const path = `/informes/${brand}/${period}`;
  const snapshot = readSnapshot(id);
  if (!snapshot) redirect(back(path, { error: "Congela el informe antes de personalizarlo" }));

  const actions: ReportCuration["actions"] = [];
  for (let index = 0; index < 12; index += 1) {
    const title = text(formData.get(`action:${index}:title`));
    if (title.length < 3) continue;
    actions.push({
      priority: reportActionPrioritySchema.catch("media").parse(formData.get(`action:${index}:priority`)),
      title: title.slice(0, 200),
      why: text(formData.get(`action:${index}:why`)).slice(0, 400),
    });
  }

  const slides = buildProjectReport({ ...snapshotInput(snapshot), teamActions: actions });
  const shown = (name: string) => new Set(formData.getAll(name).map(String));
  const curationSlides: Record<string, ReportSlideCuration> = {};
  for (const slide of slides) {
    const metrics = shown(`metric:${slide.id}`);
    const lists = shown(`list:${slide.id}`);
    const rows = shown(`row:${slide.id}`);
    const item: ReportSlideCuration = {};
    if (!formData.has(`show:${slide.id}`)) item.hidden = true;
    const note = text(formData.get(`note:${slide.id}`)).slice(0, 1200);
    if (note) item.note = note;
    if (slide.reading && !formData.has(`reading:${slide.id}`)) item.hideReading = true;
    const hiddenMetrics = slide.metrics.map((metric) => metric.label).filter((label) => !metrics.has(label));
    if (hiddenMetrics.length) item.hiddenMetrics = hiddenMetrics;
    const hiddenLists = slide.lists.map((list) => list.title).filter((title) => !lists.has(title));
    if (slide.bars && !lists.has("__bars")) hiddenLists.push("__bars");
    if (slide.series && slide.series.length > 1 && !lists.has("__series")) hiddenLists.push("__series");
    if (hiddenLists.length) item.hiddenLists = hiddenLists;
    // Solo cuentan las filas que el formulario enseñó: una acción del equipo
    // recién escrita aún no tenía casilla y no debe nacer oculta.
    const rendered = shown(`rowset:${slide.id}`);
    const hiddenRows = slide.lists.flatMap((list) =>
      list.rows.map((row) => rowKeyFor(list, row)).filter((key) => rendered.has(key) && !rows.has(key)),
    );
    const unique = [...new Set(hiddenRows)];
    if (unique.length) item.hiddenRows = unique;
    if (Object.keys(item).length) curationSlides[slide.id] = item;
  }

  saveCuration(id, { slides: curationSlides, actions, updatedAt: new Date().toISOString(), updatedBy: localAuthor() });
  revalidatePath("/informes", "layout");
  redirect(back(path, { ok: "Puntualizaciones guardadas en local. Para llevarlas al visor, pide «sube los informes» en el chat." }));
}

/** Quita todas las puntualizaciones de un informe. */
export async function resetReportCuration(formData: FormData) {
  const id = reportIdSchema.parse(formData.get("id"));
  const [brand, period] = id.split(":");
  if (readReports().reports[id]?.curation)
    saveCuration(id, { slides: {}, actions: [], updatedAt: new Date().toISOString(), updatedBy: localAuthor() });
  revalidatePath("/informes", "layout");
  redirect(back(`/informes/${brand}/${period}`, { ok: "Puntualizaciones retiradas" }));
}
