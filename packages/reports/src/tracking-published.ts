import published from "../data/tracking/actions.json";
import { actionsOfBrand, parseActionTracking, type TrackedAction } from "./action-tracking";

/**
 * Seguimiento de acciones en el visor (D-090): empaquetado en el build, de
 * solo lectura. Llega a producción con «sube las acciones» (commit y
 * despliegue), como los informes y el plan editorial.
 */
let cached: ReturnType<typeof parseActionTracking> | null = null;

export function getPublishedTracking() {
  cached ??= parseActionTracking(published);
  return cached;
}

export function getBrandTracking(brand: string): TrackedAction[] {
  return actionsOfBrand(getPublishedTracking(), brand);
}
