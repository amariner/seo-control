import { privateJson } from "@/lib/http";
import { getEditorial } from "@/lib/editorial";

/** Informe de importación: procedencia, hashes, recuentos, rechazos y avisos. */
export async function GET() {
  return privateJson(getEditorial().report);
}
