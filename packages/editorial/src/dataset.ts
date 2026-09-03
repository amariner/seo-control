import { editorialDatasetSchema, type EditorialDataset } from "@seo/contracts";
import normalized from "../data/normalized/editorial-dataset.json";
import { applyCuration } from "./curation";
import { readCurationStore } from "./curation-store";

/**
 * Dataset editorial normalizado, validado una sola vez por proceso.
 *
 * Es la fuente operativa hasta que P3 sustituya el JSON por PostgreSQL detrás del
 * mismo contrato. Solo debe importarse desde código de servidor: contiene los
 * briefs completos y la procedencia, que nunca viajan íntegros al navegador
 * salvo a través de la API autenticada.
 */

let cached: EditorialDataset | null = null;

/** Dataset tal como lo dejó la importación V1 (D-006/D-009), sin curación. */
export function getEditorialDataset(): EditorialDataset {
  if (!cached) cached = editorialDatasetSchema.parse(normalized);
  return cached;
}

/**
 * Dataset importado fusionado con la curación del workbench (P1.4). Es la
 * fuente que debe consumir el visor: nunca escribe, solo lee este resultado.
 * La curación se relee de disco en cada llamada porque cambia en caliente.
 */
export function getEffectiveEditorialDataset(): EditorialDataset {
  return applyCuration(getEditorialDataset(), readCurationStore());
}
